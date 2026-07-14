import { Link, Outlet, useLocation, } from "react-router";
import { brandName,  } from "~/config";


const Admin = () => {
    const location = useLocation();
    const current = location.pathname.split('/').pop();

    return <div style={{display: "flex", flexDirection: "column", gap: "15px"}}>
        <div style={{
            display: "flex", flexDirection: "column", gap:
                "25px"
        }}>
            <h1>{brandName}</h1>
            <div style={{display: "flex", flexDirection: "column", gap: "5px"}}>
                <div style={{ display: "flex", justifyContent: "space-between", backgroundColor: "#71ab23", color: "white",  }}>
                    <Link to="/admin" style={{ textAlign: "center", flexGrow: "1", padding: "5px", paddingLeft: "25px", paddingRight: "25px",  color: "white", fontWeight: "bold", backgroundColor: current == "admin" ? "#87cf2a" : undefined }}>Sessions</Link>
                    <Link to="/admin/venues" style={{ textAlign: "center", flexGrow: "1", padding: "5px", paddingLeft: "25px", paddingRight: "25px", color: "white", fontWeight: "bold", backgroundColor: current == "venues" ? "#87cf2a" : undefined }}>Venues</Link>
                    <Link to="/admin/tiers" style={{ textAlign: "center", flexGrow: "1", padding: "5px", paddingLeft: "25px", paddingRight: "25px", color: "white", fontWeight: "bold", backgroundColor: current == "tiers" ? "#87cf2a" : undefined }}>Tiers</Link>
                    <Link to="/admin/config" style={{ textAlign: "center", flexGrow: "1", padding: "5px", paddingLeft: "25px", paddingRight: "25px", color: "white", fontWeight: "bold", backgroundColor: current == "config" ? "#87cf2a" : undefined }}>Config</Link>
                </div>
              </div>

         
        </div>
        <div>
            <Outlet />
        </div>
        <p style={{ textAlign: "center" }}>Return to <Link to="/" style={{ fontWeight: "bold", textDecoration: "underline" }}>home</Link></p>

    </div>
}

export default Admin
