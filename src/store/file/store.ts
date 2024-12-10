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
import { SavedFile, Content, Action } from '@/common/internal-services/db'
import toast from 'react-hot-toast'

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

    version: 1,

    storage: createHyperStorage({
        localStorage: {
            dbName: DB_NAME,
            mode: 'indexedDB',
            selectors: [
                'files',
                'currentFileId',
                'currentPage',
                'actions',
                'currentWordPositions',
                'selectedGroup',
                'chatUser',
                'settings',
            ],
        },
    }),
    migrate: (persistedState: any, version: number) => {
        try {
            if (version === 11) {
                return {
                    ...persistedState,
                    files: persistedState.files.map((file: SavedFile) => ({
                        ...file,
                        words: file.words.map((word: Content) => {
                            const { ...restWord } = word
                            return restWord
                        }),
                    })),
                    currentWordPositions: persistedState.selectedWords || {},
                }
            }
        } catch (error) {
            toast.error('数据迁移失败，请联系支持团队。')
            console.error('Error migrating state:', error)
        }
        return persistedState
    },
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
        const { files, currentWordPositions: selectedWords, selectFile } = useChatStore.getState()
        const currentFile = files.find((file) => file.id === currentFileId)
        if (currentFile) {
            useChatStore.setState({ words: currentFile.words })
            if (currentFile.id) {
                const currentWordIdx = selectedWords[currentFile.id]
                const currentWord = currentFile.words.find((word) => word.idx === currentWordIdx)
                useChatStore.setState({ selectedWord: currentWord })
                selectFile(currentFile.id)
            }
        } else {
            useChatStore.setState({ words: [] })
        }
    }
)

// 同时监听 actions 和 selectedGroup 的变化
useChatStore.subscribe(
    (state) => ({
        actions: state.actions as Action[], // 明确指定类型
        selectedGroup: state.selectedGroup,
    }),
    (current) => {
        const { setSelectedActions } = useChatStore.getState()

        if (!current.actions || !Array.isArray(current.actions)) {
            setSelectedActions([])
            return
        }

        const filteredActions = current.actions.filter((action) => {
            if (action.groups && action.groups.length > 0) {
                return action.groups.includes(current.selectedGroup)
            }
            return false
        })

        setSelectedActions(filteredActions)
    },
    {
        equalityFn: shallow,
    }
)

useChatStore.subscribe(
    (state) => ({
        actions: state.actions as Action[],
        selectedGroup: state.selectedGroup,
    }),
    (current) => {
        const { setSelectedActions, setActionGroups } = useChatStore.getState()
        console.log('current')
        if (!current.actions || !Array.isArray(current.actions)) {
            setSelectedActions([])
            setActionGroups([])
            return
        }
        console.log('current.actions', current.actions)
        // 设置 actionGroups
        setActionGroups(current.actions)

        const filteredActions = current.actions.filter((action) => {
            if (action.groups && action.groups.length > 0) {
                return action.groups.includes(current.selectedGroup)
            }
            return false
        })

        setSelectedActions(filteredActions)
    },
    {
        equalityFn: shallow,
    }
)

// 监听 conversationHistory 的变化，自动保存到 IndexedDB
useChatStore.subscribe(
    (state) => ({
        conversationHistory: state.conversationHistory,
        selectedWord: state.selectedWord,
        activatedActionName: state.activatedActionName,
    }),
    (current, prev) => {
        if (
            current.conversationHistory !== prev.conversationHistory &&
            current.selectedWord &&
            current.activatedActionName
        ) {
            const { saveConversationToAnswer } = useChatStore.getState()
            saveConversationToAnswer(current.activatedActionName)
        }
    },
    {
        equalityFn: shallow,
    }
)

// 监听 activatedActionName 或 selectedWord 的变化
useChatStore.subscribe(
    (state) => ({
        activatedActionName: state.activatedActionName,
        selectedWord: state.selectedWord,
    }),
    (current, prev) => {
        if (current.activatedActionName !== prev.activatedActionName || current.selectedWord !== prev.selectedWord) {
            const { loadConversationFromAnswer } = useChatStore.getState()
            if (current.activatedActionName) {
                loadConversationFromAnswer(current.activatedActionName)
            }
        }
    },
    {
        equalityFn: shallow,
    }
)

// 监听 selectedWord 的变化，初始化 conversationHistory
useChatStore.subscribe(
    (state) => ({
        selectedWord: state.selectedWord,
        activatedActionName: state.activatedActionName,
    }),
    (current) => {
        if (current.selectedWord?.answers && current.activatedActionName) {
            const answer = current.selectedWord.answers[current.activatedActionName]
            if (answer?.conversationMessages) {
                useChatStore.setState({
                    conversationHistory: answer.conversationMessages,
                })
            } else {
                // 如果没有历史对话，则清空对话历史
                useChatStore.setState({
                    conversationHistory: [],
                })
            }
        }
    },
    {
        equalityFn: shallow,
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
