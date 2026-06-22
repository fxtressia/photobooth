import { useEffect, useState } from "react";
import { Outlet } from "react-router";
import { dashWallpaper, brandName } from "~/config";
export default function Dashboard(props: any) {
  let child;
  const [time, setTime] = useState<Date|null>(null);
  if (props && "children" in props) {
    child = props.children
  } else {
    child = <Outlet />
  }
  useEffect(() => {
    setTime(new Date())
    const interval = setInterval(() => {
      setTime(new Date())
    }, 1000);

    return () => {
      clearInterval(interval);
    };

  }, []);
  return <div style={{
    backgroundImage: `url("/images/${dashWallpaper}")`, position: "relative", display: "flex", justifyContent: "center", paddingBlock: "3.5%", paddingLeft: "25px", paddingRight: "25px", alignItems: "center", width: "stretch", height: "fit-content", minHeight: "100vh", flexDirection: "column", backgroundSize: "cover"
  }}>
    <div style={{ backgroundColor: "white", borderRadius: "15px" }}>
      <div style={{ paddingLeft: "25px", paddingRight: "25px", backgroundColor: "#d3d3d3", display: "flex", paddingTop: "5px", paddingBottom: "5px", justifyContent: "space-between", alignItems: "center", borderRadius: "15px 15px 0 0" }}>
        <div>

        </div>
        <p style={{ textAlign: "center" }}>{brandName}</p>
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "10px" }}>
          <div style={{ borderRadius: "25px", backgroundColor: "yellow", height: "1rem", width: "1rem" }}></div>

          <div style={{ borderRadius: "25px", backgroundColor: "green", height: "1rem", width: "1rem" }}></div>

          <div style={{ borderRadius: "25px", backgroundColor: "red", height: "1rem", width: "1rem" }}></div>
        </div>

      </div>
      <div style={{ padding: "25px", display: "flex", gap: "15px", flexDirection: "column" }}>
        {
          child
        }
        <div style={{ position: "absolute", overflow: "hidden", bottom: "0", left: "0", width: "100%", display: "flex", gap: "5px", backgroundColor: "#5757dd", fontSize: "1.1rem", }}>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "0 12px 12px 0", backgroundColor: "#7ecb18", color: "white", fontWeight: "bold", padding: "5px", width: "5rem" }}>start</div>
          <div style={{ display: "flex", flexGrow: "1", flexWrap: "wrap", padding: "4.5px", }}>
            <div style={{ display: "flex", justifyContent: "left", alignItems: "center", padding: "5px", borderRadius: "5px", color: "#ffffff", backgroundColor: "#6e6eff", paddingLeft: "15px", paddingRight: "15px" }}>
              {brandName}
            </div>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", padding: "5px", justifyContent: "center", alignItems: "center", color: "white", paddingRight: "25px", paddingLeft: "25px", borderRadius: "12px 0 0 12px", backgroundColor: "#3d3dc2" }}>

            {
              (() => {
                if (time){
                  return <>{time.getHours()}:{time.getMinutes()}</>
                } else {
                  return <>--:--</>
                }
              })()
            }
          </div>
        </div>
      </div>
    </div>
  </div>
}

