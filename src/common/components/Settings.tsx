import _ from 'underscore'
import icon from '../assets/images/icon-large.png'
import beams from '../assets/images/beams.jpg'
import toast, { Toaster } from 'react-hot-toast'
import * as utils from '../utils'
import { Client as Styletron } from 'styletron-engine-atomic'
import { Provider as StyletronProvider } from 'styletron-react'
import { BaseProvider, LightTheme } from 'baseui-sd'
import { Spinner } from 'baseui-sd/spinner'
import { Notification } from 'baseui-sd/notification'
import { Input, SIZE } from 'baseui-sd/input'
import { createForm } from './Form'
import { Button, ButtonProps, KIND, SHAPE } from 'baseui-sd/button'
import { Select, Value, Option, SelectProps, Options } from 'baseui-sd/select'
import { Checkbox } from 'baseui-sd/checkbox'
import { supportedLanguages } from './lang/lang'
import { createUseStyles } from 'react-jss'
import { ISettings, IThemedStyleProps } from '../types'
import { useTheme } from '../hooks/useTheme'
import { useTranslation } from 'react-i18next'
import AppConfig from '../../../package.json'
import { useSettings } from '../hooks/useSettings'
import { langCode2TTSLang, speak } from '../tts'
import { RiDeleteBin5Line } from 'react-icons/ri'
import { IoMdAdd } from 'react-icons/io'
import { TTSProvider } from '../tts/types'
import { getEdgeVoices } from '../tts/edge-tts'
import { useThemeType } from '../hooks/useThemeType'
import { Slider } from 'baseui-sd/slider'
import { GlobalSuspense } from './GlobalSuspense'
import { Modal, ModalBody, ModalHeader } from 'baseui-sd/modal'
import { Provider, engineIcons, getEngine } from '../engines'
import { IModel } from '../engines/interfaces'
import { IoRefreshSharp, IoSettingsOutline } from 'react-icons/io5'
import { CUSTOM_MODEL_ID } from '../constants'
import { TranslateMode, APIModel } from '../translate'
import { TbCloudNetwork, TbDirectionSign } from 'react-icons/tb'
import NumberInput from './NumberInput'
import { useChatStore } from '@/store/file/store'
import React, { ReactNode, useCallback, useEffect, useReducer, useState } from 'react'
import { ProgressSteps, Step } from 'baseui-sd/progress-steps'
import { Card, StyledBody } from 'baseui-sd/card'
import { StyledTabList, StyledTabPanel, Tab, Tabs } from 'baseui-sd/tabs-motion'
import { Cell, Grid } from 'baseui-sd/layout-grid'
import { RxSpeakerLoud } from 'react-icons/rx'
import { BsKeyboard } from 'react-icons/bs'
import SpeakerMotion from './SpeakerMotion'
import { Block } from 'baseui-sd/block'
import { t } from 'i18next'

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

const inputLanguageLevels: Value = [
    { id: 'Level0', label: t('完全零基础') },
    { id: 'Level1', label: t('幼儿园') },
    { id: 'Level2', label: t('小学') },
    { id: 'Level3', label: t('中学') },
    { id: 'Level4', label: t('大学') },
    { id: 'Level5', label: t('研究生') },
]

const outputLanguageLevels: Value = [
    { id: 'Level0', label: t('完全零基础') },
    { id: 'Level1', label: t('幼儿园') },
    { id: 'Level2', label: t('小学') },
    { id: 'Level3', label: t('中学') },
    { id: 'Level4', label: t('大学') },
    { id: 'Level5', label: t('研究生') },
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
    type?: 'input' | 'output'
}

interface IMultipleLanguageSelectorProps {
    value: string[] | undefined
    onChange?: (value: string[]) => void
    onBlur?: () => void
}

export function LanguageSelector({ value, onChange, onBlur }: ILanguageSelectorProps) {
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

function LanguageLevelSelector({ value, onChange, onBlur, type }: ILanguageSelectorProps) {
    const options = type === 'input' ? inputLanguageLevels : outputLanguageLevels
    return (
        <Select
            onBlur={onBlur}
            size='compact'
            clearable={false}
            options={options}
            value={value ? [{ id: value }] : []}
            onChange={({ value }) => {
                const selected = value[0]
                onChange?.(selected?.id as string)
            }}
        />
    )
}

function MultipleLanguageSelector({ value, onChange, onBlur }: IMultipleLanguageSelectorProps) {
    return (
        <Select
            onBlur={onBlur}
            size='compact'
            clearable={false}
            multi={true}
            options={langOptions}
            value={Array.isArray(value) ? value.map((v) => ({ id: v })) : []}
            onChange={({ value }) => {
                const selectedIds = value.map((item) => item.id?.toString()).filter(Boolean) as string[]
                onChange?.(selectedIds)
            }}
            overrides={{
                Tag: {
                    style: {
                        textTransform: 'capitalize',
                        backgroundColor: 'lightgray',
                        color: 'white',
                    },
                },
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
    const actions = useChatStore.getState().actions
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
    const [testText, setTestText] = useState('')
    const [isSpeaking, setIsSpeaking] = useState(false)
    const [isEditing, setIsEditing] = useState(false)
    const styles = useTTSSettingsStyles({ theme, themeType, isDesktopApp: utils.isDesktopApp() })

    const [showLangSelector, setShowLangSelector] = useState(false)

    const [supportVoices, setSupportVoices] = useState<SpeechSynthesisVoice[]>([])

    const handleChangeRate = (rate: number) => {
        onChange?.({ ...value, rate })
        setRate(rate)
    }
    const handleChangeVolume = (volume: number) => {
        onChange?.({ ...value, volume })
        setVolume(volume)
    }
    const handleTestSpeak = async (lang: string, rate: number, volume: number) => {
        if (isSpeaking) {
            // 如果正在播放，则停止
            // 注意：这里需要实现停止播放的逻辑，可能需要修改 speak 函数
            setIsSpeaking(false)
            return
        }

        setIsSpeaking(true)
        const { stopSpeak } = await speak({
            text: testText || t('Enter Text Here to Test'),
            lang: lang,
            onFinish: () => setIsSpeaking(false),
            rate,
            volume,
        })
        // 这里可以保存 stopSpeak 函数以便后续停止播放
    }

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

    const [rate, setRate] = useState(10)
    const [volume, setVolume] = useState(100)

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
                    value={[rate ?? 10]}
                    onChange={(params) => handleChangeRate(params.value[0])}
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
                    value={[volume ?? 100]}
                    onChange={(params) => handleChangeVolume(params.value[0])}
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
                <div style={{ marginTop: '20px' }}>
                    <Block onClick={() => setIsEditing(true)} style={{ cursor: 'pointer', marginBottom: '10px' }}>
                        {isEditing ? (
                            <Block
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    padding: '8px 12px',
                                }}
                            >
                                <Input
                                    value={testText}
                                    onChange={(e) => setTestText(e.target.value)}
                                    onBlur={() => setIsEditing(false)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            setIsEditing(false)
                                        }
                                    }}
                                    autoFocus
                                    placeholder={t('Enter Text Here to Test') || 'Enter Text Here to Test'}
                                    size='compact'
                                />
                                <Button size='mini' kind='secondary' onClick={() => setIsEditing(false)}>
                                    {t('Save')}
                                </Button>
                            </Block>
                        ) : (
                            <Block
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    padding: '8px 12px',
                                }}
                            >
                                <span style={{ fontWeight: 'bold' }}>{t('Test Text:')}</span>
                                <span
                                    style={{
                                        color: testText ? 'inherit' : theme.colors.contentSecondary,
                                        padding: '4px 8px',
                                    }}
                                >
                                    {testText || t('Enter Text Here to Test') || 'Enter Text Here to Test'}
                                </span>
                                <Button size='mini' kind='secondary' onClick={() => setIsEditing(true)}>
                                    {t('Edit')}
                                </Button>
                            </Block>
                        )}
                    </Block>
                </div>
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
                            kind='secondary'
                            overrides={{
                                Root: {
                                    style: {
                                        flexShrink: 0,
                                        backgroundColor: 'transparent',
                                        color: theme.colors.contentPrimary,
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
                        <Button
                            shape='circle'
                            size='mini'
                            kind='secondary'
                            overrides={{
                                Root: {
                                    style: {
                                        flexShrink: 0,
                                        alignItems: 'center',
                                        backgroundColor: 'transparent',
                                        color: theme.colors.contentPrimary,
                                    },
                                },
                            }}
                            onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                handleTestSpeak(lang, rate, volume)
                            }}
                            startEnhancer={() => (isSpeaking ? <SpeakerMotion /> : <RxSpeakerLoud />)}
                        ></Button>
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
                        {t('Add Voice')}
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

function SpacedButton(props: ButtonProps) {
    return (
        <Button
            {...props}
            shape={SHAPE.pill}
            kind={KIND.secondary}
            size={SIZE.compact}
            overrides={{
                BaseButton: {
                    style: ({ $theme }) => ({
                        marginLeft: $theme.sizing.scale200,
                        marginRight: $theme.sizing.scale200,
                        marginTop: $theme.sizing.scale800,
                    }),
                },
            }}
        />
    )
}

function ProviderSelector({ value, onChange, hasPromotion }: IProviderSelectorProps) {
    const { theme } = useTheme()

    let overrides: SelectProps['overrides'] = {
        Dropdown: {
            props: {
                // 强制下拉菜单向下显示
                popoverMargin: 0,
            },
        },
    }
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
              { label: 'OneAPI', id: 'OneAPI' },
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
              { label: 'OpenRouter', id: 'OpenRouter' },
          ] as {
              label: string
              id: Provider
          }[])
        : ([
              { label: 'OneAPI', id: 'OneAPI' },
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
              { label: 'OpenRouter', id: 'OpenRouter' },
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
    const [currentStep, setCurrentStep] = useState(0)

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
        inputLanguageLevel:'',
        outputLanguageLevel:'',
        languageLevel: '',
        userBackground: '',
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
        openRouterAPIKey: '',
        openRouterAPIModel: '',
        OneAPIAPIKey: '',
        OneAPIAPIModel: '',
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

    const onStepChange = useCallback(
        (changes: Partial<ISettings>) => {
            setValues((prevValues) => ({
                ...prevValues,
                ...changes,
            }))
            setCurrentStep(currentStep + 1)
        },
        [currentStep]
    )

    const onKeyPress = useCallback(
        (event: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
            if (event.key === 'Enter') {
                setCurrentStep(currentStep + 1)
            }
        },
        [currentStep]
    )

    const onInputChange = useCallback((changes: Partial<ISettings>) => {
        setValues((prevValues) => ({
            ...prevValues,
            ...changes,
        }))
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

    const onStepBlur = useCallback(async () => {
        if (values.apiKeys && !_.isEqual(values, prevValues)) {
            await utils.setSettings(values)
            setPrevValues(values)
        }
        setCurrentStep(currentStep + 1)
    }, [prevValues, values])

    const handleNoAPIKey = useCallback(() => {
        setCurrentStep(currentStep + 1)
    }, [currentStep])

    const handleYesAPIKey = useCallback(() => {
        setCurrentStep(currentStep + 2)
    }, [currentStep])

    const handleGetAPIKey = useCallback(async () => {
         // 更新本地状态
         setValues((prevValues) => ({
            ...prevValues,
            provider: 'OneAPI'
        }))

        // 保存到设置
        await utils.setSettings({
            ...values,
            provider: 'OneAPI',
        })
        window.open('https://tutor-chatgpt.zeabur.app/login', '_blank')
    }, [currentStep])

    const {chatUser} = useChatStore()
    const [loadingAPIKey, setLoadingAPIKey] = useState(false)

    const isDesktopApp = utils.isDesktopApp()
    const isMacOS = navigator.userAgent.includes('Mac OS X')
    const [showBuyMeACoffee, setShowBuyMeACoffee] = useState(false)
    const [showSocialMedia, setShowSocialMedia] = useState(false)

    const [activeTab, setActiveTab] = useState('general')

    const [isScrolled, setIsScrolled] = useState(window.scrollY > 0)


    useEffect(() => {
        const onScroll = () => {
            setIsScrolled(window.scrollY > 0)
        }
        window.addEventListener('scroll', onScroll)
        return () => {
            window.removeEventListener('scroll', onScroll)
        }
    }, [])

    const tabsOverrides = {
        Root: {
            style: {
                '& button:hover': {
                    background: 'transparent !important',
                },
            },
        },
        TabList: {
            style: () => ({}),
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            component: function TabsListOverride(props: any) {
                return (
                    <Grid behavior='fluid'>
                        <Cell span={12}>
                            <StyledTabList {...props} />
                        </Cell>
                    </Grid>
                )
            },
        },
    }

    const tabOverrides = {
        TabPanel: {
            style: {
                padding: '0px',
            },
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            component: function TabsListOverride(props: any) {
                return (
                    <Grid>
                        <Cell span={[1, 2, 3]}>
                            <StyledTabPanel {...props} />
                        </Cell>
                    </Grid>
                )
            },
        },
        Tab: {
            style: {
                'color': theme.colors.black,
                'background': 'transparent',
                ':hover': {
                    background: 'rgba(255, 255, 255, 0.35) !important',
                },
                ':active': {
                    background: 'rgba(255, 255, 255, 0.45) !important',
                },
            },
        },
    }
    const steps = [
        {
            title: t('i18n'),
            content: (
                <>
                    <Form form={form} initialValues={values} onValuesChange={onStepChange}>
                        <FormItem name='i18n'>
                            <Ii18nSelector onBlur={onStepBlur} />
                        </FormItem>
                    </Form>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <SpacedButton disabled={currentStep === 0} onClick={() => setCurrentStep(currentStep - 1)}>{t('Previous')}</SpacedButton>
                        <SpacedButton onClick={() => setCurrentStep(currentStep + 1)}>{t('Next')}</SpacedButton>
                    </div>
                </>
            ),
        },
        {
            title: t('The Language You are Using'),
            content: (
                <>
                <Form form={form} initialValues={values} onValuesChange={onStepChange}>
                    <FormItem name='defaultTargetLanguage'>
                        <LanguageSelector onBlur={onStepBlur} />
                    </FormItem>
                </Form>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <SpacedButton onClick={() => setCurrentStep(currentStep - 1)}>{t('Previous')}</SpacedButton>
                        <SpacedButton onClick={() => setCurrentStep(currentStep + 1)}>{t('Next')}</SpacedButton>
                    </div>
                </>
            ),
        },
        {
            title: t('The Language You Want to Learn'),
            content: (
                <>
                <Form form={form} initialValues={values} onValuesChange={onInputChange}>
                    <FormItem name='defaultSourceLanguage'>
                        <MultipleLanguageSelector value={values.defaultSourceLanguage} onBlur={onStepBlur} />
                    </FormItem>
                </Form>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <SpacedButton onClick={() => setCurrentStep(currentStep - 1)}>{t('Previous')}</SpacedButton>
                        <SpacedButton onClick={() => setCurrentStep(currentStep + 1)}>{t('Next')}</SpacedButton>
                    </div>
                </>
            ),
        },
        // {
        //     title: t('Language Level (Input) '),
        //     content: (
        //         <>
        //         <Form form={form} initialValues={values} onValuesChange={onStepChange}>
        //             <StyledBody>
        //             <strong>{t('输入量是指你学习的关于这门语言的内容，比如词汇量，语法，阅读量。输出量是指你如何使用这门语言，比如和人交流，使用这门语言写作或翻译。')} </strong> 
        //             </StyledBody>
        //             <FormItem name='languageLevel'>
        //                 <LanguageLevelSelector onBlur={onStepBlur} type='input' />
        //             </FormItem>
        //         </Form>
        //         <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        //                 <SpacedButton onClick={() => setCurrentStep(currentStep - 1)}>{t('Previous')}</SpacedButton>
        //                 <SpacedButton onClick={() => setCurrentStep(currentStep + 1)}>{t('Next')}</SpacedButton>
        //             </div>
        //         </>
        //     ),
        // },
        // {
        //     title: t('Language Level (Output) '),
        //     content: (
        //         <>
        //         <Form form={form} initialValues={values} onValuesChange={onStepChange}>
        //             <StyledBody>
        //                 <strong>{t('输出量是指你如何使用这门语言，比如和人交流，使用这门语言写作或翻译。')}</strong>
        //             </StyledBody>
        //             <FormItem name='languageLevel'>
        //                 <LanguageLevelSelector onBlur={onStepBlur} type='output' />
        //             </FormItem>
        //         </Form>
        //         <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        //                 <SpacedButton onClick={() => setCurrentStep(currentStep - 1)}>{t('Previous')}</SpacedButton>
        //                 <SpacedButton onClick={() => setCurrentStep(currentStep + 1)}>{t('Next')}</SpacedButton>
        //             </div>
        //         </>
        //     ),
        // },
        {
            title: t('About You'),
            content: (
                <>
                <Form form={form} initialValues={values} onValuesChange={onInputChange}>
                    <StyledBody>
                        <ul>
                            <li>
                                <strong>{t('你希望让GPT-Tutor知道的需求和偏好，GPT-Tutor会根据这些信息来调整。')}</strong>
                            </li>
                            <li>
                                {t(
                                    '例如：我是一名七岁的小孩，我希望你在解释时使用尽量简单的语言，不要使用复杂的词汇和句子。'
                                )}
                            </li>
                            <li>
                                {t(
                                    '例如：我是一名医生，我希望你在解释单词时，如果这个词与医学相关，请解释它在医学中的含义，并使用医学相关的例句和语境。'
                                )}
                            </li>
                        </ul>
                    </StyledBody>
                    <FormItem name='userBackground'>
                        <Input
                            size='compact'
                            onBlur={onStepBlur}
                            onKeyPress={(e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) =>
                                onKeyPress(e)
                            }
                        />
                    </FormItem>
                </Form>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <SpacedButton onClick={() => setCurrentStep(currentStep - 1)}>{t('Previous')}</SpacedButton>
                        <SpacedButton onClick={() => setCurrentStep(currentStep + 1)}>{t('Next')}</SpacedButton>
                    </div>
                </>
            ),
        },
        {
            title: t('设置如何发音'),
            content: (
                <>
                <Form form={form} initialValues={values} onValuesChange={onInputChange}>
                    <StyledBody>
                        <strong>{t('设置GPT-Tutor中不同语言朗读时的人声、速度和音量。')}</strong>
                    </StyledBody>
                    <FormItem name='tts' label={t('TTS')}>
                        <TTSVoicesSettings onBlur={onBlur} />
                    </FormItem>
                </Form>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <SpacedButton onClick={() => setCurrentStep(currentStep - 1)}>{t('Previous')}</SpacedButton>
                        <SpacedButton onClick={() => setCurrentStep(currentStep + 1)}>{t('Next')}</SpacedButton>
                    </div>
                </>
            ),
        },
        {
            title: t('是否有自己的API Key?'),
            content: (
                <>
                <StyledBody>
                    <strong>{t('想要完整且正确地使用GPT-Tutor，推荐使用一个具有高级模型（GPT-4o/Claude 3.5 Sonnet/Gemini Pro/LLAMA 3.1 405B）功能的API Key。')}</strong>
                </StyledBody>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <SpacedButton onClick={handleNoAPIKey}>{t('我没有API Key')}</SpacedButton>
                    <SpacedButton onClick={handleYesAPIKey}>{t('我有自己的API Key')}</SpacedButton>
                </div>
                </>
            ),
        },
        {
            title: t('没有API Key'),
            content: (
                <div>
        
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                <SpacedButton 
                    isLoading={loadingAPIKey} 
                    disabled={loadingAPIKey} 
                    onClick={() => handleGetAPIKey()}
                >
                    {t('点击获取API Key')}
                </SpacedButton>
            </div>
            <>
                <Notification closeable>{t('输入复制的API Key，选择模型，完成设置')}</Notification>
                <Form form={form} initialValues={values} onValuesChange={onInputChange}>
                <FormItem
                                required={values.provider === 'OneAPI'}
                                name='OneAPIAPIKey'
                                label='OneAPI API Key'
                            >
                                <Input autoFocus type='password' size='compact' onBlur={onBlur} aria-hidden={false} />
                            </FormItem>
                    <FormItem
                        name='OneAPIAPIModel'
                        label={t('API Model')}
                        required={values.provider === 'OneAPI'}
                    >
                        <APIModelSelector
                            provider='OneAPI'
                            currentProvider={values.provider}
                            apiKey={values.OneAPIAPIKey}
                            value={values.OneAPIAPIModel}
                            onBlur={onBlur}
                        />
                    </FormItem>
                </Form>
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <SpacedButton onClick={async () => await handleSave()}>
                        {t('完成设置')}
                    </SpacedButton>
                </div>
            </>
    </div>
)
        },
        {
            title: t('填入自己的API Key'),
            content: (
                <div>
                    <StyledBody>
                        <strong>{t('选择一个服务提供商，GPT-Tutor会根据你选择的服务提供商来调整教学内容和难度。')}</strong>
                    </StyledBody>
                    <Form form={form} initialValues={values} onValuesChange={onInputChange}>
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
                            <FormItem
                                name='claudeAPIModel'
                                label={t('API Model')}
                                required={values.provider === 'Claude'}
                            >
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
                            <FormItem
                                name='geminiAPIModel'
                                label={t('API Model')}
                                required={values.provider === 'Gemini'}
                            >
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
                            <FormItem
                                name='apiURLPath'
                                label={t('API URL Path')}
                                required={values.provider === 'OpenAI'}
                            >
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
                            <FormItem
                                name='azureAPIModel'
                                label={t('API Model')}
                                required={values.provider === 'Azure'}
                            >
                                <APIModelSelector provider='Azure' currentProvider={values.provider} onBlur={onBlur} />
                            </FormItem>
                            <FormItem name='azureAPIURL' label={t('API URL')} required={values.provider === 'Azure'}>
                                <Input size='compact' onBlur={onBlur} />
                            </FormItem>
                            <FormItem
                                name='azureAPIURLPath'
                                label={t('API URL Path')}
                                required={values.provider === 'Azure'}
                            >
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
                            <FormItem
                                name='chatgptModel'
                                label={t('API Model')}
                                required={values.provider === 'ChatGPT'}
                            >
                                <APIModelSelector
                                    provider='ChatGPT'
                                    currentProvider={values.provider}
                                    onBlur={onBlur}
                                />
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
                            <FormItem
                                name='miniMaxAPIModel'
                                label={t('API Model')}
                                required={values.provider === 'MiniMax'}
                            >
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
                                        <a
                                            target='_blank'
                                            href='https://www.moonshot.cn/'
                                            rel='noreferrer'
                                            style={linkStyle}
                                        >
                                            Moonshot Page
                                        </a>{' '}
                                        {t('to get your API Key.')}
                                    </div>
                                }
                            >
                                <Input autoFocus type='password' size='compact' onBlur={onBlur} />
                            </FormItem>
                            <FormItem
                                name='moonshotAPIModel'
                                label={t('API Model')}
                                required={values.provider === 'Moonshot'}
                            >
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
                            <FormItem
                                name='deepSeekAPIModel'
                                label={t('API Model')}
                                required={values.provider === 'DeepSeek'}
                            >
                                <APIModelSelector
                                    provider='DeepSeek'
                                    currentProvider={values.provider}
                                    apiKey={values.deepSeekAPIKey}
                                    onBlur={onBlur}
                                />
                            </FormItem>
                        </div>
                        <div
                            style={{
                                display: values.provider === 'OpenRouter' ? 'block' : 'none',
                            }}
                        >
                            <FormItem
                                required={values.provider === 'OpenRouter'}
                                name='openRouterAPIKey'
                                label='OpenRouter API Key'
                                caption={
                                    <div>
                                        {t('Go to the')}{' '}
                                        <a
                                            target='_blank'
                                            href='https://openrouter.com/api_keys'
                                            rel='noreferrer'
                                            style={linkStyle}
                                        >
                                            OpenRouter Dashboard
                                        </a>{' '}
                                        {t('to get your API Key.')}
                                    </div>
                                }
                            >
                                <Input autoFocus type='password' size='compact' onBlur={onBlur} />
                            </FormItem>
                            <FormItem
                                name='openRouterAPIModel'
                                label={t('API Model')}
                                required={values.provider === 'OpenRouter'}
                            >
                                <APIModelSelector
                                    provider='OpenRouter'
                                    currentProvider={values.provider}
                                    apiKey={values.openRouterAPIKey}
                                    onBlur={onBlur}
                                />
                            </FormItem>
                        </div>
                        <div
                            style={{
                                display: values.provider === 'OneAPI' ? 'block' : 'none',
                            }}
                        >
                            <FormItem
                                required={values.provider === 'OneAPI'}
                                name='OneAPIAPIKey'
                                label='OneAPI API Key'
                            >
                                <Input autoFocus type='password' size='compact' onBlur={onBlur} />
                            </FormItem>
                            <FormItem
                                name='OneAPIAPIModel'
                                label={t('API Model')}
                                required={values.provider === 'OneAPI'}
                            >
                                <APIModelSelector
                                    provider='OneAPI'
                                    currentProvider={values.provider}
                                    apiKey={values.OneAPIAPIKey}
                                    onBlur={onBlur}
                                />
                            </FormItem>
                        </div>
                    </Form>
                </div>
            ),
        },
    ]


    const handleSave = async () => {
        try {
            setLoading(true)
            await onSubmit({ ...values })
            useChatStore.setState((state) => ({
                showSettings: false,
                chatUser: {
                    ...state.chatUser,
                    isFirstTimeUse: false
                }
            }))
        } catch (error) {
            console.error(error)
        } finally {
            setLoading(false)
        }
    }

    // 设置一个useEffect来检测values的变化
    useEffect(() => {
        console.log('values', values)
    }, [values])


    return (
        <div
            style={{
                paddingTop: chatUser.isFirstTimeUse || utils.isBrowserExtensionOptions() ? undefined : '121px',
                paddingBottom: utils.isBrowserExtensionOptions() ? undefined : '21px',
                background: isDesktopApp ? 'transparent' : theme.colors.backgroundPrimary,
                minWidth: isDesktopApp ? 450 : 400,
                maxHeight: utils.isUserscript() ? 'calc(100vh - 32px)' : undefined,
                overflow: utils.isUserscript() ? 'auto' : 'hidden',
                height: '100%',
            }}
            data-testid='settings-container'
        >
            <nav
                style={{
                    display: chatUser.isFirstTimeUse ? 'none' : 'flex',
                    position: utils.isBrowserExtensionOptions() ? 'sticky' : 'fixed',
                    left: 0,
                    top: 0,
                    zIndex: 999,
                    width: '100%',
                    flexDirection: 'column',
                    background: `url(${utils.getAssetUrl(beams)}) no-repeat center center`,
                    boxSizing: 'border-box',
                    boxShadow: isScrolled ? theme.lighting.shadow600 : undefined,
                }}
            >
                <div
                    style={{
                        display: 'flex',
                        flexDirection: 'row',
                        alignItems: 'center',
                        color: '#333',
                        gap: 10,
                        padding: '15px 25px 0 25px',
                    }}
                >
                    <img width='22' src={icon} alt='logo' />
                    <h2
                        style={{
                            display: 'flex',
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 6,
                        }}
                    >
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
                </div>
                <Tabs
                    overrides={tabsOverrides}
                    activeKey={activeTab}
                    onChange={({ activeKey }) => {
                        setActiveTab(activeKey as string)
                    }}
                    fill='fixed'
                    renderAll
                >
                    <Tab
                        title={t('General')}
                        key='general'
                        artwork={() => {
                            return <IoSettingsOutline size={14} />
                        }}
                        overrides={tabOverrides}
                    />
                    {isTauri && (
                        <Tab
                            title={t('Proxy')}
                            key='proxy'
                            artwork={() => {
                                return <TbCloudNetwork size={14} />
                            }}
                            overrides={tabOverrides}
                        />
                    )}
                    <Tab
                        title={t('TTS')}
                        key='tts'
                        artwork={() => {
                            return <RxSpeakerLoud size={14} />
                        }}
                        overrides={tabOverrides}
                    />
                    <Tab
                        title={t('My Settings')}
                        key='mySettings'
                        artwork={() => {
                            return <BsKeyboard size={14} />
                        }}
                        overrides={{
                            ...tabOverrides,
                            Tab: {
                                ...tabOverrides.Tab,
                                props: {
                                    'data-testid': 'mySettings',
                                },
                            },
                        }}
                    />
                </Tabs>
            </nav>

            {chatUser.isFirstTimeUse ? (
                <Card>
                    <StyledBody>
                        <ProgressSteps current={currentStep}>
                            {steps.map((step, index) => (
                                <Step key={index} title={step.title}>
                                    {step.content}
                                </Step>
                            ))}
                        </ProgressSteps>
                        <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
                            <SpacedButton onClick={handleSave}>
                                 {t('Save')}
                            </SpacedButton>
                        </div>
                    </StyledBody>
                </Card>
            ) : (
                <Form
                    form={form}
                    style={{
                        padding: '20px 25px',
                    }}
                    onFinish={onSubmit}
                    initialValues={values}
                    onValuesChange={onChange}
                >
                    <div
                        style={{
                            display: activeTab === 'general' ? 'block' : 'none',
                        }}
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
                        </FormItem>‘
                        <div style={{display: values.provider ==='OneAPI' ? 'block' : 'none'}}>
                        <FormItem>
                            <Button
                                onClick={() => window.open('https://openai-translator.com/account', '_blank')}
                                kind="secondary"
                                size="compact"
                            >
                                {t('Check API Key Balance')}
                            </Button>
                        </FormItem>
                        </div>
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
                            <FormItem
                                name='claudeAPIModel'
                                label={t('API Model')}
                                required={values.provider === 'Claude'}
                            >
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
                            <FormItem
                                name='geminiAPIModel'
                                label={t('API Model')}
                                required={values.provider === 'Gemini'}
                            >
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
                            <FormItem
                                name='apiURLPath'
                                label={t('API URL Path')}
                                required={values.provider === 'OpenAI'}
                            >
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
                            <FormItem
                                name='azureAPIModel'
                                label={t('API Model')}
                                required={values.provider === 'Azure'}
                            >
                                <APIModelSelector provider='Azure' currentProvider={values.provider} onBlur={onBlur} />
                            </FormItem>
                            <FormItem name='azureAPIURL' label={t('API URL')} required={values.provider === 'Azure'}>
                                <Input size='compact' onBlur={onBlur} />
                            </FormItem>
                            <FormItem
                                name='azureAPIURLPath'
                                label={t('API URL Path')}
                                required={values.provider === 'Azure'}
                            >
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
                            <FormItem
                                name='chatgptModel'
                                label={t('API Model')}
                                required={values.provider === 'ChatGPT'}
                            >
                                <APIModelSelector
                                    provider='ChatGPT'
                                    currentProvider={values.provider}
                                    onBlur={onBlur}
                                />
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
                            <FormItem
                                name='miniMaxAPIModel'
                                label={t('API Model')}
                                required={values.provider === 'MiniMax'}
                            >
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
                                        <a
                                            target='_blank'
                                            href='https://www.moonshot.cn/'
                                            rel='noreferrer'
                                            style={linkStyle}
                                        >
                                            Moonshot Page
                                        </a>{' '}
                                        {t('to get your API Key.')}
                                    </div>
                                }
                            >
                                <Input autoFocus type='password' size='compact' onBlur={onBlur} />
                            </FormItem>
                            <FormItem
                                name='moonshotAPIModel'
                                label={t('API Model')}
                                required={values.provider === 'Moonshot'}
                            >
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
                            <FormItem
                                name='deepSeekAPIModel'
                                label={t('API Model')}
                                required={values.provider === 'DeepSeek'}
                            >
                                <APIModelSelector
                                    provider='DeepSeek'
                                    currentProvider={values.provider}
                                    apiKey={values.deepSeekAPIKey}
                                    onBlur={onBlur}
                                />
                            </FormItem>
                        </div>
                        <div
                            style={{
                                display: values.provider === 'OpenRouter' ? 'block' : 'none',
                            }}
                        >
                            <FormItem
                                required={values.provider === 'OpenRouter'}
                                name='openRouterAPIKey'
                                label='OpenRouter API Key'
                                caption={
                                    <div>
                                        {t('Go to the')}{' '}
                                        <a
                                            target='_blank'
                                            href='https://openrouter.com/api_keys'
                                            rel='noreferrer'
                                            style={linkStyle}
                                        >
                                            OpenRouter Dashboard
                                        </a>{' '}
                                        {t('to get your API Key.')}
                                    </div>
                                }
                            >
                                <Input autoFocus type='password' size='compact' onBlur={onBlur} />
                            </FormItem>
                            <FormItem
                                name='openRouterAPIModel'
                                label={t('API Model')}
                                required={values.provider === 'OpenRouter'}
                            >
                                <APIModelSelector
                                    provider='OpenRouter'
                                    currentProvider={values.provider}
                                    apiKey={values.openRouterAPIKey}
                                    onBlur={onBlur}
                                />
                            </FormItem>
                        </div>
                        <div
                            style={{
                                display: values.provider === 'OneAPI' ? 'block' : 'none',
                            }}
                        >
                            <FormItem
                                required={values.provider === 'OneAPI'}
                                name='OneAPIAPIKey'
                                label='OneAPI API Key'
                            >
                                <Input autoFocus type='password' size='compact' onBlur={onBlur} />
                            </FormItem>
                            <FormItem
                                name='OneAPIAPIModel'
                                label={t('API Model')}
                                required={values.provider === 'OneAPI'}
                            >
                                <APIModelSelector
                                    provider='OneAPI'
                                    currentProvider={values.provider}
                                    apiKey={values.OneAPIAPIKey}
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
                </div>
                <div  style={{
                            display: activeTab === 'mySettings' ? 'block' : 'none',
                        }}>
                    {/* <FormItem name='languageLevel' label={t('Language Level')}>
                        <LanguageLevelSelector onBlur={onStepBlur} type='input' />
                    </FormItem> */}
                                            <FormItem name='i18n' label={t('i18n')}>
                            <Ii18nSelector onBlur={onBlur} />
                        </FormItem>
                            <FormItem name='defaultYouglishLanguage' label={t('The Language of Youglish')}>
                                <YouglishLanguageSelector onBlur={onBlur} />
                            </FormItem>
                    <FormItem name='userBackground' label={t('About You')}>
                        <Input
                            size='compact'
                            onBlur={onStepBlur}
                            onKeyPress={(e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) =>
                                onKeyPress(e)
                            }
                        />
                    </FormItem>
                    <div style={{ display: 'flex', flexDirection: 'row', gap: 10 }}>
                        <FormItem name='defaultTargetLanguage' label={t('The Language You are Using')}>
                            <LanguageSelector onBlur={onBlur} />
                        </FormItem>
                        <div style={{ marginTop: '10px' }}>
                            <TbDirectionSign size={18} />
                        </div>
                        <FormItem name='defaultSourceLanguage' label={t('The Language You Want to Learn')}>
                            <MultipleLanguageSelector value={values.defaultSourceLanguage} onBlur={onBlur} />
                        </FormItem>
                    </div>
                </div>
                <div  style={{
                            display: activeTab === 'tts' ? 'block' : 'none',
                        }}>
                    <FormItem name='tts' label={t('TTS')}>
                        <TTSVoicesSettings onBlur={onBlur} />
                    </FormItem>
                </div>
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
            )}
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
