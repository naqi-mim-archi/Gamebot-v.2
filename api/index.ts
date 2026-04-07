import express from "express";
import Stripe from "stripe";
import { initializeApp as initAdminApp, cert } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import dotenv from "dotenv";
import { Resend } from "resend";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

// This tells Vercel not to parse the body, so Stripe webhooks can read the raw body
export const config = {
  api: {
    bodyParser: false,
  },
};

const app = express();

let stripeClient: Stripe | null = null;
function getStripe(): Stripe {
  if (!stripeClient) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error("STRIPE_SECRET_KEY environment variable is not set.");
    stripeClient = new Stripe(key, { apiVersion: "2025-02-24.acacia" as any });
  }
  return stripeClient;
}

let resendClient: Resend | null = null;
function getResend(): Resend {
  if (!resendClient) {
    const key = process.env.RESEND_API_KEY;
    if (!key) throw new Error("RESEND_API_KEY environment variable is not set.");
    resendClient = new Resend(key);
  }
  return resendClient;
}

let _adminInitialized = false;

function getFirebaseAdmin() {
  if (!_adminInitialized) {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY;

    if (!projectId || !clientEmail || !privateKey) {
      console.warn("Firebase Admin credentials missing. Webhooks will not update Firestore.");
      return null;
    }

    initAdminApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey: privateKey.replace(/\\n/g, '\n'),
      }),
    });
    _adminInitialized = true;
  }
  return getFirestore();
}

// Webhook MUST be before express.json() so it gets the raw body
app.post('/api/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  try {
    const stripe = getStripe();
    const event = stripe.webhooks.constructEvent(
      req.body,
      sig as string,
      process.env.STRIPE_WEBHOOK_SECRET!
    );

    const db = getFirebaseAdmin();
    if (!db) {
      console.error("Firebase Admin not initialized");
      return res.status(500).send("DB Error");
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.client_reference_id;
      const tier = session.metadata?.tier;
      const credits = parseInt(session.metadata?.credits || '0');

      if (userId) {
        const userRef = db.collection('users').doc(userId);
        if (tier === 'topup') {
          await userRef.update({ credits: FieldValue.increment(credits) });
        } else if (tier) {
          await userRef.update({ 
            tier: tier, 
            credits: FieldValue.increment(credits),
            stripeCustomerId: session.customer as string
          });
        }
      }
    }

    // Handle subscription updates and cancellations
    if (event.type === 'customer.subscription.created' || event.type === 'customer.subscription.updated' || event.type === 'customer.subscription.deleted') {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = subscription.customer as string;
      
      try {
        const customer = await stripe.customers.retrieve(customerId) as Stripe.Customer;
        if (customer && customer.email) {
          const status = subscription.status;
          const cancelAtPeriodEnd = subscription.cancel_at_period_end;
          
          let subject = '';
          let message = '';

          if (event.type === 'customer.subscription.deleted' || status === 'canceled') {
            subject = 'Your Gamebot Subscription has been Canceled';
            message = 'Your subscription has been successfully canceled. You will retain access until the end of your current billing period.';
          } else if (cancelAtPeriodEnd) {
            subject = 'Your Gamebot Subscription is set to Cancel';
            message = 'Your subscription is set to cancel at the end of your billing period. If you change your mind, you can resume it anytime from your dashboard.';
          } else if (event.type === 'customer.subscription.created') {
            subject = 'Welcome to Gamebot Pro!';
            message = 'Your subscription has been successfully created. Thank you for upgrading!';
          } else if (event.type === 'customer.subscription.updated') {
            subject = 'Your Gamebot Subscription has been Updated';
            message = 'Your subscription details have been successfully updated.';
          }

          if (subject && message) {
            const resend = getResend();
            await resend.emails.send({
              from: 'Gamebot <support@gamebot.studio>',
              to: [customer.email],
              subject: subject,
              html: `
                <div style="font-family: sans-serif; max-w: 600px; margin: 0 auto;">
                  <h2>Subscription Update</h2>
                  <p>${message}</p>
                  <br/>
                  <p>Thanks,</p>
                  <p>The Gamebot Team</p>
                </div>
              `,
            });
          }
        }
      } catch (err) {
        console.error("Failed to send subscription email:", err);
      }
    }

    res.json({ received: true });
  } catch (err: any) {
    console.error("Webhook Error:", err.message);
    res.status(400).send(`Webhook Error: ${err.message}`);
  }
});

app.use(express.json());

app.post('/api/email/welcome', async (req, res) => {
  try {
    const { email, name } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });

    const resend = getResend();
    const data = await resend.emails.send({
      from: 'Gamebot <support@gamebot.studio>',
      to: [email],
      subject: 'Welcome to Gamebot Studio!',
      html: `
        <div style="font-family: sans-serif; max-w: 600px; margin: 0 auto;">
          <h2>Welcome to Gamebot Studio, ${name || 'Player'}! 🎮</h2>
          <p>We're thrilled to have you on board. Get ready to build, play, and share amazing games.</p>
          <p>If you have any questions, just reply to this email.</p>
          <br/>
          <p>Happy gaming,</p>
          <p>The Gamebot Team</p>
        </div>
      `,
    });

    res.json({ success: true, data });
  } catch (error: any) {
    console.error('Welcome email error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/create-checkout-session', async (req, res) => {
  try {
    const { tier, userId, email, returnUrl } = req.body;
    const stripe = getStripe();
    
    let unit_amount = 0;
    let name = '';
    let credits = 0;
    let mode: 'subscription' | 'payment' = 'subscription';

    if (tier === 'creator') { unit_amount = 2000; name = 'Creator Tier'; credits = 100; }
    else if (tier === 'pro') { unit_amount = 5000; name = 'Pro Tier'; credits = 500; }
    else if (tier === 'studio') { unit_amount = 10000; name = 'Studio Tier'; credits = 9999; }
    else if (tier === 'topup_10') { unit_amount = 1000; name = '100 Credits Top-up'; credits = 100; mode = 'payment'; }
    else if (tier === 'topup_20') { unit_amount = 2000; name = '250 Credits Top-up'; credits = 250; mode = 'payment'; }
    else if (tier === 'topup_40') { unit_amount = 4000; name = '600 Credits Top-up'; credits = 600; mode = 'payment'; }
    else if (tier === 'topup_100') { unit_amount = 10000; name = '2000 Credits Top-up'; credits = 2000; mode = 'payment'; }
    else { return res.status(400).json({ error: 'Invalid tier' }); }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: mode,
      customer_email: email,
      client_reference_id: userId,
      metadata: {
        tier: tier.startsWith('topup') ? 'topup' : tier,
        credits: credits.toString()
      },
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: { name },
            unit_amount,
            ...(mode === 'subscription' ? { recurring: { interval: 'month' } } : {})
          },
          quantity: 1,
        },
      ],
      success_url: `${returnUrl}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: returnUrl,
    });

    res.json({ url: session.url });
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/create-portal-session', async (req, res) => {
  try {
    const { customerId, returnUrl } = req.body;
    if (!customerId) return res.status(400).json({ error: 'No customer ID provided' });
    
    const stripe = getStripe();
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });
    
    res.json({ url: session.url });
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/auth/profile
// Creates a Firestore user document on first login (Admin SDK bypasses security rules).
app.post('/api/auth/profile', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing auth token.' });
  }

  const idToken = authHeader.slice(7);

  let db: ReturnType<typeof getFirestore> | null = null;
  try {
    db = getFirebaseAdmin();
  } catch (err: any) {
    console.error('[profile] Firebase Admin init error:', err.message);
    return res.status(500).json({ error: 'Firebase Admin failed to initialize.' });
  }
  if (!db) return res.status(500).json({ error: 'Database unavailable.' });

  let decoded: Awaited<ReturnType<ReturnType<typeof getAuth>['verifyIdToken']>>;
  try {
    decoded = await getAuth().verifyIdToken(idToken);
  } catch (err: any) {
    console.error('[profile] Token verification error:', err.message);
    return res.status(401).json({ error: 'Invalid or expired auth token.' });
  }

  try {
    const userRef = db.collection('users').doc(decoded.uid);
    const snap = await userRef.get();

    if (!snap.exists) {
      const trialEndDate = Date.now() + 14 * 24 * 60 * 60 * 1000;
      await userRef.set({
        uid: decoded.uid,
        email: decoded.email ?? null,
        tier: '14-day-trial',
        credits: 50,
        trialEndDate,
        createdAt: FieldValue.serverTimestamp(),
      });
    }

    res.json({ success: true });
  } catch (err: any) {
    console.error('[profile] Firestore error:', err.message);
    res.status(500).json({ error: 'Failed to create user profile.' });
  }
});

// POST /api/auth/github/token
// Saves a GitHub OAuth token to the user's Firestore profile (server-side, bypasses rules).
app.post('/api/auth/github/token', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing auth token.' });
  }

  const { githubToken } = req.body;
  if (!githubToken) return res.status(400).json({ error: 'githubToken is required.' });

  try {
    const db = getFirebaseAdmin();
    if (!db) return res.status(500).json({ error: 'Database unavailable.' });
    const decoded = await getAuth().verifyIdToken(authHeader.slice(7));
    await db.collection('users').doc(decoded.uid).update({ githubToken });
    res.json({ success: true });
  } catch (err: any) {
    console.error('[github/token] Error:', err.message);
    res.status(500).json({ error: 'Failed to save GitHub token.' });
  }
});

// GitHub OAuth Routes
app.get('/api/auth/github/url', (req, res) => {
  const redirectUri = `${process.env.APP_URL || 'http://localhost:3000'}/api/auth/github/callback`;
  const params = new URLSearchParams({
    client_id: process.env.GITHUB_CLIENT_ID || '',
    redirect_uri: redirectUri,
    scope: 'repo', // Need repo scope to create and push to repositories
    response_type: 'code',
  });
  
  const authUrl = `https://github.com/login/oauth/authorize?${params.toString()}`;
  res.json({ url: authUrl });
});

app.get('/api/auth/github/callback', async (req, res) => {
  const { code } = req.query;
  
  if (!code) {
    return res.status(400).send('No code provided');
  }

  try {
    const redirectUri = `${process.env.APP_URL || 'http://localhost:3000'}/api/auth/github/callback`;
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code,
        redirect_uri: redirectUri,
      }),
    });

    const tokenData = await tokenResponse.json();
    
    if (tokenData.error) {
      throw new Error(tokenData.error_description || tokenData.error);
    }

    const accessToken = tokenData.access_token;

    // Return HTML that posts the message back to the opener window
    res.send(`
      <html>
        <body>
          <script>
            if (window.opener) {
              window.opener.postMessage({ 
                type: 'GITHUB_AUTH_SUCCESS', 
                token: '${accessToken}' 
              }, '*');
              window.close();
            } else {
              document.body.innerHTML = 'Authentication successful! You can close this window.';
            }
          </script>
          <p>Authentication successful. This window should close automatically.</p>
        </body>
      </html>
    `);
  } catch (error: any) {
    console.error('GitHub OAuth error:', error);
    res.status(500).send(`Authentication failed: ${error.message}`);
  }
});

app.post('/api/github/sync', async (req, res) => {
  try {
    const { token, repoName, files, description } = req.body;
    
    if (!token || !repoName || !files) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    const sanitizedRepoName = repoName.trim().replace(/[^a-zA-Z0-9_.-]/g, '-');

    // 1. Get authenticated user
    const userRes = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });
    
    if (!userRes.ok) throw new Error('Failed to get user info');
    const userData = await userRes.json();
    const username = userData.login;

    // 2. Create repository
    const createRepoRes = await fetch('https://api.github.com/user/repos', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: sanitizedRepoName,
        description: description || 'Generated by GameBot',
        private: false,
        auto_init: true // Initialize with README
      })
    });

    let repoData;
    if (createRepoRes.status === 422) {
      // Repo might already exist, try to get it
      const getRepoRes = await fetch(`https://api.github.com/repos/${username}/${sanitizedRepoName}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      });
      if (!getRepoRes.ok) throw new Error('Failed to create or access repository');
      repoData = await getRepoRes.json();
    } else if (!createRepoRes.ok) {
      throw new Error('Failed to create repository');
    } else {
      repoData = await createRepoRes.json();
    }

    // Wait a moment for repo initialization
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 3. Get the latest commit SHA of the main branch
    const refRes = await fetch(`https://api.github.com/repos/${username}/${sanitizedRepoName}/git/refs/heads/main`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });
    
    let baseTreeSha;
    let latestCommitSha;
    
    if (refRes.ok) {
      const refData = await refRes.json();
      latestCommitSha = refData.object.sha;
      
      const commitRes = await fetch(`https://api.github.com/repos/${username}/${sanitizedRepoName}/git/commits/${latestCommitSha}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      });
      const commitData = await commitRes.json();
      baseTreeSha = commitData.tree.sha;
    }

    // 4. Create blobs and tree
    const treeItems: any[] = [];
    for (const [path, content] of Object.entries(files)) {
      if (content === null) {
        treeItems.push({
          path: path,
          mode: '100644',
          type: 'blob',
          sha: null
        });
        continue;
      }

      const blobRes = await fetch(`https://api.github.com/repos/${username}/${sanitizedRepoName}/git/blobs`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          content: typeof content === 'string' ? content : JSON.stringify(content, null, 2),
          encoding: 'utf-8'
        })
      });
      
      if (!blobRes.ok) {
        const errData = await blobRes.json().catch(() => ({}));
        throw new Error(`Failed to create blob for ${path}: ${errData.message || blobRes.statusText}`);
      }
      const blobData = await blobRes.json();
      
      treeItems.push({
        path: path,
        mode: '100644',
        type: 'blob',
        sha: blobData.sha
      });
    }

    // 5. Create Tree
    const treeRes = await fetch(`https://api.github.com/repos/${username}/${sanitizedRepoName}/git/trees`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        base_tree: baseTreeSha,
        tree: treeItems
      })
    });
    
    if (!treeRes.ok) throw new Error('Failed to create tree');
    const treeData = await treeRes.json();

    // 6. Create Commit
    const newCommitRes = await fetch(`https://api.github.com/repos/${username}/${sanitizedRepoName}/git/commits`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: 'Sync from GameBot',
        tree: treeData.sha,
        parents: latestCommitSha ? [latestCommitSha] : []
      })
    });
    
    if (!newCommitRes.ok) throw new Error('Failed to create commit');
    const newCommitData = await newCommitRes.json();

    // 7. Update Ref
    const updateRefRes = await fetch(`https://api.github.com/repos/${username}/${sanitizedRepoName}/git/refs/heads/main`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        sha: newCommitData.sha,
        force: true
      })
    });
    
    if (!updateRefRes.ok) {
      // Try master branch if main fails
      const updateMasterRes = await fetch(`https://api.github.com/repos/${username}/${sanitizedRepoName}/git/refs/heads/master`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          sha: newCommitData.sha,
          force: true
        })
      });
      if (!updateMasterRes.ok) throw new Error('Failed to update branch ref');
    }

    res.json({ success: true, url: repoData.html_url });
  } catch (error: any) {
    console.error('GitHub sync error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// SECURE GENERATION — System prompt and API key stay server-side
// ============================================================

const SYSTEM_INSTRUCTION = `You are an expert game developer and creative coder.
Your task is to generate a complete, playable browser game based on the user's description.

Requirements:
1. Generate a multi-file project structure (e.g., index.html, src/main.js, styles/style.css, assets/data.json).
2. Use HTML5 Canvas, or include Phaser.js/Three.js via CDN if necessary.
3. The output MUST be a valid JSON object where keys are file paths and values are the file contents as strings.
4. The game MUST be full-screen. The canvas should fill the entire window. Handle window resize events to update the canvas dimensions dynamically.
5. Add basic error handling in the JS to catch and log errors to the console.
6. Make it look good and feel "juicy" (add particles, screen shake, or good colors if applicable).
7. The index.html file MUST be the entry point.
8. Use relative paths to link CSS and JS files in the HTML (e.g., <script src="src/main.js"></script>).
9. DO NOT use ES modules (import/export). All JS must be included via <script> tags in index.html, as the files will be inlined for preview.
10. IMPORTANT: Ensure the canvas is appended to document.body and that document.body has margin: 0 and overflow: hidden.

Return ONLY the raw JSON object. No explanations, no markdown formatting.`;

const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

// POST /api/generate/stream
// Streams Gemini game generation as SSE.
// Verifies Firebase auth, deducts credits atomically before calling Gemini.
app.post('/api/generate/stream', async (req, res) => {
  // 1. Verify Firebase ID token
  const authHeader = req.headers.authorization;
  let userId: string | null = null;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const idToken = authHeader.slice(7);
    try {
      const db = getFirebaseAdmin();
      if (db) {
        const decoded = await getAuth().verifyIdToken(idToken);
        userId = decoded.uid;
      }
    } catch {
      return res.status(401).json({ error: 'Invalid or expired auth token.' });
    }
  }

  const { prompt, previousFiles, files: attachments } = req.body;

  if (!prompt && (!attachments || attachments.length === 0)) {
    return res.status(400).json({ error: 'Prompt is required.' });
  }

  const isRevision = previousFiles && Object.keys(previousFiles).length > 0;
  const cost = isRevision ? 1 : 5;

  // 2. Atomic credit check + deduction (server-side only)
  if (userId) {
    const db = getFirebaseAdmin();
    if (db) {
      try {
        const userRef = db.collection('users').doc(userId);
        await db.runTransaction(async (t) => {
          const snap = await t.get(userRef);
          const credits = snap.data()?.credits ?? 0;
          if (credits < cost) throw new Error('INSUFFICIENT_CREDITS');
          t.update(userRef, { credits: FieldValue.increment(-cost) });
        });
      } catch (err: any) {
        if (err.message === 'INSUFFICIENT_CREDITS') {
          return res.status(402).json({ error: 'INSUFFICIENT_CREDITS' });
        }
        console.error('Credit transaction error:', err);
        return res.status(500).json({ error: 'Credit check failed.' });
      }
    }
  }

  // 3. Set up SSE stream
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const sendEvent = (data: object) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  try {
    const geminiKey = process.env.GEMINI_API_KEY;
    if (!geminiKey) throw new Error('GEMINI_API_KEY is not configured on the server.');

    const ai = new GoogleGenAI({ apiKey: geminiKey });

    let textPrompt = prompt;
    if (isRevision) {
      textPrompt = `Here is the current game code:\n\n${JSON.stringify(previousFiles, null, 2)}\n\nUser request to modify the game: ${prompt}\n\nPlease provide the complete updated JSON object containing all files.`;
    }

    const parts: any[] = [];
    if (attachments && attachments.length > 0) {
      for (const file of attachments) {
        parts.push({ inlineData: { mimeType: file.mimeType, data: file.data } });
      }
    }
    parts.push({ text: textPrompt });

    const responseStream = await ai.models.generateContentStream({
      model: GEMINI_MODEL,
      contents: [{ role: 'user', parts }],
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        temperature: 0.7,
        responseMimeType: 'application/json',
      },
    });

    let fullText = '';
    for await (const chunk of responseStream) {
      if (chunk.text) {
        fullText += chunk.text;
        sendEvent({ type: 'chunk', text: chunk.text });
      }
    }

    // Parse and normalize the final file map
    try {
      let text = fullText.trim();
      // Strip markdown code fences if present
      if (text.startsWith('```')) {
        text = text.replace(/^```[a-z]*\n?/, '').replace(/\n?```$/, '');
      }
      // Some models wrap the JSON in an outer object with a "json" key
      if (text.startsWith('{') && text.includes('"json"')) {
        try { const outer = JSON.parse(text); if (outer.json) text = outer.json; } catch {}
      }
      if (!text) throw new Error('Empty response from model');
      let parsed = JSON.parse(text);

      if (parsed.files && typeof parsed.files === 'object' && !Array.isArray(parsed.files)) {
        parsed = parsed.files;
      }

      if (Array.isArray(parsed)) {
        const normalized: Record<string, string> = {};
        for (const file of parsed) {
          if (file.name && file.content) normalized[file.name] = file.content;
          else if (file.path && file.content) normalized[file.path] = file.content;
        }
        parsed = normalized;
      }

      const finalFiles: Record<string, string> = {};
      for (const key in parsed) {
        finalFiles[key] = typeof parsed[key] === 'string'
          ? parsed[key]
          : JSON.stringify(parsed[key], null, 2);
      }

      sendEvent({
        type: 'files',
        files: Object.keys(finalFiles).length > 0
          ? finalFiles
          : { 'index.html': '<h1>No files generated</h1>' },
      });
    } catch (parseErr: any) {
      console.error('[generate] JSON parse failed:', parseErr.message);
      console.error('[generate] Raw response (first 500 chars):', fullText.slice(0, 500));
      sendEvent({ type: 'error', message: 'The AI returned a response that could not be parsed. Please try again.' });
    }
  } catch (err: any) {
    console.error('Generation error:', err.message);
    sendEvent({ type: 'error', message: err.message || 'Generation failed.' });
  } finally {
    res.end();
  }
});

// POST /api/enhance
// Enhances a rough prompt. No auth required (used on landing page without account).
// POST /api/enhance/questions
// Generates targeted questions about the game idea to gather user preferences.
app.post('/api/enhance/questions', async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt) return res.status(400).json({ error: 'Prompt is required.' });

    const geminiKey = process.env.GEMINI_API_KEY;
    if (!geminiKey) throw new Error('GEMINI_API_KEY is not configured on the server.');

    const ai = new GoogleGenAI({ apiKey: geminiKey });
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: {
        systemInstruction: `You are a game design consultant helping a developer refine their game idea.
Given a game idea, generate exactly 3 short, specific questions to understand their vision better.
Each question should target a different aspect: visual style, core mechanic, or player experience.
Keep questions conversational and concise — one sentence each.
Return ONLY a valid JSON array with this exact shape:
[
  { "id": "1", "question": "...", "placeholder": "e.g. ..." },
  { "id": "2", "question": "...", "placeholder": "e.g. ..." },
  { "id": "3", "question": "...", "placeholder": "e.g. ..." }
]
No markdown, no explanation, just the JSON array.`,
        temperature: 0.7,
        responseMimeType: 'application/json',
      },
    });

    let questions = [];
    try {
      let text = (response.text || '[]').trim();
      if (text.startsWith('```')) text = text.replace(/^```[a-z]*\n?/, '').replace(/\n?```$/, '');
      questions = JSON.parse(text);
    } catch {
      return res.status(500).json({ error: 'Failed to parse questions.' });
    }

    res.json({ questions });
  } catch (error: any) {
    console.error('Enhance/questions error:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/enhance/finalize
// Takes the original prompt + user's answers and builds a rich enhanced prompt.
app.post('/api/enhance/finalize', async (req, res) => {
  try {
    const { prompt, answers } = req.body;
    if (!prompt) return res.status(400).json({ error: 'Prompt is required.' });

    const geminiKey = process.env.GEMINI_API_KEY;
    if (!geminiKey) throw new Error('GEMINI_API_KEY is not configured on the server.');

    const answersText = Object.entries(answers || {})
      .filter(([, v]) => v)
      .map(([q, a]) => `Q: ${q}\nA: ${a}`)
      .join('\n\n');

    const userContent = `Game idea: ${prompt}${answersText ? `\n\nAdditional details from the developer:\n${answersText}` : ''}`;

    const ai = new GoogleGenAI({ apiKey: geminiKey });
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: [{ role: 'user', parts: [{ text: userContent }] }],
      config: {
        systemInstruction: `You are an expert prompt engineer specializing in game development.
Using the game idea and the developer's answers, write a detailed, well-structured prompt for a code-generation AI to build the game.
Cover: mechanics, visual style, controls, win/lose conditions, and game feel (juice, particles, sound cues).
Return ONLY the enhanced prompt text. No markdown, no filler, no explanations.`,
        temperature: 0.7,
      },
    });

    res.json({ enhanced: response.text || prompt });
  } catch (error: any) {
    console.error('Enhance/finalize error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default app;
