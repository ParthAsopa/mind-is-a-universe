import { login } from '../_lib/auth.js';

export function onRequestPost({ request, env }) {
  return login(request, env);
}
