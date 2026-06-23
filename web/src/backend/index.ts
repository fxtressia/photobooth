import { Context, Hono } from 'hono'

import { auth0, requiresAuth, getUser, claimEquals } from '@auth0/auth0-hono'
import { monotonicFactory } from "ulidx";
import { admins } from "../config";
import ssr from './ssr';
import crypto from "node:crypto";
import home_feed from './home_feed';
import adminFeed from './admin_feed';

const app = new Hono()
if (typeof globalThis !== 'undefined' && !('document' in globalThis)) {
  Object.defineProperty(globalThis, 'document', {
    get() {
      const err = new Error('Capture Stack Trace');
      console.error('!!! CAUGHT DOCUMENT ACCESS HERE !!!', err.stack);
      throw new ReferenceError('document is not defined');
    },
    configurable: true
  });
}
const ulid = monotonicFactory();
// Add auth to every route
app.use('*', auth0({
  authRequired: false,
  clientID: process.env.AUTH0_CLIENT_ID,
  clientSecret: process.env.AUTH0_CLIENT_SECRET,
  baseURL: process.env.APP_BASE_URL,
  domain: process.env.AUTH0_DOMAIN,
  session: {
    secret: process.env.AUTH0_SESSION_ENCRYPTION_KEY,
  },
  authorizationParams: {
    audience: process.env.AUTH0_AUDIENCE,

    response_type: "code",
    scope: "openid profile email",
    response_mode: "query",
  },

}))


const requiresAdmin = async (c: Context, next) => {
  let user;
  try {
    user = getUser(c);
  } catch (e) {
    if (e instanceof Error && e.message == "Missing session") {

      return c.notFound();
    } else {
      return c.json({ msg: "Unauthorized" })
    }
  }
  if (admins.includes(user.sub)) {

    await next();
  } else {
    return c.notFound();
  }

};

app.use('/api/me/*', requiresAuth());
app.use('/api/admin/*', requiresAuth(), requiresAdmin);
app.use('/admin/*', requiresAuth(), requiresAdmin);
app.use('/admin', requiresAuth(), requiresAdmin);
app.get('/api/me', (c) => {
  const user = getUser(c);
  return c.json(user);

})

app.get('/api/me/home', home_feed);

app.get('/api/me/designs', async (c) => {
  const user = getUser(c);
  const { results } = await c.env.DB.prepare("select * from designs where user_auth0_id = ?").bind(user.sub).all();
  return c.json(results);
})
app.get('/api/me/designs/:id', async (c) => {
  const user = getUser(c);
  const id = c.req.param('id');
  const format = c.req.query('format') || '';
  const design = await c.env.DB.prepare("select * from designs where user_auth0_id = ? and id = ?").bind(user.sub, id).first();
  if (!design) {
    return c.json({ error: "Design not found" }, 404);
  }

  if (format == "fd") {

    const formData = new FormData();
    if (design.current_state) {
      formData.append("current_state", new Blob([new Uint8Array(design.current_state)], { type: "application/octet-stream" }));
    }
    if (design.history_stack) {
      formData.append("history_stack", new Blob([new Uint8Array(design.history_stack)], { type: "application/octet-stream" }));
    }
    formData.append("metadata", new Blob([JSON.stringify({ name: design.name, aspect_ratio: design.aspect_ratio })], { type: "application/json" }));

    return new Response(formData);
  } else {
    return c.json(design);
  }

})

app.post('/api/me/designs/new', async (c) => {
  const user = getUser(c);
  const { aspect_ratio } = await c.req.json();
  const id = ulid();
  await c.env.DB.prepare("insert into designs (id, user_auth0_id, aspect_ratio) values (?, ?, ?)").bind(id, user.sub, aspect_ratio).run();
  return c.json({ id });
})

app.patch('/api/me/designs/:id', async (c) => {
  const user = getUser(c);
  const id = c.req.param('id');
  const data = await c.req.formData();
  const current_state = data.get("current_state");
  const history_stack = data.get("history_stack");
  try {
    await c.env.DB.prepare("update designs set name = ?, current_state = ?, history_stack = ? where id = ? and user_auth0_id = ?").bind(data.get("name"), current_state instanceof File ? await current_state.arrayBuffer() : null, history_stack instanceof File ? await history_stack.arrayBuffer() : null, id, user.sub).run();
  } catch (e) {
    return c.json({ error: `Unable to change ${e}` }, 418);
  }
  return c.json({ message: "Design updated" });
})

app.get('/api/me/sessions', async (c: Context) => {
  const user = getUser(c);
  const sessions = await c.env.DB.prepare("select * from sessions where user_auth0_id = ?").bind(user.sub).all();
  return c.json(sessions);
})


app.post('/api/me/venue/unlock', async (c: Context) => {
  const user = getUser(c);
  const id = c.req.query("session");
  if (!id) {

    return c.json({
      msg: "Bad Request"
    }, 400);
  }
  const sessions = (await c.env.DB.prepare("select * from sessions where id = ? and user_auth0_id = ? and authorized = 1").bind(id, user.sub).all()).results;
  if (sessions.length <= 0) {
    return c.json({
      msg: "Bad Request"
    }, 401);
  }
  const session = sessions[0];
  const path = `/apps/${process.env.PUSHER_APP_ID}/events`;
  const body = JSON.stringify({
    data: JSON.stringify({
      session: {
        user_auth0_id: session.user_auth0_id,
        id: session.id,
        tier: session.tier,
      }
    }),
    channel: "photobooth-ws",
    name: "booth-login"

  });
  const bodyMd5 = crypto.createHash('md5').update(body).digest('hex');
  const timestamp = Math.floor(Date.now() / 1000);
  const params = `auth_key=${process.env.PUSHER_APP_KEY}&auth_timestamp=${timestamp}&auth_version=1.0&body_md5=${bodyMd5}`;
  const presign = `POST\n${path}\n${params}`;
  const authSign = crypto.createHmac('sha256', process.env.PUSHER_APP_SECRET).update(presign).digest('hex');


  const res = await fetch(`https://api-${process.env.PUSHER_APP_REGION}.pusher.com${path}?${params}&auth_signature=${authSign}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body
  });
  if (res.ok) {
    return c.text("OK");
  } else {


    return c.json({
      text: await res.text(),
      pusherStatusText: res.statusText,
      pusherStatusCode: res.status
      // @ts-expect-error
    }, res.status)
  }
});

app.post('/api/admin/sessions/generate', async (c) => {
  return c.notFound();
  /*
  const user = getUser(c);
 
  const { location, images_count, tier } = await c.req.json();
  const owner_id = c.req.param("owner_id") ? c.req.param("owner_id") : null;

  const id = ulid();
  await c.env.DB.prepare("insert into sessions (id, user_auth0_id, location, images_count) values (?, ?, ?, ?)").bind(id, owner_id, location, images_count, tier).run();
  return c.json({ id });*/
})



app.get('/api/admin/home', adminFeed);
app.post('/api/admin/verify-payment', async (c) => {
  const id = c.req.query("id");
  await c.env.DB.prepare("update sessions set authorized = ? where id = ?").bind(1, id).run();
  return c.redirect('/admin/');
})
app.post('/api/admin/deverify-payment', async (c) => {
  const id = c.req.query("id");
  await c.env.DB.prepare("update sessions set authorized = ? where id = ?").bind(0, id).run();
  return c.redirect('/admin/');
})
app.post('/api/admin/sessions/login', async (c) => {
  const id = c.req.query("id");
  const location = c.req.query("location");
  await c.env.DB.prepare("update sessions set location = ? where id = ?").bind(location, id).run();

  return c.json({ "msg": "success" });
})
app.post('/api/webhook/tally/sessions/pay', async (c) => {
  if (c.req.header("Authorization") != `Bearer ${process.env.TALLY_WEBHOOK_API_KEY}`) {
    console.log("Wrong auth");
    return c.notFound();

  }

  const data = {};
  const json = await c.req.json();
  //console.log("Hello");
  //console.log(json);
  for (const field of json["data"]["fields"]) {
    data[field["label"]] = field["value"];
  }

  if (!(data["proof-of-purchase"] || data["user_id"] || data["tier"])) {
    c.status(400);
    return c.json({ message: "lacking input" });
  }
  //console.log(data);
  const id = ulid();
  await c.env.DB.prepare("insert into sessions (id, user_auth0_id, tier, authorized, payment_proof) values (?, ?, ?, ?, ?)").bind(id, data["user_id"], data["tier"], 0, data["proof-of-purchase"][0].url).run();
  return c.json({ id });

})
/*
{
  app_metadata: {},
  created_at: '2026-06-21T14:55:42.099Z',
  email: 'j+smith@example.com',
  email_verified: true,
  family_name: 'Smith',
  given_name: 'John',
  last_password_reset: '2026-06-21T14:55:42.099Z',
  name: 'John Smith',
  nickname: 'j+smith',
  phoneNumber: '123-123-1234',
  phone_number: '123-123-1234',
  phone_verified: true,
  picture: 'http://www.gravatar.com/avatar/?d=identicon',
  tenant: 'alphalicious',
  updated_at: '2026-06-21T14:55:42.099Z',
  user_id: 'auth0|5f7c8ec7c33c6c004bbafe82',
  user_metadata: {},
  username: 'j+smith'
}

*/

/*

exports.onExecutePostUserRegistration = async (event, api) => {
  const API_ENDPOINT = "https://photobooth-project.tailf2950e.ts.net";
  await fetch(`${API_ENDPOINT}/api/webhook/auth0/account-created`, {
    method: "POST",
    body: JSON.stringify(event.user),
    headers: {
      // @ts-ignore
      "Authentication": `Bearer ${event.secrets.API_KEY}`
    }
    // …
  })
};
 */
app.post('/api/webhook/auth0/account-created', async (c) => {
  // @ts-expect-error
  if (c.req.header("Authorization") != `Bearer ${process.env.AUTH0_WEBHOOK_API_KEY}`) {
    //console.log("Not found")
    return c.notFound();

  }
  const user = await c.req.json();
  //console.log("Hi ughm");
  await c.env.DB.prepare("insert into users (auth0_id, email, name) values (?, ?, ?)").bind(user.user_id, user.email, user.name).run();
  return c.json({ id: user.user_id })
})

/*
app.post('/api/me/sessions/pay', async(c) => {
  const body = await c.req.formData();
  const proof = body.get("proof-of-payment");
})*/

app.post('/api/me/designs/:id/order', async (c) => {
  const user = getUser(c);
  const designId = c.req.param('id');
  return c.json({ message: `Order placed for design ${designId} by user ${user.name}` });
})


app.get('*', ssr)

export default app
