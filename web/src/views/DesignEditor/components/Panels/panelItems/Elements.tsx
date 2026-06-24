import React, { useEffect, useState } from "react"
import { useEditor } from "@layerhub-io/react"
import { useStyletron } from "baseui"
import { Block } from "baseui/block"
import { Button, SIZE } from "baseui/button"

import AngleDoubleLeft from "~/components/Icons/AngleDoubleLeft"
import Scrollable from "~/components/Scrollable"
import { graphics } from "~/constants/mock-data"
import useSetIsSidebarOpen from "~/hooks/useSetIsSidebarOpen"

const Elements = () => {
  const editor = useEditor()
  const setIsSidebarOpen = useSetIsSidebarOpen()
  const [images, setImages] = useState<string[]>([]);
  useEffect(() => {
    // @ts-expect-error
    const images = Object.values(import.meta.glob("~/assets/brand/**/*.{png,jpg,jpeg,webp,gif}", {
      eager: true,
      query: "?url"
    })).map((m: any) => m.default);
    //console.log("Images", images);
    setImages(images);
  }, [])
  const addObject = React.useCallback(
    (item: any) => {
      if (editor) {
        editor.objects.add(item)
      }
    },
    [editor]
  )

  return (
    <Block $style={{ flex: 1, display: "flex", flexDirection: "column" }}>
      <Block
        $style={{
          display: "flex",
          alignItems: "center",
          fontWeight: 500,
          justifyContent: "space-between",
          padding: "1.5rem",
        }}
      >
        <Block>Elements</Block>

        <Block onClick={() => setIsSidebarOpen(false)} $style={{ cursor: "pointer", display: "flex" }}>
          <AngleDoubleLeft size={18} />
        </Block>

      </Block>
      <Scrollable>
        {/* <Block padding={"0 1.5rem"}>
          <Button
            size={SIZE.compact}
            overrides={{
              Root: {
                style: {
                  width: "100%",
                },
              },
            }}
          >
            Computer
          </Button>
        </Block> */}
        <div>
          <Block $style={{ display: "grid", gap: "8px", padding: "1.5rem", gridTemplateColumns: "1fr 1fr 1fr 1fr" }}>
            {graphics.map((graphic, index) => (
              <ImageItem onClick={() => addObject(graphic)} key={index} preview={`data:image/svg+xml;charset=utf-8,<svg width="${graphic.width}" height="${graphic.height}" viewBox="0 0 ${graphic.width} ${graphic.height}" fill="${graphic.fill.replace("#", "%23")}" xmlns="http://www.w3.org/2000/svg"><path d="${graphic.path.map((l) => l.join(" ")).join(" ")}"></path></svg>`} />
            ))}
          </Block>

        </div>
        <div style={{ padding: "25px" }}>
          <h3>Images</h3>
          <div style={{
            display: "grid", gridTemplateColumns: "1fr 1fr", columnGap: "10px",
            rowGap: "1rem"
          }}>
            {images.map((i) => <button onClick={async (e) => {
              const image = new Image();
              image.src = i;
              await image.decode();
              const image_data = {
                type: "StaticImage",
                src: i,
                // Optional: Set initial position/size
                width: image.naturalWidth,
                height: image.naturalHeight,
                x: editor.canvas.canvas.width ? ((editor.canvas.canvas.width - image.naturalWidth) / 2) : 0,
                y: editor.canvas.canvas.height ? ((editor.canvas.canvas.height - image.naturalHeight) / 2) : 0,
              };

              await editor.objects.add(image_data);
            }} style={{ padding: 0, margin: 0, width: "fit-content", backgroundColor: "#8a8aff", borderRadius: "5px" }} key={i}>
              <img style={{ width: "100%" }} src={i}></img>
            </button>)}
          </div>
        </div>

      </Scrollable>
    </Block>
  )
}

const ImageItem = ({ preview, onClick }: { preview: any; onClick?: (option: any) => void }) => {
  const [css] = useStyletron()
  return (
    <div
      onClick={onClick}
      className={css({
        position: "relative",
        background: "#f8f8fb",
        cursor: "pointer",
        borderRadius: "8px",
        overflow: "hidden",
        ":hover": {
          opacity: 1,
          background: "rgb(233,233,233)",
        },
      })}
    >
      <img
        src={preview}
        className={css({
          width: "100%",
          height: "100%",
          objectFit: "contain",
          pointerEvents: "none",
          verticalAlign: "middle",
        })}
      />
    </div>
  )
}

export default Elements
