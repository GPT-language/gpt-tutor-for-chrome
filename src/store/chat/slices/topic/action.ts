import { produce } from 'immer'
import { SWRResponse, mutate } from 'swr'
import { StateCreator } from 'zustand/vanilla'
import { useClientDataSWR } from '@/libs/swr'
import { messageService } from '@/common/internal-services/message'
import { topicService } from '@/common/internal-services/topic'
import { ChatStore } from '@/store/chat'
import { Topic } from '@/common/internal-services/db'
import { setNamespace } from '@/utils/storeDebug'

import { chatSelectors } from '../message/selectors'
import { topicSelectors } from './selectors'

const n = setNamespace('topic')

const SWR_USE_FETCH_TOPIC = 'SWR_USE_FETCH_TOPIC'

export interface ChatTopicAction {
    favoriteTopic: (id: string, favState: boolean) => Promise<void>
    openNewTopicOrSaveTopic: () => Promise<void>
    refreshTopic: () => Promise<void>
    removeAllTopics: () => Promise<void>
    removeSessionTopics: () => Promise<void>
    removeTopic: (id: string) => Promise<void>
    saveToTopic: () => Promise<string | undefined>
    setTopicTitle: (topicId: string, topicTitle: string) => Promise<void>
    switchTopic: (id?: string) => Promise<void>
    updateTopicTitleInSummary: (id: string, title: string) => void
    updateTopicLoading: (id?: string) => void
    updateTopicTitle: (id: string, title: string) => Promise<void>
    useFetchTopics: (activeTopicId?: string) => SWRResponse<Topic[]>
}

export const chatTopic: StateCreator<ChatStore, [['zustand/devtools', never]], [], ChatTopicAction> = (set, get) => ({
    // create
    openNewTopicOrSaveTopic: async () => {
        const { switchTopic, saveToTopic, refreshMessages, activeTopicId } = get()
        const hasTopic = !!activeTopicId

        if (hasTopic) switchTopic()
        else {
            await saveToTopic()
            refreshMessages()
        }
    },

    saveToTopic: async () => {
        // if there is no message, stop
        const messages = chatSelectors.currentChats(get())
        if (messages.length === 0) return

        const { activeId, refreshTopic } = get()

        // 1. create topic and bind these messages

        const topicId = await topicService.createTopic({
            sessionId: activeId,
            title: 'default',
            messages: messages.map((m) => m.id),
        })
        await refreshTopic()

        // 2. auto summary topic Title
        // we don't need to wait for summary, just let it run async

        return topicId
    },
    // update
    setTopicTitle: async (topicId, topicTitle: string) => {
        const { updateTopicTitleInSummary, refreshTopic } = get()
        const topic = topicSelectors.getTopicById(topicId)(get())
        if (!topic) return

        updateTopicTitleInSummary(topicId, topicTitle)

        // 自动总结话题标题
        await refreshTopic()
    },
    favoriteTopic: async (id, favState) => {
        await topicService.updateFavorite(id, favState)
        await get().refreshTopic()
    },
    updateTopicTitle: async (id, title) => {
        await topicService.updateTitle(id, title)
        await get().refreshTopic()
    },

    // query
    useFetchTopics: (activeTopicId) =>
        useClientDataSWR<Topic[]>(
            [SWR_USE_FETCH_TOPIC, activeTopicId],
            async ([, activeTopicId]: [string, string]) => topicService.getTopics({ activeTopicId }),
            {
                onSuccess: (topics) => {
                    set({ topics, topicsInit: true }, false, n('useFetchTopics(success)', { activeTopicId }))
                },
            }
        ),
    switchTopic: async (id) => {
        set({ activeTopicId: id }, false, n('toggleTopic'))

        await get().refreshMessages()
    },
    // delete
    removeSessionTopics: async () => {
        const { switchTopic, activeId, refreshTopic } = get()

        await topicService.removeTopic(activeId)
        await refreshTopic()

        // switch to default topic
        switchTopic()
    },
    removeAllTopics: async () => {
        const { refreshTopic } = get()

        await topicService.removeAllTopic()
        await refreshTopic()
    },
    removeTopic: async (id) => {
        const { switchTopic, refreshTopic } = get()

        // remove messages in the topic
        await messageService.removeMessages(id)

        // remove topic
        await topicService.removeTopic(id)
        await refreshTopic()

        // switch bach to default topic
        switchTopic()
    },

    // Internal process method of the topics
    updateTopicTitleInSummary: (id, title) => {
        const topics = produce(get().topics, (draftState: unknown[]) => {
            const topic = draftState.find((i) => i.id === id)

            if (!topic) return
            topic.title = title
        })

        set({ topics }, false, n(`updateTopicTitleInSummary`, { id, title }))
    },
    updateTopicLoading: (id) => {
        set({ topicLoadingId: id }, false, n('updateTopicLoading'))
    },
    refreshTopic: async () => {
        await mutate([SWR_USE_FETCH_TOPIC, get().activeId])
    },
})
