const SESSION_COOKIE = 'editor_session';
const SESSION_MAX_AGE = 60 * 60 * 24;

function base64UrlEncode(value) {
  let binary = '';
  const bytes = typeof value === 'string' ? new TextEncoder().encode(value) : value;
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlDecode(value) {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((value.length + 3) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

async function signingKey(env) {
  if (!env.EDITOR_PASSWORD) throw new Error('Missing editor configuration: EDITOR_PASSWORD');
  return crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(env.EDITOR_PASSWORD),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
}

async function sign(value, env) {
  const signature = await crypto.subtle.sign('HMAC', await signingKey(env), new TextEncoder().encode(value));
  return base64UrlEncode(new Uint8Array(signature));
}

function constantTimeEqual(left, right) {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) difference |= left[index] ^ right[index];
  return difference === 0;
}

async function passwordMatches(supplied, env) {
  if (!env.EDITOR_PASSWORD || typeof supplied !== 'string') return false;
  const encoder = new TextEncoder();
  const [expected, actual] = await Promise.all([
    crypto.subtle.digest('SHA-256', encoder.encode(env.EDITOR_PASSWORD)),
    crypto.subtle.digest('SHA-256', encoder.encode(supplied)),
  ]);
  return constantTimeEqual(new Uint8Array(expected), new Uint8Array(actual));
}

function cookieValue(request) {
  const cookies = (request.headers.get('Cookie') || '').split(';');
  for (const cookie of cookies) {
    const separator = cookie.indexOf('=');
    if (separator < 0) continue;
    if (cookie.slice(0, separator).trim() === SESSION_COOKIE) return cookie.slice(separator + 1).trim();
  }
  return null;
}

async function validSession(request, env) {
  const token = cookieValue(request);
  if (!token) return false;
  const separator = token.lastIndexOf('.');
  if (separator < 0) return false;
  const encodedPayload = token.slice(0, separator);
  const suppliedSignature = token.slice(separator + 1);
  let payload;
  try {
    payload = JSON.parse(new TextDecoder().decode(base64UrlDecode(encodedPayload)));
  } catch {
    return false;
  }
  if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) return false;
  const expectedSignature = await sign(encodedPayload, env);
  return constantTimeEqual(new TextEncoder().encode(suppliedSignature), new TextEncoder().encode(expectedSignature));
}

function cookieHeader(request, token, maxAge) {
  const secure = new URL(request.url).protocol === 'https:' ? '; Secure' : '';
  return `${SESSION_COOKIE}=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${maxAge}${secure}`;
}

export async function requireEditor(request, env) {
  if (await validSession(request, env)) return null;
  return new Response(JSON.stringify({ error: 'Authentication required.' }), {
    status: 401,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}

export async function sessionResponse(request, env) {
  return Response.json({ authenticated: await validSession(request, env) }, {
    headers: { 'Cache-Control': 'no-store' },
  });
}

export async function login(request, env) {
  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid login request.' }, { status: 400 });
  }
  if (!(await passwordMatches(body.password, env))) {
    return Response.json({ error: 'That password does not match.' }, { status: 401 });
  }
  const payload = base64UrlEncode(JSON.stringify({
    exp: Math.floor(Date.now() / 1000) + SESSION_MAX_AGE,
    nonce: base64UrlEncode(crypto.getRandomValues(new Uint8Array(18))),
  }));
  const token = `${payload}.${await sign(payload, env)}`;
  return new Response(JSON.stringify({ authenticated: true }), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'Set-Cookie': cookieHeader(request, token, SESSION_MAX_AGE),
    },
  });
}

export function logout(request) {
  return new Response('{}', {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'Set-Cookie': cookieHeader(request, '', 0),
    },
  });
}
