import { ChatFileState, initialFileState } from './slices/translation/initialState'

export type ChatStoreState = ChatFileState

export const initialState: ChatStoreState = {
    ...initialFileState,
}
