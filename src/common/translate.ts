/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable camelcase */
import * as lang from './components/lang/lang'
import { v4 as uuidv4 } from 'uuid'
import { getLangConfig, LangCode } from './components/lang/lang'
import { getUniversalFetch } from './universal-fetch'
import { Action } from './internal-services/db'
import { ResponseContent } from './types'
import Browser from 'webextension-polyfill'
import { sha3_512 } from 'js-sha3'
import { IEngine } from './engines/interfaces'

export type TranslateMode = 'built-in' | 'translate' | 'explain-code' | 'Sentence analysis' | 'Free to ask'

export type APIModel =
    | 'gpt-3.5-turbo'
    | 'gpt-3.5-turbo-0301'
    | 'gpt-4'
    | 'gpt-4-0314'
    | 'gpt-4-32k'
    | 'gpt-4-32k-0314'
    | string

interface BaseTranslateQuery {
    activateAction?: Action
    parentAction?: Action
    text?: string
    context?: string
    learningLang?: LangCode
    userLang?: LangCode
    mode?: Exclude<TranslateMode, 'big-bang'>
    inputLanguageLevel?: string
    outputLanguageLevel?: string
    userBackground?: string
    useBackgroundInfo?: boolean
    languageLevelInfo?: boolean
    onMessage: (message: { content: string; role: string; isFullText?: boolean }) => void
    onError: (error: string) => void
    onFinish: (reason: string) => void
    onStatusCode?: (statusCode: number) => void
    signal: AbortSignal
}

export type TranslateQuery = BaseTranslateQuery

export interface TranslateResult {
    text?: string
    from?: string
    to?: string
    error?: string
}

function removeCitations(text: string) {
    return text.replaceAll(/\u3010\d+\u2020source\u3011/g, '')
}

function parseResponseContent(content: ResponseContent): { text?: string } {
    if (content.content_type === 'text') {
        return { text: removeCitations(content.parts[0]) }
    }
    if (content.content_type === 'code') {
        return { text: '_' + content.text + '_' }
    }
    return {}
}

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

interface ConversationContext {
    conversationId: string
    lastMessageId: string
}

function getConversationId() {
    return new Promise(function (resolve) {
        chrome.storage.local.get(['conversationId'], function (result) {
            const conversationId = result.conversationId?.value
            resolve(conversationId)
        })
    })
}

function getlastMessageId() {
    return new Promise(function (resolve) {
        chrome.storage.local.get(['lastMessageId'], function (result) {
            const lastMessageId = result.lastMessageId?.value
            resolve(lastMessageId)
        })
    })
}

export async function getArkoseToken() {
    const config = await Browser.storage.local.get(['chatgptArkoseReqUrl', 'chatgptArkoseReqForm'])
    const arkoseToken = await getUniversalFetch()(
        'https://tcr9i.chat.openai.com/fc/gt2/public_key/35536E1E-65B4-4D96-9D97-6ADB7EFF8147',
        {
            method: 'POST',
            body: config.chatgptArkoseReqForm,
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                'Origin': 'https://tcr9i.chat.openai.com',
                'Referer': 'https://tcr9i.chat.openai.com/v2/2.4.4/enforcement.f73f1debe050b423e0e5cd1845b2430a.html',
            },
        }
    )
        .then((resp) => resp.json())
        .then((resp) => resp.token)
        .catch(() => null)
    if (!arkoseToken)
        throw new Error(
            'Failed to get arkose token.' +
                '\n\n' +
                "Please keep https://chat.openai.com open and try again. If it still doesn't work, type some characters in the input box of chatgpt web page and try again."
        )
    return arkoseToken
}

export async function isNeedWebsocket(accessToken: string) {
    const response = await callBackendAPIWithToken(accessToken, 'GET', '/accounts/check/v4-2023-04-27')
    const isNeedWebsocket = (await response.text()).includes('shared_websocket')
    return isNeedWebsocket
}

async function callBackendAPIWithToken(token: string, method: string, endpoint: string, body?: unknown) {
    return fetch(`https://chat.openai.com/backend-api${endpoint}`, {
        method: method,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
        },
        body: body !== undefined ? JSON.stringify(body) : undefined,
    })
}

async function getChatRequirements(token: string) {
    const response = await callBackendAPIWithToken(token, 'POST', '/sentinel/chat-requirements', {
        conversation_mode_kind: 'primary_assistant',
    })
    return response.json()
}

async function GenerateProofToken(seed: string, diff: string | number | unknown[], userAgent: string) {
    const cores = [8, 12, 16, 24]
    const screens = [3000, 4000, 6000]
    const randomInt = (min: number, max: number): number => {
        return Math.floor(Math.random() * (max - min + 1)) + min
    }

    const core = cores[randomInt(0, cores.length)]
    const screen = screens[randomInt(0, screens.length)]

    const now = new Date(Date.now() - 8 * 3600 * 1000)
    const parseTime = now.toUTCString().replace('GMT', 'GMT-0500 (Eastern Time)')

    const config = [core + screen, parseTime, 4294705152, 0, userAgent]
    if (typeof diff === 'string') {
        const diffLen = Math.floor(diff.length / 2)

        for (let i = 0; i < 100000; i++) {
            config[3] = i
            const jsonData = JSON.stringify(config)
            const base = btoa(unescape(encodeURIComponent(jsonData)))
            const hashValue = sha3_512(seed + base)

            if (hashValue.substring(0, diffLen) <= diff) {
                const result = 'gAAAAAB' + base
                return result
            }
        }
    }

    const fallbackBase = btoa(unescape(encodeURIComponent(`"${seed}"`)))
    return 'gAAAAABwQ8Lk5FbGpA2NcR9dShT6gYjU7VxZ4D' + fallbackBase
}

const chineseLangCodes = ['zh-Hans', 'zh-Hant', 'lzh', 'yue', 'jdbhw', 'xdbhw']

async function registerWebsocket(token: string): Promise<{ wss_url: string; expires_at: string }> {
    return callBackendAPIWithToken(token, 'POST', '/register-websocket').then((r) => r.json())
}

export async function askAI(query: TranslateQuery, engine: IEngine | undefined, isOpenToAsk?: boolean) {
    if (!engine) {
        console.error('Translation engine is undefined')
        query.onError('Translation engine is undefined')
        return
    }
    console.log('query', query)
    let rolePrompt = ''
    let commandPrompt = ''
    const assistantPrompts: string[] = []
    let userBackgroundPrompt = ''
    if (query.context) {
        assistantPrompts.push('context: ' + query.context)
    }
    if (query.context && !query.text) {
        query.text = query.context
    }
    if (query.userLang) {
        assistantPrompts.push('Please always respond in ' + query.userLang)
    }
    if (query.useBackgroundInfo && query.userBackground) {
        userBackgroundPrompt += query.userBackground
    }
    if (query.languageLevelInfo && query.inputLanguageLevel) {
        let languageLevelText = ''

        switch (query.inputLanguageLevel) {
            case 'Level0':
                languageLevelText = '您对这门语言没有任何知识。我们将从基础知识开始介绍，例如字母和简单的问候语。'
                break
            case 'Level1':
                languageLevelText =
                    '您只知道一些基本的词汇。我们会用简单的句子来解释，像对五岁小孩一样。比如，"Hello"（你好）是一个问候语。'
                break
            case 'Level2':
                languageLevelText =
                    'You can understand some basic expressions. For example, "Good morning" (早上好) is a common greeting. It is used when you meet someone in the morning.'
                break
            case 'Level3':
                languageLevelText =
                    'You can understand most phrases and expressions. For instance, "How are you?" (你好吗?) is a common way to ask someone about their well-being.'
                break
            case 'Level4':
                languageLevelText = 'You can understand advanced expressions, so no adjustments are needed.'
                break
            default:
                languageLevelText = 'Invalid language level.'
                break
        }

        userBackgroundPrompt += `Language level: ${languageLevelText}. `
    }

    userBackgroundPrompt = userBackgroundPrompt.trim()
    if (userBackgroundPrompt) {
        assistantPrompts.push(userBackgroundPrompt)
    }

    const learningLangCode = query.learningLang ?? 'en'
    const userLangCode = query.userLang ?? 'zh-Hans'
    const learningLangName = lang.getLangName(learningLangCode)
    const userLangName = lang.getLangName(userLangCode)
    const toChinese = chineseLangCodes.indexOf(userLangCode) >= 0
    const userLangConfig = getLangConfig(userLangCode)
    const learningLangConfig = getLangConfig(learningLangCode)
    rolePrompt = userLangConfig.rolePrompt

    // 设置替换${text}和其它值
    rolePrompt = (query.activateAction?.rolePrompt ?? '')
        .replace('${sourceLang}', learningLangName)
        .replace('${targetLang}', userLangName)
        .replace('${text}', query.text ?? '')
    commandPrompt = (query.activateAction?.commandPrompt ?? '')
        .replace('${sourceLang}', learningLangName)
        .replace('${targetLang}', userLangName)
        .replace('${text}', query.text ?? query.context ?? '')
    if (query.activateAction?.outputRenderingFormat) {
        commandPrompt += `. Format: ${query.activateAction.outputRenderingFormat}`
    }
    if (!commandPrompt.trim() && query.text) {
        if (query.context) {
            commandPrompt = 'Context: ' + query.context + '\n' + query.text
        } else {
            commandPrompt = query.text
        }
    }

    console.log('assistantPrompts', assistantPrompts)

    await engine?.sendMessage({
        signal: query.signal,
        rolePrompt,
        commandPrompt,
        assistantPrompts,
        onMessage: async (message) => {
            await query.onMessage({ ...message })
        },
        onFinished: (reason) => {
            query.onFinish(reason)
        },
        onError: (error) => {
            query.onError(error)
        },
        onStatusCode: (statusCode) => {
            query.onStatusCode?.(statusCode)
        },
    })
}

export async function simpleTranslate(query: TranslateQuery, engine: IEngine): Promise<void> {
    const abortController = new AbortController()

    await engine.sendMessage({
        rolePrompt: `context: ${query.context}`,
        commandPrompt: `\n${query.text}`,
        signal: abortController.signal,
        onMessage: async (message) => {
            if (message.content) {
                query.onMessage({ ...message })
            }
        },
        onFinished: (reason) => {
            query.onFinish(reason)
        },
        onError: (error) => {
            query.onError(error)
        },
    })
}
