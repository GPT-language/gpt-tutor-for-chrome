import { Action } from '../internal-services/db'

export interface IModel {
    id: string
    name: string
    description?: string
}

export interface IMessage {
    role: string
    content: string
}

export interface IMessageRequest {
    signal: AbortSignal
    rolePrompt: string
    commandPrompt: string
    assistantPrompts?: string[]
    activateAction?: Action
    messageId?: string
    parentAction?: Action
    isMultipleConversation?: boolean
    conversationMessages?: Array<{
        role: string
        content: string
    }>
    onMessage: (message: {
        content: string
        role: string
        isFullText: boolean
        actionName?: string
        messageId?: string
    }) => Promise<void>
    onError?: (error: string) => void
    onFinished?: (reason: string) => void
    onStatusCode?: (statusCode: number) => void
}

export interface IEngine {
    checkLogin(): Promise<boolean>
    isLocal(): boolean
    supportCustomModel(): boolean
    getModel(): Promise<string>
    listModels(apiKey: string | undefined): Promise<IModel[]>
    sendMessage(req: IMessageRequest): Promise<void>
}
