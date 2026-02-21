/**
 * ChatGPT OAuth 2.0 PKCE — browser flow.
 * ported from VibeRobot (using official Codex CLI OAuth client).
 */

const AUTHORIZE_URL = "https://auth.openai.com/oauth/authorize";
const TOKEN_URL = "https://auth.openai.com/oauth/token";
const CLIENT_ID = "app_EMoamEEZ73f0CkXaXp7hrann";
const REDIRECT_URI = "http://localhost:1455/auth/callback";
// `api.model.read` is required for /v1/models catalog lookup.
const SCOPE = "openid profile email offline_access api.model.read";

const STORAGE_KEY = "benchmark_oauth";
const PKCE_KEY = "benchmark_pkce";

export interface OAuthTokens {
  access_token: string;
  refresh_token: string;
  expires_at: number; // unix ms
  account_id: string;
  plan_type: string;
}

export interface AuthStatus {
  authenticated: boolean;
  plan?: string;
  account_id?: string;
  message?: string;
}

export interface PKCEFlow {
  authUrl: string;
  verifier: string;
  state: string;
}

function base64url(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let str = "";
  bytes.forEach((b) => (str += String.fromCharCode(b)));
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function generatePKCE() {
  const raw = new Uint8Array(32);
  crypto.getRandomValues(raw);
  const verifier = base64url(raw);
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(verifier)
  );
  const challenge = base64url(digest);
  return { verifier, challenge };
}

function decodeJwtPayload(token: string): Record<string, unknown> {
  try {
    const parts = token.split(".");
    if (parts.length < 2) return {};
    let b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    while (b64.length % 4) b64 += "=";
    return JSON.parse(atob(b64));
  } catch {
    return {};
  }
}

export function loadTokens(): OAuthTokens | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const tokens: OAuthTokens = JSON.parse(raw);
    if (Date.now() >= tokens.expires_at - 300_000) return null;
    return tokens;
  } catch {
    return null;
  }
}

function saveTokens(tokens: OAuthTokens) {
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tokens));
  }
}

export function clearTokens() {
  if (typeof window !== "undefined") {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(PKCE_KEY);
  }
}

export function getAuthStatus(): AuthStatus {
  const tokens = loadTokens();
  if (!tokens) return { authenticated: false };
  return {
    authenticated: true,
    plan: tokens.plan_type || "connected",
    account_id: tokens.account_id
      ? tokens.account_id.slice(0, 8) + "..."
      : "",
  };
}

export async function createAuthFlow(): Promise<PKCEFlow> {
  const { verifier, challenge } = await generatePKCE();
  const stateBytes = new Uint8Array(16);
  crypto.getRandomValues(stateBytes);
  const state = base64url(stateBytes);

  const params = new URLSearchParams({
    response_type: "code",
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    scope: SCOPE,
    code_challenge: challenge,
    code_challenge_method: "S256",
    state,
    audience: "https://api.openai.com/v1",
  });

  const authUrl = `${AUTHORIZE_URL}?${params}`;

  if (typeof window !== "undefined") {
    localStorage.setItem(PKCE_KEY, JSON.stringify({ verifier, state }));
  }

  return { authUrl, verifier, state };
}

export async function exchangeCode(code: string): Promise<OAuthTokens> {
  const pkceRaw = localStorage.getItem(PKCE_KEY);
  if (!pkceRaw) throw new Error("Auth session expired. Please try again.");
  const { verifier } = JSON.parse(pkceRaw);

  const resp = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      client_id: CLIENT_ID,
      code,
      code_verifier: verifier,
      redirect_uri: REDIRECT_URI,
    }),
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Token exchange failed (${resp.status}): ${text}`);
  }

  const data = await resp.json();
  if (!data.access_token || !data.refresh_token) {
    throw new Error("Invalid token response");
  }

  const claims = decodeJwtPayload(data.access_token);
  const authInfo = (claims["https://api.openai.com/auth"] || {}) as Record<string, string>;

  const tokens: OAuthTokens = {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: Date.now() + (data.expires_in || 86400) * 1000,
    account_id: authInfo.chatgpt_account_id || "",
    plan_type: authInfo.chatgpt_plan_type || "",
  };

  saveTokens(tokens);
  localStorage.removeItem(PKCE_KEY);
  return tokens;
}

export async function refreshAccessToken(): Promise<OAuthTokens | null> {
  const tokens = loadTokens();
  if (!tokens?.refresh_token) return null;

  try {
    const resp = await fetch(TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        client_id: CLIENT_ID,
        refresh_token: tokens.refresh_token,
      }),
    });

    if (!resp.ok) {
      clearTokens();
      return null;
    }

    const data = await resp.json();
    const newTokens: OAuthTokens = {
      ...tokens,
      access_token: data.access_token as string,
      refresh_token: (data.refresh_token as string) || tokens.refresh_token,
      expires_at: Date.now() + ((data.expires_in as number) || 86400) * 1000,
    };

    saveTokens(newTokens);
    return newTokens;
  } catch {
    return null;
  }
}
