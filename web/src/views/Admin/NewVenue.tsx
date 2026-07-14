import { useState } from "react";
import useToast from "~/contexts/ToastContext";
interface VenueCreateResponse extends AuthData {

    name: string,
}

export interface AuthData {

    rawKey: string,
}
export function ApiKeyDisplay({ data, name }: { data: AuthData, name: string }) {
    const { setToast } = useToast();
    const [isRevealed, setIsRevealed] = useState(false);
    return <div style={{ display: "flex", gap: "15px", flexDirection: "column" }}>
        <h4>Success! Written below is the API key for venue "{name}".</h4>
        <code style={{ padding: "15px", background: "#f8fdb5" }}>{isRevealed ? data?.rawKey : "*".repeat(data?.rawKey.length)}</code>
        <div style={{
            display: "flex", gap: "5px"
        }}><button style={{

            width: "stretch",
            background: "#f8fdb5", padding: "5px",
        }} onClick={async () => {
            setIsRevealed(!isRevealed);
        }}>
                Reveal
            </button>
            <button style={{
                width: "stretch",
                background: "#f8fdb5", padding: "5px",
            }} onClick={async () => {
                if (data?.rawKey) {
                    await navigator.clipboard.writeText(data?.rawKey);
                    setToast({ isError: false, text: "API key copied to clipboard!" })
                }
            }}>
                Copy to Clipboard
            </button></div>

    </div>;
}
export default function NewVenue() {
    const [data, setData] = useState<VenueCreateResponse | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { setToast } = useToast();
    return <>
        <div style={{ width: "stretch", borderRadius: "15px", backgroundColor: "#b5fb5a", padding: "10px", display: "flex", gap: "15px", flexDirection: "column" }}>
            {
                data?.rawKey ? <ApiKeyDisplay name={data.name} data={data}></ApiKeyDisplay> : <form onSubmit={async (e: React.SubmitEvent<HTMLFormElement>) => {
                    e.preventDefault();
                    const name = new FormData(e.currentTarget).get("name");
                    if (!name) return setToast({ isError: true, text: `Missing name in your venue!` });

                    setIsSubmitting(true);
                    const res = await fetch("/api/admin/venues/create", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ name })
                    });

                    if (res.ok) {
                        setData(await res.json());
                    } else {
                        setToast({ isError: true, text: `Error in fetching: ${res.status} ${res.statusText} ${await res.text()}` });

                    }
                    setIsSubmitting(false);

                }} style={{ display: "flex", flexDirection: "column", gap: "15px" }}>

                    <div style={{ display: "flex", gap: "5px", flexDirection: "column" }}>
                        <h3>Name:</h3>
                        <input style={{ width: "stretch", }} name="name" type="text" />
                    </div>

                    <button type="submit" style={{ cursor: "pointer", borderRadius: "10px", width: "stretch", fontSize: "1rem", backgroundColor: "#f8fdb5", padding: "5px", }} disabled={isSubmitting}>{isSubmitting ? "Submitting" : "Create!"}</button>


                </form>
            }
        </div>

    </>
}

