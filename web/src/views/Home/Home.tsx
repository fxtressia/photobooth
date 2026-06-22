import { Link, useLoaderData } from "react-router";
import { brandName, tiers } from "~/config";
import { TiersList } from "../TiersList/TiersList";
import Session from "../Session";

const Home = () => {
    const data = useLoaderData();

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
                    return <><Link style={{ width: "stretch", backgroundColor: "#71ab23", padding: "15px", minHeight: "5rem", paddingLeft: "10px", paddingRight: "10px", borderRadius: "15px", color: "white", display: "flex", justifyContent: "center", alignItems: "center", fontSize: "3rem", fontWeight: "bolder", textDecoration: "none" }} to="/design/new">New design</Link>
                        <Link style={{ width: "stretch", backgroundColor: "#71ab23", padding: "15px", minHeight: "5rem", paddingLeft: "10px", paddingRight: "10px", borderRadius: "15px", color: "white", display: "flex", justifyContent: "center", alignItems: "center", fontSize: "3rem", fontWeight: "bolder", textDecoration: "none" }} to="/pay">Buy another session</Link>
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
                if (data.sessions.length > 0) {
                    return <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>{data.sessions.map(Session(false))}</div>
                } else {
                    return (<p>You have not purchased any photobooth sessions at {brandName}! Purchase now and you will see your pictures ready for download here.</p>)
                }
            })()}
        </div>
        {(() => { if (data.admin) { return <Link style={{ textAlign: "center", fontWeight: "bold", backgroundColor: "#71ab23", color: "white", padding: "5px", borderRadius: "15px" }} to="admin">Run as Administrator</Link> } else { return <></> } })()}
    </>

}

export default Home
