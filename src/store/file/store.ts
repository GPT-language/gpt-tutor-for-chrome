import { persist, PersistOptions, subscribeWithSelector } from 'zustand/middleware'
import { shallow } from 'zustand/shallow'
import { createWithEqualityFn } from 'zustand/traditional'
import { StateCreator } from 'zustand/vanilla'

import { ChatStoreState, initialState } from './initialState'
import { ChatFileAction, chatFile } from './slices/file/action'
import { ChatAction, chat } from './slices/chat/action'
import { ComponentAction, component } from './slices/component/action'
import { chatUser, ChatUserAction } from './slices/user/action'
import { chatWord, ChatWordAction } from './slices/word/action'
import { createHyperStorage } from './middleware/createHyperStorage'
import { createActionSlice, ActionSlice } from './slices/action/action'
import { createDevtools } from './middleware/createDevtools'

declare global {
    interface Window {
        __REDUX_DEVTOOLS_EXTENSION__?: any
    }
}

export type ChatStore = ChatStoreState &
    ChatFileAction &
    ChatAction &
    ComponentAction &
    ChatUserAction &
    ChatWordAction &
    ActionSlice
export const DB_NAME = 'GPT-Tutor'

//  ===============  聚合 createStoreFn ============ //

const createStore: StateCreator<ChatStore, [['zustand/devtools', never]]> = (...params) => ({
    ...initialState,
    ...chatFile(...params),
    ...chat(...params),
    ...component(...params),
    ...chatUser(...params),
    ...chatWord(...params),
    ...createActionSlice(...params),
})

//  ===============  persist 本地缓存中间件配置 ============ //
type GlobalPersist = Pick<ChatStore, 'currentFileId' | 'files' | 'currentPage' | 'actions'>

const persistOptions: PersistOptions<ChatStore, GlobalPersist> = {
    name: 'LOBE_GLOBAL',

    skipHydration: false,

    version: 10,

    storage: createHyperStorage({
        localStorage: {
            dbName: DB_NAME,
            mode: 'indexedDB',
            selectors: [
                'files',
                'currentFileId',
                'currentPage',
                'actions',
                'selectedWords',
                'selectedGroup',
                'chatUser',
                'settings',
            ],
        },
    }),
}

//  ===============  实装 useStore ============ //

const devtools = createDevtools('chat')

export const useChatStore = createWithEqualityFn<ChatStore>()(
    persist(
        subscribeWithSelector(
            devtools(createStore, {
                name: 'LobeChat_Chat',
            })
        ),
        persistOptions
    ),
    shallow
)
// 添加订阅逻辑

// 监听selectedGroup的变化，并加载对应的文件
useChatStore.subscribe(
    (state) => state.selectedGroup,
    async (selectedGroup, previousSelectedGroup) => {
        if (selectedGroup !== previousSelectedGroup) {
            const { loadFiles } = useChatStore.getState()
            loadFiles(selectedGroup)
        }
    }
)

// 监听 currentFileId 的变化
useChatStore.subscribe(
    (state) => state.currentFileId,
    (currentFileId) => {
        const { files, selectedWords, selectFile } = useChatStore.getState()
        const currentFile = files.find((file) => file.id === currentFileId)
        if (currentFile) {
            useChatStore.setState({ words: currentFile.words })
            if (currentFile.id) {
                useChatStore.setState({ selectedWord: selectedWords[currentFile.id] })
                selectFile(currentFile.id)
            }
        } else {
            useChatStore.setState({ words: [] })
        }
    }
)

// 初始化
const initializeState = () => {
    const { files, currentFileId } = useChatStore.getState()
    const currentFile = files.find((file) => file.id === currentFileId)
    if (currentFile) {
        useChatStore.setState({ words: currentFile.words })
    }
}

initializeState()
