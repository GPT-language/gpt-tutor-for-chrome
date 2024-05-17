import { ChatFileState, initialFileState } from './slices/file/initialState'

export type ChatStoreState = ChatFileState

export const initialState: ChatStoreState = {
    ...initialFileState,
}
