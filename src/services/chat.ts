/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable prettier/prettier */
import { v4 as uuidv4 } from 'uuid'
import * as utils from '../common/utils'
import { TranslateMode } from '@/common/translate'
import { LangCode, getLangConfig } from '@/common/components/lang/lang'
import { ISettings } from '@/common/types'
import { ChatMessageError } from '@lobehub/ui'
import { Action } from '@/common/internal-services/db'
import * as lang from '@/common/components/lang/lang'
interface TranslateQuery {
    detectFrom?: LangCode
    detectTo?: LangCode
    activatedActionName: string
    text: string
    mode?: TranslateMode
    action?: Action
    onAbort?: (text: string) => Promise<void>
    onErrorHandle?: (error: ChatMessageError) => void
    onFinish?: OnFinishHandler
    onMessageHandle?: (text: string) => void
    signal?: AbortSignal
}

export type OnFinishHandler = (
    text: string,
    context: {
        type?: SSEFinishType
    }
) => Promise<void>

type SSEFinishType = 'done' | 'error' | 'abort'

export class QuoteProcessor {
    private quote: string
    public quoteStart: string
    public quoteEnd: string
    private prevQuoteStartBuffer: string
    private prevQuoteEndBuffer: string

    constructor() {
        this.quote = uuidv4().replace(/-/g, '').slice(0, 4)
        this.quoteStart = `<${this.quote}>`
        this.quoteEnd = `</${this.quote}>`
        this.prevQuoteStartBuffer = ''
        this.prevQuoteEndBuffer = ''
    }

    public processText(text: string): string {
        const deltas = text.split('')
        const targetPieces = deltas.map((delta) => this.processTextDelta(delta))
        return targetPieces.join('')
    }

    private processTextDelta(textDelta: string): string {
        if (textDelta === '') {
            return ''
        }
        if (textDelta.trim() === this.quoteEnd) {
            return ''
        }
        let result = textDelta
        // process quote start
        let quoteStartBuffer = this.prevQuoteStartBuffer
        // console.debug('\n\n')
        // console.debug('---- process quote start -----')
        // console.debug('textDelta', textDelta)
        // console.debug('this.quoteStartbuffer', this.quoteStartBuffer)
        // console.debug('start loop:')
        let startIdx = 0
        for (let i = 0; i < textDelta.length; i++) {
            const char = textDelta[i]
            // console.debug(`---- i: ${i} startIdx: ${startIdx} ----`)
            // console.debug('char', char)
            // console.debug('quoteStartBuffer', quoteStartBuffer)
            // console.debug('result', result)
            if (char === this.quoteStart[quoteStartBuffer.length]) {
                if (this.prevQuoteStartBuffer.length > 0) {
                    if (i === startIdx) {
                        quoteStartBuffer += char
                        result = textDelta.slice(i + 1)
                        startIdx += 1
                    } else {
                        result = this.prevQuoteStartBuffer + textDelta
                        quoteStartBuffer = ''
                        break
                    }
                } else {
                    quoteStartBuffer += char
                    result = textDelta.slice(i + 1)
                }
            } else {
                if (quoteStartBuffer.length === this.quoteStart.length) {
                    quoteStartBuffer = ''
                    break
                }
                if (quoteStartBuffer.length > 0) {
                    result = this.prevQuoteStartBuffer + textDelta
                    quoteStartBuffer = ''
                    break
                }
            }
        }
        // console.debug('end loop!')
        this.prevQuoteStartBuffer = quoteStartBuffer
        // console.debug('result', result)
        // console.debug('this.quoteStartBuffer', this.quoteStartBuffer)
        // console.debug('---- end of process quote start -----')
        textDelta = result
        // process quote end
        let quoteEndBuffer = this.prevQuoteEndBuffer
        // console.debug('\n\n')
        // console.debug('---- start process quote end -----')
        // console.debug('textDelta', textDelta)
        // console.debug('this.quoteEndBuffer', this.quoteEndBuffer)
        // console.debug('start loop:')
        let endIdx = 0
        for (let i = 0; i < textDelta.length; i++) {
            const char = textDelta[i]
            // console.debug(`---- i: ${i}, endIdx: ${endIdx} ----`)
            // console.debug('char', char)
            // console.debug('quoteEndBuffer', quoteEndBuffer)
            // console.debug('result', result)
            if (char === this.quoteEnd[quoteEndBuffer.length]) {
                if (this.prevQuoteEndBuffer.length > 0) {
                    if (i === endIdx) {
                        quoteEndBuffer += char
                        result = textDelta.slice(i + 1)
                        endIdx += 1
                    } else {
                        result = this.prevQuoteEndBuffer + textDelta
                        quoteEndBuffer = ''
                        break
                    }
                } else {
                    quoteEndBuffer += char
                    result = textDelta.slice(0, textDelta.length - quoteEndBuffer.length)
                }
            } else {
                if (quoteEndBuffer.length === this.quoteEnd.length) {
                    quoteEndBuffer = ''
                    break
                }
                if (quoteEndBuffer.length > 0) {
                    result = this.prevQuoteEndBuffer + textDelta
                    quoteEndBuffer = ''
                    break
                }
            }
        }
        // console.debug('end loop!')
        this.prevQuoteEndBuffer = quoteEndBuffer
        // console.debug('totally result', result)
        // console.debug('this.quoteEndBuffer', this.quoteEndBuffer)
        // console.debug('---- end of process quote end -----')
        return result
    }
}

class ChatService {
    // 定义一个新的方法来处理ChatGPT的请求
    async getChatWebCompletion(query: TranslateQuery): Promise<any> {
        try {
            const { headers, body } = await this.prepareRequestData(query)
            const response = await fetch(`${utils.defaultChatGPTWebAPI}/conversation`, {
                method: 'POST',
                headers,
                body: JSON.stringify(body),
                signal: query.signal,
            })

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`)
            }

            return await response.text()
        } catch (error: any) {
            throw new Error(`Network or server error: ${error.message}`)
        }
    }

    async prepareRequestData(query: TranslateQuery) {
        const settings = await utils.getSettings()
        const apiKey = await utils.getApiKey()
        const arkoseToken = await utils.getArkoseToken()
        const chatRequirements = await utils.getChatRequirementsToken()
        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
            'Openai-Sentinel-Arkose-Token': arkoseToken,
            'Openai-Sentinel-Chat-Requirements-Token': chatRequirements,
        }
        const body = this.buildRequestBody(query, settings)

        return { apiKey, headers, body }
    }

    async buildRequestBody(query: TranslateQuery, settings: ISettings) {
        const contentPrompt = this.constructContentPrompt(query)
        return {
            model: settings.apiModel,
            messages: [
                {
                    id: uuidv4(),
                    author: { role: 'user' },
                    content: { content_type: 'text', parts: [contentPrompt] },
                    metadata: {},
                },
            ],
            conversation_id: (await this.getConversationId(query.activatedActionName)) || undefined,
            conversation_mode: { kind: 'primary_assistant' },
        }
    }

    constructContentPrompt(query: TranslateQuery): string {
        // Logic to construct content prompt based on the query
        let rolePrompt = ''
        let commandPrompt = ''
        let contentPrompt = query.text
        const sourceLangCode = query.detectFrom || 'en'
        const targetLangCode = query.detectTo || 'zh-Hans'
        const sourceLangName = lang.getLangName(sourceLangCode)
        const targetLangName = lang.getLangName(targetLangCode)
        const targetLangConfig = getLangConfig(targetLangCode)
        rolePrompt = targetLangConfig.rolePrompt

        switch (query.action?.mode) {
            case null:
            case undefined:
                if (
                    (query.action?.rolePrompt ?? '').includes('${text}') ||
                    (query.action?.commandPrompt ?? '').includes('${text}')
                ) {
                    contentPrompt = ''
                } else {
                    contentPrompt = '"""' + query.text + '"""'
                }
                rolePrompt = (query.action?.rolePrompt ?? '')
                    .replace('${sourceLang}', sourceLangName)
                    .replace('${targetLang}', targetLangName)
                    .replace('${text}', query.text)
                commandPrompt = (query.action?.commandPrompt ?? '')
                    .replace('${sourceLang}', sourceLangName)
                    .replace('${targetLang}', targetLangName)
                    .replace('${text}', query.text)
                if (query.action?.outputRenderingFormat) {
                    commandPrompt += `. Format: ${query.action.outputRenderingFormat}`
                }
                break
        }
        return `${rolePrompt}\n\n${commandPrompt}:\n${contentPrompt}`
    }

    getSavedAction() {
        const savedAction = localStorage.getItem('savedAction')
        return savedAction ? JSON.parse(savedAction) : undefined
    }

    getConversationId(name: string) {
        return new Promise(function (resolve) {
            chrome.storage.local.get([`${name}.conversationId`], function (result) {
                const conversationId = result[`${name}.conversationId`]?.value || ''
                resolve(conversationId)
            })
        })
    }

    saveConversationContext(name: string, conversationContext: { conversationId: string; lastMessageId: string }) {
        //  使用 chrome.storage.local.set() 保存上下文
        // 保存的键为action.name，然后保存对话ID
        chrome.storage.local.set({
            [`${name}.conversationId`]: {
                value: conversationContext.conversationId,
            },
            [`${name}.lastMessageId`]: {
                value: conversationContext.lastMessageId,
            },
        })
    }
}

export const chatService = new ChatService()
