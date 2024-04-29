'use client'
import { memo, useEffect } from 'react'
import { createStoreUpdater } from 'zustand-utils'
import { useChatStore } from '@/store/chat'
// sync outside state to useChatStore
const ChatHydration = memo(() => {
    const useStoreUpdater = createStoreUpdater(useChatStore)

    // two-way bindings the topic params to chat store
    const topic = ''

    useStoreUpdater('activeTopicId', topic)

    useEffect(() => {
        const unsubscribe = useChatStore.subscribe(
            (s) => s.activeTopicId,
            (state) => {
                console.log('state changed', state)
            }
        )

        return () => {
            unsubscribe()
        }
    }, [])

    return null
})

export default ChatHydration
