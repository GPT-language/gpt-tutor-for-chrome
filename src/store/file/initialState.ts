import { ChatState, initialChatState } from './slices/chat/initialState'
import { ChatFileState, initialFileState } from './slices/file/initialState'

export type ChatStoreState = ChatFileState & ChatState

export const initialState: ChatStoreState = {
    ...initialFileState,
    ...initialChatState,
}
