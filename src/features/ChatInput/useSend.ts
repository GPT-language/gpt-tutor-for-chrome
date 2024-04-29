import { useCallback } from 'react'

import { useChatStore } from '@/store/chat'

export const useSendMessage = () => {
    const [sendMessage, updateInputMessage] = useChatStore((s) => [s.sendMessage, s.updateInputMessage])

    return useCallback((onlyAddUserMessage?: boolean) => {
        const store = useChatStore.getState()
        if (!store.inputMessage) return

        sendMessage({
            message: store.inputMessage,
            onlyAddUserMessage: onlyAddUserMessage,
        })

        updateInputMessage('')
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
}
