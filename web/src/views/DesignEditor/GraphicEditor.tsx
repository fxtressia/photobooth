import Navbar from "./components/Navbar"
import Panels from "./components/Panels"
import Canvas from "./components/Canvas"
import Footer from "./components/Footer/Graphic"
import Toolbox from "./components/Toolbox"
import EditorContainer from "./components/EditorContainer"
import ContextMenu from "./components/ContextMenu"
import { useEffect, } from "react"
import { useAutoSaver, useRemoteDesignLoader } from "~/utils/load-and-save"
import { useEditor } from "@layerhub-io/react"

const GraphicEditor = () => {

  const searchParams = new URLSearchParams(window.location.search);
  const designId = searchParams.get("design");
  const loader = useRemoteDesignLoader();
  const editor = useEditor();
  const autoSaver = useAutoSaver();

  useEffect(() => {
    if (editor && designId) {
      const saver = autoSaver(designId);
      loader(designId);
      const list = ["text:changed", "object:modified", "object:added", "object:removed"];
      for (let a in list) {
        editor.canvas.canvas.on(a, saver);
      }
    }

  }, [designId, editor])
  return (

    <EditorContainer>
      <Navbar />
      <div style={{ display: "flex", flex: 1 }}>
        <Panels />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", position: "relative" }}>
          <Toolbox />
          <Canvas />
          <Footer />
        </div>
      </div>
    </EditorContainer>
  )
}

export default GraphicEditor
