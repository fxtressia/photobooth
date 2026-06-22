/* eslint-disable no-empty-pattern */
import type { LoaderFunctionArgs } from "react-router";
import Home from "./Home"
import homeFeed from "~/backend/home_feed";
export default Home;

export async function homeLoader({ context }: LoaderFunctionArgs) {
    if (context && 'hono' in context) {
        return await homeFeed(context.hono);
    } else {
        const req = await fetch("/api/me/home");
        if (req.ok) {
            return await req.json();
        } else {

            return {
                status: req.status,
                statusText: req.statusText,
                text: await req.text(),

            }
        }
    }

}
/*export async function paymentLoader({ context }: LoaderFunctionArgs) {
    if (context && 'hono' in context) {
        const { getUser } = await import("@auth0/auth0-hono");
        return getUser(context.hono);
    } else {
        return await (await fetch("/api/me")).json();
    }
} */