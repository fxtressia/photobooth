import { getUser } from "@auth0/auth0-hono";
import type { Context } from "hono";

export async function adminConfigFeed(c: Context){
    return {}
}
export async function adminTiersFeed(c: Context){
    return {}
}
export async function adminVenuesFeed(c: Context){
    
    const venues = (await c.env.DB.prepare("select * from venues").all()).results;
    return c.json({ venues: venues.map((c) => {
        return {
            ...c,
            hash_api_token: undefined,
        };
    })});
}
export  async function adminSessionsFeed(c: Context) {
    const user = getUser(c);
    const sessions = (await c.env.DB.prepare("select * from sessions").all()).results;
    const authorized = [];
    const pending = [];
    const finished = [];
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