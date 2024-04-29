import { LobeAgentConfig, LobeAgentTTSConfig } from '@/types/agent'

export const DEFAUTT_AGENT_TTS_CONFIG: LobeAgentTTSConfig = {
    showAllLocaleVoice: false,
    sttLocale: 'auto',
    ttsService: 'openai',
    voice: {
        openai: 'alloy',
    },
}

export const COOKIE_CACHE_DAYS = 30

export const DEFAULT_AGENT_CONFIG: LobeAgentConfig = {
    autoCreateTopicThreshold: 2,
    displayMode: 'chat',
    enableAutoCreateTopic: true,
    historyCount: 1,
    model: 'gpt-3.5-turbo',
    params: {
        frequency_penalty: 0,
        presence_penalty: 0,
        temperature: 0.6,
        top_p: 1,
    },
    plugins: [],
    systemRole: '',
}
