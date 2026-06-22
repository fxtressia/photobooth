import { useEffect, useState } from "react";
import { Form } from "react-router";
import { tiers } from "~/config";

export default function Session(is_admin: boolean) {
    return (data) => {
        const date = new Date(data.created_at * 1000);
        const [dateStr, setDateStr] = useState(date.toUTCString());
        const [verifyEnabled, setVerifyEnabled] = useState(false);
        useEffect(() => {
            setDateStr(date.toString())
        }, []);
        
        

        const session = (<div key={data.id} style={{ display: "flex", flexDirection: "column", gap: "25px", backgroundColor: data.authorized ? "#b5fb5a" :  "#f5ff63", borderRadius: "15px", padding: "10px" }}><div><h4>
            {tiers[data.tier].name} - Purchase Date: {dateStr}

        </h4>
        {(() => { if (is_admin){
                return <p>{tiers[data.tier].price}</p>
        }})()}

            {(() => {
                if (data.authorized && !is_admin) {
                    return <div>Press here and scan the machine!</div>
                } else {

                    return <><div style={{ display: "flex", justifyContent: "space-between" }}>
                        <p>Waiting for authorization...</p>
                        {(() => {
                            if (is_admin) {
                                return <></>
                            } else {
                                return <a style={{ textDecoration: "underline", fontWeight: "bold" }} target="_blank" href={data.payment_proof}>Proof of Payment</a>;

                            }
                        })()}


                    </div>
                        
                    </>

                }
            })()}
            </div>
            <div style={{display: "flex", gap:"5px", flexDirection: "column"}}>
                {(() => {
                    if (is_admin) {
                        return <>
                            <a onClick={() => { setVerifyEnabled(true) }} style={{
                                textAlign: "center",
                                width: "stretch", backgroundColor: "#f8fdb5", padding: "5px", borderRadius: "5px"
                            }} target="_blank" href={data.payment_proof}>See Proof of Payment</a>

                            <form action={`/api/admin/${data.authorized ? 'de' : ''}verify-payment?id=${data.id}`} method="post">
                                <button disabled={!verifyEnabled}  style={{ backgroundColor: "#f8fdb5", width: "stretch", textAlign: "center", padding: "5px", borderRadius: "5px" }}>
                                    {data.authorized ? 'Dev' : 'V'}erify Payment
                                </button>
                            </form></>;
                    } else {
                        return <></>;
                    }
                })()}
                </div>
        </div>);

        if (data.authorized == 1 && !is_admin){
            return <a key={data.id}  href={`/me/launch?session=${data.id}`}>
                {session}
            </a>
        } else {
            return session;
        }

    }
}