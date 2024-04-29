import { devtools, subscribeWithSelector } from 'zustand/middleware'
import { shallow } from 'zustand/shallow'
import { createWithEqualityFn } from 'zustand/traditional'
import { StateCreator } from 'zustand/vanilla'

import { ChatStoreState, initialState } from './initialState'
import { ChatMessageAction, chatMessage } from './slices/message/action'
import { ChatTopicAction, chatTopic } from './slices/topic/action'

export interface ChatStoreAction extends ChatMessageAction, ChatTopicAction {}

export type ChatStore = ChatStoreAction & ChatStoreState

//  ===============  聚合 createStoreFn ============ //

const createStore: StateCreator<ChatStore, [['zustand/devtools', never]]> = (...params) => ({
    ...initialState,

    ...chatMessage(...params),
    ...chatTopic(...params),
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
