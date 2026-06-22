import { Link } from "react-router"
import { tiers, brandName } from "~/config"

export function TiersList() {
    return <>
        <div style={{ width: "stretch", backgroundColor: "#71ab23", minHeight: "7.5rem",  borderRadius: "15px", color: "white", display: "flex", justifyContent: "space-between", alignItems: "stretch",  flexDirection: "row",  flexWrap: "wrap", "overflow": "hidden"}} >
            <div style={{ /*width: "fit-content",*/ flexGrow: 1, minWidth: "50%", padding: "15px", paddingLeft: "10px", paddingRight: "10px",  display: "flex", justifyContent: "center", alignItems: "center", gap: "15px", flexDirection: "column" }}>

                <div style={{ fontSize: "3rem", fontWeight: "bolder", textDecoration: "none" }}>Buy a session</div>
                <div style={{ display: "flex", justifyContent: "center", alignItems: "center" }}>
                    {Object.entries(tiers).map(([id, tier]) => {
                        return <Link key={id} style={{ borderRadius: "15px", padding: "25px", background: "#92cf41", fontSize: "1rem" }} to={`/pay?tier=${id}`}>
                            <div style={{ display: "flex", flexDirection: "column", }}>
                                <span style={{ fontSize: "2.5rem" }}>{tier.name}</span>
                                <span style={{ fontSize: "2rem" }}>{tier.price}</span>
                            </div>
                            <p>{tier["time-mins"]} minutes of idle time*</p>
                            <p>{tier.pics} maximum amount of photos saved</p>
                            <p>1 month of data retention</p>
                            <p>1 month website access</p>
                            <p>Shareable URL</p>
                        </Link>
                    })}
                </div>
                <Link to="/faq" style={{color: "white"}}>Read our FAQ</Link>
            </div>
            <div style={{ backgroundColor: "#b1e074", flexGrow: 1,  padding: "15px", paddingLeft: "10px", paddingRight: "10px",  color: "black", display: "flex", justifyContent: "center", alignItems: "center", gap: "15px", flexDirection: "column" }}>
                <p>
                    Buy a session
                </p>
            </div>
        </div>
        <div style={{ width: "stretch", backgroundColor: "#f5ff63", borderRadius: "15px", }}>

            <div style={{ padding: "15px", paddingTop: "5px", paddingBottom: "5px" }}>   <p><b>Information:</b> Once you have finished a photobooth at a {brandName} booth, you can create collages or any design from them in our editor.</p>
            </div>


        </div>
    </>
}