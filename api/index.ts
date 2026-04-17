import express from "express";
import Stripe from "stripe";
import { initializeApp as initAdminApp, cert } from "firebase-admin/app";
import { getFirestore, FieldValue, Firestore } from "firebase-admin/firestore";
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
            stripeCustomerId: session.customer as string,
            trialEndDate: null,
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

app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

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
        // Sync Google/provider display name and photo on first login
        ...(decoded.name ? { displayName: decoded.name } : {}),
        ...(decoded.picture ? { photoURL: decoded.picture } : {}),
      });
    } else {
      // Always keep displayName/photoURL in sync if user hasn't set a custom one
      const data = snap.data()!;
      const updates: Record<string, any> = {};
      if (!data.displayName && decoded.name) updates.displayName = decoded.name;
      if (!data.photoURL && decoded.picture) updates.photoURL = decoded.picture;
      if (Object.keys(updates).length > 0) await userRef.update(updates);
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
    const userRef = db.collection('users').doc(decoded.uid);
    const snap = await userRef.get();
    const existing = snap.data() || {};

    const updates: Record<string, any> = { githubToken };
    let tokensAwarded = 0;

    // Award 20 tokens on first GitHub connection
    if (!existing.githubRewardClaimed) {
      updates.githubRewardClaimed = true;
      updates.credits = FieldValue.increment(20);
      tokensAwarded = 20;
    }

    await userRef.update(updates);
    res.json({ success: true, tokensAwarded });
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
  const { repoName, files, prompt, githubToken } = req.body;
  
  if (!repoName || !files || !githubToken) {
    return res.status(400).json({ error: "Missing required parameters" });
  }

  try {
    // 1. Get the authenticated user's GitHub username
    const userRes = await fetch('https://api.github.com/user', {
      headers: { Authorization: `Bearer ${githubToken}`, Accept: 'application/vnd.github.v3+json' }
    });
    if (!userRes.ok) throw new Error("Invalid GitHub token");
    const userData = await userRes.json();
    const owner = userData.login; // e.g., "naqi-mim-archi"

    // 2. Check if the repository exists. If not, CREATE it.
    const repoCheckRes = await fetch(`https://api.github.com/repos/${owner}/${repoName}`, {
      headers: { Authorization: `Bearer ${githubToken}`, Accept: 'application/vnd.github.v3+json' }
    });

    if (repoCheckRes.status === 404) {
      // Repo doesn't exist, let's create it
      const createRes = await fetch('https://api.github.com/user/repos', {
        method: 'POST',
        headers: { Authorization: `Bearer ${githubToken}`, Accept: 'application/vnd.github.v3+json' },
        body: JSON.stringify({
          name: repoName,
          description: `Generated by GameBot AI: ${prompt ? prompt.substring(0, 100) + '...' : 'A custom game'}`,
          private: false,
          auto_init: true // Creates an initial commit so we can push files immediately
        })
      });
      
      if (!createRes.ok) {
        const errData = await createRes.json();
        throw new Error(`Failed to create repository: ${errData.message}`);
      }
      
      // Wait a tiny bit for GitHub to initialize the repo on their servers
      await new Promise(resolve => setTimeout(resolve, 1000));
    } else if (!repoCheckRes.ok) {
      throw new Error("Error checking repository status");
    }

    // 3. Upload or update the files
    // In our app, 'files' is an object like: { "index.html": "<html>...", "game.js": "..." }
    for (const [filePath, fileContent] of Object.entries(files)) {
      
      // First, we MUST check if the file already exists to get its 'sha'. 
      // GitHub requires the old file's sha if we are overwriting an existing file.
      let sha = undefined;
      const fileCheckRes = await fetch(`https://api.github.com/repos/${owner}/${repoName}/contents/${filePath}`, {
        headers: { Authorization: `Bearer ${githubToken}`, Accept: 'application/vnd.github.v3+json' }
      });
      
      if (fileCheckRes.ok) {
        const fileData = await fileCheckRes.json();
        sha = fileData.sha;
      }

      // Convert content to Base64 (Node.js way)
      const base64Content = Buffer.from(fileContent as string, 'utf-8').toString('base64');

      // Upload the file
      const uploadRes = await fetch(`https://api.github.com/repos/${owner}/${repoName}/contents/${filePath}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${githubToken}`, Accept: 'application/vnd.github.v3+json' },
        body: JSON.stringify({
          message: `GameBot Sync: ${filePath}`,
          content: base64Content,
          sha: sha // Include sha if overwriting, omit if new file
        })
      });

      if (!uploadRes.ok) {
        const errData = await uploadRes.json();
        console.error(`Failed to upload ${filePath}:`, errData);
        throw new Error(`Failed to upload ${filePath}: ${errData.message}`);
      }
    }

    // 4. Return the live repository URL to the frontend so the user can click it
    res.status(200).json({ 
      success: true, 
      repoUrl: `https://github.com/${owner}/${repoName}` 
    });

  } catch (error: any) {
    console.error("GitHub Sync Error:", error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// PROFILE UPDATE
// ============================================================

// POST /api/profile/update
// Updates displayName and/or photoURL in Firebase Auth + Firestore.
app.post('/api/profile/update', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing auth token.' });
  }

  const { displayName, photoURL } = req.body as { displayName?: string; photoURL?: string };

  try {
    const db = getFirebaseAdmin();
    if (!db) return res.status(500).json({ error: 'Database unavailable.' });

    const decoded = await getAuth().verifyIdToken(authHeader.slice(7));

    const updates: Record<string, string> = {};
    if (displayName !== undefined) updates.displayName = displayName;
    if (photoURL !== undefined) updates.photoURL = photoURL;

    await db.collection('users').doc(decoded.uid).update(updates);

    // Mirror into Firebase Auth user record
    await getAuth().updateUser(decoded.uid, {
      ...(displayName !== undefined ? { displayName } : {}),
      ...(photoURL !== undefined ? { photoURL } : {}),
    });

    res.json({ success: true });
  } catch (err: any) {
    console.error('[profile/update] Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// DISCORD OAUTH
// ============================================================

app.get('/api/auth/discord/url', (req, res) => {
  const redirectUri = `${process.env.APP_URL || 'http://localhost:3000'}/api/auth/discord/callback`;
  const params = new URLSearchParams({
    client_id: process.env.DISCORD_CLIENT_ID || '',
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'identify webhook.incoming',
  });
  res.json({ url: `https://discord.com/api/oauth2/authorize?${params.toString()}` });
});

app.get('/api/auth/discord/callback', async (req, res) => {
  const { code } = req.query;
  if (!code) return res.status(400).send('No code provided');

  try {
    const redirectUri = `${process.env.APP_URL || 'http://localhost:3000'}/api/auth/discord/callback`;

    const tokenRes = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.DISCORD_CLIENT_ID || '',
        client_secret: process.env.DISCORD_CLIENT_SECRET || '',
        grant_type: 'authorization_code',
        code: code as string,
        redirect_uri: redirectUri,
      }),
    });

    const tokenData = await tokenRes.json() as any;
    if (tokenData.error) throw new Error(tokenData.error_description || tokenData.error);

    const userRes = await fetch('https://discord.com/api/users/@me', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const discordUser = await userRes.json() as any;

    const avatarUrl = discordUser.avatar
      ? `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.png`
      : '';

    // webhook.incoming scope returns a webhook object with the channel webhook URL
    const webhookUrl = (tokenData.webhook as any)?.url || '';
    const channelName = (tokenData.webhook as any)?.name || '';

    const payload = JSON.stringify({
      type: 'DISCORD_AUTH_SUCCESS',
      discordId: discordUser.id,
      discordUsername: discordUser.username,
      discordAvatar: avatarUrl,
      discordWebhookUrl: webhookUrl,
      discordChannelName: channelName,
    });

    res.send(`<html><body><script>
      if(window.opener){window.opener.postMessage(${payload},'*');window.close();}
      else{document.body.textContent='Discord connected! You can close this window.';}
    </script></body></html>`);
  } catch (error: any) {
    console.error('Discord OAuth error:', error);
    res.status(500).send(`Discord authentication failed: ${error.message}`);
  }
});

// ============================================================
// STEAM OPENID
// ============================================================

app.get('/api/auth/steam/url', (req, res) => {
  const returnTo = `${process.env.APP_URL || 'http://localhost:3000'}/api/auth/steam/callback`;
  const realm = process.env.APP_URL || 'http://localhost:3000';
  const params = new URLSearchParams({
    'openid.ns': 'http://specs.openid.net/auth/2.0',
    'openid.mode': 'checkid_setup',
    'openid.return_to': returnTo,
    'openid.realm': realm,
    'openid.identity': 'http://specs.openid.net/auth/2.0/identifier_select',
    'openid.claimed_id': 'http://specs.openid.net/auth/2.0/identifier_select',
  });
  res.json({ url: `https://steamcommunity.com/openid/login?${params.toString()}` });
});

app.get('/api/auth/steam/callback', async (req, res) => {
  const claimedId = req.query['openid.claimed_id'] as string | undefined;

  if (!claimedId) {
    return res.status(400).send('No Steam ID provided');
  }

  // Extract 64-bit Steam ID from the claimed_id URL first
  const match = claimedId.match(/\/(\d+)$/);
  if (!match) {
    return res.status(400).send('Could not parse Steam ID from claimed_id');
  }
  const steamId = match[1];

  try {
    // Validate the assertion with Steam using the raw query string
    // (avoids encoding issues from Express query parsing)
    const rawQuery = req.url.split('?')[1] || '';
    const verifyBody = rawQuery.replace('openid.mode=id_res', 'openid.mode=check_authentication');

    const verifyRes = await fetch('https://steamcommunity.com/openid/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: verifyBody,
    });
    const verifyText = await verifyRes.text();
    console.log('[steam/callback] Steam verify response:', verifyText);

    if (!verifyText.includes('is_valid:true')) {
      throw new Error(`Steam validation failed. Response: ${verifyText}`);
    }

    // Fetch profile from public Steam community XML (no API key needed)
    let steamUsername = steamId;
    let steamAvatar = '';

    try {
      const profileRes = await fetch(
        `https://steamcommunity.com/profiles/${steamId}?xml=1`,
        { headers: { 'Accept-Language': 'en-US,en;q=0.9' } }
      );
      const profileXml = await profileRes.text();
      const nameMatch = profileXml.match(/<steamID><!\[CDATA\[(.*?)\]\]><\/steamID>/);
      const avatarMatch = profileXml.match(/<avatarFull><!\[CDATA\[(.*?)\]\]><\/avatarFull>/);
      if (nameMatch?.[1]) steamUsername = nameMatch[1];
      if (avatarMatch?.[1]) steamAvatar = avatarMatch[1];
    } catch {
      // Profile fetch failure is non-fatal — steamId still gets saved
    }

    // Also try Steam Web API if key is available
    if (process.env.STEAM_API_KEY) {
      try {
        const apiRes = await fetch(
          `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key=${process.env.STEAM_API_KEY}&steamids=${steamId}`
        );
        const apiData = await apiRes.json() as any;
        const player = apiData?.response?.players?.[0];
        if (player) {
          steamUsername = player.personaname;
          steamAvatar = player.avatarfull || player.avatar || '';
        }
      } catch { /* ignore */ }
    }

    const payload = JSON.stringify({
      type: 'STEAM_AUTH_SUCCESS',
      steamId,
      steamUsername,
      steamAvatar,
    });

    res.send(`<!DOCTYPE html><html><body>
      <p style="font-family:sans-serif;color:#aaa;padding:20px">Connecting Steam account...</p>
      <script>
        try {
          if(window.opener){
            window.opener.postMessage(${payload},'*');
            window.close();
          } else {
            document.body.innerHTML='<p style="font-family:sans-serif;padding:20px;color:#aaa">Steam connected! You can close this window.</p>';
          }
        } catch(e) {
          document.body.innerHTML='<p style="font-family:sans-serif;padding:20px;color:red">Error: '+e.message+'</p>';
        }
      </script>
    </body></html>`);
  } catch (error: any) {
    console.error('[steam/callback] Error:', error.message);
    res.send(`<!DOCTYPE html><html><body>
      <p style="font-family:sans-serif;padding:20px;color:red">Steam connection failed: ${error.message}</p>
      <p style="font-family:sans-serif;padding:0 20px;color:#aaa;font-size:14px">You can close this window and try again.</p>
    </body></html>`);
  }
});

// ============================================================
// STEAM LIBRARY — proxy the public Steam games XML feed
// ============================================================

// GET /api/steam/library?steamId=XXXXXXXX
// Returns the user's owned games sorted by hours played.
// Uses Steam's public XML endpoint — no API key required.
// The user's Steam profile must be set to Public.
app.get('/api/steam/library', async (req, res) => {
  const { steamId } = req.query as { steamId?: string };
  if (!steamId || !/^\d+$/.test(steamId)) {
    return res.status(400).json({ error: 'Valid steamId is required.' });
  }

  try {
    const STEAM_KEY = process.env.STEAM_API_KEY;
    let games: { appId: string; name: string; hours: number; headerImage: string }[] = [];

    // ── Strategy 1: Steam Web API (most reliable, requires API key) ──────────
    if (STEAM_KEY) {
      const apiRes = await fetch(
        `https://api.steampowered.com/IPlayerService/GetOwnedGames/v0001/?key=${STEAM_KEY}&steamid=${steamId}&include_appinfo=1&include_played_free_games=1&format=json`
      );
      if (apiRes.ok) {
        const apiData = await apiRes.json();
        const apiGames = apiData?.response?.games ?? [];
        if (apiGames.length > 0) {
          games = apiGames.map((g: any) => ({
            appId: String(g.appid),
            name: g.name || `App ${g.appid}`,
            hours: Math.round((g.playtime_forever ?? 0) / 60 * 10) / 10,
            headerImage: `https://cdn.cloudflare.steamstatic.com/steam/apps/${g.appid}/header.jpg`,
          }));
          games.sort((a, b) => b.hours - a.hours);
          return res.json({ games, total: games.length, source: 'api' });
        }
        // If games array is empty, profile may be private — fall through to XML
      }
    }

    // ── Strategy 2: Public XML feed (no API key, needs public profile) ───────
    const xmlRes = await fetch(
      `https://steamcommunity.com/profiles/${steamId}/games?xml=1&tab=all`,
      { headers: { 'Accept-Language': 'en-US,en;q=0.9', 'User-Agent': 'Mozilla/5.0' } }
    );
    const xml = await xmlRes.text();

    console.log('[steam/library] XML preview:', xml.slice(0, 300));

    // Detect private profile or HTML response (login redirect)
    if (
      xml.includes('<error>') ||
      xml.includes('This profile is private') ||
      xml.includes('<!DOCTYPE html') ||
      xml.includes('<html')
    ) {
      return res.status(403).json({
        error: 'Your Steam game list is private. Go to Steam → Settings → Privacy → Game Details → set to Public.',
      });
    }

    // Parse game entries — handle both CDATA names and plain text names
    const gameBlocks = [...xml.matchAll(/<game>([\s\S]*?)<\/game>/g)];

    for (const match of gameBlocks) {
      const g = match[1];
      const appId = g.match(/<appID>(\d+)<\/appID>/)?.[1];
      const name =
        g.match(/<name><!\[CDATA\[(.*?)\]\]><\/name>/)?.[1] ??
        g.match(/<name>(.*?)<\/name>/)?.[1];
      // hoursOnRecord = recent play, hoursForever = total — prefer total
      const hoursRaw =
        g.match(/<hoursForever>([\d,.]+)<\/hoursForever>/)?.[1] ??
        g.match(/<hoursOnRecord>([\d,.]+)<\/hoursOnRecord>/)?.[1] ??
        '0';
      const hours = parseFloat(hoursRaw.replace(/,/g, '')) || 0;

      if (appId && name) {
        games.push({
          appId,
          name,
          hours,
          headerImage: `https://cdn.cloudflare.steamstatic.com/steam/apps/${appId}/header.jpg`,
        });
      }
    }

    if (games.length === 0 && xml.includes('<gamesList>')) {
      // Profile is public but game list is private or empty
      return res.status(403).json({
        error: 'Your Steam game list is private. Go to Steam → Settings → Privacy → Game Details → set to Public.',
      });
    }

    games.sort((a, b) => b.hours - a.hours);
    res.json({ games, total: games.length, source: 'xml' });

  } catch (err: any) {
    console.error('[steam/library] Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// PLATFORM CONNECT — server-side save + one-time token reward
// ============================================================

const CONNECT_REWARD = 20;

async function awardConnectionReward(
  db: Firestore,
  uid: string,
  rewardField: string,
  dataUpdates: Record<string, any>
): Promise<number> {
  const userRef = db.collection('users').doc(uid);
  const snap = await userRef.get();
  const existing = snap.data() || {};

  const updates: Record<string, any> = { ...dataUpdates };
  let tokensAwarded = 0;

  if (!existing[rewardField]) {
    updates[rewardField] = true;
    updates.credits = FieldValue.increment(CONNECT_REWARD);
    tokensAwarded = CONNECT_REWARD;
  }

  await userRef.update(updates);
  return tokensAwarded;
}

// POST /api/profile/discord/connect
app.post('/api/profile/discord/connect', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return res.status(401).json({ error: 'Missing auth token.' });

  const { discordId, discordUsername, discordAvatar, discordWebhookUrl } = req.body;
  if (!discordId) return res.status(400).json({ error: 'discordId is required.' });

  try {
    const db = getFirebaseAdmin();
    if (!db) return res.status(500).json({ error: 'Database unavailable.' });
    const decoded = await getAuth().verifyIdToken(authHeader.slice(7));

    const tokensAwarded = await awardConnectionReward(db, decoded.uid, 'discordRewardClaimed', {
      discordId,
      discordUsername: discordUsername || '',
      discordAvatar: discordAvatar || '',
      discordWebhookUrl: discordWebhookUrl || '',
    });

    res.json({ success: true, tokensAwarded });
  } catch (err: any) {
    console.error('[discord/connect] Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/profile/steam/connect
app.post('/api/profile/steam/connect', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return res.status(401).json({ error: 'Missing auth token.' });

  const { steamId, steamUsername, steamAvatar } = req.body;
  if (!steamId) return res.status(400).json({ error: 'steamId is required.' });

  try {
    const db = getFirebaseAdmin();
    if (!db) return res.status(500).json({ error: 'Database unavailable.' });
    const decoded = await getAuth().verifyIdToken(authHeader.slice(7));

    const tokensAwarded = await awardConnectionReward(db, decoded.uid, 'steamRewardClaimed', {
      steamId,
      steamUsername: steamUsername || '',
      steamAvatar: steamAvatar || '',
    });

    res.json({ success: true, tokensAwarded });
  } catch (err: any) {
    console.error('[steam/connect] Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// DISCORD SHARE — post game embed to channel via webhook
// ============================================================

// POST /api/discord/share
// Add to api/index.ts
app.post('/api/discord/share', async (req, res) => {
  const { webhookUrl, gameName, message, gameId } = req.body;

  if (!webhookUrl || !gameName) {
    return res.status(400).json({ error: "Missing required parameters" });
  }

  try {
    const playUrl = gameId ? `https://gamebot.studio/play/${gameId}` : null;
    const embed: Record<string, any> = {
      title: "🎮 " + gameName,
      description: message || null,
      color: 0x10B981,
      footer: { text: "Generated by GameBot AI" },
      timestamp: new Date().toISOString()
    };
    if (playUrl) {
      embed.url = playUrl;
      embed.fields = [{ name: "Play Now", value: `[Click here to play!](${playUrl})` }];
    }

    // Send to the Webhook URL we got during OAuth
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: "Check out this new game I just generated with AI!",
        embeds: [embed]
      })
    });

    if (!response.ok) {
      throw new Error("Discord rejected the webhook. The channel might have been deleted.");
    }
    
    res.json({ success: true });
  } catch (error: any) {
    console.error("Discord Share Error:", error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// CREATIVE KICKOFF — Fast lightweight plan for UI display only
// ============================================================

const KICKOFF_MODEL = process.env.GEMINI_MODEL || 'gemini-3-flash-preview';

app.post('/api/plan/kickoff', async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt) return res.status(400).json({ error: 'Prompt is required.' });

    const geminiKey = process.env.GEMINI_API_KEY;
    if (!geminiKey) throw new Error('GEMINI_API_KEY is not configured on the server.');

    const ai = new GoogleGenAI({ apiKey: geminiKey });

    const response = await ai.models.generateContent({
      model: KICKOFF_MODEL,
      contents: [{ role: 'user', parts: [{ text: `Game idea: "${prompt}"` }] }],
      config: {
        systemInstruction: `You analyze game ideas and return a JSON plan. Return ONLY valid JSON, no markdown, no code fences.
JSON format:
{
  "aiMessage": "2 sentence enthusiastic response about what you will build",
  "summary": "1 paragraph describing the game concept clearly",
  "highlights": ["key feature 1", "key feature 2", "key feature 3", "key feature 4", "key feature 5"],
  "setup": {
    "dimension": "2D or 3D",
    "platform": "desktop or mobile or both",
    "players": "single or multi"
  }
}`,
        temperature: 0.7,
        responseMimeType: 'application/json',
      },
    });

    let text = (response.text || '').trim();
    if (text.startsWith('```')) {
      text = text.replace(/^```[a-z]*\n?/, '').replace(/\n?```$/, '');
    }

    const parsed = JSON.parse(text);
    res.json(parsed);
  } catch (err: any) {
    console.error('[plan/kickoff] Error:', err.message, err.stack);
    res.status(500).json({ error: err.message || 'Failed to analyze game idea.' });
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
11. SAFE CDN ONLY: Only use these verified CDN URLs — do NOT invent or guess library URLs:
    - Three.js: https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js
    - Phaser 3: https://cdnjs.cloudflare.com/ajax/libs/phaser/3.60.0/phaser.min.js
    - Never load postprocessing, ammo.js, cannon.js, or other physics/fx libraries via CDN — use canvas-native solutions instead.
12. NO RAW BASE64 IN JS: Never place a raw base64 or SVG string as a bare JS identifier. Always wrap data URIs and base64 strings inside a quoted string literal or template literal.
    WRONG:  var img = new Image(); img.src = data:image/png;base64,iVBOR...
    RIGHT:  var img = new Image(); img.src = 'data:image/png;base64,iVBOR...';
13. CHESS / BOARD GAMES: Draw pieces using canvas 2D API (fillText with Unicode ♔♕♖♗♘♙♚♛♜♝♞♟, or simple geometric shapes). Do NOT use SVG files or external image assets.

Return ONLY the raw JSON object. No explanations, no markdown formatting.`;

const MULTIPLAYER_ADDON = `

=== MULTIPLAYER MODE SELECT — MANDATORY ===

The game MUST support both Local and Online multiplayer.
Show a mode-select overlay at startup. Use an HTML <div> overlay — do NOT hide or delay canvas initialisation.

STRUCTURE (copy this pattern exactly):

HTML in <body> — add this BEFORE the <canvas>:
  <div id="modeOverlay" style="position:fixed;inset:0;z-index:999;background:#111;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:20px;font-family:sans-serif;">
    <h2 style="color:#fff;font-size:1.6rem;margin:0">Choose Mode</h2>
    <button id="btnLocal"  style="padding:14px 40px;font-size:1.1rem;border-radius:12px;border:none;background:#22c55e;color:#000;cursor:pointer;font-weight:700">🎮 Local Multiplayer</button>
    <button id="btnOnline" style="padding:14px 40px;font-size:1.1rem;border-radius:12px;border:none;background:#8b5cf6;color:#fff;cursor:pointer;font-weight:700">🌐 Online Multiplayer</button>
    <p id="waitMsg" style="color:#aaa;font-size:0.9rem;display:none">Waiting for opponent…</p>
  </div>

JavaScript — add this block (do NOT change your game logic, just add this wrapper):

  var gameMode = null;

  document.getElementById('btnLocal').onclick = function() {
    gameMode = 'local';
    document.getElementById('modeOverlay').style.display = 'none';
    initGame();   // ← call whatever starts your game loop
  };

  document.getElementById('btnOnline').onclick = function() {
    gameMode = 'online';
    document.getElementById('btnLocal').style.display   = 'none';
    document.getElementById('btnOnline').style.display  = 'none';
    document.getElementById('waitMsg').style.display    = 'block';
    window.parent.postMessage({ type: 'MP_GAME_LOADED' }, '*');
  };

  // Online: listen for go-signal and opponent state
  window.addEventListener('message', function(e) {
    if (!e.data) return;
    if (e.data.type === 'MP_INIT') {
      document.getElementById('modeOverlay').style.display = 'none';
      initGame(e.data.playerIndex);  // playerIndex: 0 = host/P1, 1 = guest/P2
    }
    if (e.data.type === 'MP_RECV') {
      applyOpponentState(e.data.data);
    }
  });

  // Call this each frame to send your state to the opponent (online only)
  function sendState(data) {
    if (gameMode === 'online') window.parent.postMessage({ type: 'MP_SEND', data: data }, '*');
  }

RULES:
- Canvas MUST be created and sized normally — the overlay sits on top of it, not instead of it.
- initGame() MUST NOT be called until a button is clicked. The game loop does not start at page load.
- Local mode: both players share one keyboard (P1: WASD, P2: Arrow keys — or split as appropriate for the game type).
- Online mode: Player 0 owns all physics and broadcasts full game state every frame via sendState(). Player 1 applies received state via applyOpponentState() and sends only their own inputs.
- NEVER call initGame() automatically on page load. NEVER default to online-only.
=== END MULTIPLAYER ===
`;

function isMultiplayerPrompt(prompt: string): boolean {
  const lower = prompt.toLowerCase();
  return lower.includes('multiplayer') || lower.includes('2 player') || lower.includes('two player') ||
    lower.includes('2-player') || lower.includes('pvp') || lower.includes('co-op') ||
    lower.includes('coop') || lower.includes('versus') || lower.includes('vs another') ||
    lower.includes('with a friend') || lower.includes('online') || lower.includes('local multiplayer');
}

const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const GEMINI_MODEL_DETAILED = process.env.GEMINI_MODEL_DETAILED || "gemini-2.5-pro";

const SYSTEM_INSTRUCTION_DETAILED = `You are an elite game developer with a strong eye for visual design and game feel.
Your task is to create an exceptionally polished, visually stunning browser game.

Requirements:
1. Generate a multi-file project structure (e.g., index.html, src/main.js, styles/style.css).
2. Use HTML5 Canvas. For complex 3D scenes, include Three.js via CDN.
3. The output MUST be a valid JSON object where keys are file paths and values are the file contents as strings.
4. The game MUST be full-screen. The canvas should fill the entire window. Handle window resize events to update canvas dimensions dynamically.
5. VISUAL EXCELLENCE: Rich particle systems, smooth tweened animations, screen shake on impact, glowing neon effects, gradient fills, dynamic shadows and lighting where feasible. Every action should have a visible reaction.
6. GAME FEEL: Satisfying audio feedback using Web Audio API (synthesised sounds — no external files), responsive controls with input buffering, clear visual feedback for every player action. Aim for 60fps.
7. POLISH: Animated title/loading screen, pause menu (Escape key), high score / best time persistence via localStorage, animated UI transitions and score pop-ups.
8. Use relative paths to link CSS and JS files (e.g., <script src="src/main.js"></script>). NO ES modules — all JS must be loaded via <script> tags so files can be inlined for preview.
9. IMPORTANT: canvas appended to document.body; body must have margin:0 and overflow:hidden.
10. Aim for production-quality architecture: clean separation of game logic, renderer, and UI; optimised render loops; no memory leaks.
11. SAFE CDN ONLY: Only use these verified CDN URLs:
    - Three.js: https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js
    - Phaser 3: https://cdnjs.cloudflare.com/ajax/libs/phaser/3.60.0/phaser.min.js
    - Never load postprocessing, ammo.js, cannon.js, or other physics/fx libraries via CDN — implement effects with canvas/Web Audio natively.
12. NO RAW BASE64 IN JS: Always wrap data URIs and base64 strings inside a quoted string or template literal. Never use a base64 string as a bare JS identifier.
13. CHESS / BOARD GAMES: Draw pieces using fillText with Unicode chess symbols (♔♕♖♗♘♙♚♛♜♝♞♟) styled with canvas font. Do not use SVG or external images.

Take your time to build something truly impressive. Return ONLY the raw JSON object. No explanations, no markdown.`;

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
    } catch (authErr: any) {
      // Only hard-reject on explicit auth errors (bad token format, revoked, etc.)
      // Network/admin-init errors should fall through and treat as guest
      const code = authErr?.errorInfo?.code || authErr?.code || '';
      const isAuthError = code.startsWith('auth/') ||
        authErr?.message?.includes('Firebase ID token') ||
        authErr?.message?.includes('invalid-argument');
      if (isAuthError) {
        return res.status(401).json({ error: 'Invalid or expired auth token.' });
      }
      // Otherwise: admin SDK unavailable or network issue — proceed as guest
      console.warn('[generate] Token verification failed (non-auth reason), proceeding as guest:', authErr?.message);
      userId = null;
    }
  }

  const { prompt, previousFiles, files: attachments, mode } = req.body;

  if (!prompt && (!attachments || attachments.length === 0)) {
    return res.status(400).json({ error: 'Prompt is required.' });
  }

  const isRevision = previousFiles && Object.keys(previousFiles).length > 0;
  const isDetailed = mode === 'detailed';
  const cost = isRevision ? 1 : (isDetailed ? 7 : 3);

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

  // Heartbeat every 5s — Vercel's edge proxy and CDN drop idle SSE connections
  // after ~10s of silence (common during gemini-2.5-pro's thinking phase before
  // it begins streaming tokens). SSE comment lines (': ping') are invisible to
  // the client but keep the TCP connection alive through all proxy layers.
  const heartbeat = setInterval(() => {
    if (!res.writableEnded) res.write(': ping\n\n');
  }, 5000);

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

    const baseInstruction = isDetailed ? SYSTEM_INSTRUCTION_DETAILED : SYSTEM_INSTRUCTION;
    const fullSystemInstruction = isMultiplayerPrompt(prompt)
      ? baseInstruction + MULTIPLAYER_ADDON
      : baseInstruction;

    const modelName = isDetailed ? GEMINI_MODEL_DETAILED : GEMINI_MODEL;

    const responseStream = await ai.models.generateContentStream({
      model: modelName,
      contents: [{ role: 'user', parts }],
      config: {
        systemInstruction: fullSystemInstruction,
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
    clearInterval(heartbeat);
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
