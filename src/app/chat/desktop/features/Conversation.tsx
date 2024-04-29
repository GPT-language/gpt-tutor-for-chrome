import { memo } from 'react'

import RawConversation from '@/features/Conversation'

import ChatInput from './ChatInput'

const Conversation = memo(() => {
    return (
        <>
            <RawConversation chatInput={<ChatInput />} />
        </>
    )
})

export default Conversation
