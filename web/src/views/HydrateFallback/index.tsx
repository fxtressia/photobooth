import Dashboard from "../Dashboard";

export default function HydrateFallback() {


    /*
      */
    return <Dashboard><div
        className="loading-ui"
        style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            flexDirection: "column",
            gap: "50px",
            minHeight: "100vh",
        }}
    >{/*
        <div style={{ height: "8vw", width: "8vw", backgroundColor: "#25273a", animation: "loading 8s ease-in-out infinite alternate" }}></div>*/}
        <div style={{ fontFamily: "monospace", color: "black" }}>loading...</div>
        {/*<style>
            {` @keyframes loading {
                0 % {
                    background- color: #25273a;
            transform: rotate(0turn);
        }
            25% {
                background - color: rgb(143, 136, 173);
            transform: rotate(0.25turn);
        }
            50% {
                background - color: #25273a;
            transform: rotate(0.5turn);
        }

            75% {
                background - color: rgb(143, 136, 173);
            transform: rotate(0.75turn);
        }
            100% {
                background - color: #25273a;
            transform: rotate(1turn);
        }
      }`}
        </style>*/}
    </div></Dashboard>
}