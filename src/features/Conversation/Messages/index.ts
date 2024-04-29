import { RenderMessage } from '../types'
import { DefaultMessage } from './Default'
import { UserMessage } from './User'

export const renderMessages: Record<string, RenderMessage> = {
    default: DefaultMessage,
    user: UserMessage,
}
