import type { RootState } from "~/store/rootReducer"

export const selectPages = (state: RootState) => state.designEditor.pages
