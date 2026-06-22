/* eslint-disable no-empty-pattern */
import Dashboard from "./Dashboard"
export default Dashboard;

export async function dashLoader({ }){
    return /*await (await fetch("/api/me/home")).json()*/ {};
}