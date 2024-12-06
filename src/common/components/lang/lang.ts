/* eslint-disable no-control-regex */
/* eslint-disable no-misleading-character-class */

import { isTraditional } from '../../traditional-or-simplified'
import ISO6391 from 'iso-639-1'
import { LANG_CONFIGS, Config as OptionalLangConfig } from './data'
import { oneLine } from 'common-tags'
import { getUniversalFetch } from '@/common/universal-fetch'
import qs from 'qs'
export type LangCode =
    | 'en'
    | 'en-US'
    | 'en-GB'
    | 'en-CA'
    | 'en-AU'
    | 'zh-Hans'
    | 'zh-Hant'
    | 'zh-sg'
    | 'lzh'
    | 'jdbhw'
    | 'xdbhw'
    | 'ja'
    | 'ko'
    | 'ko-banmal'
    | 'fr'
    | 'fr-qc'
    | 'fr-be'
    | 'fr-ch'
    | 'de'
    | 'es'
    | 'es-la'
    | 'it'
    | 'ru'
    | 'pt'
    | 'pt-br'
    | 'nl'
    | 'nl-be'
    | 'pl'
    | 'ar'
    | 'af'
    | 'am'
    | 'az'
    | 'asl'
    | 'be'
    | 'bg'
    | 'bn'
    | 'bs'
    | 'bsl'
    | 'ca'
    | 'ceb'
    | 'co'
    | 'cs'
    | 'cy'
    | 'da'
    | 'el'
    | 'eo'
    | 'et'
    | 'eu'
    | 'fa'
    | 'fi'
    | 'fj'
    | 'fy'
    | 'ga'
    | 'gd'
    | 'gl'
    | 'gu'
    | 'ha'
    | 'haw'
    | 'he'
    | 'hi'
    | 'hmn'
    | 'hr'
    | 'ht'
    | 'hu'
    | 'hy'
    | 'id'
    | 'ig'
    | 'is'
    | 'jw'
    | 'ka'
    | 'kk'
    | 'mn'
    | 'tr'
    | 'ug'
    | 'uk'
    | 'ur'
    | 'vi'
    | 'sign-us'
    | 'sign-uk'
    | 'sign-aus'
    | 'sign-nz'
    | 'sign-ie'
export type LanguageConfig = Required<OptionalLangConfig>
export const supportedLanguages = Object.entries(LANG_CONFIGS).map(
    ([code, config]) => [code, config.name] as [LangCode, string]
)
export const sourceLanguages = Object.entries(LANG_CONFIGS)
    .filter(([, config]) => config.isSource !== false)
    .map(([code, config]) => [code, config.name] as [LangCode, string])
export const targetLanguages = Object.entries(LANG_CONFIGS)
    .filter(([, config]) => config.isTarget !== false)
    .map(([code, config]) => [code, config.name] as [LangCode, string])
export const langMap = new Map(Object.entries(LANG_CONFIGS).map(([code, config]) => [code, config.name]))
export const langMapReverse = new Map(Object.entries(LANG_CONFIGS).map(([code, config]) => [config.name, code]))

export function getLangName(langCode: string): string {
    const langName = ISO6391.getName(langCode)
    return langName || langMap.get(langCode) || langCode
}

export async function googleDetectLang(text: string): Promise<LangCode> {
    const langMap: Record<string, LangCode> = {
        'zh-CN': 'zh-Hans',
        'zh-TW': 'zh-Hant',
        'ja': 'ja',
        'en': 'en',
        'ko': 'ko',
        'fr': 'fr',
        'es': 'es',
        'ru': 'ru',
        'de': 'de',
        'it': 'it',
        'tr': 'tr',
        'pt': 'pt',
        'vi': 'vi',
        'id': 'id',
        'th': 'th',
        'ar': 'ar',
        'hi': 'hi',
        'mn': 'mn',
        'fa': 'fa',
    }

    const fetcher = getUniversalFetch()
    const resp = await fetcher(
        `https://translate.google.com/translate_a/single?dt=at&dt=bd&dt=ex&dt=ld&dt=md&dt=qca&dt=rw&dt=rm&dt=ss&dt=t&${qs.stringify(
            {
                client: 'gtx',
                sl: 'auto',
                tl: 'zh-CN',
                hl: 'zh-CN',
                ie: 'UTF-8',
                oe: 'UTF-8',
                otf: '1',
                ssel: '0',
                tsel: '0',
                kc: '7',
                q: text,
            }
        )}`,
        {
            method: 'GET',
            headers: { 'content-type': 'application/json' },
        }
    )
    if (resp.ok) {
        const result = await resp.json()
        if (result[2] && result[2] in langMap) {
            return langMap[result[2] as string]
        }
    }
    return 'en'
}

export async function detectLang(text: string): Promise<LangCode> {
    const detectedText = text.trim()
    return await googleDetectLang(detectedText)
}

export function getLangConfig(langCode: LangCode): LanguageConfig {
    const config = LANG_CONFIGS[langCode]
    const DEFAULT_CONFIG: LanguageConfig = {
        name: 'American English',
        nameEn: 'English',
        accent: 'us',
        phoneticNotation: 'transcription',
        isSource: true,
        isTarget: true,
        isVariant: false,
        direction: 'ltr',
        rolePrompt: '',
        genCommandPrompt: (sourceLanguageConfig: LanguageConfig, quoteStart: string, quoteEnd: string) =>
            oneLine`Translate from ${sourceLanguageConfig.name} to ${config.name}.
            Return translated text only.
            Only translate the text between ${quoteStart} and ${quoteEnd}.`,
    }
    return { ...DEFAULT_CONFIG, ...config }
}

export function intoLangCode(langCode: string | null): LangCode {
    const DEFAULT_LANGUAGE_CODE = 'en'
    if (langCode && langCode in LANG_CONFIGS) {
        return langCode as LangCode
    }
    return DEFAULT_LANGUAGE_CODE
}
