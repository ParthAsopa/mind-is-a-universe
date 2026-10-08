export function requireEditor(request, env) {
  const authenticated = request.headers.get('CF-Access-Authenticated') === 'true';
  const email = request.headers.get('CF-Access-Authenticated-User-Email');
  if (!authenticated || (env.EDITOR_EMAIL && email !== env.EDITOR_EMAIL)) {
    return new Response(JSON.stringify({ error: 'Authentication required.' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  return null;
}
