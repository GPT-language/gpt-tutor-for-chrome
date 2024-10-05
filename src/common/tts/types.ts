export interface SpeakOptions {
    text: string
    lang?: string
    voice?: string
    messageId?: string
    conversationId?: string
    rate?: number
    volume?: number
    onFinish?: () => void
}

export type TTSProvider = 'WebSpeech' | 'EdgeTTS'
