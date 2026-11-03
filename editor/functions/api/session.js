import { sessionResponse } from '../_lib/auth.js';

export function onRequestGet({ request, env }) {
  return sessionResponse(request, env);
}
