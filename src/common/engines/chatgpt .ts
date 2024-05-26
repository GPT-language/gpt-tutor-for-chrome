/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable camelcase */
import { v4 as uuidv4 } from 'uuid'
import { getUniversalFetch } from '../universal-fetch'
import { IMessageRequest, IModel } from './interfaces'
import * as utils from '../utils'
import { AbstractEngine } from './abstract-engine'
import { chatgptArkoseReqParams } from '../constants'
import { sha3_512 } from 'js-sha3'
import { OnGroupDataMessageArgs, OnServerDataMessageArgs, WebPubSubClient } from '@azure/web-pubsub-client'
import { createParser } from 'eventsource-parser'
import { PubSubPayload } from '../types'
import { Base64 } from 'js-base64'
import Browser from 'webextension-polyfill'
import { useChatStore } from '@/store/file'

export const keyChatgptArkoseReqUrl = 'chatgptArkoseReqUrl'
export const keyChatgptArkoseReqForm = 'chatgptArkoseReqForm'

export async function getArkoseToken() {
    const browser = (await import('webextension-polyfill')).default
    const config = await browser.storage.local.get([keyChatgptArkoseReqUrl, keyChatgptArkoseReqForm])
    if (!config[keyChatgptArkoseReqUrl] || !config[keyChatgptArkoseReqForm]) {
        throw new Error(
            'Failed to get arkose token.' +
                '\n\n' +
                "Please keep https://chat.openai.com open and try again. If it still doesn't work, type some characters in the input box of chatgpt web page and try again."
        )
    }
    const fetcher = getUniversalFetch()
    const arkoseToken = await fetcher(config[keyChatgptArkoseReqUrl] + '?' + chatgptArkoseReqParams, {
        method: 'POST',
        body: config[keyChatgptArkoseReqForm],
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
            'Origin': 'https://tcr9i.chat.openai.com',
            'Referer': 'https://tcr9i.chat.openai.com/v2/2.5.0/enforcement.13af146b6f5532afc450f0718859ea0f.html',
        },
    })
        .then((resp) => resp.json())
        .then((resp) => resp.token)
        .catch(() => null)
    if (!arkoseToken) {
        throw new Error(
            'Failed to get arkose token.' +
                '\n\n' +
                "Please keep https://chatgpt.com open and try again. If it still doesn't work, type some characters in the input box of chatgpt web page and try again."
        )
    }
    return arkoseToken
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function callBackendAPIWithToken(token: string, method: string, endpoint: string, body?: any) {
    const fetcher = getUniversalFetch() // Assuming getUniversalFetch returns the global fetch
    const response = await fetcher(`https://chatgpt.com/backend-api${endpoint}`, {
        method: method,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
        },
        body: body !== undefined ? JSON.stringify(body) : undefined,
    })

    if (response.status === 401) {
        // Token might be expired or invalid
        throw new Error('Token expired or invalid')
    }
    return response
}

async function getChatRequirements(accessToken: string) {
    try {
        const response = await callBackendAPIWithToken(accessToken, 'POST', '/sentinel/chat-requirements', {
            conversation_mode_kind: 'primary_assistant',
        })
        return response.json()
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
        if (error.message === 'Token expired or invalid') {
            // Try to refresh the token
            const newAccessToken = await utils.getAccessToken(true) // Force token refresh
            const retryResponse = await callBackendAPIWithToken(newAccessToken, 'POST', '/sentinel/chat-requirements', {
                conversation_mode_kind: 'primary_assistant',
            })
            return retryResponse.json()
        }
        throw error // Re-throw other errors for further handling
    }
}

async function GenerateProofToken(seed: string, diff: string | number | unknown[], userAgent: string) {
    const cores = [8, 12, 16, 24]
    const screens = [3000, 4000, 6000]
    const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min

    const core = cores[randomInt(0, cores.length)]
    const screen = screens[randomInt(0, screens.length)]

    const now = new Date(Date.now() - 8 * 3600 * 1000)
    const parseTime = now.toUTCString().replace('GMT', 'GMT-0500 (Eastern Time)')

    const config = [core + screen, parseTime, 4294705152, 0, userAgent]
    if (typeof diff === 'string') {
        const diffLen = Math.floor(diff.length / 2)
        // Continue with your code logic that uses diffLen
        for (let i = 0; i < 100000; i++) {
            config[3] = i
            const jsonData = JSON.stringify(config)
            const base = btoa(decodeURIComponent(encodeURIComponent(jsonData)))
            const hashValue = sha3_512(seed + base)

            if (hashValue.substring(0, diffLen) <= diff) {
                const result = 'gAAAAAB' + base
                return result
            }
        }
    }

    const fallbackBase = btoa(decodeURIComponent(encodeURIComponent(`"${seed}"`)))
    return 'gAAAAABwQ8Lk5FbGpA2NcR9dShT6gYjU7VxZ4D' + fallbackBase
}

export async function registerWebsocket(accessToken: string): Promise<{ wss_url: string; expires_at: string }> {
    return callBackendAPIWithToken(accessToken, 'POST', '/register-websocket').then((resp) => resp.json())
}

interface ConversationContext {
    messageId?: string
    conversationId?: string
    pubSubClient?: WebPubSubClient
}

export class ChatGPT extends AbstractEngine {
    private length = 0
    private context: ConversationContext
    private accessToken?: string
    private model: string
    private store: ReturnType<typeof useChatStore>

    constructor() {
        super()
        this.context = {}
        this.model = 'gpt-3.5-turbo'
        this.store = useChatStore
    }

    saveConversationContext(name: string, model: string, conversationContext: { conversationId: string }) {
        // 使用 chrome.storage.local.set() 保存上下文
        // 保存的键为 name 和 model 的组合，然后保存对话 ID
        const conversationKey = `${name}.${model}.conversationId`
        chrome.storage.local.set({
            [conversationKey]: {
                value: conversationContext.conversationId,
            },
        })
    }

    getConversationId(name: string, model: string) {
        const key = `${name}.${model}.conversationId`
        return new Promise(function (resolve) {
            chrome.storage.local.get([key], function (result) {
                const conversationId = result[key]?.value
                useChatStore.getInitialState().setConversationId(conversationId)
                console.log('set conversationId', conversationId)
                resolve(conversationId)
            })
        })
    }

    saveMessageId(name: string, model: string, messageId: string) {
        const key = `${name}.${model}.messageId`
        chrome.storage.local.set({
            [key]: {
                value: messageId,
            },
        })
    }

    getMessageId(name: string, model: string) {
        const key = `${name}.${model}.messageId`
        return new Promise(function (resolve) {
            chrome.storage.local.get([key], function (result) {
                const messageId = result[key]?.value
                resolve(messageId)
            })
        })
    }

    getConversationIdAndMessageId(name: string, model: string) {
        return Promise.all([this.getConversationId(name, model), this.getMessageId(name, model)])
    }

    removeConversationId(name: string, model: string) {
        const key = `${name}.${model}.conversationId`
        chrome.storage.local.remove([key])
    }

    removeMessageId(name: string, model: string) {
        const key = `${name}.${model}.messageId`
        chrome.storage.local.remove([key])
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async listModels(apiKey_: string | undefined): Promise<IModel[]> {
        const fetcher = getUniversalFetch()
        const sessionResp = await fetcher(utils.defaultChatGPTAPIAuthSession, {
            cache: 'no-cache',
            headers: {
                'User-Agent':
                    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) chatall/1.29.40 Chrome/114.0.5735.134 Safari/537.36',
            },
        })
        if (sessionResp.status !== 200) {
            try {
                const sessionRespJsn = await sessionResp.json()
                if (sessionRespJsn && sessionRespJsn.error) {
                    throw new Error(sessionRespJsn.error)
                }
                if (sessionRespJsn && sessionRespJsn.detail) {
                    throw new Error(`Failed to fetch ChatGPT Web accessToken: ${sessionRespJsn.detail}`)
                } else {
                    throw new Error(`Failed to fetch ChatGPT Web accessToken: ${sessionResp.statusText}`)
                }
            } catch {
                throw new Error(`Failed to fetch ChatGPT Web accessToken: ${sessionResp.statusText}`)
            }
        }
        const sessionRespJsn = await sessionResp.json()
        const headers: Record<string, string> = {
            Authorization: `Bearer ${sessionRespJsn.accessToken}`,
        }
        const modelsResp = await fetcher(`${utils.defaultChatGPTWebAPI}/models`, {
            cache: 'no-cache',
            headers,
        })
        const modelsRespJsn = await modelsResp.json()
        if (!modelsRespJsn) {
            return []
        }
        if (modelsResp.status !== 200) {
            if (modelsResp.status === 401) {
                throw new Error('ChatGPT is not login')
            }
            return []
        }
        const { models } = modelsRespJsn
        if (!models) {
            return []
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return models.map((model: any) => ({
            name: `${model.title} (${model.tags.join(', ')})`,
            description: model.description,
            id: model.slug,
        }))
    }

    async getModel(): Promise<string> {
        const settings = await utils.getSettings()
        return settings.chatgptModel
    }

    private subscribeWebsocket(websocketRequestId: string, onMessage: (message: string) => void) {
        const parser = createParser((event) => {
            if (event.type === 'event') {
                onMessage(event.data)
            }
        })
        const listener = (e: OnServerDataMessageArgs | OnGroupDataMessageArgs) => {
            console.debug('raw message', e.message)
            const payload = e.message.data as PubSubPayload
            if (payload.websocket_request_id && payload.websocket_request_id !== websocketRequestId) {
                console.debug('skip message')
                return
            }
            const encodedBody = payload.body
            const bodyChunk = Base64.decode(encodedBody)
            parser.feed(bodyChunk)
        }
        this.context.pubSubClient!.on('server-message', listener)
        this.context.pubSubClient!.on('group-message', listener)
        return () => {
            this.context.pubSubClient?.off('server-message', listener)
            this.context.pubSubClient?.off('group-message', listener)
        }
    }

    async postMessage(req: IMessageRequest, websocketRequestId?: string): Promise<Response | undefined> {
        try {
            const accessToken = await utils.getAccessToken()
            if (!accessToken) {
                throw new Error('There is no logged-in ChatGPT account in this browser.')
            }

            const [arkoseToken, requirements] = await Promise.all([
                getArkoseToken(),
                getChatRequirements(accessToken), // 确保传递 apiKey
            ])

            this.model = await this.getModel()

            const messageId = uuidv4()
            const lastConversationId = await this.getConversationId(req.activatedActionName, this.model)

            const userAgent =
                process.env.USER_AGENT ||
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36'
            const proofToken = await GenerateProofToken(
                requirements.proofofwork.seed,
                requirements.proofofwork.difficulty,
                userAgent
            )

            let cookie
            let oaiDeviceId

            if (Browser.cookies && Browser.cookies.getAll) {
                try {
                    const cookies = await Browser.cookies.getAll({ url: 'https://chatgpt.com/' })
                    if (cookies.length > 0) {
                        cookie = cookies.map((cookie) => `${cookie.name}=${cookie.value}`).join('; ')
                    } else {
                        console.log('No cookies returned for the URL')
                    }
                } catch (error) {
                    console.error('Failed to get cookies:', error)
                }

                try {
                    const oaiCookie = await Browser.cookies.get({
                        url: 'https://chatgpt.com/',
                        name: 'oai-did',
                    })
                    if (oaiCookie) {
                        oaiDeviceId = oaiCookie.value
                    } else {
                        console.log('oai-did cookie not found or not accessible')
                    }
                } catch (error) {
                    console.error('Failed to get oai-did cookie:', error)
                }
            }

            let headers
            type ResponseMode = 'sse' | 'websocket'
            const responseMode: ResponseMode = (await utils.isNeedWebsocket(accessToken)) ? 'websocket' : 'sse'

            console.log('oaiDeviceId:', oaiDeviceId)

            if (responseMode === 'websocket') {
                headers = {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${accessToken}`,
                    'Openai-Sentinel-Arkose-Token': arkoseToken,
                    'Openai-Sentinel-Chat-Requirements-Token': requirements.token,
                    'openai-sentinel-proof-token': proofToken,
                    'Oai-Device-Id': oaiDeviceId!,
                    'Oai-Language': 'en-US',
                }
            }

            if (responseMode === 'sse') {
                headers = {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${accessToken}`,
                    'Openai-Sentinel-Chat-Requirements-Token': requirements.token,
                    'openai-sentinel-proof-token': proofToken,
                    'Oai-Device-Id': oaiDeviceId!,
                    'Oai-Language': 'en-US',
                }
            }

            const body = {
                action: 'next',
                messages: [
                    {
                        id: messageId,
                        role: 'user',
                        content: { content_type: 'text', parts: [`${req.rolePrompt}\n\n${req.commandPrompt}`] },
                    },
                ],
                model: this.model,
                parent_message_id: uuidv4(),
                conversation_mode: { kind: 'primary_assistant', plugin_ids: null },
                force_nulligen: false,
                force_paragen: false,
                force_use_sse: true,
                force_paragen_model_slug: '',
                force_rate_limit: false,
                reset_rate_limits: false,
                suggestions: [],
                history_and_training_disabled: false,
                conversation_id: lastConversationId || undefined,
                websocket_request_id: websocketRequestId,
            }

            const response = await fetch(`${utils.defaultChatGPTWebAPI}/conversation`, {
                method: 'POST',
                headers,
                body: JSON.stringify(body),
                signal: req.signal,
            })

            if (response.status === 404) {
                this.removeConversationId(req.activatedActionName, this.model)
                throw new Error(
                    `API call failed with status ${response.status}: ${response.statusText}, please try again.`
                )
            }
            if (response.status !== 200) {
                const errorText = await response.text()
                throw new Error(`API call failed with status ${response.status}: ${errorText}`)
            }

            return response
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (error: any) {
            if (error.response && error.response.data.detail.code === 'token_expired') {
                // Clear the expired token from localStorage
                localStorage.removeItem('accessToken')
                // Optional: Redirect user to login or automatically re-authenticate
                req.onError('Token expired. Please try again.')
                // Re-authentication logic here...
            } else {
                req.onError(error.message)
            }
        }
    }

    async sendMessage(req: IMessageRequest) {
        if (!this.accessToken) {
            this.accessToken = await utils.getAccessToken()
        }

        type ResponseMode = 'sse' | 'websocket' | 'test'
        const responseMode: ResponseMode = (await utils.isNeedWebsocket(this.accessToken)) ? 'websocket' : 'sse'
        console.debug('chatgpt response mode:', responseMode)

        if (responseMode) {
            const resp = await this.postMessage(req)
            if (!resp) return
            await utils.parseSSEResponse(resp, this.createMessageHanlder(req))
            return
        }

        if (responseMode === 'test' && !this.context.pubSubClient) {
            const { wss_url } = await registerWebsocket(this.accessToken)
            const client = new WebPubSubClient(wss_url)
            await client.start()
            this.context.pubSubClient = client
        }

        const websocketRequestId = uuidv4()

        const unsubscribe = this.subscribeWebsocket(websocketRequestId, this.createMessageHanlder(req))

        const resp = await this.postMessage(req, websocketRequestId).catch((err) => {
            unsubscribe()
            throw err
        })

        if (resp && !resp.ok) {
            unsubscribe()
            const error = await resp.json()
            throw new Error(`${resp.status} ` + JSON.stringify(error))
        }
    }

    private createMessageHanlder(req: IMessageRequest) {
        return async (message: string) => {
            if (message === '[DONE]') {
                console.debug('Received completion signal from server.')
                req.onFinished('stop')
                return
            }
            let finished = false
            let resp
            if (finished) return
            try {
                resp = JSON.parse(message)
                this.saveConversationContext(req.activatedActionName, this.model, {
                    conversationId: resp.conversation_id,
                })

                useChatStore.getInitialState().setConversationId(resp.conversation_id)
                this.context = {
                    ...this.context,
                    conversationId: resp.conversation_id,
                    messageId: resp.message_id,
                }
            } catch (err) {
                console.error(err)
                req.onFinished('stop')
                finished = true
                return
            }

            if (resp.is_completion) {
                req.onFinished('stop')
                finished = true
                return
            }

            if (!resp.message) {
                if (resp.error) {
                    req.onError(`ChatGPT Web error: ${resp.error}`)
                }
                return
            }

            const { content, author, id } = resp.message
            if (content.content_type !== 'text') {
                return
            }
            useChatStore.getInitialState().setMessageId(id)
            if (author.role === 'assistant') {
                const targetTxt = content.parts.join('')
                const textDelta = targetTxt.slice(this.length)
                this.length = targetTxt.length
                await req.onMessage({ content: textDelta, role: '' })
            }
        }
    }
}
