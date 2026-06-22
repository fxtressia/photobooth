import React from "react"
//import { Provider as ScenifyProvider } from "@layerhub-io/react"
//import { Client as Styletron } from "styletron-engine-atomic"
//import { Provider as StyletronProvider } from "styletron-react"
//import { BaseProvider, LightTheme } from "baseui"
//import { store } from "./store/store"
//import { Provider as ReduxProvider } from "react-redux"
//import { AppProvider } from "./contexts/AppContext"
//import { DesignEditorProvider } from "./contexts/DesignEditor"
import { I18nextProvider } from "react-i18next"
//import { TimerProvider } from "@layerhub-io/use-timer"
import i18next from "i18next"
import "./translations"

//const engine = new Styletron()

const Provider = ({ children }: { children: React.ReactNode }) => {
  return (


    <I18nextProvider i18n={i18next}>{children}</I18nextProvider>



  )
}

export default Provider
/*<BaseProvider theme={LightTheme}>
 </BaseProvider>
    < TimerProvider >
    <AppProvider>
      <ScenifyProvider>
      <StyletronProvider value={engine}></StyletronProvider>
         </StyletronProvider >
   </ScenifyProvider>
    </AppProvider >
      </TimerProvider >
{/*<ReduxProvider store={store}>
          <DesignEditorProvider>
          {/* </DesignEditorProvider>
    </ReduxProvider>
          */
