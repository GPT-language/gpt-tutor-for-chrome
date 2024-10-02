import { SpeakOptions } from './types'
import { getSettings } from '../utils'
import { speak as edgeSpeak } from './edge-tts'

export const langCode2TTSLang: Record<string, string> = {
  'en': 'en-US',
  'zh-Hans': 'zh-CN',
  'zh-Hant': 'zh-TW',
  'yue': 'zh-HK',
  'lzh': 'zh-CN',
  'ja': 'ja-JP',
  'ko': 'ko-KR',
  'fr': 'fr-FR',
  'de': 'de-DE',
  'es': 'es-ES',
  'it': 'it-IT',
  'ru': 'ru-RU',
  'pt': 'pt-PT',
  'nl': 'nl-NL',
  'pl': 'pl-PL',
  'ar': 'ar-001',
  'bg': 'bg-BG',
  'ca': 'ca-ES',
  'cs': 'cs-CZ',
  'da': 'da-DK',
  'el': 'el-GR',
  'fi': 'fi-FI',
  'he': 'he-IL',
  'hi': 'hi-IN',
  'hr': 'hr-HR',
  'id': 'id-ID',
  'vi': 'vi-VN',
}

let supportVoices: SpeechSynthesisVoice[] = []
if (window.speechSynthesis) {
  window.speechSynthesis.onvoiceschanged = () => {
    supportVoices = speechSynthesis.getVoices()
  }
}

function cleanMarkdown(text: string): string {
  return text
    .replace(/#+\s/g, '') // 移除标题符号
    .replace(/\*\*/g, '') // 移除粗体符号
    .replace(/\*/g, '') // 移除斜体符号
    .replace(/`/g, '') // 移除代码符号
    .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1') // 将链接替换为纯文本
    .replace(/\n/g, ' ') // 将换行符替换为空格
    .trim() // 去除首尾空白
}

export async function speak({ text, lang, messageId, conversationId, onFinish }: SpeakOptions) {
  const settings = await getSettings()
  const langTag = langCode2TTSLang[lang ?? 'en'] ?? 'en-US'
  const voiceCfg = settings.tts?.voices?.find((item) => item.lang === lang)
  const rate = (settings.tts?.rate ?? 10) / 10
  const volume = settings.tts?.volume

  if (!settings.tts?.provider || settings.tts?.provider === 'EdgeTTS') {
    return edgeSpeak({
      text: cleanMarkdown(text),
      lang: langTag,
      messageId,
      conversationId,
      onFinish,
      voice: voiceCfg?.voice,
      rate,
      volume: volume ?? 100,
    })
  }

  const utterance = new SpeechSynthesisUtterance()
  if (onFinish) {
    utterance.addEventListener('end', onFinish, { once: true })
  }

  utterance.text = text
  utterance.lang = langTag
  utterance.rate = rate
  utterance.volume = volume ? volume / 100 : 1

  const defaultVoice = supportVoices.find((v) => v.lang === langTag) ?? null
  const settingsVoice = supportVoices.find((v) => v.voiceURI === voiceCfg?.voice)
  utterance.voice = settingsVoice ?? defaultVoice

  speechSynthesis.speak(utterance)
  return { stopSpeak: () => speechSynthesis.cancel() }
}
