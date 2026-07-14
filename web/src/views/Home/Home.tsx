import { Link, useLoaderData } from "react-router";
import { brandName, tiers } from "~/config";
import { TiersList } from "../TiersList/TiersList";
import Session from "../Session";
import { useEffect, useState } from "react";
import type { VenueData } from "../Admin/Venues";
import useToast from "~/contexts/ToastContext";

const Home = () => {
    const data = useLoaderData();
    const [selectedSession, setSelectedSession] = useState<string | null>(null);
    const [launchedVenue, setLaunchedVenue] = useState<VenueData | null>(null);
    const { setToast } = useToast();
    useEffect(() => {
        setSelectedSession(data.sessions.authorized[0].id);
    }, [data.sessions.authorized]);
    if (!data) {
        return <div>
            <h1>Well this is awkward...</h1>

            The application crashed because the data is not loaded.
        </div>
    }

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
                                if (data.online_venues.length == 0) {
                                    return <div style={{
                                        width: "stretch", backgroundColor: "#ab3a23", borderRadius: "15px", color: "white", padding: "15px"
                                    }}>
                                        <h2>No booths are online right now. {":<"}</h2>
                                        <p>Please come back another time. </p>
                                    </div>
                                }
                                return <div>
                                    {
                                        data.online_venues.length == 1 || launchedVenue ? (<button
                                            onClick={async () => {
                                                const venue = launchedVenue || data.online_venues[0];
                                                
                                                const res = await fetch(`/api/me/venue/unlock?venue=${venue.id}&session=${selectedSession}`, {
                                                    method: "POST",

                                                });
                                                if (res.ok) {
                                                    setLaunchedVenue(venue);
                                                } else {

                                                    setToast({ isError: true, text: `Error in fetching: ${res.status} ${res.statusText} ${await res.text()}` });


                                                }
                                            }}
                                            style={{ cursor: "pointer", width: "stretch", backgroundColor: "#93e02e", borderRadius: "15px 15px 0 0", color: "white", padding: "15px", height: "50vh" }}>
                                            {
                                                launchedVenue ? <>
                                                    <h2>Check the screen at {launchedVenue.name}!</h2>
                                                    <p>We've just logged you in over there. Have fun!</p>
                                                    <p>
                                                        If this is not the case, click again.
                                                    </p>
                                                </> : <h2>Start your photobooth session at {data.online_venues[0].name}</h2>
                                            }

                                        </button>) : (<Link to={selectedSession ? `/me/launch?session=${selectedSession}` : ''} style={{ width: "stretch", backgroundColor: "#93e02e", borderRadius: "15px", color: "white" }}>
                                            <div style={{ padding: "15px" }}> <h2>Scan QR Code</h2>
                                                <p>Attend a booth and scan its Entrance QR.</p></div>

                                        </Link>)
                                    }
                                    {(() => {
                                        if (selectedSession) {


                                            return <a href="#sessions" style={{ color: "white", padding: "15px", backgroundColor: "#659f19", borderRadius: " 0 0 15px 15px", display: "flex", flexWrap: "wrap", gap: "5px" }}>

                                                <p>Selected session</p>
                                                <p>{tiers[data.sessions.authorized.find((s) => s.id == selectedSession).tier].name}</p>


                                            </a>
                                        } else { return <></> }
                                    })()}
                                </div>;
                            } else {
                                return <></>
                            }

                        })()
                    }
                        <Link style={{ width: "stretch", backgroundColor: "#71ab23", padding: "15px", minHeight: "1.5rem", paddingLeft: "10px", paddingRight: "10px", borderRadius: "15px", color: "white", display: "flex", justifyContent: "center", alignItems: "center", fontSize: "1.5rem", fontWeight: "bolder", textDecoration: "none" }} to="/pay">Buy another session</Link>
                    </>


                }
            })()}
        </>

        <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
            <h2>Your Designs</h2>

            {(() => {
                if (data.designs.length > 0) {
                    return <div style={{ display: "flex", flexWrap: "wrap", gap: "25px" }}>{data.designs.map((data) => {
                        // console.log(data);

                        let [time, setTime] = useState("");
                        useEffect(() => {
                            setTime((new Date(data.created_at * 1000)).toString())
                        })
                        return (<Link target="_blank" key={data.id} style={{ padding: "15px", color: "white", borderRadius: "25px", backgroundColor: "#ab6323" }} to={`/edit?design=${data.id}`}>
                            <h3>
                                {data.name || "Untitled Design"}
                            </h3>
                            {time}

                        </Link>)
                    })}</div>
                } else {
                    return (<p>You have not created any designs. Create one, edit it, download the picture, and order your print!</p>)
                }
            })()}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
            <h2 id="sessions">Your Sessions</h2>
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
