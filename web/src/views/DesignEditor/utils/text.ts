import type { IStaticText } from "@layerhub-io/types"
import { groupBy } from "lodash"
import type { IFontFamily } from "~/interfaces/editor"

export const getTextProperties = (object: Required<IStaticText>, fonts: IFontFamily[]) => {
  //console.log("getTextProperties", object, ffonts);
  
  if (!fonts || fonts.length == 0){
    throw Error("No fonts are present");
  }
  //console.log("object", object, fonts);
  const color = object.fill
  const family = object.fontFamily
  const selectedFont = fonts.find((font) => {
    //console.log("COMPARE ", font, family);
    return font.postScriptName == family
  })
  if (!selectedFont){
    throw Error(`Font ${family} could not be selected from the list of fonts`);
  }
  const groupedFonts = groupBy(fonts, "family")
  const selectedFamily = groupedFonts[selectedFont!.family];

  const hasBold = selectedFamily.find((font) => font.postScriptName.includes("-Bold"))
  const hasItalic = selectedFamily.find((font) => font.postScriptName.includes("-Italic"))
  const styleOptions = {
    hasBold: !!hasBold,
    hasItalic: !!hasItalic,
    options: selectedFamily,
  }
  return {
    color,
    family: selectedFamily[0].family,
    bold: family.includes("Bold"),
    italic: family.includes("Italic"),
    underline: object.underline,
    styleOptions,
  }
}
