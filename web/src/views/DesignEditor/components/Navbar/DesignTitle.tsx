
import { Block } from "baseui/block"
import CloudCheck from "~/components/Icons/CloudCheck"
import { StatefulTooltip } from "baseui/tooltip"
import useDesignEditorContext from "~/hooks/useDesignEditorContext"
import { useAutoSaver, useSavingState } from "~/utils/load-and-save"
interface State {
  name: string
  width: number
}

const DesignTitle = () => {

  const autoSaver = useAutoSaver();

  const { savingState, setSavingState } = useSavingState();
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
        onBlur={(e) => {
          const searchParams = new URLSearchParams(window.location.search);
          const designId = searchParams.get("design");
          const newName = e.currentTarget.textContent || "";
          //setText(newName);
          setCurrentDesign({ ...currentDesign, name: newName });
          autoSaver(designId)(null);
          
        }}
        style={{

          fontFamily: "Tenor Sans",
          width: "fit-content",
          fontSize: "0.9rem",
          fontWeight: 300,
        }}

      >
        {currentDesign?.name || "Untitled Design"}
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
        content={() => <Block backgroundColor="#ffffff">{
          ((savingState == 0) && <p>Some changes have not been saved.</p>) || ((savingState == 1) && <p>Saving</p>) || ((savingState == 2) && <p>All changes saved</p>) || (savingState instanceof Error && <><p>{savingState.message}</p><p>{savingState.stack}</p></>)
        }
        </Block>}
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
