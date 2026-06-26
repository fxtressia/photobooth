import React from "react"
import { Input } from "baseui/input"
import { Block } from "baseui/block"
import CloudCheck from "~/components/Icons/CloudCheck"
import { StatefulTooltip } from "baseui/tooltip"
import useDesignEditorContext from "~/hooks/useDesignEditorContext"

interface State {
  name: string
  width: number
}

const DesignTitle = () => {
  const [text, setText] = React.useState<string>( "Untitled Design")

  const { currentDesign, setCurrentDesign } = useDesignEditorContext();
  return (
    <Block
      $style={{
        display: "flex",
        alignItems: "center",
        width: "fit-content",
        justifyContent: "center",
        color: "#ffffff",
        opacity: 1,
      
      }}
    >
   
        <span
        contentEditable="plaintext-only"
        suppressContentEditableWarning={true}
        onInput={(e) => {
          
          const newName = e.currentTarget.textContent || "";
          //setText(newName);
          setCurrentDesign({ ...currentDesign, name: newName })
        }}
          style={{
        
            fontFamily: "Tenor Sans",
            width: "fit-content",
            fontSize: "0.9rem",
            fontWeight: 300,
          }}
     
        >
          {text}
        </span>
  
  

      <StatefulTooltip
        showArrow={true}
        overrides={{
          Inner: {
            style: {
              backgroundColor: "#ffffff",
            },
          },
        }}
        content={() => <Block backgroundColor="#ffffff">All changes are saved</Block>}
      >
        <Block
          $style={{
            cursor: "pointer",
            padding: "10px",
            display: "flex",
            color: "#ffffff",
          }}
        >
          <CloudCheck size={24} />
        </Block>
      </StatefulTooltip>
    </Block>
  )
}

export default DesignTitle
