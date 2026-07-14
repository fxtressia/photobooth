import { useEffect, useState } from "react";
import { ToastContext } from "../contexts/ToastContext";
export interface ToastMessage {
    text: string,
    isError: boolean,
}
export default function ToastProvider({ children }: { children: React.ReactNode }) {

    const [toast, setToast] = useState<ToastMessage | null>(null);
    useEffect(() => {
        if (!toast) return;
        const id = setTimeout(() => {

            setToast(null)

        }, 5000);

        return () => clearTimeout(id);
    }, [toast])
    return <ToastContext.Provider value={{ setToast, toast }}>
        {toast && <div style={{
            zIndex: "25",
            position: "fixed", bottom: "25px", right: "25px", paddingTop: "5px", paddingBottom: "5px", paddingLeft: "15px", paddingRight: "15px",
            color: "white", fontWeight: "bold", backgroundColor: !toast.isError ? "#71ab23" : "#ab3a23"
        }}>
            {toast.text}
        </div>}
        {children}
    </ToastContext.Provider>
}