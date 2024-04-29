/* eslint-disable @typescript-eslint/no-explicit-any */
import { AlertProps, ChatItem } from '@lobehub/ui'
import { createStyles } from 'antd-style'
import isEqual from 'fast-deep-equal'
import { ReactNode, memo, useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useChatStore } from '@/store/chat'
import { chatSelectors } from '@/store/chat/selectors'
import { ChatMessage } from '@/types/message'

import ErrorMessageExtra from '../../Error'
import { renderMessages } from '../../Messages'
import ActionsBar from './ActionsBar'
import HistoryDivider from './HistoryDivider'
import { DEFAULT_AVATAR, DEFAULT_USER_AVATAR } from '@/const/meta'

const useStyles = createStyles(({ css, prefixCls }) => ({
    message: css`
        // prevent the textarea too long
        .${prefixCls}-input {
            max-height: 900px;
        }
    `,
}))

export interface ChatListItemProps {
    id: string
    index: number
}

const Item = memo<ChatListItemProps>(({ index, id }) => {
    const { t } = useTranslation('common')
    const { styles } = useStyles()
    const [editing, setEditing] = useState(false)
    const item = useChatStore((s) => {
        const chats = chatSelectors.currentChatsWithGuideMessage(s)
        if (index >= chats.length) return null
        return chatSelectors.currentChatsWithGuideMessage(s)[index]
    }, isEqual)
    const [loading, updateMessageContent] = useChatStore((s) => [s.chatLoadingId === id, s.modifyMessageContent])
    const RenderMessage = useCallback(
        ({ editableContent, data }: { data: ChatMessage; editableContent: ReactNode }) => {
            if (!item?.role) return null
            const RenderFunction = renderMessages[item.role] ?? renderMessages['default']

            if (!RenderFunction) return null

            return <RenderFunction {...data} editableContent={editableContent} />
        },
        [item?.role]
    )

    const { t: errorT } = useTranslation('error')
    const error = useMemo<AlertProps | undefined>(() => {
        if (!item?.error) return
        const messageError = item.error

        return { message: errorT(`response.${messageError.type}` as unknown) }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [item?.error])

    const enableHistoryDivider = true
    const fontSize = 14
    const systemAvatar = {
        avatar: DEFAULT_AVATAR,
        title: 'default system',
    }
    const userAvatar = {
        avatar: DEFAULT_USER_AVATAR,
        title: 'default user',
    }
    return (
        item && (
            <>
                <HistoryDivider enable={enableHistoryDivider} />
                <ChatItem
                    actions={<ActionsBar index={index} setEditing={setEditing} />}
                    avatar={item.role === 'user' ? systemAvatar : userAvatar}
                    className={styles.message}
                    editing={editing}
                    error={error}
                    errorMessage={<ErrorMessageExtra data={item} />}
                    fontSize={fontSize}
                    loading={loading}
                    message={item.content}
                    onChange={(value: any) => updateMessageContent(item.id, value)}
                    onDoubleClick={(e) => {
                        if (item.id === 'default' || item.error) return
                        if (item.role && ['assistant', 'user'].includes(item.role) && e.altKey) {
                            setEditing(true)
                        }
                    }}
                    onEditingChange={setEditing}
                    placement={item.role === 'user' ? 'right' : 'left'}
                    primary={item.role === 'user'}
                    renderMessage={(editableContent: any) => (
                        <RenderMessage data={item} editableContent={editableContent} />
                    )}
                    text={{
                        cancel: t('cancel'),
                        confirm: t('ok'),
                        edit: t('edit'),
                    }}
                    time={item.updatedAt || item.createdAt}
                />
            </>
        )
    )
})

export default Item
