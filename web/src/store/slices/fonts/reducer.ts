import Fuse from 'fuse.js'
import type { IFontFamily } from "~/interfaces/editor"
import { createReducer } from "@reduxjs/toolkit"
import { queryFonts, setFonts } from "./actions"
import { useMemo } from "react"

export interface FontsState {
  fonts: IFontFamily[]
  result: IFontFamily[]
}

const initialState: FontsState = {
  fonts: [],
  result: [],
}
/*
function fuzzySearch(items: IFontFamily[], query: string) {
  if (!query || !query.trim()) return items;
  // const fuse = useMemo(() => {
 
  // }, [])
  const results = fuse.search(query);
  return results.map(({ item }) => item);
    
  //let search = query.toLowerCase().split(/\s+/);*/
  /*
  let ret = items.reduce((found, i) => {
    let matches = 0
    search.forEach((s) => {
      let props = 0
      for (let prop in i) {
        // @ts-ignore
        if (i[prop].indexOf(s) > -1) {
          props++
        }
      }
      if (props >= 1) {
        matches++
      }
    })
    if (matches == search.length) {
      // console.log(i, found, 'was found');
      // @ts-ignore
      found.push(i)
    }
    return found
  }, [])*//*

  

}
*/
let fuse: Fuse<IFontFamily> | null = null;

export const fontsReducer = createReducer(initialState, (builder) => {
  console.log("Hello")!;
  builder.addCase(setFonts, (state, { payload }) => {
    state.fonts = payload[0];
    fuse = new Fuse(payload[0], {
      keys: ['family', 'fullName', 'category'], // fields to search
      threshold: 0.4,            // 0 = exact, 1 = match anything
    });
    console.log("FUSEDDD", payload[0]);
    state.result = payload[0].slice(0, 100)
    console.log("FUSED POST", state.result)

  })

  builder.addCase(queryFonts, (state, { payload }) => {
    const { take, skip, query } = payload
    if (query && fuse) {
      const results = fuse.search(query);
       console.log("PRE FUSED", state.result)
      state.result = results.map(({ item }) => item)
       console.log("POST", state.result)
    } else {
      console.log("PRE DEFUSED", state.result);
       state.result = state.fonts.slice(0, (skip + 1) * (take || 100))
       console.log("POST", state.result)
    }
    // const data = fuzzySearch(state.fonts, "open")
    // console.log(data)
  })
})
