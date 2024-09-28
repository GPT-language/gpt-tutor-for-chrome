import { devtools, subscribeWithSelector } from 'zustand/middleware'
import { shallow } from 'zustand/shallow'
import { createWithEqualityFn } from 'zustand/traditional'
import { StateCreator } from 'zustand/vanilla'

import { ChatStoreState, initialState } from './initialState'
import { ChatFileAction, chatFile } from './slices/file/action'
import { ChatAction, chat } from './slices/chat/action'
import { ComponentAction, component } from './slices/component/action'
import { chatUser, ChatUserAction } from './slices/user/action'
import { chatWord, ChatWordAction } from './slices/word/action'

export type ChatStore = ChatStoreState & ChatFileAction & ChatAction & ComponentAction & ChatUserAction & ChatWordAction

//  ===============  聚合 createStoreFn ============ //

const createStore: StateCreator<ChatStore, [['zustand/devtools', never]]> = (...params) => ({
    ...initialState,
    ...chatFile(...params),
    ...chat(...params),
    ...component(...params),
    ...chatUser(...params),
    ...chatWord(...params),
})

//  ===============  实装 useStore ============ //

export const useChatStore = createWithEqualityFn<ChatStore>()(
    subscribeWithSelector(
        devtools(createStore, {
            name: 'LobeChat_Chat',
        })
    ),
    shallow
)
