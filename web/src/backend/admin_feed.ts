import { getUser } from "@auth0/auth0-hono";
import type { Context } from "hono";

export default async function adminFeed(c: Context) {
    const user = getUser(c);
    const sessions = (await c.env.DB.prepare("select * from sessions").all()).results;
    let authorized = [];
    let pending = [];
    let finished = [];
    //console.log(sessions);
    for (const key in sessions) {
        const session = sessions[key];
        if (session.authorized == 2) { 
            finished.push(session);
        } else if (session.authorized) {
            authorized.push(session);
        } else {
            pending.push(session);
        }
        sessions[key] = null;
    }

    return c.json({
        id: user.sub, sessions: {
            authorized, pending, finished
        }
    });
}