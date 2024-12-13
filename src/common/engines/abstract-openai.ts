/* eslint-disable camelcase */
import { fetchSSE } from '../utils'
import { AbstractEngine } from './abstract-engine'
import { IMessageRequest, IModel } from './interfaces'
import { Action } from '../internal-services/db'

export abstract class AbstractOpenAI extends AbstractEngine {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    abstract listModels(apiKey_: string | undefined): Promise<IModel[]>

    async getModel() {
        return await this.getAPIModel()
    }

    abstract getAPIModel(): Promise<string>
    abstract getAPIKey(): Promise<string>
    abstract getAPIURL(): Promise<string>
    abstract getAPIURLPath(): Promise<string>

    async getHeaders(): Promise<Record<string, string>> {
        const apiKey = await this.getAPIKey()
        return {
            'User-Agent':
                'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) chatall/1.29.40 Chrome/114.0.5735.134 Safari/537.36',
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
        }
    }

    async isChatAPI(): Promise<boolean> {
        return true
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async getBaseRequestBody(activatedAction?: Action): Promise<Record<string, any>> {
        const model = await this.getAPIModel()
        const response_format = { type: 'json_object' }
        const requestBody = {
            model,
            temperature: 0,
            top_p: 1,
            frequency_penalty: 1,
            presence_penalty: 1,
            stream: true,
        }

        // Handle different output formats
        switch (activatedAction?.outputRenderingFormat) {
            case 'json':
                response_format.type = 'json_object'
                requestBody.model = 'gpt-4-1106-preview'
                break
            default:
                // The default case will use the model set above
                break
        }

        return requestBody
    }

    async sendMessage(req: IMessageRequest): Promise<void> {
        const url = `${await this.getAPIURL()}${await this.getAPIURLPath()}`
        const headers = await this.getHeaders()
        const isChatAPI = await this.isChatAPI()
        const body = await this.getBaseRequestBody(req.activateAction)

        if (isChatAPI) {
            const messages = []

            // 添加系统角色提示和助手提示
            if (req.rolePrompt || (req.assistantPrompts && req.assistantPrompts.length > 0)) {
                const systemContent = [req.rolePrompt, ...(req.assistantPrompts || [])].filter(Boolean).join('\n')
                messages.push({
                    role: 'system',
                    content: systemContent,
                })
            }

            // 添加历史消息，确保使用正确的conversationMessages
            if (req.isMultipleConversation && req.conversationMessages && req.conversationMessages.length > 0) {
                // 过滤掉system消息，因为我们已经在上面添加了
                const nonSystemMessages = req.conversationMessages.filter((msg) => msg.role !== 'system')
                messages.push(...nonSystemMessages)
            }

            // 添加当前的command prompt作为用户消息
            if (req.commandPrompt) {
                messages.push({
                    role: 'user',
                    content: req.commandPrompt,
                })
            }

            body.messages = messages
        }

        let currentMessage = ''
        let finished = false

        await fetchSSE(url, {
            method: 'POST',
            headers,
            body: JSON.stringify(body),
            signal: req.signal,
            onMessage: async (msg) => {
                if (finished) return
                if (msg === '[DONE]') {
                    // 最后发送完整消息
                    if (currentMessage) {
                        await req.onMessage({
                            content: currentMessage,
                            role: 'assistant',
                            isFullText: true,
                            actionName: req.activateAction?.name,
                        })
                    }
                    req.onFinished?.('stop')
                    finished = true
                    return
                }

                let resp
                try {
                    resp = JSON.parse(msg)
                } catch (e: any) {
                    req.onError?.(e?.message ?? 'Cannot parse response JSON')
                    return
                }

                const { choices } = resp
                if (!choices || choices.length === 0) {
                    return
                }

                const { delta, finish_reason: finishReason } = choices[0]

                // 当收到空的 delta 对象且为 finish_reason 时，表示消息结束
                if ((!delta || Object.keys(delta).length === 0) && finishReason === 'stop') {
                    if (currentMessage) {
                        await req.onMessage({
                            content: currentMessage,
                            role: 'assistant',
                            isFullText: true,
                            actionName: req.activateAction?.name,
                        })
                    }
                    req.onFinished?.(finishReason)
                    finished = true
                    return
                }

                // 处理正常的消息片段
                if (delta?.content) {
                    currentMessage += delta.content
                    await req.onMessage({
                        content: delta.content,
                        role: 'assistant',
                        isFullText: false,
                        actionName: req.activateAction?.name,
                    })
                }
            },
            onError: (err) => {
                if (err instanceof Error) {
                    req.onError?.(err.message)
                    return
                }
                if (typeof err === 'string') {
                    req.onError?.(err)
                    return
                }
                if (typeof err === 'object') {
                    const { detail } = err
                    if (detail) {
                        req.onError?.(detail)
                        return
                    }
                }
                const { error } = err
                if (error instanceof Error) {
                    req.onError?.(error.message)
                    return
                }
                if (typeof error === 'object') {
                    const { message } = error
                    if (message) {
                        if (typeof message === 'string') {
                            req.onError?.(message)
                        } else {
                            req.onError?.(JSON.stringify(message))
                        }
                        return
                    }
                }
                req.onError?.('Unknown error')
            },
        })
    }
}
