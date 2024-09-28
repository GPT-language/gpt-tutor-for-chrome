import { ChatState, initialChatState } from './slices/chat/initialState'
import { ChatFileState, initialFileState } from './slices/file/initialState'
import { ComponentState, initialComponentState } from './slices/component/initialState'
import { ChatUserState, initialUserState } from './slices/user/initialState'
import { ChatWordState, initialWordState } from './slices/word/initialState'
export type ChatStoreState = ChatFileState & ChatState & ComponentState & ChatUserState & ChatWordState

export const initialState: ChatStoreState = {
    ...initialFileState,
    ...initialChatState,
    ...initialComponentState,
    ...initialUserState,
    ...initialWordState,
}
