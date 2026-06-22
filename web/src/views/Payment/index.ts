/* eslint-disable no-empty-pattern */
import type { LoaderFunctionArgs } from "react-router";
import Payment from "./Payment"
export default Payment

export async function paymentLoader({ context }: LoaderFunctionArgs) {
    if (context && 'hono' in context) {
        const { getUser } = await import("@auth0/auth0-hono");
        return getUser(context.hono);
    } else {
        return await (await fetch("/api/me")).json();
    }
}