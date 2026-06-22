import type { LoaderFunctionArgs } from "react-router";
import DesignEditor from "./DesignEditor"
export default DesignEditor

export async function loader({ context }: LoaderFunctionArgs) {
    /*if (context && 'hono' in context) {
        const { getUser } = await import("@auth0/auth0-hono");
       
        return context.hono.var.auth0?.user || { status: };
       } else {*/
    const req = await fetch("/api/me");
    if (req.ok) {
        return await req.json();
    } else {

        return {
            status: req.status,
            statusText: req.statusText,
            text: await req.text(),

        }
    }
    //}
}