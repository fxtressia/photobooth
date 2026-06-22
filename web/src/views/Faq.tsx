import { Link } from "react-router";
import { brandName } from "~/config";

export default function Faq() {
    return <div style={{ fontSize: "1.2rem", display: "flex", flexDirection: "column", gap: "1.6rem" }}>
        <h1 style={{textAlign: "center"}}>
            Frequently Asked Questions
        </h1>

        <div>
            <h3>
                Will the raw, uncompressed files be given?
            </h3>
            <p>
                We will send an email to all customers attached with a copy of the original JPG file, without any compression or edits except built into the camera. These images will only be guaranteed to be hosted for a period of 3 months after you take them. After that, they may be stored as long as we have space in our Google Drive.
            </p></div>
            <div>
                <h3>How can I delete all my data?</h3>
                <p>
                    Go to account settings and press "Delete my account all my data".
                    </p>
                </div>
        <div>
            <h3>
                What is encryption?
            </h3>
            <p>
                When you enable encryption, all your images will be stored in ciphered form. Staff would not be able to logically see your images without your passcode. 
               
            </p>
            <br/>
            <p>
                Although we pledge not to use your images without your consent, this feature provides you with more privacy in the booth.

                Of course, this means no one can't help you if you lose the pass code. As such, this feature is not enabled by default.
               </p>
        </div>
        <Link to="/" style={{ textAlign: "center", textDecoration: "underline", color: "#5353c6"}}>Go back to the home page.</Link>
    </div>
}