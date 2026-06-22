import type { Context } from "hono";
import { cloneRawRequest } from "hono/request";
import { renderToString } from "react-dom/server";
import {
    createStaticHandler,
    createStaticRouter,
    StaticRouterProvider,
} from "react-router";
import Container from "~/Container";
import Provider from "~/Provider";
//import templateHnotml from '../../index.html?raw';
import routes from "~/routes";

const { query, dataRoutes } = createStaticHandler(routes);

export default async function ssr(c: Context) {
    try {
        console.log("Got request " + c.req.url);
        if (new URL(c.req.url).pathname.includes('.')){
            const asset = await c.env.ASSETS.fetch(c.req.raw);
            if (asset.status == 200) {
                console.log("Got assets " + c.req.url);
                return asset;
            }
        }
        
        // 1. run actions/loaders to get the routing context with `query`
        const context = await query(await cloneRawRequest(c.req), {
            requestContext: { hono: c }
        });

        // If `query` returns a Response, send it raw (a route probably a redirected)
        if (context instanceof Response) {
            return context;
        }

        // 2. Create a static router for SSR
        const router = createStaticRouter(dataRoutes, context);

        // 3. Render everything with StaticRouterProvider
        const html = renderToString(

            <Provider>
                {/*<Container>*/}
                <StaticRouterProvider
                    router={router}
                    context={context}
                />
                {/*</Container>*/}
            </Provider>

        );


        // Setup headers from action and loaders from deepest match
        const leaf = context.matches[context.matches.length - 1];
        const actionHeaders = context.actionHeaders[leaf.route.id];
        const loaderHeaders = context.loaderHeaders[leaf.route.id];
        const headers = new Headers(actionHeaders);
        if (loaderHeaders) {
            for (const [key, value] of loaderHeaders.entries()) {
                headers.append(key, value);
            }
        }

        headers.set("Content-Type", "text/html; charset=utf-8");
        const res = await c.env.ASSETS.fetch(new Request(new URL("/index.html", c.req.url)));
        const a = await res.text();
        //console.log(a);
        // 4. send a response
        return new Response((a).split('<div id="root"></div>').join(`<div id="root">${html}</div>`), {
            status: context.statusCode,
            headers,
        });
    } catch (e) {
        if (!(e instanceof Error)) {
            return new Response(`${e} Internal Server Error`, {
                status: 500,
                headers: { "Content-Type": "text/html; charset=utf-8" }
            })
        }
        return new Response(e.toString(), {
            status: 500,
            headers: { "Content-Type": "text/html; charset=utf-8" }
        })
    }
}