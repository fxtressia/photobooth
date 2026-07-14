import { Context, Hono } from 'hono'
import { v2 as cloudinary } from "cloudinary"
import { auth0, requiresAuth, getUser } from '@auth0/auth0-hono'
import { monotonicFactory } from "ulidx";
import { admins, brandName, tiers } from "../config";
import ssr from './ssr';
import crypto from "node:crypto";
import home_feed from './home_feed';
import { adminSessionsFeed, adminVenuesFeed } from './admin_feed';

import verifyPusherWebhook from './pusher';
import authVenue, { generateApiKey } from './venue_auth';

const app = new Hono();

cloudinary.config({
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME
});
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

app.get('/api/me/home', async (c: Context) => {
  return c.json(await home_feed(c));
});

app.get('/api/me/designs', async (c: Context) => {
  const user = getUser(c);
  const { results } = await c.env.DB.prepare("select * from designs where user_auth0_id = ?").bind(user.sub).all();
  return c.json(results.map((e) => { return { ...e, current_state: undefined, history_stack: undefined }; }));
})
app.get('/api/me/designs/:id', async (c: Context) => {
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
    formData.append("name", design.name);
    formData.append("aspect_ratio", String(design.aspect_ratio));

    return new Response(formData);
  } else {
    return c.json(design);
  }

})

app.post('/api/me/designs/new', async (c: Context) => {
  const user = getUser(c);
  const id = ulid();
  const attached = c.req.query('contents_attached') || '';
  if (attached == "yes") {
    const fd = await c.req.formData();
    const aspectRatioBlob = fd.get("aspect_ratio");
    const historyStackBlob = fd.get("history_stack");
    const currentStateBlob = fd.get("current_state");
    if (!(aspectRatioBlob?.constructor?.name == "String") || !(historyStackBlob instanceof Blob) || !(currentStateBlob instanceof Blob)) {
      // console.log(!(aspectRatioBlob instanceof String), !(historyStackBlob instanceof Blob), !(currentStateBlob instanceof Blob), aspectRatioBlob?.constructor?.name);
      return c.json({ msg: "Missing or mismatching parameters" }, 400);
    }
    await c.env.DB.prepare("insert into designs (id, user_auth0_id, aspect_ratio, history_stack, current_state) values (?, ?, ?, ?, ?)").bind(id, user.sub, Number(aspectRatioBlob), await historyStackBlob.arrayBuffer(), await currentStateBlob.arrayBuffer()).run();
  } else {
    const { aspect_ratio } = await c.req.json();

    await c.env.DB.prepare("insert into designs (id, user_auth0_id, aspect_ratio) values (?, ?, ?)").bind(id, user.sub, aspect_ratio).run();
  }
  return c.json({ id });
})

app.patch('/api/me/designs/:id', async (c: Context) => {
  const user = getUser(c);
  const id = c.req.param('id');
  const data = await c.req.formData();
  const current_state = data.get("current_state");
  const history_stack = data.get("history_stack");
  try {
    await c.env.DB.prepare("update designs set name = ?, current_state = ?, history_stack = ? where id = ? and user_auth0_id = ?").bind(data.get("name"), current_state instanceof Blob ? await current_state.arrayBuffer() : null, history_stack instanceof Blob ? await history_stack.arrayBuffer() : null, id, user.sub).run();
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

app.use("/api/venue/*", authVenue);
app.post("/api/venue/finish-session", async (c: Context) => {
  let data = await c.req.json();
  await c.env.DB.prepare("update sessions set finished = 1 where id = ?").bind(data.id).run();

  return c.json({ msg: "Done!" });
})

app.post('/api/venue/auth', async (c: Context) => {
  const socketId = c.req.query("socket_id");
  if (!socketId) {
    return c.json({ "msg": "Bad Request" }, 400);
  }
  const venue = c.env.venue;

  const presence = (() => {
    const channel_data = JSON.stringify({ user_id: venue.id });
    const stringToSign = `${socketId}:presence-venues:${channel_data}`;
    const signature = crypto
      .createHmac('sha256', process.env.PUSHER_APP_SECRET)
      .update(stringToSign)
      .digest('hex');

    return { auth: `${process.env.PUSHER_APP_KEY}:${signature}`, channel_data };
  })();

  const user = (() => {
    const user_data = JSON.stringify({ id: venue.id });
    const stringToSign = `${socketId}::user::${user_data}`;
    const signature = crypto
      .createHmac('sha256', process.env.PUSHER_APP_SECRET)
      .update(stringToSign)
      .digest('hex');

    return {
      auth: `${process.env.PUSHER_APP_KEY}:${signature}`,
      user_data,
    };
  })();



  /*
  pub struct VenueConfig {
    pub service_name: String,
    pub venue_name: String,
    pub id: String,
}
  */
  return c.json({
    presence, user, metadata: {
      service_name: brandName,
      venue_name: venue.name,
      id: venue.id
    }
  });

})

app.post('/api/webhook/cloudinary/notify', async (c: Context) => {
  const body = await c.req.text();
  const signature = c.req.header('x-cld-signature');
  const timestam = c.req.header('x-cld-timestamp');
  if (!timestam || !signature) return c.json({ "msg": "unauthorized" }, 401);
  const timestamp = Number(timestam);

  const isValid = cloudinary.utils.verifyNotificationSignature(body, timestamp, signature);

  if (!isValid) {
    return c.json({ "msg": "unauthorized" }, 401);
  }

  const data = await c.req.json();
  if (data.notification_type == "upload") {
    // add 
    //console.log(data);
    if (typeof data.public_id == "string") {
      const segments = data.public_id.split("/");
      const session = segments[4];
      const user = segments[2];
      const take = segments[6];

      await c.env.DB.prepare("update sessions set images_taken_count = ? where id = ? and user_auth0_id = ? and images_taken_count < ?").bind(take, session, user, take).run();


    };
  }
})



app.post('/api/webhook/pusher/*', verifyPusherWebhook);
app.post('/api/webhook/pusher/online', async (c: Context) => {
  const body = await c.req.json();
  for (const event of body.events) {

    if (event.name == 'member_added') {
      (await c.env.DB.prepare("update venues set is_online = 1 where id = ?").bind(event.user_id).run());
    } else if (event.name == 'member_removed') {
      (await c.env.DB.prepare("update venues set is_online = 0 where id = ?").bind(event.user_id).run());
    }
  }

  return c.text("OK", 200);
})


app.post('/api/me/venue/unlock', async (c: Context) => {
  const user = getUser(c);
  const id = c.req.query("session");
  const venue = c.req.query("venue");

  if (!id || !venue) {
    return c.json({
      msg: "Bad Request"
    }, 400);
  }
  const sessions = (await c.env.DB.prepare("select * from sessions where id = ? and user_auth0_id = ? and authorized = 1").bind(id, user.sub).all()).results;
  if (sessions.length <= 0) {
    return c.json({
      msg: "Unauthorized"
    }, 401);
  }
  const session = sessions[0];
  const path = `/apps/${process.env.PUSHER_APP_ID}/events`;
  const body = JSON.stringify({
    data: JSON.stringify({
      session: {
        user: {
          auth0_id: session.user_auth0_id,
        },
        id: session.id,
        tier: tiers[session.tier],
      }
    }),
    channel: `#server-to-user-${venue}`,
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
    return c.redirect("/");
  } else {


    return c.json({
      text: await res.text(),
      pusherStatusText: res.statusText,
      pusherStatusCode: res.status
      // @ts-expect-error res.status will always be a valid HTTP response code
    }, res.status)
  }
});




app.post('/api/admin/sessions/generate', async (c) => {

  const { location, tier } = await c.req.json();
  const owner_id = c.req.param("owner_id") ? c.req.param("owner_id") : null;

  const id = ulid();
  await c.env.DB.prepare("insert into sessions (id, user_auth0_id, location,  tier) values (?, ?, ?, ?)").bind(id, owner_id, location, tier).run();
  return c.json({ id });
})

app.get('/api/admin/venues', adminVenuesFeed);


app.get('/api/admin/sessions', adminSessionsFeed);

app.post('/api/admin/venues/create', async (c: Context) => {
  const data = await c.req.json();

  if (!data || !data.name) return c.json({ msg: "Bad request" }, 400)
  const { rawKey, hashedKey } = await generateApiKey();
  const id = ulid();

  await c.env.DB.prepare("insert into venues (id, hash_api_token, is_online, name) values (?, ?, ?, ?)").bind(id, hashedKey, 0, data.name).run();

  return c.json({ rawKey, name: data.name });
})

app.post('/api/admin/venues/delete', async (c: Context) => {
  const data = await c.req.json();
  await c.env.DB.prepare("delete from venues where id = ?").bind(data.id).run();
  return c.json({ msg: "OK" });
})

app.patch('/api/admin/venues/reset-token', async (c: Context) => {
  const data = await c.req.json();
  const { rawKey, hashedKey } = await generateApiKey();
  await c.env.DB.prepare("update venues set hash_api_token = ? where id = ?").bind(hashedKey, data.id).run();
  return c.json({ rawKey });
})

app.patch('/api/admin/venues/update', async (c) => {
  const data = await c.req.json();
  if (!(data?.name || data?.id)) {
    return c.json({ msg: "Bad Request" }, 400);
  }
  await c.env.DB.prepare("update venues set name = ? where id = ?").bind(data.name, data.id).run();

  return c.json({ msg: "OK" });
})
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



