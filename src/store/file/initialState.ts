import { ChatState, initialChatState } from './slices/chat/initialState'
import { ChatFileState, initialFileState } from './slices/file/initialState'
import { ComponentState, initialComponentState } from './slices/component/initialState'

export type ChatStoreState = ChatFileState & ChatState & ComponentState

export const initialState: ChatStoreState = {
  ...initialFileState,
  ...initialChatState,
  ...initialComponentState,
}
