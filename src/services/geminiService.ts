// src/services/geminiService.ts

import { getAuth } from "firebase/auth";

// ================= TYPES =================

export type FileSystem = {
  [path: string]: string;
};

export type FileAttachment = {
  name: string;
  mimeType: string;
  data: string; // base64
};

// ================= PROMPT ENHANCER =================

export type EnhanceQuestion = {
  id: string;
  question: string;
  placeholder: string;
};

export async function getEnhanceQuestions(prompt: string): Promise<EnhanceQuestion[]> {
  const response = await fetch('/api/enhance/questions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt }),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to generate questions');
  }
  const data = await response.json();
  return data.questions || [];
}

export async function finalizeEnhancedPrompt(
  prompt: string,
  answers: Record<string, string>
): Promise<string> {
  const response = await fetch('/api/enhance/finalize', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, answers }),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to finalize prompt');
  }
  const data = await response.json();
  return data.enhanced || prompt;
}

// ================= STREAMING =================

export async function* generateGameCodeStream(
  prompt: string,
  previousFiles?: FileSystem,
  files?: FileAttachment[],
  signal?: AbortSignal,
  mode?: 'quick' | 'detailed'
): AsyncGenerator<string | FileSystem, void, unknown> {

  const auth = getAuth();
  const user = auth.currentUser;

  // Build headers — include auth token if logged in, skip if guest
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (user) {
    try {
      const token = await user.getIdToken(true);
      headers['Authorization'] = `Bearer ${token}`;
    } catch {
      // Token refresh failed (network issue, expired session) — proceed as guest
      console.warn('[gemini] Failed to get ID token, proceeding without auth header');
    }
  }

  const response = await fetch('/api/generate/stream', {
    method: 'POST',
    headers,
    body: JSON.stringify({ prompt, previousFiles, files, mode }),
    signal,
  });

  if (response.status === 402) {
    throw new Error('INSUFFICIENT_CREDITS');
  }

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Generation failed');
  }

  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  let receivedFiles = false;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;

      try {
        const event = JSON.parse(line.slice(6));

        if (event.type === 'chunk') {
          yield event.text;
        }
        else if (event.type === 'files') {
          receivedFiles = true;
          yield event.files;
        }
        else if (event.type === 'error') {
          throw new Error(event.message || 'Generation error');
        }

      } catch (e: any) {
        // Re-throw real errors (from the block above), ignore malformed SSE lines
        if (e?.message && !e.message.startsWith('Unexpected token')) throw e;
      }
    }
  }

  // Stream ended without a files event — most likely a Vercel function timeout
  // or the proxy dropped the connection. Throw a descriptive error instead of
  // silently returning, which would cause a misleading "No files generated" message.
  if (!receivedFiles) {
    throw new Error('Generation timed out before completing. Try Quick mode or a simpler prompt.');
  }
}

// ================= NON-STREAM =================

export async function generateGameCode(
  prompt: string,
  previousFiles?: FileSystem,
  files?: FileAttachment[],
  signal?: AbortSignal
): Promise<FileSystem> {

  let result: FileSystem | null = null;

  for await (const chunk of generateGameCodeStream(prompt, previousFiles, files, signal)) {
    if (typeof chunk !== 'string') {
      result = chunk;
    }
  }

  if (!result) throw new Error('No files generated');
  return result;
}

// ================= PREVIEW =================

export function bundleForPreview(files: FileSystem): string {
  let html = files['index.html'] || files['/index.html'] || '';

  if (!html) {
    const firstHtmlKey = Object.keys(files).find(k => k.endsWith('.html'));
    if (firstHtmlKey) {
      html = files[firstHtmlKey];
    } else {
      return '<h1>No index.html found</h1>';
    }
  }

  const injection = `
    <style>
      html, body { margin: 0; padding: 0; width: 100%; height: 100%; overflow: hidden; }
      canvas { display: block; width: 100%; height: 100%; touch-action: none; }
    </style>
    <script>
      window.onerror = function(msg, url, line, col, error) {
        console.error("Game Error:", msg, "\\nURL:", url, "\\nLine:", line);
      };
    </script>
  `;

  if (html.includes('</head>')) {
    html = html.replace('</head>', `${injection}</head>`);
  } else {
    html = injection + html;
  }

  // Helper: look up a file by path, trying multiple path variants
  const lookupFile = (path: string): string | undefined => {
    const clean = path.replace(/^\.\//, '').replace(/^\//, '');
    return files[clean] || files['./' + clean] || files['/' + clean];
  };

  // Inline CSS
  html = html.replace(/<link\s+[^>]*href=["']([^"']+)["'][^>]*>/gi, (match, href) => {
    const content = lookupFile(href);
    if (content) return `<style>${content}</style>`;
    return match;
  });

  // Inline JS
  html = html.replace(/<script\s+([^>]*)src=["']([^"']+)["']([^>]*)><\/script>/gi,
    (match, before, src, after) => {
      const content = lookupFile(src);
      if (content) {
        return `<script ${before} ${after}>${content}</script>`;
      }
      return match;
    });

  return html;
}