import type { RootState } from "~/store/rootReducer"

export const selectComponents = (state: RootState) => state.components.components
export const selectPublicComponents = (state: RootState) => state.components.public