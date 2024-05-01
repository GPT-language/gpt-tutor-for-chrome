import { useEffect } from 'react'

import { useChatStore } from '@/store/chat'

export const useInitConversation = () => {
    const [init, activeTopicId, activeId, switchTopic, useFetchMessages, useFetchTopics] = useChatStore((s) => {
        console.log('Chat Store updated:', {
            messagesInit: s.messagesInit,
            activeTopicId: s.activeTopicId,
            activeId: s.activeId,
        })
        return [s.messagesInit, s.activeTopicId, s.activeId, s.switchTopic, s.useFetchMessages, s.useFetchTopics]
    })
    console.log('init', init)
    console.log('activeTopicId', activeTopicId)

    console.log('Fetching messages...')
    useFetchMessages(activeId)
    console.log('Fetching topics...')
    useFetchTopics(activeId)

    useEffect(() => {
        // // when activeId changed, switch topic to undefined
        const unsubscribe = useChatStore.subscribe(
            (s) => s.activeId,
            () => {
                switchTopic()
            }
        )
        return () => {
            unsubscribe()
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    return init
}
