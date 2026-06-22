/* eslint-disable no-empty-pattern */
import type { LoaderFunctionArgs } from "react-router";
import Admin from "./Admin"
import adminFeed from "~/backend/admin_feed";
export default Admin;

export async function adminLoader({ context }: LoaderFunctionArgs) {
    if (context && 'hono' in context) {
        return await adminFeed(context.hono);
    } else {
        const req = await fetch("/api/admin/home");
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