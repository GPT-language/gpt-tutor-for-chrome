/* eslint-disable react-hooks/exhaustive-deps */
import { App } from 'antd'
import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'

import { useChatStore } from '@/store/chat'
import { LLMRoleType } from '@/types/llm'

import { OnActionsClick, RenderAction } from '../types'
import { AssistantActionsBar } from './Assistant'
import { DefaultActionsBar } from './Fallback'
import { FunctionActionsBar } from './Function'
import { UserActionsBar } from './User'

export const renderActions: Record<LLMRoleType, RenderAction> = {
    assistant: AssistantActionsBar,
    function: FunctionActionsBar,
    system: DefaultActionsBar,
    user: UserActionsBar,
}

export const useActionsClick = (): OnActionsClick => {
    const { t } = useTranslation('common')
    const [deleteMessage, regenerateMessage, delAndRegenerateMessage, copyMessage] = useChatStore((s) => [
        s.deleteMessage,
        s.regenerateMessage,
        s.delAndRegenerateMessage,
        s.copyMessage,
    ])
    const { message } = App.useApp()

    return useCallback<OnActionsClick>(async (action, { id, content, error }) => {
        switch (action.key) {
            case 'copy': {
                await copyMessage(id, content)
                message.success(t('copySuccess', { defaultValue: 'Copy Success' }))
                break
            }

            case 'del': {
                deleteMessage(id)
                break
            }

            case 'regenerate': {
                regenerateMessage(id)
                // if this message is an error message, we need to delete it
                if (error) deleteMessage(id)
                break
            }

            case 'delAndRegenerate': {
                delAndRegenerateMessage(id)
                break
            }
        }
    }, [])
}
