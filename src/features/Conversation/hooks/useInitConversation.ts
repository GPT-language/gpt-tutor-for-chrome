import { useEffect } from 'react'

import { useChatStore } from '@/store/chat'

export const useInitConversation = () => {
    const [init, activeTopicId, switchTopic, useFetchMessages, useFetchTopics] = useChatStore((s) => {
        console.log('Chat Store updated:', {
            messagesInit: s.messagesInit,
            activeTopicId: s.activeTopicId,
        })
        return [s.messagesInit, s.activeTopicId, s.switchTopic, s.useFetchMessages, s.useFetchTopics]
    })
    console.log('init', init)
    console.log('activeTopicId', activeTopicId)

    console.log('Fetching messages...')
    useFetchMessages(activeTopicId)
    console.log('Fetching topics...')
    useFetchTopics(activeTopicId)

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
