import { useState } from "react"
import { styled } from "baseui"
import type { Theme } from "baseui/theme"
import Common from "./Common"
import Scenes from "./Scenes"
import { ScenesEnabledContext } from "~/views/DesignEditor/utils/scenes";
const Container = styled<"div", {}, Theme>("div", ({ $theme }) => ({
  background: $theme.colors.white,
}))

const Graphic = () => {
  const [enabled, setEnabled] = useState(false);
  return (
    <div style={{position: "sticky", bottom: "0", right: "0"}}>
    <Container>
      <ScenesEnabledContext.Provider value={{ enabled, setEnabled}}>
        
            <Scenes />
        
      
      <Common />

        </ScenesEnabledContext.Provider>
    </Container>
    </div>
  )
}

export default Graphic
