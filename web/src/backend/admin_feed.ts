import { getUser } from "@auth0/auth0-hono";
import type { Context } from "hono";

export default async function adminFeed(c: Context){
    const user = getUser(c);
    const sessions = (await c.env.DB.prepare("select * from sessions").all()).results;
    let authorized = [];
    let pending = [];
    //console.log(sessions);
    for (const session of sessions){
        if (session.authorized){
            authorized.push(session);
        } else {
            pending.push(session);
        }
    }
    return c.json({ id: user.sub, sessions: {
        authorized, pending
    } });
}