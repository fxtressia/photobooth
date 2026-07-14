import { tiers } from "../../config";

export default function Tiers() {
    return <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
        <div>
            <h2>Runtime Tiers</h2>
            <p>
                Tiers in this category can be reconfigured even when the site is operational. This feature is not supported yet!
            </p>
        </div>
        <div style={{display: "flex", flexDirection: "column", gap: "20px"}}>
            <div>
            <h2>Static Tiers</h2>
            <p>
                These tiers are configured through the site's source code configuration and their configurations are locked when the site is operational. To change them, change <code>web/src/config/config.json</code>.
                </p></div>
            <div>
                {Object.entries(tiers).map(([id, val]) => {
                    return <div key={"c" + id} style={{ background: "#f8ff93", padding: "15px", borderRadius: "5px" }}>
                        <h3>{val.name}</h3>
                        <p><b>Price:</b> {val.price}</p>
                        <p><b>Maximum time:</b> {val["time-mins"]} minutes </p> 
                        <p><b>Maximum number of pictures that may be taken:</b> {val.pics}</p>

                    </div>
                })}
            </div>
        </div>
    </div>
}