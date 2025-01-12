/* eslint-disable prettier/prettier */
import { StateCreator } from 'zustand'
import { ChatMessage, ChatState } from './initialState'
import { produce } from 'immer'
import { Action, Content, SavedFile} from '@/common/internal-services/db'
import { IEngine } from '@/common/engines/interfaces'
import { ISettings } from '@/common/types'
import { speak } from '@/common/tts'
import { detectLang } from '@/common/components/lang/lang'

export interface TranslateCallbacks {
    onBeforeTranslate?: () => void
    onAfterTranslate?: (reason: string) => void
    onMessage: (message: { content: string; role: string; isFullText?: boolean }) => void
    onFinish: (reason: string) => void
    onError: (error: any) => void
    onStatusCode: (statusCode: number) => void
}

export interface TranslateParams {
    signal: AbortSignal;
    text?: string;
    settings: ISettings;
    engine: IEngine;
    isOpenToAsk: boolean;
    callbacks: TranslateCallbacks;
}

export interface ChatAction {
    setEditableText: (text: string) => void
    setConversationId: (id: string) => void
    setMessageId: (id: string) => void
    setActivatedModel: (model: string) => void
    setActivatedProvider: (provider: string) => void
    setAccessToken: (token: string) => void
    setActions: (actions: Action[]) => void
    setAction: (action: Action | undefined) => void
    setAssistantAction: (action: Action | undefined) => void
    setActionStr: (text: string) => void
    setErrorMessage: (text: string) => void
    setTranslatedText: (text: string) => void
    setQuoteText: (text: string) => void
    setIndependentText: (text: string) => void
    setShowConversationMenu: (show: boolean) => void
    setAvailableConversations: (conversations: { key: string; messages: ChatMessage[] }[]) => void
    setCurrentConversationKey: (key: string) => void
    generateNewConversationKey: () => string
    setSpeakingMessageId: (messageId: string | null) => void
    startSpeak: (params: {
        text: string
        messageId?: string
        conversationId?: string
        lang?: string
        onFinish?: () => void
    }) => Promise<void>
    stopSpeak: () => void
    deleteMessage: (messageId: string, conversationKey: string) => void
}

export const chat: StateCreator<ChatState, [['zustand/devtools', never]], [], ChatAction> = (set, get) => {
    // 使用 ref 来存储 stopSpeak 函数
    let stopSpeakRef: (() => void) | null = null

    return {
    setEditableText: (text) => set({ editableText: text }),
    setConversationId: (id) =>
        set(
            produce((draft: ChatState) => {
                if (draft.conversationId !== id) {
                    draft.conversationId = id
                }
            })
        ),
    setMessageId: (id) =>
        set(
            produce((draft: ChatState) => {
                if (draft.messageId !== id) {
                    draft.messageId = id
                }
            })
        ),
    setActivatedModel: (model) => set({ activatedModel: model }),
    setActivatedProvider: (provider) => set({ activatedProvider: provider }),
    setAccessToken: (token) => set({ accessToken: token }),
    setActions: (actions: Action[]) => {
        set({ actions })
    },

    setAction: (action?: Action) => {
        set({
          activateAction: action
        })
    },
    setAssistantAction: (action) => set({ assistantAction: action }),
    setActionStr: (text) => set({ actionStr: text }),
    setQuoteText: (text) => set({ quoteText: text }),
    setIndependentText: (text) => set({ independentText: text }),
    setErrorMessage: (text) => set({ errorMessage: text }),
    setTranslatedText: (text) => set({ translatedText: text }),

    setShowConversationMenu: (show) => set({ showConversationMenu: show }),
    setAvailableConversations: (conversations) => set({ availableConversations: conversations }),
    setCurrentConversationKey: (key) => set({ currentConversationKey: key }),
    // ... existing code ...
generateNewConversationKey: () => {
    // 生成一个包含日期和时间的唯一标识符
    // 存在以下三种情况
    // 1. 当前存在对话，那么直接使用 currentConversationKey
    // 2. 当前不存在对话但是激活了 action，那么使用 activateAction?.name
    // 3. 当前不存在对话且没有激活 action，那么使用 editableText
    const now = new Date()
    const timestamp = now.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    }).replace(/\/|\s|:/g, '')  // 移除分隔符
    
    if (get().activateAction?.name) {
        return `${get().activateAction?.name}_${timestamp}`
    }
    
    if (get().editableText) {
        const truncatedText = get().editableText.slice(0, 20).trim()
        return truncatedText ? `${truncatedText}_${timestamp}` : timestamp
    }
    
    return timestamp
}
,
        setSpeakingMessageId: (messageId) => set({ speakingMessageId: messageId }),
        startSpeak: async ({ text, messageId, conversationId }) => {
            const currentState = get()
            
            // 如果当前正在播放，先停止
            if (currentState.isSpeaking) {
                stopSpeakRef?.()
                set({ 
                    speakingMessageId: null,
                    isSpeaking: false
                })
                return
            }

            try {
                // 检测语言
                
                const lang = await detectLang(text)
                console.log('detect lang', lang)
                // 清理text中的markdown相关语法
                const cleanText = text
                    .replace(/```[\s\S]*```/g, '') // 清理代码块
                    .replace(/\*\*(.*?)\*\*/g, '$1') // 清理加粗语法
                    .replace(/\*(.*?)\*/g, '$1')     // 清理斜体语法
                    .replace(/~~(.*?)~~/g, '$1')     // 清理删除线语法
                    .replace(/`(.*?)`/g, '$1')       // 清理行内代码语法
                    .replace(/\[(.*?)\]\(.*?\)/g, '$1') // 清理链接语法，只保留链接文本
                    console.log('cleanText', cleanText)
                    // 更新状态为正在播放
                set({ 
                    speakingMessageId: messageId || null,
                    isSpeaking: true
                })

                // 开始播放
                const { stopSpeak } = await speak({
                    text: cleanText,
                    messageId,
                    conversationId,
                    lang,
                    onFinish: () => {
                        set({ 
                            speakingMessageId: null,
                            isSpeaking: false
                        })
                        stopSpeakRef = null
                    }
                })

                // 保存停止函数的引用
                stopSpeakRef = stopSpeak

            } catch (error) {
                console.error('Failed to speak:', error)
                set({ 
                    speakingMessageId: null,
                    isSpeaking: false
                })
                stopSpeakRef = null
            }
        },

        stopSpeak: () => {
            stopSpeakRef?.()
            set({ 
                speakingMessageId: null,
                isSpeaking: false
            })
            stopSpeakRef = null
        },

        deleteMessage: (messageId: string, conversationKey: string) => 
            set(
                produce((draft) => {
                    console.log('删除前的 conversationHistory:', draft.answers[conversationKey].conversationMessages)
                    // 从 conversationHistory 中删除消息
                    // 找到要删除的消息的索引
                    const messageIndex = draft.answers[conversationKey].conversationMessages.findIndex(
                        (msg: ChatMessage) => msg.messageId === messageId
            )
            
            if (messageIndex !== -1) {
                // 删除当前消息和下一条消息（如果存在且是 assistant 消息）
                if (
                    messageIndex + 1 < draft.answers[conversationKey].conversationMessages.length && 
                    draft.answers[conversationKey].conversationMessages[messageIndex + 1].role === 'assistant'
                ) {
                    // 删除两条消息
                    draft.answers[conversationKey].conversationMessages.splice(messageIndex, 2)
                } else {
                    // 只删除当前消息
                    draft.answers[conversationKey].conversationMessages.splice(messageIndex, 1)
                }
            }
    
                    // 如果存在 selectedWord，也从其中删除消息
                    if (draft.selectedWord?.answers?.[conversationKey]) {
                        const messages = draft.selectedWord.answers[conversationKey].conversationMessages || []
                        const msgIndex = messages.findIndex((msg: ChatMessage) => msg.messageId === messageId)
                        
                        if (msgIndex !== -1) {
                            if (
                                msgIndex + 1 < messages.length && 
                                messages[msgIndex + 1].role === 'assistant'
                            ) {
                                messages.splice(msgIndex, 2)
                            } else {
                                messages.splice(msgIndex, 1)
                            }
                            
                            draft.selectedWord.answers[conversationKey].conversationMessages = messages
                        }
                    }
    
                    // 更新 files 中的 word
                    if (draft.currentFileId && draft.selectedWord) {
                        const fileIndex = draft.files.findIndex((f: SavedFile) => f.id === draft.currentFileId)
                        if (fileIndex !== -1) {
                            const wordIndex = draft.files[fileIndex].words.findIndex(
                                (w: Content) => w.idx === draft.selectedWord?.idx
                            )
                            if (wordIndex !== -1) {
                                draft.files[fileIndex].words[wordIndex] = draft.selectedWord
                            }
                        }
                    }

                    console.log('删除后的 conversationHistory:', draft.conversationHistory)
                    console.log('删除后的 selectedWord:', draft.selectedWord?.answers?.[conversationKey])
                })
            ),
    }
}
