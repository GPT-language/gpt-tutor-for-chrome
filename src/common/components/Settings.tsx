import { ReactNode, useCallback, useEffect, useReducer, useState } from 'react'
import _ from 'underscore'
import icon from '../assets/images/icon-large.png'
import beams from '../assets/images/beams.jpg'
import toast, { Toaster } from 'react-hot-toast'
import * as utils from '../utils'
import { Client as Styletron } from 'styletron-engine-atomic'
import { Provider as StyletronProvider } from 'styletron-react'
import { BaseProvider, LightTheme } from 'baseui-sd'
import { Input } from 'baseui-sd/input'
import { createForm } from './Form'
import { Button } from 'baseui-sd/button'
import { Select, Value, Option, SelectProps, Options } from 'baseui-sd/select'
import { Checkbox } from 'baseui-sd/checkbox'
import { supportedLanguages } from './lang/lang'
import { createUseStyles } from 'react-jss'
import { ISettings, IThemedStyleProps } from '../types'
import { useTheme } from '../hooks/useTheme'
import { useTranslation } from 'react-i18next'
import AppConfig from '../../../package.json'
import { useSettings } from '../hooks/useSettings'
import { langCode2TTSLang } from '../tts'
import { RiDeleteBin5Line } from 'react-icons/ri'
import { IoMdAdd } from 'react-icons/io'
import { TTSProvider } from '../tts/types'
import { getEdgeVoices } from '../tts/edge-tts'
import { useThemeType } from '../hooks/useThemeType'
import { Slider } from 'baseui-sd/slider'
import { useLiveQuery } from 'dexie-react-hooks'
import { actionService } from '../services/action'
import { GlobalSuspense } from './GlobalSuspense'
import { Modal, ModalBody, ModalHeader } from 'baseui-sd/modal'
import { Provider, engineIcons, getEngine } from '../engines'
import { IModel } from '../engines/interfaces'
import { IoRefreshSharp } from 'react-icons/io5'
import { CUSTOM_MODEL_ID } from '../constants'
import { TranslateMode, APIModel } from '../translate'
import { TbDirectionSign } from 'react-icons/tb'
// eslint-disable-next-line no-duplicate-imports
import React from 'react'
import NumberInput from './NumberInput'
import { useChatStore } from '@/store/file/store'

const langOptions: Value = supportedLanguages.reduce((acc, [id, label]) => {
    return [
        ...acc,
        {
            id,
            label,
        } as Option,
    ]
}, [] as Value)

const specifiedLangCodes = [
    'ar', // Arabic
    'zh-Hans',
    'zh-Hant', // Chinese (Simplified and Traditional)
    'zh-sg',
    'nl', // Dutch
    'nl-be',
    'en',
    'en-US',
    'en-GB',
    'en-CA',
    'en-AU', // English (All variants)
    'fr', // French
    'fr-be',
    'fr-qc',
    'fr-ch',
    'de', // German
    'el', // Greek
    'he', // Hebrew
    'it', // Italian
    'ja', // Japanese
    'ko', // Korean
    'pl', // Polish
    'pt', // Portuguese
    'pt-br',
    'ru', // Russian
    'es', // Spanish
    'es-la',
    'sv', // Swedish
    'th', // Thai
    'tr', // Turkish
    'uk', // Ukrainian
    'vi', // Vietnamese
    'sign-us',
    'sign-uk',
    'sign-ie',
    'sign-aus',
    'sign-nz',
]

const yourglishLangOptions: Value = supportedLanguages.reduce((acc, [id, label]) => {
    if (specifiedLangCodes.includes(id)) {
        return [
            ...acc,
            {
                id,
                label,
            } as Option,
        ]
    }
    return acc
}, [] as Value)

interface ILanguageSelectorProps {
    value?: string
    onChange?: (value: string) => void
    onBlur?: () => void
}

function LanguageSelector({ value, onChange, onBlur }: ILanguageSelectorProps) {
    return (
        <Select
            onBlur={onBlur}
            size='compact'
            clearable={false}
            options={langOptions}
            value={value ? [{ id: value }] : []}
            onChange={({ value }) => {
                const selected = value[0]
                onChange?.(selected?.id as string)
            }}
            overrides={{
                Root: {
                    style: {
                        minWidth: '130px',
                    },
                },
            }}
        />
    )
}

function YouglishLanguageSelector({ value, onChange, onBlur }: ILanguageSelectorProps) {
    return (
        <Select
            onBlur={onBlur}
            size='compact'
            clearable={false}
            options={yourglishLangOptions}
            value={value ? [{ id: value }] : []}
            onChange={({ value }) => {
                const selected = value[0]
                onChange?.(selected?.id as string)
            }}
        />
    )
}

interface ITranslateModeSelectorProps {
    value?: TranslateMode | 'nop'
    onChange?: (value: TranslateMode | 'nop') => void
    onBlur?: () => void
}

interface AlwaysShowIconsCheckboxProps {
    value?: boolean
    onChange?: (value: boolean) => void
    onBlur?: () => void
}

function AlwaysShowIconsCheckbox({ value, onChange, onBlur }: AlwaysShowIconsCheckboxProps) {
    return (
        <Checkbox
            checkmarkType='toggle_round'
            checked={value}
            onChange={(e) => {
                onChange?.(e.target.checked)
                onBlur?.()
            }}
        />
    )
}

interface AutoTranslateCheckboxProps {
    value?: boolean
    onChange?: (value: boolean) => void
    onBlur?: () => void
}

interface IProviderSelectorProps {
    value?: Provider
    onChange?: (value: Provider) => void
}

function TranslateModeSelector({ value, onChange, onBlur }: ITranslateModeSelectorProps) {
    const actions = useLiveQuery(() => actionService.list())
    const { t } = useTranslation()

    return (
        <Select
            size='compact'
            onBlur={onBlur}
            searchable={false}
            clearable={false}
            value={
                value && [
                    {
                        id: value,
                    },
                ]
            }
            onChange={(params) => {
                onChange?.(params.value[0].id as TranslateMode | 'nop')
            }}
            options={
                [
                    { label: t('Nop'), id: 'nop' },
                    ...(actions?.map((item) => ({
                        label: item.mode ? t(item.name) : item.name,
                        id: item.mode ? item.mode : String(item.id),
                    })) ?? []),
                ] as {
                    label: string
                    id: string
                }[]
            }
        />
    )
}

const useTTSSettingsStyles = createUseStyles({
    settingsLabel: (props: IThemedStyleProps) => ({
        color: props.theme.colors.contentPrimary,
        display: 'block',
        marignTop: '4px',
    }),
    voiceSelector: {
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        marginTop: '10px',
    },
    providerSelector: {
        marginTop: '10px',
    },
    formControl: {
        marginBottom: '12px',
    },
    tickBar: (props: IThemedStyleProps) => ({
        color: props.theme.colors.contentPrimary,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingRight: '16px',
        paddingLeft: '16px',
    }),
})

interface TTSVoicesSettingsProps {
    value?: ISettings['tts']
    onChange?: (value: ISettings['tts']) => void
    onBlur?: () => void
}

const ttsProviderOptions: {
    label: string
    id: TTSProvider
    voice?: string
}[] = [
    { label: 'Edge TTS', id: 'EdgeTTS' },
    { label: 'System Default', id: 'WebSpeech' },
    { label: 'Ember（ChatGPT Web）', id: 'EdgeTTS', voice: 'ember' },
    { label: 'Cove（ChatGPT Web）', id: 'EdgeTTS', voice: 'cove' },
    { label: 'Breeze（ChatGPT Web）', id: 'EdgeTTS', voice: 'breeze' },
    { label: 'Juniper（ChatGPT Web）', id: 'EdgeTTS', voice: 'juniper' },
    { label: 'Sky（ChatGPT Web）', id: 'EdgeTTS', voice: 'sky' },
]

function TTSVoicesSettings({ value, onChange, onBlur }: TTSVoicesSettingsProps) {
    const { t } = useTranslation()
    const { theme, themeType } = useTheme()

    const styles = useTTSSettingsStyles({ theme, themeType, isDesktopApp: utils.isDesktopApp() })

    const [showLangSelector, setShowLangSelector] = useState(false)

    const [supportVoices, setSupportVoices] = useState<SpeechSynthesisVoice[]>([])

    useEffect(() => {
        ;(async () => {
            switch (value?.provider ?? 'WebSpeech') {
                case 'EdgeTTS':
                    setSupportVoices(await getEdgeVoices())
                    break
                case 'WebSpeech':
                    setSupportVoices(speechSynthesis.getVoices())
                    break
                default:
                    setSupportVoices(speechSynthesis.getVoices())
                    break
            }
        })()
    }, [value?.provider])

    const getLangOptions = useCallback(
        (lang: string) => {
            return supportedLanguages.reduce((acc, [langCode, label]) => {
                const ttsLang = langCode2TTSLang[langCode]
                if (ttsLang && supportVoices.find((v) => v.lang === ttsLang)) {
                    if (value?.voices?.find((item) => item.lang === langCode) && langCode !== lang) {
                        return acc
                    }
                    return [
                        ...acc,
                        {
                            id: langCode,
                            label,
                        } as Option,
                    ]
                }
                return acc
            }, [] as Value)
        },
        [value?.voices, supportVoices]
    )

    const getVoiceOptions = useCallback(
        (lang: string) => {
            const ttsLang = langCode2TTSLang[lang]
            return supportVoices
                .filter((v) => v.lang === ttsLang)
                .map((sv) => ({ id: sv.voiceURI, label: sv.name, lang: sv.lang }))
        },
        [supportVoices]
    )

    const handleDeleteLang = useCallback(
        (lang: string) => {
            const voices = value?.voices ?? []
            const newVoices = voices.filter((item) => {
                return item.lang !== lang
            })
            onChange?.({ ...value, voices: newVoices })
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [value]
    )

    const handleChangeLang = useCallback(
        (prevLang: string, newLang: string) => {
            const voices = value?.voices ?? []
            const newVoices = voices.map((item) => {
                if (item.lang === prevLang) {
                    return {
                        ...item,
                        lang: newLang,
                    }
                }
                return item
            })
            onChange?.({ ...value, voices: newVoices })
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [value]
    )

    const handleAddLang = useCallback(
        (lang: string) => {
            const voices = value?.voices ?? []
            onChange?.({
                ...value,
                voices: [
                    ...voices,
                    {
                        lang,
                        voice: '',
                    },
                ],
            })
            setShowLangSelector(false)
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [value]
    )

    const handleChangeVoice = useCallback(
        (lang: string, voice: string) => {
            const voices = value?.voices ?? []
            const newVoices = voices.map((item) => {
                if (item.lang === lang) {
                    return {
                        ...item,
                        voice,
                    }
                }
                return item
            })
            onChange?.({ ...value, voices: newVoices })
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [value]
    )

    const handleChangeProvider = useCallback(
        (provider: TTSProvider, voice: string) => {
            onChange?.({ ...value, provider })
            if (voice) {
                useChatStore.setState({ ttsProvider: voice })
                localStorage.setItem('ttsProvider', voice)
            }
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [value]
    )

    return (
        <div>
            <div className={styles.formControl}>
                <label className={styles.settingsLabel}>{t('Provider')}</label>
                <div className={styles.providerSelector}>
                    <Select
                        size='compact'
                        clearable={false}
                        searchable={false}
                        options={ttsProviderOptions}
                        value={[
                            {
                                label:
                                    value?.provider && useChatStore.getState().ttsProvider
                                        ? `ChatGPT (${useChatStore.getState().ttsProvider})`
                                        : value?.provider || 'EdgeTTS',
                            },
                        ]}
                        onChange={({ option }) => handleChangeProvider(option?.id as TTSProvider, option?.voice)}
                        onBlur={onBlur}
                    />
                </div>
            </div>
            <div className={styles.formControl}>
                <label className={styles.settingsLabel}>{t('Rate')}</label>
                <Slider
                    min={1}
                    max={20}
                    step={1}
                    value={[value?.rate ?? 10]}
                    onChange={(params) => onChange?.({ ...value, rate: params.value[0] })}
                    overrides={{
                        ThumbValue: () => null,
                        InnerThumb: () => null,
                        TickBar: () => (
                            <div className={styles.tickBar}>
                                <div>{t('Slow')}</div>
                                <div>{t('Fast')}</div>
                            </div>
                        ),
                    }}
                />
            </div>
            <div className={styles.formControl}>
                <label className={styles.settingsLabel}>{t('Volume')}</label>
                <Slider
                    min={0}
                    max={100}
                    step={1}
                    value={[value?.volume ?? 100]}
                    onChange={(params) => onChange?.({ ...value, volume: params.value[0] })}
                    overrides={{
                        ThumbValue: () => null,
                        InnerThumb: () => null,
                        TickBar: () => (
                            <div className={styles.tickBar}>
                                <div>{t('Quiet')}</div>
                                <div>{t('Loud')}</div>
                            </div>
                        ),
                    }}
                />
            </div>
            <div className={styles.formControl}>
                <label className={styles.settingsLabel}>{t('Voice')}</label>
                {(value?.voices ?? []).map(({ lang, voice }) => (
                    <div className={styles.voiceSelector} key={lang}>
                        <Select
                            size='compact'
                            clearable={false}
                            options={getLangOptions(lang)}
                            onChange={({ option }) => handleChangeLang(lang, option?.id as string)}
                            value={[{ id: lang }]}
                        />
                        <Select
                            size='compact'
                            options={getVoiceOptions(lang)}
                            value={[{ id: voice }]}
                            onChange={({ option }) => handleChangeVoice(lang, option?.id as string)}
                            clearable={false}
                            onBlur={onBlur}
                        />
                        <Button
                            shape='circle'
                            size='mini'
                            overrides={{
                                Root: {
                                    style: {
                                        flexShrink: 0,
                                    },
                                },
                            }}
                            onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                handleDeleteLang(lang)
                            }}
                        >
                            <RiDeleteBin5Line />
                        </Button>
                    </div>
                ))}
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        marginTop: 10,
                    }}
                >
                    {showLangSelector && (
                        <Select
                            size='mini'
                            clearable={false}
                            options={getLangOptions('')}
                            onChange={({ option }) => handleAddLang(option?.id as string)}
                        />
                    )}
                    <Button
                        size='mini'
                        startEnhancer={() => <IoMdAdd size={12} />}
                        onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            setShowLangSelector(true)
                        }}
                    >
                        {t('Add')}
                    </Button>
                </div>
            </div>
        </div>
    )
}

interface Ii18nSelectorProps {
    value?: string
    onChange?: (value: string) => void
    onBlur?: () => void
}

function Ii18nSelector({ value, onChange, onBlur }: Ii18nSelectorProps) {
    const { i18n } = useTranslation()

    const options = [
        { label: 'English', id: 'en' },
        { label: '简体中文', id: 'zh-Hans' },
        { label: '繁體中文', id: 'zh-Hant' },
        { label: '日本語', id: 'ja' },
        { label: 'ไทย', id: 'th' },
        { label: 'عربي', id: 'ar' },
        { label: 'हिन्दी', id: 'hi' },
        { label: '한국어', id: 'ko' },
        { label: 'Русский', id: 'ru' },
        { label: 'Deutsch', id: 'de' },
        { label: 'Français', id: 'fr' },
    ]

    return (
        <Select
            size='compact'
            onBlur={onBlur}
            searchable={false}
            clearable={false}
            value={
                value
                    ? [
                          {
                              id: value,
                              label: options.find((option) => option.id === value)?.label,
                          },
                      ]
                    : undefined
            }
            onChange={(params) => {
                onChange?.(params.value[0].id as string)
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                ;(i18n as any).changeLanguage(params.value[0].id as string)
            }}
            options={options}
        />
    )
}

interface APIModelSelectorProps {
    currentProvider: Provider
    provider: Provider
    apiKey?: string
    value?: string
    onChange?: (value: string) => void
    onBlur?: () => void
}

const linkStyle = {
    color: 'inherit',
    opacity: 0.8,
    cursor: 'pointer',
    outline: 'none',
}

interface APIModelOption {
    label: ReactNode
    id: string
}

function APIModelSelector({ currentProvider, provider, apiKey, value, onChange, onBlur }: APIModelSelectorProps) {
    const { t } = useTranslation()
    const [isLoading, setIsLoading] = useState(false)
    const [options, setOptions] = useState<APIModelOption[]>([])
    const [errMsg, setErrMsg] = useState<string>()
    const [isChatGPTNotLogin, setIsChatGPTNotLogin] = useState(false)
    const [refreshFlag, refresh] = useReducer((x: number) => x + 1, 0)
    const { theme } = useTheme()

    useEffect(() => {
        setIsChatGPTNotLogin(false)
        setErrMsg('')
        setOptions([])
        if (provider !== currentProvider) {
            return
        }
        const engine = getEngine(provider)
        setIsLoading(true)
        ;(async () => {
            try {
                const models = await engine.listModels(apiKey)
                setOptions([
                    ...models.map((model: IModel) => ({
                        label: (
                            <div
                                style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: 3,
                                }}
                            >
                                <div
                                    style={{
                                        fontSize: '14px',
                                        color: theme.colors.contentPrimary,
                                    }}
                                >
                                    {model.name}
                                </div>
                                {model.description && (
                                    <div
                                        style={{
                                            fontSize: '12px',
                                            color: theme.colors.contentTertiary,
                                        }}
                                    >
                                        {model.description}
                                    </div>
                                )}
                            </div>
                        ),
                        id: model.id,
                    })),
                    ...(engine.supportCustomModel()
                        ? [
                              {
                                  id: CUSTOM_MODEL_ID,
                                  label: t('Custom'),
                              },
                          ]
                        : []),
                ])
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
            } catch (e: any) {
                if (
                    provider === 'ChatGPT' &&
                    e.message &&
                    (e.message.includes('not login') || e.message.includes('Forbidden'))
                ) {
                    setIsChatGPTNotLogin(true)
                    const accessToken = await chrome.storage.local.get('accessToken')
                    if (accessToken && e.message.includes('Forbidden')) {
                        chrome.storage.local.remove('accessToken')
                    }
                }
                setErrMsg(e.message)
            } finally {
                setIsLoading(false)
            }
        })()
    }, [apiKey, currentProvider, provider, refreshFlag, t, theme.colors.contentPrimary, theme.colors.contentTertiary])

    return (
        <div>
            <div
                style={{
                    display: 'flex',
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 4,
                }}
            >
                <Select
                    isLoading={isLoading}
                    size='compact'
                    onBlur={onBlur}
                    searchable={false}
                    clearable={false}
                    value={
                        value
                            ? [
                                  {
                                      id: value,
                                  },
                              ]
                            : undefined
                    }
                    onChange={(params) => {
                        onChange?.(params.value[0].id as APIModel)
                    }}
                    options={options}
                />
                <Button
                    size='compact'
                    kind='secondary'
                    onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        refresh()
                    }}
                >
                    <IoRefreshSharp size={16} />
                </Button>
            </div>
            <div
                style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 4,
                }}
            >
                {errMsg && (
                    <div
                        style={{
                            color: 'red',
                        }}
                    >
                        {errMsg}
                    </div>
                )}
                {isChatGPTNotLogin && (
                    <div
                        style={{
                            color: theme.colors.contentPrimary,
                        }}
                    >
                        <span>{t('Please login to ChatGPT Web')}: </span>
                        <a href='https://chat.openai.com' target='_blank' rel='noreferrer' style={linkStyle}>
                            Login
                        </a>
                    </div>
                )}
            </div>
        </div>
    )
}

interface AutoTranslateCheckboxProps {
    value?: boolean
    onChange?: (value: boolean) => void
    onBlur?: () => void
}

function AutoTranslateCheckbox({ value, onChange, onBlur }: AutoTranslateCheckboxProps) {
    return (
        <Checkbox
            checkmarkType='toggle_round'
            checked={value}
            onChange={(e) => {
                onChange?.(e.target.checked)
                onBlur?.()
            }}
        />
    )
}

interface MyCheckboxProps {
    value?: boolean
    onChange?: (value: boolean) => void
    onBlur?: () => void
}

function MyCheckbox({ value, onChange, onBlur }: MyCheckboxProps) {
    return (
        <Checkbox
            checkmarkType='toggle_round'
            checked={value}
            onChange={(e) => {
                onChange?.(e.target.checked)
                onBlur?.()
            }}
        />
    )
}

interface IAddProviderIconsProps {
    options: Options
    currentProvider?: Provider
    hasPromotion?: boolean
    theme: typeof LightTheme
}

const addProviderIcons = ({ options, currentProvider, hasPromotion, theme }: IAddProviderIconsProps) => {
    if (!Array.isArray(options)) {
        return options
    }
    return options.map((item) => {
        if (typeof item.label !== 'string') {
            return item
        }
        const icon = engineIcons[item.id as Provider]
        if (!icon) {
            return item
        }
        let label = (
            <div
                style={{
                    display: 'flex',
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 8,
                }}
            >
                {React.createElement(icon, { size: 10 }, [])}
                {item.label}
            </div>
        )
        if (item.id === 'OpenAI') {
            label = (
                <div
                    style={{
                        display: 'flex',
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 10,
                    }}
                >
                    {label}
                    {hasPromotion && currentProvider !== 'OpenAI' && (
                        <div
                            style={{
                                width: '0.45rem',
                                height: '0.45rem',
                                borderRadius: '50%',
                                backgroundColor: theme.colors.warning300,
                            }}
                        />
                    )}
                </div>
            )
        }
        return {
            ...item,
            label,
        }
    })
}

interface IProviderSelectorProps {
    value?: Provider
    onChange?: (value: Provider) => void
    hasPromotion?: boolean
}

function ProviderSelector({ value, onChange, hasPromotion }: IProviderSelectorProps) {
    const { theme } = useTheme()
    const { t } = useTranslation()

    let overrides: SelectProps['overrides'] = undefined
    if (hasPromotion && value !== 'OpenAI') {
        overrides = {
            ControlContainer: {
                style: {
                    borderColor: theme.colors.warning300,
                },
            },
        }
    }

    const options = utils.isDesktopApp()
        ? ([
              { label: 'OpenAI', id: 'OpenAI' },
              { label: `Kimi`, id: 'Kimi' },
              { label: `ChatGLM`, id: 'ChatGLM' },
              { label: `Ollama`, id: 'Ollama' },
              { label: 'Gemini', id: 'Gemini' },
              // { label: 'ChatGPT (Web)', id: 'ChatGPT' },
              { label: 'Azure', id: 'Azure' },
              { label: 'MiniMax', id: 'MiniMax' },
              { label: 'Moonshot', id: 'Moonshot' },
              { label: 'Groq', id: 'Groq' },
              { label: 'Claude', id: 'Claude' },
              { label: 'DeepSeek', id: 'DeepSeek' },
          ] as {
              label: string
              id: Provider
          }[])
        : ([
              { label: 'OpenAI', id: 'OpenAI' },
              { label: `Kimi`, id: 'Kimi' },
              { label: `ChatGLM`, id: 'ChatGLM' },
              { label: 'ChatGPT', id: 'ChatGPT' },
              { label: 'Gemini', id: 'Gemini' },
              { label: 'Azure', id: 'Azure' },
              { label: 'MiniMax', id: 'MiniMax' },
              { label: 'Moonshot', id: 'Moonshot' },
              { label: 'Groq', id: 'Groq' },
              { label: 'Claude', id: 'Claude' },
              { label: 'DeepSeek', id: 'DeepSeek' },
          ] as {
              label: string
              id: Provider
          }[])

    return (
        <Select
            overrides={overrides}
            size='compact'
            searchable={false}
            clearable={false}
            value={
                value && [
                    {
                        id: value,
                    },
                ]
            }
            onChange={(params) => {
                onChange?.(params.value[0].id as Provider | 'OpenAI')
            }}
            options={addProviderIcons({
                options,
                currentProvider: value,
                hasPromotion,
                theme,
            })}
        />
    )
}

const { Form, FormItem, useForm } = createForm<ISettings>()

interface IInnerSettingsProps {
    onSave?: (oldSettings: ISettings) => void
}

interface ISettingsProps extends IInnerSettingsProps {
    engine: Styletron
}

export function Settings({ engine, ...props }: ISettingsProps) {
    const { theme } = useTheme()
    return (
        <StyletronProvider value={engine}>
            <BaseProvider theme={theme}>
                <GlobalSuspense>
                    <InnerSettings {...props} />
                </GlobalSuspense>
            </BaseProvider>
        </StyletronProvider>
    )
}

export function InnerSettings({ onSave }: IInnerSettingsProps) {
    const { theme } = useTheme()
    const { setThemeType } = useThemeType()

    const { t } = useTranslation()

    const isTauri = utils.isTauri()

    const [loading, setLoading] = useState(false)
    const [values, setValues] = useState<ISettings>({
        chatgptArkoseReqUrl: '',
        chatgptArkoseReqForm: '',
        apiKeys: '',
        apiURL: utils.defaultAPIURL,
        apiURLPath: utils.defaultAPIURLPath,
        apiModel: utils.defaultAPIModel,
        provider: utils.defaultProvider,
        autoTranslate: utils.defaultAutoTranslate,
        chatContext: utils.defaultChatContext,
        defaultTranslateMode: 'translate',
        defaultYouglishLanguage: utils.defaultYouglishLanguage,
        defaultSourceLanguage: utils.defaultSourceLanguage,
        defaultTargetLanguage: utils.defaultTargetLanguage,
        alwaysShowIcons: !isTauri,
        hotkey: '',
        i18n: utils.defaulti18n,
        restorePreviousPosition: false,
        selectInputElementsText: utils.defaultSelectInputElementsText,
        runAtStartup: false,
        azureAPIKeys: '',
        azureAPIURL: '',
        azureAPIURLPath: '',
        azureAPIModel: '',
        miniMaxAPIKey: '',
        miniMaxAPIModel: '',
        moonshotAPIKey: '',
        moonshotAPIModel: '',
        geminiAPIKey: '',
        geminiAPIModel: '',
        miniMaxGroupID: '',
        moonshotGroupID: '',
        geminiAPIURL: '',
        deepSeekAPIKey: '',
        deepSeekAPIModel: '',
    })
    const [prevValues, setPrevValues] = useState<ISettings>(values)

    const [form] = useForm()

    useEffect(() => {
        form.setFieldsValue(values)
    }, [form, values])

    const { settings, setSettings } = useSettings()

    useEffect(() => {
        if (settings) {
            ;(async () => {
                setValues(settings)
                setPrevValues(settings)
            })()
        }
    }, [isTauri, settings])

    const onChange = useCallback((_changes: Partial<ISettings>, values_: ISettings) => {
        setValues(values_)
    }, [])

    const onSubmit = useCallback(
        async (data: ISettings) => {
            if (data.themeType) {
                setThemeType(data.themeType)
            }
            setLoading(true)
            const oldSettings = await utils.getSettings()
            await utils.setSettings(data)

            toast(t('Saved'), {
                icon: '👍',
                duration: 3000,
            })
            setLoading(false)
            setSettings(data)
            onSave?.(oldSettings)
        },
        [onSave, setSettings, setThemeType, t]
    )

    const onBlur = useCallback(async () => {
        if (values.apiKeys && !_.isEqual(values, prevValues)) {
            await utils.setSettings(values)
            setPrevValues(values)
        }
    }, [prevValues, values])

    const isDesktopApp = utils.isDesktopApp()
    const isMacOS = navigator.userAgent.includes('Mac OS X')
    const [showBuyMeACoffee, setShowBuyMeACoffee] = useState(false)
    const [showSocialMedia, setShowSocialMedia] = useState(false)

    return (
        <div
            style={{
                paddingTop: isDesktopApp ? '98px' : undefined,
                paddingBottom: isDesktopApp ? '32px' : undefined,
                background: theme.colors.backgroundPrimary,
                minWidth: isDesktopApp ? 450 : 360,
            }}
            data-testid='settings-container'
        >
            <nav
                style={{
                    position: isDesktopApp ? 'fixed' : undefined,
                    left: isDesktopApp ? 0 : undefined,
                    top: isDesktopApp ? 0 : undefined,
                    zIndex: 1,
                    width: '100%',
                    display: 'flex',
                    flexDirection: 'row',
                    alignItems: 'center',
                    padding: '15px 25px',
                    color: '#333',
                    background: `url(${beams}) no-repeat center center`,
                    gap: 10,
                    boxSizing: 'border-box',
                }}
            >
                <img width='22' src={icon} alt='logo' />
                <h2>
                    GPT Tutor
                    {AppConfig?.version ? (
                        <a
                            href='https://github.com/GPT-language/gpt-tutor-for-chrome'
                            target='_blank'
                            rel='noreferrer'
                            style={linkStyle}
                        >
                            {AppConfig.version}
                        </a>
                    ) : null}
                </h2>
                <div
                    style={{
                        flexGrow: 1,
                    }}
                />
                <div>
                    <Button
                        kind='secondary'
                        size='mini'
                        onClick={(e) => {
                            e.stopPropagation()
                            setShowSocialMedia(true)
                        }}
                    >
                        {'🖥️  ' + t('Follow me on social media')}
                    </Button>
                </div>
                <div>
                    <Button
                        kind='secondary'
                        size='mini'
                        onClick={(e) => {
                            e.stopPropagation()
                            setShowBuyMeACoffee(true)
                        }}
                    >
                        {'❤️  ' + t('Buy my kitty a treat')}
                    </Button>
                </div>
            </nav>
            <Form
                form={form}
                style={{
                    padding: '20px 25px',
                }}
                onFinish={onSubmit}
                initialValues={values}
                onValuesChange={onChange}
            >
                <FormItem
                    name='provider'
                    label={t('Default Service Provider')}
                    required
                    caption={
                        values.provider === 'Ollama' ? (
                            <div>
                                {t('Go to the')}{' '}
                                <a
                                    target='_blank'
                                    href='https://github.com/ollama/ollama#ollama'
                                    rel='noreferrer'
                                    style={linkStyle}
                                >
                                    Ollama Homepage
                                </a>{' '}
                                {t('to learn how to install and setup.')}
                            </div>
                        ) : undefined
                    }
                >
                    <ProviderSelector />
                </FormItem>
                <div
                    style={{
                        display: values.provider === 'Ollama' ? 'block' : 'none',
                    }}
                >
                    <FormItem
                        name='ollamaAPIURL'
                        label={t('API URL')}
                        required={values.provider === 'Ollama'}
                        caption={t('Generally, there is no need to modify this item.')}
                    >
                        <Input size='compact' onBlur={onBlur} />
                    </FormItem>
                    <FormItem
                        name='ollamaAPIModel'
                        label={t('API Model')}
                        required={values.provider === 'Ollama'}
                        caption={
                            <div>
                                <div>
                                    {t(
                                        'Model needs to first use the `ollama pull` command to download locally, please view all models from this page:'
                                    )}{' '}
                                    <a
                                        target='_blank'
                                        href='https://ollama.com/library'
                                        rel='noreferrer'
                                        style={linkStyle}
                                    >
                                        Models
                                    </a>
                                </div>
                            </div>
                        }
                    >
                        <APIModelSelector provider='Ollama' currentProvider={values.provider} onBlur={onBlur} />
                    </FormItem>
                    <div
                        style={{
                            display: values.ollamaAPIModel === CUSTOM_MODEL_ID ? 'block' : 'none',
                        }}
                    >
                        <FormItem
                            name='ollamaCustomModelName'
                            label={t('Custom Model Name')}
                            required={values.provider === 'Ollama' && values.ollamaAPIModel === CUSTOM_MODEL_ID}
                        >
                            <Input autoComplete='off' size='compact' />
                        </FormItem>
                    </div>
                </div>
                <div
                    style={{
                        display: values.provider === 'Groq' ? 'block' : 'none',
                    }}
                >
                    <FormItem
                        required={values.provider === 'Groq'}
                        name='groqAPIKey'
                        label='Groq API Key'
                        caption={
                            <div>
                                {t('Go to the')}{' '}
                                <a
                                    target='_blank'
                                    href='https://console.groq.com/keys'
                                    rel='noreferrer'
                                    style={linkStyle}
                                >
                                    GroqCloud
                                </a>{' '}
                                {t('to get your API Key.')}
                            </div>
                        }
                    >
                        <Input autoFocus type='password' size='compact' onBlur={onBlur} />
                    </FormItem>
                    <FormItem name='groqAPIModel' label={t('API Model')} required={values.provider === 'Groq'}>
                        <APIModelSelector
                            provider='Groq'
                            currentProvider={values.provider}
                            apiKey={values.groqAPIKey}
                            onBlur={onBlur}
                        />
                    </FormItem>
                    <div
                        style={{
                            display: values.groqAPIModel === CUSTOM_MODEL_ID ? 'block' : 'none',
                        }}
                    >
                        <FormItem
                            name='groqCustomModelName'
                            label={t('Custom Model Name')}
                            required={values.provider === 'Groq' && values.groqAPIModel === CUSTOM_MODEL_ID}
                        >
                            <Input autoComplete='off' size='compact' />
                        </FormItem>
                    </div>
                    <FormItem
                        name='groqAPIURL'
                        label={t('API URL')}
                        required={values.provider === 'Groq'}
                        caption={t('Generally, there is no need to modify this item.')}
                    >
                        <Input size='compact' onBlur={onBlur} />
                    </FormItem>
                    <FormItem
                        name='groqAPIURLPath'
                        label={t('API URL Path')}
                        required={values.provider === 'Groq'}
                        caption={t('Generally, there is no need to modify this item.')}
                    >
                        <Input size='compact' onBlur={onBlur} />
                    </FormItem>
                </div>
                <div
                    style={{
                        display: values.provider === 'Claude' ? 'block' : 'none',
                    }}
                >
                    <FormItem
                        required={values.provider === 'Claude'}
                        name='claudeAPIKey'
                        label='Claude API Key'
                        caption={
                            <div>
                                {t('Go to the')}{' '}
                                <a
                                    target='_blank'
                                    href='https://console.anthropic.com/settings/keys'
                                    rel='noreferrer'
                                    style={linkStyle}
                                >
                                    Anthropic Console
                                </a>{' '}
                                {t('to get your API Key.')}
                            </div>
                        }
                    >
                        <Input autoFocus type='password' size='compact' onBlur={onBlur} />
                    </FormItem>
                    <FormItem name='claudeAPIModel' label={t('API Model')} required={values.provider === 'Claude'}>
                        <APIModelSelector
                            provider='Claude'
                            currentProvider={values.provider}
                            apiKey={values.claudeAPIKey}
                            onBlur={onBlur}
                        />
                    </FormItem>
                    <div
                        style={{
                            display: values.claudeAPIModel === CUSTOM_MODEL_ID ? 'block' : 'none',
                        }}
                    >
                        <FormItem
                            name='claudeCustomModelName'
                            label={t('Custom Model Name')}
                            required={values.provider === 'Claude' && values.claudeAPIModel === CUSTOM_MODEL_ID}
                        >
                            <Input autoComplete='off' size='compact' />
                        </FormItem>
                    </div>
                    <FormItem
                        name='claudeAPIURL'
                        label={t('API URL')}
                        required={values.provider === 'Claude'}
                        caption={t('Generally, there is no need to modify this item.')}
                    >
                        <Input size='compact' onBlur={onBlur} />
                    </FormItem>
                    <FormItem
                        name='claudeAPIURLPath'
                        label={t('API URL Path')}
                        required={values.provider === 'Claude'}
                        caption={t('Generally, there is no need to modify this item.')}
                    >
                        <Input size='compact' onBlur={onBlur} />
                    </FormItem>
                </div>
                <div
                    style={{
                        display: values.provider === 'Kimi' && utils.isDesktopApp() ? 'block' : 'none',
                    }}
                >
                    <FormItem
                        required={values.provider === 'Kimi' && utils.isDesktopApp()}
                        name='kimiRefreshToken'
                        label='Kimi Refresh Token'
                        caption={
                            <div>
                                {t('Go to the')}{' '}
                                <a
                                    target='_blank'
                                    href={
                                        values?.i18n?.toLowerCase().includes('zh')
                                            ? 'https://github.com/openai-translator/openai-translator/blob/main/docs/kimi-cn.md'
                                            : 'https://github.com/openai-translator/openai-translator/blob/main/docs/kimi.md'
                                    }
                                    rel='noreferrer'
                                    style={linkStyle}
                                >
                                    Tutorial
                                </a>{' '}
                                {t('to get your refresh_token.')}
                            </div>
                        }
                    >
                        <Input autoFocus type='password' size='compact' onBlur={onBlur} />
                    </FormItem>
                    <FormItem
                        required={values.provider === 'Kimi' && utils.isDesktopApp()}
                        name='kimiAccessToken'
                        label='Kimi Access Token'
                        caption={
                            <div>
                                {t('Go to the')}{' '}
                                <a
                                    target='_blank'
                                    href={
                                        values?.i18n?.toLowerCase().includes('zh')
                                            ? 'https://github.com/openai-translator/openai-translator/blob/main/docs/kimi-cn.md'
                                            : 'https://github.com/openai-translator/openai-translator/blob/main/docs/kimi.md'
                                    }
                                    rel='noreferrer'
                                    style={linkStyle}
                                >
                                    Tutorial
                                </a>{' '}
                                {t('to get your access_token.')}
                            </div>
                        }
                    >
                        <Input autoFocus type='password' size='compact' onBlur={onBlur} />
                    </FormItem>
                </div>
                <div
                    style={{
                        display: values.provider === 'ChatGLM' && utils.isDesktopApp() ? 'block' : 'none',
                    }}
                >
                    <FormItem
                        required={values.provider === 'ChatGLM' && utils.isDesktopApp()}
                        name='chatglmRefreshToken'
                        label={`ChatGLM Refresh Token`}
                        caption={
                            <div>
                                {t('Go to the')}{' '}
                                <a
                                    target='_blank'
                                    href={
                                        values?.i18n?.toLowerCase().includes('zh')
                                            ? 'https://github.com/openai-translator/openai-translator/blob/main/docs/chatglm-cn.md'
                                            : 'https://github.com/openai-translator/openai-translator/blob/main/docs/chatglm.md'
                                    }
                                    rel='noreferrer'
                                    style={linkStyle}
                                >
                                    Tutorial
                                </a>{' '}
                                {t('to get your refresh_token.')}
                            </div>
                        }
                    >
                        <Input autoFocus type='password' size='compact' onBlur={onBlur} />
                    </FormItem>
                    <FormItem
                        required={values.provider === 'ChatGLM' && utils.isDesktopApp()}
                        name='chatglmAccessToken'
                        label={`ChatGLM Token`}
                        caption={
                            <div>
                                {t('Go to the')}{' '}
                                <a
                                    target='_blank'
                                    href={
                                        values?.i18n?.toLowerCase().includes('zh')
                                            ? 'https://github.com/openai-translator/openai-translator/blob/main/docs/chatglm-cn.md'
                                            : 'https://github.com/openai-translator/openai-translator/blob/main/docs/chatglm.md'
                                    }
                                    rel='noreferrer'
                                    style={linkStyle}
                                >
                                    Tutorial
                                </a>{' '}
                                {t('to get your token.')}
                            </div>
                        }
                    >
                        <Input autoFocus type='password' size='compact' onBlur={onBlur} />
                    </FormItem>
                </div>
                <div
                    style={{
                        display: values.provider === 'Gemini' ? 'block' : 'none',
                    }}
                >
                    <FormItem name='geminiAPIURL' label={t('API URL')} required={values.provider === 'Gemini'}>
                        <Input size='compact' onBlur={onBlur} />
                    </FormItem>
                    <FormItem
                        required={values.provider === 'Gemini'}
                        name='geminiAPIKey'
                        label='Gemini API Key'
                        caption={
                            <div>
                                {t('Go to the')}{' '}
                                <a
                                    target='_blank'
                                    href='https://makersuite.google.com/app/apikey'
                                    rel='noreferrer'
                                    style={linkStyle}
                                >
                                    Google AI Studio
                                </a>{' '}
                                {t('to get your API Key.')}
                            </div>
                        }
                    >
                        <Input autoFocus type='password' size='compact' onBlur={onBlur} />
                    </FormItem>
                    <FormItem name='geminiAPIModel' label={t('API Model')} required={values.provider === 'Gemini'}>
                        <APIModelSelector provider='Gemini' currentProvider={values.provider} onBlur={onBlur} />
                    </FormItem>
                </div>
                <div
                    style={{
                        display: values.provider === 'OpenAI' ? 'block' : 'none',
                    }}
                >
                    <FormItem
                        required={values.provider === 'OpenAI'}
                        name='apiKeys'
                        label={t('API Key')}
                        caption={
                            <div
                                style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: 3,
                                }}
                            >
                                <div>
                                    {t('Go to the')}{' '}
                                    <a
                                        target='_blank'
                                        href='https://platform.openai.com/account/api-keys'
                                        rel='noreferrer'
                                        style={linkStyle}
                                    >
                                        {t('OpenAI page')}
                                    </a>{' '}
                                    {t(
                                        'to get your API Key. You can separate multiple API Keys with English commas to achieve quota doubling and load balancing.'
                                    )}
                                </div>
                            </div>
                        }
                    >
                        <Input autoFocus type='password' size='compact' name='apiKey' onBlur={onBlur} />
                    </FormItem>
                    <FormItem name='apiModel' label={t('API Model')} required={values.provider === 'OpenAI'}>
                        <APIModelSelector provider='OpenAI' currentProvider={values.provider} onBlur={onBlur} />
                    </FormItem>
                    <div
                        style={{
                            display: values.apiModel === CUSTOM_MODEL_ID ? 'block' : 'none',
                        }}
                    >
                        <FormItem
                            name='customModelName'
                            label={t('Custom Model Name')}
                            required={values.provider === 'OpenAI' && values.apiModel === CUSTOM_MODEL_ID}
                        >
                            <Input autoComplete='off' size='compact' />
                        </FormItem>
                    </div>
                    <FormItem name='apiURL' label={t('API URL')} required={values.provider === 'OpenAI'}>
                        <Input size='compact' onBlur={onBlur} />
                    </FormItem>
                    <FormItem name='apiURLPath' label={t('API URL Path')} required={values.provider === 'OpenAI'}>
                        <Input size='compact' />
                    </FormItem>
                </div>
                <div
                    style={{
                        display: values.provider === 'Azure' ? 'block' : 'none',
                    }}
                >
                    <FormItem
                        required={values.provider === 'Azure'}
                        name='azureAPIKeys'
                        label={t('API Key')}
                        caption={
                            <div>
                                {t('Go to the')}{' '}
                                <a
                                    target='_blank'
                                    href='https://learn.microsoft.com/en-us/azure/cognitive-services/openai/chatgpt-quickstart?tabs=command-line&pivots=rest-api#retrieve-key-and-endpoint'
                                    rel='noreferrer'
                                    style={linkStyle}
                                >
                                    {t('Azure OpenAI Service page')}
                                </a>{' '}
                                {t(
                                    'to get your API Key. You can separate multiple API Keys with English commas to achieve quota doubling and load balancing.'
                                )}
                            </div>
                        }
                    >
                        <Input autoFocus type='password' size='compact' onBlur={onBlur} />
                    </FormItem>
                    <FormItem name='azureAPIModel' label={t('API Model')} required={values.provider === 'Azure'}>
                        <APIModelSelector provider='Azure' currentProvider={values.provider} onBlur={onBlur} />
                    </FormItem>
                    <FormItem name='azureAPIURL' label={t('API URL')} required={values.provider === 'Azure'}>
                        <Input size='compact' onBlur={onBlur} />
                    </FormItem>
                    <FormItem name='azureAPIURLPath' label={t('API URL Path')} required={values.provider === 'Azure'}>
                        <Input size='compact' />
                    </FormItem>
                    <FormItem name='azMaxWords' label='Max Tokens' required={values.provider === 'Azure'}>
                        <NumberInput size='compact' />
                    </FormItem>
                </div>
                <div
                    style={{
                        display: values.provider === 'ChatGPT' ? 'block' : 'none',
                    }}
                >
                    <FormItem name='chatgptModel' label={t('API Model')} required={values.provider === 'ChatGPT'}>
                        <APIModelSelector provider='ChatGPT' currentProvider={values.provider} onBlur={onBlur} />
                    </FormItem>
                </div>
                <div
                    style={{
                        display: values.provider === 'MiniMax' ? 'block' : 'none',
                    }}
                >
                    <FormItem
                        required={values.provider === 'MiniMax'}
                        name='miniMaxGroupID'
                        label='MiniMax Group ID'
                        caption={
                            <div>
                                {t('Go to the')}{' '}
                                <a
                                    target='_blank'
                                    href='https://api.minimax.chat/user-center/basic-information'
                                    rel='noreferrer'
                                    style={linkStyle}
                                >
                                    {t('MiniMax page')}
                                </a>{' '}
                                {t('to get your Group ID.')}
                            </div>
                        }
                    >
                        <Input size='compact' onBlur={onBlur} />
                    </FormItem>
                    <FormItem
                        required={values.provider === 'MiniMax'}
                        name='miniMaxAPIKey'
                        label='MiniMax API Key'
                        caption={
                            <div>
                                {t('Go to the')}{' '}
                                <a
                                    target='_blank'
                                    href='https://api.minimax.chat/user-center/basic-information/interface-key'
                                    rel='noreferrer'
                                    style={linkStyle}
                                >
                                    {t('MiniMax page')}
                                </a>{' '}
                                {t('to get your API Key.')}
                            </div>
                        }
                    >
                        <Input autoFocus type='password' size='compact' onBlur={onBlur} />
                    </FormItem>
                    <FormItem name='miniMaxAPIModel' label={t('API Model')} required={values.provider === 'MiniMax'}>
                        <APIModelSelector
                            provider='MiniMax'
                            currentProvider={values.provider}
                            onBlur={onBlur}
                            apiKey={values.miniMaxAPIKey}
                        />
                    </FormItem>
                </div>
                <div
                    style={{
                        display: values.provider === 'Moonshot' ? 'block' : 'none',
                    }}
                >
                    <FormItem
                        required={values.provider === 'Moonshot'}
                        name='moonshotAPIKey'
                        label='Moonshot API Key'
                        caption={
                            <div>
                                {t('Go to the')}{' '}
                                <a target='_blank' href='https://www.moonshot.cn/' rel='noreferrer' style={linkStyle}>
                                    Moonshot Page
                                </a>{' '}
                                {t('to get your API Key.')}
                            </div>
                        }
                    >
                        <Input autoFocus type='password' size='compact' onBlur={onBlur} />
                    </FormItem>
                    <FormItem name='moonshotAPIModel' label={t('API Model')} required={values.provider === 'Moonshot'}>
                        <APIModelSelector
                            provider='Moonshot'
                            currentProvider={values.provider}
                            onBlur={onBlur}
                            apiKey={values.moonshotAPIKey}
                        />
                    </FormItem>
                </div>
                <div
                    style={{
                        display: values.provider === 'DeepSeek' ? 'block' : 'none',
                    }}
                >
                    <FormItem
                        required={values.provider === 'DeepSeek'}
                        name='deepSeekAPIKey'
                        label='DeepSeek API Key'
                        caption={
                            <div>
                                {t('Go to the')}{' '}
                                <a
                                    target='_blank'
                                    href='https://platform.deepseek.com/api_keys'
                                    rel='noreferrer'
                                    style={linkStyle}
                                >
                                    DeepSeek Dashboard
                                </a>{' '}
                                {t('to get your API Key.')}
                            </div>
                        }
                    >
                        <Input autoFocus type='password' size='compact' onBlur={onBlur} />
                    </FormItem>
                    <FormItem name='deepSeekAPIModel' label={t('API Model')} required={values.provider === 'DeepSeek'}>
                        <APIModelSelector
                            provider='DeepSeek'
                            currentProvider={values.provider}
                            apiKey={values.deepSeekAPIKey}
                            onBlur={onBlur}
                        />
                    </FormItem>
                </div>
                <FormItem name='defaultTranslateMode' label={t('Default Action')}>
                    <TranslateModeSelector onBlur={onBlur} />
                </FormItem>
                <FormItem
                    name='alwaysShowIcons'
                    label={t('Show icon when text is selected')}
                    caption={
                        isDesktopApp && (
                            <div
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 6,
                                }}
                            >
                                {t('It is highly recommended to disable this feature and use the Clip Extension')}
                                <a
                                    href='https://github.com/openai-translator/openai-translator/blob/main/CLIP-EXTENSIONS.md'
                                    target='_blank'
                                    rel='noreferrer'
                                >
                                    {t('Clip Extension')}
                                </a>
                            </div>
                        )
                    }
                >
                    <AlwaysShowIconsCheckbox onBlur={onBlur} />
                </FormItem>
                <FormItem name='autoTranslate' label={t('Auto Translate')}>
                    <AutoTranslateCheckbox onBlur={onBlur} />
                </FormItem>
                <FormItem
                    style={{
                        display: isDesktopApp && isMacOS ? 'block' : 'none',
                    }}
                    name='allowUsingClipboardWhenSelectedTextNotAvailable'
                    label={t('Using clipboard')}
                    caption={t(
                        'Allow using the clipboard to get the selected text when the selected text is not available'
                    )}
                >
                    <MyCheckbox onBlur={onBlur} />
                </FormItem>
                <FormItem name='defaultYouglishLanguage' label={t('The Language of Youglish')}>
                    <YouglishLanguageSelector onBlur={onBlur} />
                </FormItem>
                <div style={{ display: 'flex', flexDirection: 'row', gap: 10 }}>
                    <FormItem name='defaultTargetLanguage' label={t('The Language You are Using')}>
                        <LanguageSelector onBlur={onBlur} />
                    </FormItem>
                    <div style={{ marginTop: '10px' }}>
                        <TbDirectionSign size={18} />
                    </div>
                    <FormItem name='defaultSourceLanguage' label={t('The Language You Want to Learn')}>
                        <LanguageSelector onBlur={onBlur} />
                    </FormItem>
                </div>
                <FormItem name='i18n' label={t('i18n')}>
                    <Ii18nSelector onBlur={onBlur} />
                </FormItem>
                <FormItem name='tts' label={t('TTS')}>
                    <TTSVoicesSettings onBlur={onBlur} />
                </FormItem>
                <FormItem
                    style={{
                        display: isDesktopApp ? 'block' : 'none',
                    }}
                    name='disableCollectingStatistics'
                    label={t('disable collecting statistics')}
                >
                    <MyCheckbox onBlur={onBlur} />
                </FormItem>
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        flexDirection: 'row',
                        gap: 10,
                    }}
                >
                    <div
                        style={{
                            marginRight: 'auto',
                        }}
                    />
                    <Button isLoading={loading} size='compact'>
                        {t('Save')}
                    </Button>
                </div>
                <Toaster />
            </Form>
            <Modal
                isOpen={showSocialMedia}
                onClose={() => setShowSocialMedia(false)}
                closeable
                size='auto'
                autoFocus
                animate
            >
                <ModalHeader
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                    }}
                >
                    {'🖥️ ' + t('Follow me on social media')}
                </ModalHeader>
                <ModalBody>
                    <div
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: 10,
                        }}
                    >
                        <div>{t('Follow me on social media to get the latest updates and support')}</div>
                        <div>
                            <a href='https://space.bilibili.com/363340721' target='_blank' rel='noopener noreferrer'>
                                Bilibili
                            </a>
                        </div>
                        <div>
                            <a
                                href='https://www.youtube.com/channel/UC7ecjWbmTb316c1Jk4pQprg'
                                target='_blank'
                                rel='noopener noreferrer'
                            >
                                Youtube
                            </a>
                        </div>
                        <div>
                            <a href='https://x.com/Heraclitius' target='_blank' rel='noopener noreferrer'>
                                X
                            </a>
                        </div>
                        <div>
                            <a href='https://weibo.com/u/2432250323' target='_blank' rel='noopener noreferrer'>
                                微博
                            </a>
                        </div>
                    </div>
                </ModalBody>
            </Modal>
            <Modal
                isOpen={showBuyMeACoffee}
                onClose={() => setShowBuyMeACoffee(false)}
                closeable
                size='auto'
                autoFocus
                animate
            >
                <ModalHeader
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                    }}
                >
                    {'❤️  ' + t('Buy my kitty a treat')}
                </ModalHeader>
                <ModalBody>
                    <div
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: 10,
                        }}
                    >
                        <div>{t('If you find this tool helpful, you can buy my kitty a treat.')}</div>
                        <div>
                            <a href='https://afdian.com/a/zy1999' target='_blank' rel='noopener noreferrer'>
                                爱发电
                            </a>
                        </div>
                        <div>
                            <a href='https://www.patreon.com/yaoyaoyao' target='_blank' rel='noopener noreferrer'>
                                Patreon
                            </a>
                        </div>
                    </div>
                </ModalBody>
            </Modal>
        </div>
    )
}
