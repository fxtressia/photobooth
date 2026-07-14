import { createContext, useContext, type Dispatch, type SetStateAction } from "react";
import type { ToastMessage } from "../providers/ToastProvider";

interface ToastContextType {
    toast: ToastMessage | null;
    setToast: Dispatch<SetStateAction<ToastMessage | null>>;
}
export const ToastContext = createContext<ToastContextType | null>(null);

export default function useToast(){
    const ctx = useContext(ToastContext);
    if (!ctx) throw Error("ToastContext is not found. Did you run this function outside of a ToastProvider?");

    return ctx;
}