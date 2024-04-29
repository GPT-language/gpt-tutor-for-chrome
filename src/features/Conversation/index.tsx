import { createStyles } from 'antd-style'
import { ReactNode, memo } from 'react'
import { Flexbox } from 'react-layout-kit'

import SkeletonList from './components/SkeletonList'
import ChatList from './components/VirtualizedList'
import ChatHydration from '@/components/StoreHydration/ChatHydration'
import { useInitConversation } from './hooks/useInitConversation'

const useStyles = createStyles(
    ({ css }) => css`
        position: relative;
        overflow-y: auto;
        height: 100%;
    `
)

interface ConversationProps {
    chatInput: ReactNode
}

const Conversation = memo<ConversationProps>(() => {
    const { styles } = useStyles()

    const init = useInitConversation()
    console.log('Conversation init', init)

    return (
        <Flexbox
            flex={1}
            //  position: 'relative' is required, ChatInput's absolute position needs it
            style={{ position: 'relative' }}
        >
            <div className={styles}>{init ? <ChatList /> : <SkeletonList />}</div>
            <ChatHydration />
        </Flexbox>
    )
})

export default Conversation
