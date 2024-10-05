import { devtools, persist, PersistOptions, subscribeWithSelector } from 'zustand/middleware'
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

    version: 4,

    storage: createHyperStorage({
        localStorage: {
            dbName: DB_NAME,
            mode: 'indexedDB',
            selectors: ['files', 'currentFileId', 'currentPage', 'actions'],
        },
    }),
}

//  ===============  实装 useStore ============ //

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

const updateWords = () => {
    const { files, currentFileId } = useChatStore.getState()
    const currentFile = files.find((file) => file.id === currentFileId)
    useChatStore.setState({ words: currentFile ? currentFile.words : [] })
}

// 监听 files 的变化
useChatStore.subscribe((state) => state.files, updateWords, { equalityFn: shallow })

// 监听 currentFileId 的变化
useChatStore.subscribe((state) => state.currentFileId, updateWords)

// 初始化
updateWords()
