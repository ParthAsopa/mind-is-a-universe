import { logout } from '../_lib/auth.js';

export function onRequestPost({ request }) {
  return logout(request);
}
