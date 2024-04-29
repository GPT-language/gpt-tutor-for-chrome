import type { AlertProps } from '@lobehub/ui'
import { memo } from 'react'

import { ErrorType } from '@/types/fetch'
import { ChatMessage, ChatMessageError } from '@/types/message'

import ErrorJsonViewer from './ErrorJsonViewer'

// Config for the errorMessage display
export const getErrorAlertConfig = (errorType?: ErrorType): AlertProps | undefined => {
    // OpenAIBizError / ZhipuBizError / GoogleBizError / ...
    if (typeof errorType === 'string' && (errorType.includes('Biz') || errorType.includes('Invalid')))
        return {
            extraDefaultExpand: true,
            extraIsolate: true,
            type: 'warning',
        }

    switch (errorType) {
        default: {
            return undefined
        }
    }
}

const ErrorMessageExtra = memo<{ data: ChatMessage }>(({ data }) => {
    const error = data.error as ChatMessageError
    if (!error?.type) return <div>No error type</div>

    switch (error.type) {
        default: {
            return <ErrorJsonViewer error={data.error} id={data.id} />
        }
    }
})

export default ErrorMessageExtra
