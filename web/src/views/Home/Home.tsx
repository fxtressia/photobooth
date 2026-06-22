import { Link, useLoaderData } from "react-router";
import { brandName, tiers } from "~/config";
import { TiersList } from "../TiersList/TiersList";
import Session from "../Session";
import { useEffect, useState } from "react";

const Home = () => {
    const data = useLoaderData();
    const [selectedSession, setSelectedSession] = useState<string | null>(null);

    if (!data.sessions || !data.designs) {

        return <>
            <h1>{brandName}</h1>
            <a href="/auth/login" style={{ color: "white", display: "flex", justifyContent: "center", alignItems: "center", flexDirection: "column", borderRadius: "15px", padding: "50px", width: "stretch", backgroundColor: "#71ab23" }}><h2>Login or Sign Up</h2></a>
        </>;
    };
    return <>
        <>
            {(() => {

                if (data.sessions.length <= 0) {
                    return <TiersList />

                } else {
                    return <>{
                        (() => {

                            if (data.sessions.authorized.length > 0) {
                                useEffect(() => {

                                    setSelectedSession(data.sessions.authorized[0].id);
                                }, []);
                                return <Link to={selectedSession ? `/me/launch?session=${selectedSession}` : ''} style={{ width: "stretch", backgroundColor: "#93e02e", borderRadius: "15px", color: "white" }}>
                                    <div style={{ padding: "15px" }}> <h2>Scan QR Code</h2>
                                        <p>Attend a booth and scan its Entrance QR.</p></div>
                                    {(() => {
                                        if (selectedSession) {


                                            return <div style={{ padding: "15px", backgroundColor: "#659f19", borderRadius: " 0 0 15px 15px", display: "flex", flexWrap: "wrap", gap: "5px" }}>

                                                <p>Selected session</p>
                                                <p>{tiers[data.sessions.authorized.find((s) => s.id == selectedSession).tier].name}</p>
                                                {/*<select>
                                            {data.sessions.authorized.map((s) => {
                                                const date = new Date(s.created_at * 1000);
                                                let [timeStr, setTimeStr] = useState("");
                                                useEffect(() => {
                                                    setTimeStr(`${date.getDate()}/${date.getMonth()}/${date.getFullYear()} ${date.getHours()}:${date.getMinutes()}`);
                                                }, [])
                                                return <option value={s.id}>Tier {tiers[s.tier].name} - Ordered on {timeStr}</option>
                                            })}
                                        </select> */}
                                            </div>
                                        } else { return <></> }
                                    })()}
                                </Link>;
                            } else {

                            }

                        })()
                    }
                        <Link style={{ width: "stretch", backgroundColor: "#71ab23", padding: "15px", minHeight: "1.5rem", paddingLeft: "10px", paddingRight: "10px", borderRadius: "15px", color: "white", display: "flex", justifyContent: "center", alignItems: "center", fontSize: "1.5rem", fontWeight: "bolder", textDecoration: "none" }} to="/pay">Buy another session</Link>
                    </>


                }
            })()}
        </>

        <div>
            <h2>Your Designs</h2>
            {(() => {
                if (data.designs.length > 0) {
                    return data.designs.forEach((data) => {
                        return (<p></p>)
                    })
                } else {
                    return (<p>You have not created any designs. Create one, edit it, download the picture, and order your print!</p>)
                }
            })()}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
            <h2>Your Sessions</h2>
            {(() => {
                if (data.sessions.pending.length + data.sessions.finished.length + data.sessions.authorized.length > 0) {
                    return <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>{data.sessions.authorized.map(Session(false))}{data.sessions.pending.map(Session(false))}</div>
                } else {
                    return (<p>You have not purchased any photobooth sessions at {brandName}! Purchase now and you will see your pictures ready for download here.</p>)
                }
            })()}
        </div>
        {(() => { if (data.admin) { return <Link style={{ textAlign: "center", fontWeight: "bold", backgroundColor: "#71ab23", color: "white", padding: "5px", borderRadius: "15px" }} to="admin">Run as Administrator</Link> } else { return <></> } })()}
    </>

}

export default Home
