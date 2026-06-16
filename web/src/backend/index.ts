import { Hono } from 'hono'

import { auth0, requiresAuth, getUser } from '@auth0/auth0-hono'
import { monotonicFactory } from "ulidx";
const app = new Hono()

const ulid = monotonicFactory();
// Add auth to every route
app.use('*', auth0({
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

app.get('/api/', (c) => {
  return c.text('Hello Hono!')
})

app.get('/api/me', (c) => {
  const user = getUser(c);
  return c.json(user);

})

app.get('/api/me/home', (c) => {
  const user = getUser(c);
  return c.json({ message: `Welcome back, ${user.name}!` });
});

app.get('/api/me/designs', async (c) => {
  const user = getUser(c);
  const { results }= await c.env.DB.prepare("select * from designs where user_auth0_id = ?").bind(user.sub).all();
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

  let formData = new FormData();
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

app.get('/api/me/sessions', async (c) => {
  const user = getUser(c);
  const sessions = await c.env.DB.prepare("select * from sessions where user_auth0_id = ?").bind(user.sub).all();
  return c.json(sessions);
})

app.post('/api/me/sessions/new', async (c) => {
  const user = getUser(c);
  const { location, images_count } = await c.req.json();
  const id = ulid();
  await c.env.DB.prepare("insert into sessions (id, user_auth0_id, location, images_count) values (?, ?, ?, ?)").bind(id, user.sub, location, images_count).run();
  return c.json({ id });
})

app.post('/api/me/designs/:id/order', async (c) => {
  const user = getUser(c);
  const designId = c.req.param('id');
  return c.json({ message: `Order placed for design ${designId} by user ${user.name}` });
})



export default app
