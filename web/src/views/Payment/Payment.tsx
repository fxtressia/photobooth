
import { Form, useLoaderData, useParams } from "react-router";
import { tiers, paymentMessage } from "~/config";
import { TiersList } from "../TiersList/TiersList";
import { useSearchParams } from "react-router";
import Brand from "./brand";
import { useEffect } from "react";


const Payment = () => {
    const data = useLoaderData();
    const [searchParams, _setSearchParams] = useSearchParams();
    const tierId = searchParams.get("tier");
  
    if (tierId != undefined) {
        if (!("sub" in data)) {
            useEffect(() => {
                window.location.replace("/auth/login");
            }, [])
            return <div>You need to log in in order to purchase.</div>
        }
        const tier = tiers[tierId];
        return <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
            <div>
                <h1>Complete the transaction</h1>
                <p>{tier.name} - {tier.price}</p>
            </div>
            
            {paymentMessage}
            <Brand sub={ 'sub' in data ? data['sub'] : "null"} tier={tier}></Brand>
            {/*
            <Form action={`/api/sessions/pay?tier=${tierId}`} method="post" encType="multipart/form-data" style={{display: "flex", flexDirection: "column", gap: "15px"}}>
                <div style={{
                    display: "flex", 
                    flexDirection: "column"
                }}>
                    <label htmlFor="proof" style={{fontWeight: "bold"}}>Proof of Payment</label>
                    <input name="proof" type="file" accept="image/*,.pdf" required />
                   
                </div>
                <div>
                    <button style={{ backgroundColor:"#71ab23", padding: "5px", borderRadius: "15px", width: "stretch"}}>Submit</button>
                </div>
            </Form>
*/}
        </div>
    } else {
        return <TiersList />
    }

}

export default Payment
