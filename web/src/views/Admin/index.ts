/* eslint-disable no-empty-pattern */
import type { LoaderFunctionArgs } from "react-router";
import Admin from "./Admin"
import { adminSessionsFeed, adminVenuesFeed } from "~/backend/admin_feed";
export default Admin;

export async function adminVenuesLoader({ context }: LoaderFunctionArgs){
    if (context && 'hono' in context) {
        return await adminVenuesFeed(context.hono);
    } else {
        const req = await fetch("/api/admin/venues");
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
export async function adminSessionsLoader({ context }: LoaderFunctionArgs) {
    if (context && 'hono' in context) {
        return await adminSessionsFeed(context.hono);
    } else {
        const req = await fetch("/api/admin/sessions");
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