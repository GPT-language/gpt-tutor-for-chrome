export interface SpeakOptions {
    text: string
    lang?: string
    voice?: string
    messageId?: string
    conversationId?: string
    onFinish?: () => void
}

export type TTSProvider = 'WebSpeech' | 'EdgeTTS'
