import { useState } from "react";
import { SavingStateContext } from ".";

export function SavingStateProvider({ children }: { children: React.ReactNode }) {
    const [savingState, setSavingState] = useState<number | Error>(0);
    return <SavingStateContext.Provider value={{ savingState, setSavingState }}> {children} </SavingStateContext.Provider >
}
