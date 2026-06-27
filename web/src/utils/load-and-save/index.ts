
import type { Editor } from "../../../../../layerhub-io/packages/core/dist";
import { SavingStateProvider } from "./state"
export { SavingStateProvider };
import { loadTemplateFonts } from "~/utils/fonts"
import { loadVideoEditorAssets } from "~/utils/video"
import type { IDesign } from "~/interfaces/DesignEditor";
import type { IScene } from "@layerhub-io/types";
import { useEditor } from "@layerhub-io/react";
import useDesignEditorContext from "~/hooks/useDesignEditorContext";
import { useSearchParams } from "react-router";
import { createContext, useContext, useRef, useState, type Dispatch, type SetStateAction } from "react";


export function useTemplateLoader() {
    const editor = useEditor();

    return async (payload: IDesign) => {
        if (!editor) return;
        return await loadGraphicTemplate(payload, editor);

    };
}

export function useAutoSaver() {
    const timer = useRef<any | null>(null);
    const saver = useRemoteDesignSaver();
    const { setSavingState } = useSavingState();
    return (designId: string | null) => (_: any) => {
        setSavingState(0);
        //console.log("Got event.")
        if (timer.current) {
            clearTimeout(timer.current);
        }
        timer.current = setTimeout(() => {
            saver(designId)
        }, 7500)

    };
}

export function useRemoteDesignLoader() {
    const loader = useJSONImporter();
    return (id: string | null) => {
        loadRemoteDesign(id, loader);
    };
}
export async function loadRemoteDesign(id: string | null, loader: any) {
    if (!id) return;
    const res = await (await fetch(`/api/me/designs/${id}?format=fd`)).formData();
    const currentStateBlob = res.get("current_state") as Blob;
    const historyStack = res.get("history_stack") as Blob;
    //const metadataBlob = res.get("metadata") as Blob;
    if (!currentStateBlob || !historyStack /*|| !metadataBlob*/) {
        throw Error("The following data is missing from fetching design data from backend: " + (currentStateBlob ? "" : "current_state ") + (historyStack ? "" : "history_stack ") + (/*metadataBlob ? "" : "metadata "*/""));
    }

    //const metadata = JSON.parse(await metadataBlob.text());

    const decompressedStream = currentStateBlob.stream().pipeThrough(new DecompressionStream('deflate'));
    const response = new Response(decompressedStream);

    const rawJsonText = await response.text();
    if (rawJsonText && rawJsonText != "undefined") {

        const canvasState = JSON.parse(rawJsonText);

        loader(canvasState);
    }


}
function deflateCompress(blob: Blob) {
    const compressionStream = blob.stream().pipeThrough(new CompressionStream("deflate"));
    return new Response(compressionStream);
}
export function useRemoteDesignSaver() {
    const parser = useJSONParser();
    const { currentDesign } = useDesignEditorContext();
    const [searchParams, setSearchParams] = useSearchParams();
    const { savingState, setSavingState } = useSavingState();
    return async (id: string | null) => {
        setSavingState(1);
        const json = parser();
        const blob = new Blob([JSON.stringify(json)]);

        const compressedBlob = await deflateCompress(blob).blob();
        const compressedHistoryBlob = await deflateCompress(new Blob([JSON.stringify([])])).blob();
        const formData = new FormData();
        formData.append("current_state", compressedBlob);
        formData.append("name", currentDesign?.name || "Untitled Design");
        formData.append("history_stack", compressedHistoryBlob);
        formData.append("aspect_ratio", (currentDesign.frame.width / currentDesign.frame.height).toString());
        let res;
        if (id) {
            res = await fetch("/api/me/designs/" + id, {
                method: "PATCH",
                body: formData,

            });

        } else {
            res = await fetch("/api/me/designs/new?contents_attached=yes", {
                method: "POST",
                body: formData,

            });
            if (res.ok) {
                const { id } = await res.json();

                setSearchParams({ design: id }, { replace: true });
                
            }
        }

        if (!res.ok) {
            const err = Error(`${await res.text()} \n\n${res.status} ${res.statusText}`);
            setSavingState(err);
            throw err;

        } else {
            setSavingState(2);
        }


        return true;
    }
}

export async function loadGraphicTemplate(payload: IDesign, editor: Editor) {
    const scenes = []
    const { scenes: scns, ...design } = payload

    for (const scn of scns) {
        const scene: IScene = {
            name: scn.name,
            frame: payload.frame,
            id: scn.id,
            layers: scn.layers,
            metadata: {},
        }
        const loadedScene = await loadVideoEditorAssets(scene)
        await loadTemplateFonts(loadedScene)

        const preview = (await editor.renderer.render(loadedScene)) as string
        scenes.push({ ...loadedScene, preview })
    }

    return { scenes, design }
}
export function useJSONParser() {
    const { currentDesign, scenes } = useDesignEditorContext();

    const editor = useEditor();
    return () => {
        return parseJSON(editor, currentDesign, scenes);
    }
}
export function useJSONImporter() {
    const { setScenes, setCurrentDesign, } = useDesignEditorContext()
    const loader = useTemplateLoader();
    return async (data: any) => {
        let template = await loader(data);
        //   @ts-ignore
        setScenes(template.scenes);
        //   @ts-ignore
        setCurrentDesign(template.design);
    }
}
export function parseJSON(editor: Editor, currentDesign: IDesign | null, scenes: IScene[]) {

    const currentScene = editor.scene.exportToJSON();

    const updatedScenes = scenes.map((scn) => {
        if (scn.id === currentScene.id) {
            return {
                id: currentScene.id,
                layers: currentScene.layers,
                name: currentScene.name,
            }
        }
        return {
            id: scn.id,
            layers: scn.layers,
            name: scn.name,
        }
    })

    if (currentDesign) {
        const graphicTemplate: IDesign = {
            id: currentDesign.id,
            //  type: "GRAPHIC",
            name: currentDesign.name,
            frame: currentDesign.frame,
            scenes: updatedScenes,
            metadata: {},
            previews: [],
            published: false,
        }
        return graphicTemplate;
    } else {
        console.log("NO CURRENT DESIGN")
        return null;
    }
}


interface SavingStateContextType {
    savingState: number | Error;
    setSavingState: Dispatch<SetStateAction<number | Error>>;
}
export const SavingStateContext = createContext<SavingStateContextType | null>(null);

export function useSavingState() {
    const enabled = useContext(SavingStateContext);

    if (!enabled) throw new Error('useSavingState must be used within a SavingState.Provider');

    return enabled
}

