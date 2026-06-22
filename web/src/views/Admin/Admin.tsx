import { Link, useLoaderData } from "react-router";
import { brandName, tiers } from "~/config";
import Session from "~/views/Session";

const Admin = () => {
    const data = useLoaderData();
    
    if ("status" in data || "text" in data) {
        let message;
        try {
            const json = JSON.parse(data.text);
            message = <p><b>{json.error}:</b> <span>{json.error_description}</span></p>

        } catch (e) {
            message = <p>{data.text}</p>
        }
        return <><h1>Oops! Server says, "Error {data.status}."</h1>
            {message}

        </>
    }
    return <div>
        <div style={{
            display: "flex", flexDirection: "column", gap:
                "25px"
        }}>
            <h1>{brandName}</h1>
          
            <Link to={`/admin/session/generate${(() => {
                if (Object.keys(tiers).length == 1) {
                    return "?tier=" + Object.keys(tiers)[0];
                }
                return "";
            })()}`} style={{
                width: "stretch", paddingTop: "5px", paddingBottom: "5px", paddingLeft: "15px", paddingRight: "15px",
                color: "white", fontWeight: "bold", fontSize: "1.5rem", backgroundColor: "#71ab23"
            }}>
                Generate session {(() => {
                    if (Object.keys(tiers).length == 1) {
                        // @ts-expect-error
                        return '"' + tiers[Object.keys(tiers)[0]].name + '"';
                    }
                })()}
            </Link>
            
            <h3>Pending Authorization</h3>
            {
                data.sessions.pending.map(Session(true))
            }
            <h3>Authorized Session</h3>
            {
                data.sessions.authorized.map(Session(true))
            }
            <p style={{ textAlign: "center" }}>Return to <Link to="/" style={{ fontWeight: "bold", textDecoration: "underline" }}>home</Link></p>
            <></>
        </div>


    </div>
}

export default Admin
