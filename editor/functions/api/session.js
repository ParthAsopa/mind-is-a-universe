import { requireEditor } from '../_lib/auth.js';

export function onRequestGet({ request, env }) {
  return requireEditor(request, env) || Response.json({ authenticated: true });
}
