import { useEffect, useState } from "react";
import { Form } from "react-router";

export default function Session(is_admin: boolean) {
    return (data) => {
        const date = new Date(data.created_at * 1000);
        const [dateStr, setDateStr] = useState(date.toUTCString());
        const [verifyEnabled, setVerifyEnabled] = useState(false);
        useEffect(() => {
            setDateStr(date.toString())
        }, []);


        return (<div key={data.id} style={{  display: "flex", flexDirection: "column", gap: "25px", backgroundColor: "#f5ff63", borderRadius: "15px", padding: "10px" }}><div><h4>
            {dateStr}

        </h4>

            {(() => {
                if (data.authorized) {
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

                            <Form action="verify-payment">
                                <button disabled={!verifyEnabled}  style={{ backgroundColor: "#f8fdb5", width: "stretch", textAlign: "center", padding: "5px", borderRadius: "5px" }}>
                                    Verify Payment
                                </button>
                            </Form></>;
                    } else {
                        return <></>;
                    }
                })()}
                </div>
        </div>);



    }
}