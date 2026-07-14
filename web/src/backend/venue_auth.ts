import type { Context, Next } from "hono";

export async function hashAPIKey(rawToken: string) {
  const encoder = new TextEncoder();
  const tokenBuffer = encoder.encode(rawToken);
  const hashBuffer = await crypto.subtle.digest('SHA-256', tokenBuffer);

  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function generateApiKey() {
  const randomBytes = new Uint8Array(32);
  crypto.getRandomValues(randomBytes);

  const randomHex = Array.from(randomBytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  const rawKey = `venue_none_${randomHex}`;

  return { rawKey, hashedKey: await hashAPIKey(rawKey) };
}

export default async function authVenue(c: Context, next: Next) {
  let key = c.req.header("Authorization");
  if (!key || !key.startsWith("Bearer ")) return c.json({ "msg": "unauthorized" }, 401);
  key = key.slice(7);

  const venue = (await c.env.DB.prepare("select * from venues where hash_api_token = ?").bind(await hashAPIKey(key)).first());

  if (!venue) return c.json({ "msg": "venue not found" }, 400);
  c["env"]["venue"] = venue;
  await next();
}

