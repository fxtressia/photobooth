import { getUser } from "@auth0/auth0-hono";
import type { Context } from "hono";
import { admins } from "~/config";

export default async function homeFeed(c: Context) {
  let user = undefined;
  try {
  user = getUser(c);
  } catch (e){
    if ((e instanceof Error && e.message == "Missing session")){
      return {};
    } else {
      throw e;
    }
  }
  if(user == undefined){
    throw Error("User can't be undefined! See home_feed.ts");
  }
  const designs = (await c.env.DB.prepare("select * from designs where user_auth0_id = ?").bind(user.sub).all()).results;
  const sessions = (await c.env.DB.prepare("select * from sessions where user_auth0_id = ?").bind(user.sub).all()).results;

  return c.json({ sub: user.sub, admin: admins.includes(user.sub), designs, sessions });
  
}