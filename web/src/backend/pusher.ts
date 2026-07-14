import { createMiddleware } from 'hono/factory';
import crypto from "node:crypto";
const verifyPusherWebhook = createMiddleware(async (c, next) => {
    console.log("pusher webhook");
    const signature = c.req.header('X-Pusher-Signature');
    const bodyText = await c.req.raw.clone().text();
    const expectedSignature = crypto
        .createHmac('sha256', process.env.PUSHER_APP_SECRET)
        .update(bodyText)
        .digest('hex');
    if (signature !== expectedSignature) {
        return c.text("Unauthorized", 401);
    }
    await next();
})

export default verifyPusherWebhook;