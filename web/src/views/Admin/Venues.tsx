import React, { useRef, useState } from "react";
import NewVenue, { ApiKeyDisplay, type AuthData } from "./NewVenue"
import { Link, useLoaderData } from "react-router";
import useToast from "~/contexts/ToastContext";
export interface VenueData {
    id: string,
    name: string,
    is_online: string,

}
export function Venue(v: VenueData) {
    const [editable, setEditable] = useState(false);
    const [data, setData] = useState<AuthData | null>(null);
    const { setToast } = useToast();
    
    const nameRef = useRef<HTMLHeadingElement>(null);
    return <div key={v.id} style={{
        borderRadius: "15px",


        backgroundColor: "#f8ff93",
        padding: "15px",
        display: "flex",
        flexDirection: "column",
        gap: "15px"
    }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "start", gap: "15px", textAlign: "center", }}> <h3 ref={nameRef} style={{ padding: "0", fontWeight: "1rem", }} contentEditable={editable ? "plaintext-only" : "false"} suppressContentEditableWarning={true}>
            {v.name}
        </h3>
            <div style={{ color: "white", padding: "2.5px 5px 2.5px 5px", borderRadius: "5px 5px", backgroundColor: v.is_online ? "#71ab23" : "#ab3a23" }}>{v.is_online ? "Online" : "Offline"}</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "15px", }}>
            <div style={{ display: "flex", gap: "15px", flexWrap: "wrap" }}>
                <button style={{ cursor: "pointer", backgroundColor: "#fdffdc", flexGrow: "1", textAlign: "center", padding: "5px", borderRadius: "5px" }} onClick={async (e) => {
                    if (editable) {
                        const name = nameRef.current?.innerText.trim().split("\n")[0];
                        console.log("name", name);
                        if (!name) {
                            setToast({ isError: true, text: "Venue name can't be empty." })
                            return;
                        }
                        const res = await fetch("/api/admin/venues/update", {
                            method: "PATCH",
                            headers: {
                                "Content-Type": "application/json"
                            },
                            body: JSON.stringify({ id: v.id, name })
                        });

                        if (res.ok) {
                            setToast({ isError: false, text: `Venue name updated to ${name}` });
                            setEditable(false);
                        } else {

                            setToast({ isError: true, text: `Error in fetching: ${res.status} ${res.statusText} ${await res.text()}` });


                        }


                    } else {

                        setEditable(true);
                    }
                }}>
                    {editable ? "Save" : "Rename"}
                </button>
                <button style={{ cursor: "pointer", backgroundColor: "#fdffdc", flexGrow: "1", textAlign: "center", padding: "5px", borderRadius: "5px" }} onClick={async () => {
                    const proceed = window.confirm(`Reset API key for venue "${v.name}"? This action will immediately crash your kiosk application, if running, and cannot be undone.`);
                    if (proceed) {
                        const res = await fetch("/api/admin/venues/reset-token", {
                            method: "PATCH", headers: {
                                "Content-Type": "application/json"
                            }, body: JSON.stringify({ id: v.id })
                        });

                        if (res.ok) {
                            setData(await res.json());
                        } else {

                            setToast({ isError: true, text: `Error in fetching: ${res.status} ${res.statusText} ${await res.text()}` });


                        }
                    }
                }}>
                    Reset API Key
                </button>
                <button style={{ cursor: "pointer", backgroundColor: "#fdffdc", flexGrow: "1", textAlign: "center", padding: "5px", borderRadius: "5px" }} onClick={async () => {
                    const proceed = window.confirm(`Delete venue "${v.name}"? This action will immediately crash your kiosk application, if running, and cannot be undone.`);
                    if (proceed) {
                        const res = await fetch("/api/admin/venues/delete", {
                            method: "POST", headers: {
                                "Content-Type": "application/json"
                            }, body: JSON.stringify({ id: v.id })
                        });

                        if (res.ok) {
                            setToast({ isError: false, text: `Deleted venue ${v.name}`});
                        } else {

                            setToast({ isError: true, text: `Error in fetching: ${res.status} ${res.statusText} ${await res.text()}` });


                        }
                    }
                }}>
                    Delete
                </button>
            </div>
            {data?.rawKey && <ApiKeyDisplay name={v.name} data={data}></ApiKeyDisplay>}
        </div>
    </div>
}

export default function Venues() {
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

    return <div style={{ display: "flex", gap: "15px", flexDirection: "column" }}>
        <h2>
            Venues
        </h2>
        <div style={{ display: "flex", gap: "25px", flexDirection: "column" }}>
            {data.venues.length > 0 ? data.venues.map((v: VenueData) => {
                return Venue(v);
            }) : <div style={{ padding: "25px", display: "flex", justifyContent: "center", alignItems: "center", gap: "15px", flexDirection: "column" }}>
                <h3>
                    You have not created any venues
                </h3>


            </div>}
            <div style={{ display: "flex", gap: "15px", flexDirection: "column" }}>
                <h2>Create a new venue</h2>
                <NewVenue></NewVenue>
            </div>

        </div>
    </div >
}