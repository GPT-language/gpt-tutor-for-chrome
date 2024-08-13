import React, { Key, useCallback, useEffect, useLayoutEffect, useMemo, useReducer, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import toast, { Toaster } from 'react-hot-toast'
import { Client as Styletron } from 'styletron-engine-atomic'
import { Provider as StyletronProvider } from 'styletron-react'
import { BaseProvider } from 'baseui-sd'
import { Textarea } from 'baseui-sd/textarea'
import { createUseStyles } from 'react-jss'
import { AiOutlineTranslation, AiOutlineLock, AiOutlinePlusSquare, AiOutlineQuestionCircle } from 'react-icons/ai'
import { GoSignOut } from 'react-icons/go'
import { useClerk } from '@clerk/chrome-extension'
import { IoSettingsOutline } from 'react-icons/io5'
import * as mdIcons from 'react-icons/md'
import { getLangConfig, sourceLanguages, targetLanguages, LangCode } from './lang/lang'
import { translate } from '../translate'
import { Select, Value, Option } from 'baseui-sd/select'
import { RxEraser, RxReload, RxSpeakerLoud } from 'react-icons/rx'
import { RiSpeakerFill } from 'react-icons/ri'
import { calculateMaxXY, queryPopupCardElement } from '../../browser-extension/content_script/utils'
import { clsx } from 'clsx'
import { Button } from 'baseui-sd/button'
import { ErrorBoundary } from 'react-error-boundary'
import { ErrorFallback } from '../components/ErrorFallback'
import { defaultAPIURL, isDesktopApp, isTauri } from '../utils'
import { InnerSettings } from './Settings'
import { documentPadding } from '../../browser-extension/content_script/consts'
import Dropzone from 'react-dropzone'
import { addNewNote, isConnected } from '../anki/anki-connect'
import ChineseActionsData from '../services/Chinese.json'
import EnglishActionData from '../services/English.json'
import TraditionalChineseActionData from '../services/TraditionalChinese.json'
import JapaneseActionData from '../services/Japanese.json'
import RussianActionData from '../services/Russian.json'
import KoreanActionData from '../services/Korean.json'
import ThaiActionData from '../services/Thai.json'
import HindiActionData from '../services/Hindi.json'
import ArabicActionData from '../services/Arabic.json'
import FrenchActionData from '../services/French.json'
import GermanActionData from '../services/German.json'
import SpeakerMotion from '../components/SpeakerMotion'
import IpLocationNotification from '../components/IpLocationNotification'
import { HighlightInTextarea } from '../highlight-in-textarea'
import LRUCache from 'lru-cache'
import { ISettings, IThemedStyleProps } from '../types'
import { useTheme } from '../hooks/useTheme'
import { speak } from '../tts'
import { Tooltip } from './Tooltip'
import { useSettings } from '../hooks/useSettings'
import { Modal, ModalBody, ModalHeader } from 'baseui-sd/modal'
import { setupAnalysis } from '../analysis'
import { Action, Translations, ActionOutputRenderingFormat } from '../internal-services/db'
import { CopyButton } from './CopyButton'
import { useLiveQuery } from 'dexie-react-hooks'
import { actionService } from '../services/action'
import { ActionManager } from './ActionManager'
import { GrMoreVertical } from 'react-icons/gr'
import { StatefulPopover } from 'baseui-sd/popover'
import { StatefulMenu } from 'baseui-sd/menu'
import { IconType } from 'react-icons'
import { GiPlatform } from 'react-icons/gi'
import { IoIosRocket } from 'react-icons/io'
import 'katex/dist/katex.min.css'
import Latex from 'react-latex-next'
import { Markdown } from './Markdown'
import useResizeObserver from 'use-resize-observer'
import _ from 'underscore'
import { GlobalSuspense } from './GlobalSuspense'
import YouGlishComponent from '../youglish/youglish'
import { LANG_CONFIGS } from '../components/lang/data'
import { useChatStore } from '@/store/file/store'
import { Provider, getEngine } from '../engines'
import { IEngine } from '../engines/interfaces'
import TextParser from './TextParser'
import ActionList from './ActionList'
import WordListUploader from './WordListUploader'
import { fileService } from '../internal-services/file'
import CategorySelector from './CategorySelector'
import { Accordion, Panel } from 'baseui-sd/accordion'
import MessageCard from './MessageCard'
import { ReviewManager } from './ReviewSettings'
import { StatefulTooltip } from 'baseui-sd/tooltip'

const cache = new LRUCache({
    max: 500,
    maxSize: 5000,
    sizeCalculation: (_value, _key) => {
        return 1
    },
})

function genLangOptions(langs: [LangCode, string][]): Value {
    return langs.reduce((acc, [id, label]) => {
        return [
            ...acc,
            {
                id,
                label,
            } as Option,
        ]
    }, [] as Value)
}
const sourceLangOptions = genLangOptions(sourceLanguages)
const targetLangOptions = genLangOptions(targetLanguages)

const useStyles = createUseStyles({
    'popupCard': {
        height: '100%',
        boxSizing: 'border-box',
    },
    'footer': (props: IThemedStyleProps) =>
        props.isDesktopApp
            ? {
                  color: props.theme.colors.contentSecondary,
                  position: 'fixed',
                  width: '100%',
                  height: '42px',
                  cursor: 'pointer',
                  left: '0',
                  bottom: '0',
                  paddingLeft: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  background: props.themeType === 'dark' ? 'rgba(31, 31, 31, 0.5)' : 'rgba(255, 255, 255, 0.5)',
                  backdropFilter: 'blur(10px)',
              }
            : {
                  color: props.theme.colors.contentSecondary,
                  position: 'absolute',
                  cursor: 'pointer',
                  bottom: '16px',
                  left: '16px',
                  lineHeight: '1',
              },
    'popupCardHeaderContainer': (props: IThemedStyleProps) =>
        props.isDesktopApp
            ? {
                  'position': 'fixed',
                  'backdropFilter': 'blur(10px)',
                  'zIndex': 1,
                  'left': 0,
                  'top': 0,
                  'width': '100%',
                  'boxSizing': 'border-box',
                  'padding': '30px 16px 8px',
                  'background': props.themeType === 'dark' ? 'rgba(31, 31, 31, 0.5)' : 'rgba(255, 255, 255, 0.5)',
                  'display': 'flex',
                  'flexDirection': 'row',
                  'flexFlow': 'row nowrap',
                  'cursor': 'move',
                  'alignItems': 'center',
                  'borderBottom': `1px solid ${props.theme.colors.borderTransparent}`,
                  '-ms-user-select': 'none',
                  '-webkit-user-select': 'none',
                  'user-select': 'none',
              }
            : {
                  'display': 'flex',
                  'flexDirection': 'row',
                  'cursor': 'move',
                  'alignItems': 'center',
                  'padding': '6px 14px',
                  'borderBottom': `1px solid ${props.theme.colors.borderTransparent}`,
                  'minWidth': '270px',
                  '-ms-user-select': 'none',
                  '-webkit-user-select': 'none',
                  'user-select': 'none',
              },
    'iconContainer': {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        flexShrink: 0,
        marginRight: 'auto',
    },
    'icon': {
        'display': 'block',
        'width': '16px',
        'height': '16px',
        '-ms-user-select': 'none',
        '-webkit-user-select': 'none',
        'user-select': 'none',
    },
    'iconText': (props: IThemedStyleProps) => ({
        color: props.themeType === 'dark' ? props.theme.colors.contentSecondary : props.theme.colors.contentPrimary,
        fontSize: '12px',
        fontWeight: 600,
        cursor: 'unset',
    }),
    'paragraph': {
        'margin': '0.5em 0',
        '-ms-user-select': 'text',
        '-webkit-user-select': 'text',
        'user-select': 'text',
    },
    'popupCardHeaderButtonGroup': (props: IThemedStyleProps) => ({
        'display': 'flex',
        'flexDirection': 'row',
        'alignItems': 'center',
        'gap': '5px',
        'marginLeft': '10px',
        '@media screen and (max-width: 460px)': {
            marginLeft: props.isDesktopApp ? '5px' : undefined,
        },
    }),
    'popupCardHeaderMoreActionsContainer': () => ({
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        marginLeft: 5,
    }),
    'popupCardHeaderMoreActionsBtn': (props: IThemedStyleProps) => ({
        'cursor': 'pointer',
        '& *': {
            fill: props.theme.colors.contentPrimary,
            color: props.theme.colors.contentPrimary,
            stroke: props.theme.colors.contentPrimary,
        },
    }),
    'popupCardHeaderActionsContainer': (props: IThemedStyleProps) => ({
        'box-sizing': 'border-box',
        'display': 'flex',
        'flexShrink': 0,
        'flexDirection': 'row',
        'alignItems': 'center',
        'padding': '5px 10px',
        'gap': '10px',
        '@media screen and (max-width: 460px)': {
            padding: props.isDesktopApp ? '5px 0' : undefined,
            gap: props.isDesktopApp ? '5px' : undefined,
        },
    }),
    'from': {
        display: 'flex',
        color: '#999',
        fontSize: '12px',
        flexShrink: 0,
    },
    'arrow': {
        display: 'flex',
        color: '#999',
        cursor: 'pointer',
    },
    'to': {
        display: 'flex',
        color: '#999',
        fontSize: '12px',
        flexShrink: 0,
    },
    'popupCardContentContainer': (props: IThemedStyleProps) => ({
        paddingTop: props.isDesktopApp ? '52px' : undefined,
        display: 'flex',
        flexDirection: 'column',
    }),
    'loadingContainer': {
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        gap: '10px',
    },
    'popupCardEditorContainer': {
        display: 'flex',
        flexDirection: 'column',
        padding: '16px',
    },
    'popupCardTranslatedContainer': (props: IThemedStyleProps) => ({
        'position': 'relative',
        'padding': '26px 16px 16px 16px',
        'border-top': `1px solid ${props.theme.colors.borderTransparent}`,
        '-ms-user-select': 'none',
        '-webkit-user-select': 'none',
        'user-select': 'none',
    }),
    'actionStr': (props: IThemedStyleProps) => ({
        position: 'absolute',
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        gap: '6px',
        top: '0',
        left: '50%',
        transform: 'translateX(-50%) translateY(-50%)',
        fontSize: '10px',
        padding: '2px 12px',
        borderRadius: '4px',
        background: props.theme.colors.backgroundTertiary,
        color: props.theme.colors.contentSecondary,
    }),
    'error': {
        background: '#f8d7da',
    },
    'caret': {
        marginLeft: '4px',
        borderRight: '0.2em solid #777',
        animation: '$caret 500ms steps(44) infinite',
    },
    '@keyframes caret': {
        '50%': {
            borderColor: 'transparent',
        },
    },
    'popupCardTranslatedContentContainer': (props: IThemedStyleProps) => ({
        fontSize: '15px',
        marginTop: '-14px',
        display: 'flex',
        overflowY: 'auto',
        color: props.themeType === 'dark' ? props.theme.colors.contentSecondary : props.theme.colors.contentPrimary,
    }),
    'errorMessage': {
        display: 'flex',
        color: 'red',
        alignItems: 'center',
        gap: '4px',
    },
    'actionButtonsContainer': {
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        gap: '12px',
    },
    'actionButton': (props: IThemedStyleProps) => ({
        color: props.theme.colors.contentSecondary,
        cursor: 'pointer',
        display: 'flex',
        paddingTop: '6px',
        paddingBottom: '6px',
    }),
    'actionButtonDisabled': (props: IThemedStyleProps) => ({
        color: props.theme.colors.buttonDisabledText,
        cursor: 'default',
        display: 'flex',
        paddingTop: '6px',
        paddingBottom: '6px',
    }),
    'writing': {
        'marginLeft': '3px',
        'width': '10px',
        '&::after': {
            content: '"✍️"',
            animation: '$writing 1.3s infinite',
        },
    },
    '@keyframes writing': {
        '50%': {
            marginLeft: '-3px',
            marginBottom: '-3px',
        },
    },
    'dropZone': (props: IThemedStyleProps) => ({
        'display': 'flex',
        'flexDirection': 'column',
        'alignItems': 'center',
        'justifyContent': 'center',
        'padding-left': '3px',
        'padding-right': '3px',
        'borderRadius': '0.75rem',
        'cursor': 'pointer',
        '-ms-user-select': 'none',
        '-webkit-user-select': 'none',
        'user-select': 'none',
        'border': `1px dashed ${props.theme.colors.borderTransparent}`,
        'background': props.theme.colors.backgroundTertiary,
        'color': props.theme.colors.contentSecondary,
    }),
    'fileDragArea': (props: IThemedStyleProps) => ({
        padding: '10px',
        display: 'flex',
        justifyContent: 'center',
        marginBottom: '10px',
        fontSize: '11px',
        border: `2px dashed ${props.theme.colors.borderTransparent}`,
        background: props.theme.colors.backgroundTertiary,
        color: props.theme.colors.contentSecondary,
    }),
    'OCRStatusBar': (props: IThemedStyleProps) => ({
        color: props.theme.colors.contentSecondary,
    }),
})

interface IActionStrItem {
    beforeStr: string
    afterStr: string
}

export interface MovementXY {
    x: number
    y: number
}

export interface IInnerTranslatorProps {
    uuid?: string
    text: string
    autoFocus?: boolean
    showSettings?: boolean
    defaultShowSettings?: boolean
    containerStyle?: React.CSSProperties
    editorRows?: number
    onSettingsSave?: (oldSettings: ISettings) => void
}

export interface ITranslatorProps extends IInnerTranslatorProps {
    engine: Styletron
}

export function Translator(props: ITranslatorProps) {
    const { theme } = useTheme()

    return (
        <ErrorBoundary FallbackComponent={ErrorFallback}>
            <div>
                <StyletronProvider value={props.engine}>
                    <BaseProvider theme={theme}>
                        <GlobalSuspense>
                            <InnerTranslator {...props} />
                        </GlobalSuspense>
                    </BaseProvider>
                </StyletronProvider>
            </div>
        </ErrorBoundary>
    )
}

function InnerTranslator(props: IInnerTranslatorProps) {
    useEffect(() => {
        setupAnalysis()
    }, [])
    const {
        activateAction,
        currentFileId,
        selectedWord,
        deleteSelectedWord,
        getInitialFile,
        setActions,
        words,
        setAction,
        isShowMessageCard,
        toggleMessageCard,
        selectWordNotInCurrentFile,
        showActionManager,
        setShowActionManager,
        showSettings,
        setShowSettings,
        actionStr,
        setActionStr,
    } = useChatStore()
    const [refreshActionsFlag, refreshActions] = useReducer((x: number) => x + 1, 0)

    const [translationFlag, forceTranslate] = useReducer((x: number) => x + 1, 0)

    const [showReviewManger, setShowReviewManager] = useState(false)

    const editorRef = useRef<HTMLTextAreaElement>(null)
    const isCompositing = useRef(false)
    const highlightRef = useRef<HighlightInTextarea | null>(null)
    const { t, i18n } = useTranslation()
    const { settings } = useSettings()
    const [finalText, setFinalText] = useState(props.text)

    useEffect(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if (settings?.i18n !== (i18n as any).language) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            ;(i18n as any).changeLanguage(settings?.i18n)
        }
    }, [i18n, settings?.i18n])

    useEffect(() => {
        const savedAction = localStorage.getItem('savedAction')
        if (savedAction) {
            const action = JSON.parse(savedAction)
            setAction(action)
        }
    }, [setAction])

    const [autoFocus, setAutoFocus] = useState(false)

    useEffect(() => {
        if (highlightRef.current) {
            if (props.autoFocus) {
                setAutoFocus(false)
                setTimeout(() => {
                    setAutoFocus(true)
                }, 500)
            }
            return
        }
        const editor = editorRef.current
        if (!editor) {
            return undefined
        }
        highlightRef.current = new HighlightInTextarea(editor, { highlight: '' })
        if (props.autoFocus) {
            editor.focus()
        }
    }, [props.autoFocus])

    useEffect(() => {
        const editor = editorRef.current
        if (!editor) {
            return undefined
        }
        editor.focus()
        editor.spellcheck = false
    }, [props.uuid])

    const currentTranslateMode = useMemo(() => {
        if (!activateAction) {
            return undefined
        }
        return activateAction.mode
    }, [activateAction])

    const headerRef = useRef<HTMLDivElement>(null)
    const { width: headerWidth = 0, height: headerHeight = 0 } = useResizeObserver<HTMLDivElement>({ ref: headerRef })

    const languagesSelectorRef = useRef<HTMLDivElement>(null)

    const { width: languagesSelectorWidth = 0 } = useResizeObserver<HTMLDivElement>({ ref: languagesSelectorRef })

    const headerActionButtonsRef = useRef<HTMLDivElement>(null)

    const { width: headerActionButtonsWidth = 0 } = useResizeObserver<HTMLDivElement>({ ref: headerActionButtonsRef })

    const editorContainerRef = useRef<HTMLDivElement>(null)

    const translatedContentRef = useRef<HTMLDivElement>(null)

    const actionButtonsRef = useRef<HTMLDivElement>(null)

    const scrollYRef = useRef<number>(0)

    const hasActivateAction = activateAction !== undefined
    const clerk = useClerk()

    useLayoutEffect(() => {
        const handleResize = () => {
            const headerElem = headerRef.current
            if (!headerElem) {
                return
            }
            const activateActionElem = headerElem.querySelector('.__yetone-activate-action')
            if (hasActivateAction && !activateActionElem) {
                return
            }
            const paddingWidth = 32
            const iconWidth = 32
            const iconWithTextWidth = activateActionElem ? activateActionElem.clientWidth : 105
            const iconGap = 5
            let count = Math.floor(
                (headerWidth -
                    paddingWidth -
                    languagesSelectorWidth -
                    102 -
                    iconWithTextWidth * (hasActivateAction ? 1 : 0)) /
                    (iconGap + iconWidth)
            )
            count = hasActivateAction ? count + 1 : count
            setDisplayedActionsMaxCount(Math.min(Math.max(count, 1), 10))
        }

        const timer = setTimeout(() => handleResize(), 300)

        return () => {
            clearTimeout(timer)
        }
    }, [hasActivateAction, headerWidth, languagesSelectorWidth, headerActionButtonsWidth])

    const actions = useLiveQuery(() => actionService.list(), [refreshActionsFlag])
    const [selectedGroup, setSelectedGroup] = useState(localStorage.getItem('selectedGroup') || 'English Learning')
    const [displayedActions, setDisplayedActions] = useState<Action[]>([])
    const [hiddenActions, setHiddenActions] = useState<Action[]>([])
    const [displayedActionsMaxCount, setDisplayedActionsMaxCount] = useState(6)
    const actionGroups = actions?.reduce((groups: { [key: string]: Action[] }, action) => {
        if (!action.groups) {
            console.log('no groups', action)
            return groups
        }
        // 每个 action 可能属于多个 group
        action.groups.forEach((group) => {
            if (!groups[group]) {
                groups[group] = []
            }
            groups[group].push(action)
        })
        return groups
    }, {})

    useEffect(() => {
        if (!settings?.i18n) {
            return
        }
    
        const loadActions = async () => {
            const languageCode = settings.i18n
            console.log('languageCode is ', languageCode)
    
            // 从 localStorage 获取上次加载的语言
            const lastLoadedLanguage = localStorage.getItem('lastLoadedLanguage')
    
            // 检查是否已存在 action 且语言未变化
            const existingAction = await actionService.get(1)
            if (existingAction && lastLoadedLanguage === languageCode) {
                console.log('Actions already exist and language unchanged. Skipping bulk put.')
                return
            }
    
            let promptsData: Action[] | [] = []
    
            switch (languageCode) {
                case 'zh-Hans':
                    promptsData = ChineseActionsData as Action[]
                    break
                case 'zh-Hant':
                    promptsData = TraditionalChineseActionData as Action[]
                    break
                case 'en':
                    promptsData = EnglishActionData as Action[]
                    break
                case 'ja':
                    promptsData = JapaneseActionData as Action[]
                    break
                case 'ko':
                    promptsData = KoreanActionData as Action[]
                    break
                case 'ru':
                    promptsData = RussianActionData as Action[]
                    break
                case 'th':
                    promptsData = ThaiActionData as Action[]
                    break
                case 'ar':
                    promptsData = ArabicActionData as Action[]
                    break
                case 'hi':
                    promptsData = HindiActionData as Action[]
                    break
                case 'fr':
                    promptsData = FrenchActionData as Action[]
                    break
                case 'de':
                    promptsData = GermanActionData as Action[]
                    break
                default:
                    console.log('Unsupported language code')
                    promptsData = EnglishActionData as Action[]
                    break
            }
    
            console.log('Loading new promptsData for language:', languageCode)
            await actionService.bulkPut(promptsData)
            
            // 更新 localStorage 中的语言记录
            localStorage.setItem('lastLoadedLanguage', languageCode || 'en')
            
            refreshActions()
        }
    
        loadActions()
    }, [settings?.i18n])

    useEffect(() => {
        // eslint-disable-next-line react-hooks/exhaustive-deps
        if (!actions) {
            setDisplayedActions([])
            setHiddenActions([])
            refreshActions()
            return
        }

        const filteredActions = actions.filter((action) => {
            return action.groups.includes(selectedGroup)
        })

        setActions(filteredActions)

        let displayedActions = filteredActions.slice(0, displayedActionsMaxCount)
        let hiddenActions = filteredActions.slice(displayedActionsMaxCount)
        if (!displayedActions.find((action) => action.id === activateAction?.id)) {
            const activatedAction = filteredActions.find((a) => a.id === activateAction?.id)
            if (activatedAction) {
                const lastDisplayedAction = displayedActions[displayedActions.length - 1]
                if (lastDisplayedAction) {
                    displayedActions = displayedActions.slice(0, displayedActions.length - 1)
                    hiddenActions = [lastDisplayedAction, ...hiddenActions]
                }
                displayedActions.push(activatedAction)
                hiddenActions = hiddenActions.filter((a) => a.id !== activatedAction.id)
            }
        }
        setDisplayedActions(displayedActions)
        setHiddenActions(hiddenActions)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [actions, selectedGroup, activateAction, displayedActionsMaxCount, refreshActionsFlag])

    const isTranslate = currentTranslateMode === 'translate'

    useEffect(() => {
        localStorage.setItem('selectedGroup', selectedGroup)
    }, [selectedGroup])

    useEffect(() => {
        const handleRuntimeMessage = (message: { type: string; text: string }) => {
            if (message.type === 'Text') {
                if (selectedWord) {
                    deleteSelectedWord()
                }
                const text = message.text
                setEditableText(text)
            }
        }

        chrome.runtime.onMessage.addListener(handleRuntimeMessage)

        // 清理函数
        return () => {
            chrome.runtime.onMessage.removeListener(handleRuntimeMessage)
        }
    }, [deleteSelectedWord, props.text, props.uuid, selectedWord])

    const { theme, themeType } = useTheme()
    const styles = useStyles({ theme, themeType, isDesktopApp: isDesktopApp() })
    const [isLoading, setIsLoading] = useState(false)
    const [newYouGlish, setNewYouGlish] = useState(false)
    const [showYouGlish, setShowYouGlish] = useState(false)
    const [editableText, setEditableText] = useState(props.text)
    const [selectWordIdx, setSelectWordIdx] = useState(0)
    const [isSpeakingEditableText, setIsSpeakingEditableText] = useState(false)
    const [translatedText, setTranslatedText] = useState('')
    const [translatedLines, setTranslatedLines] = useState<string[]>([])
    const [engine, setEngine] = useState<IEngine | undefined>(undefined)
    const [translations, setTranslations] = useState<Translations>({})
    const [activeKey, setActiveKey] = useState<Key | null>(null)
    const [parentAction, setParentAction] = useState<Action | undefined>(undefined)

    const handleAccordionChange = (expanded: Array<React.Key>) => {
        setActiveKey(expanded.length > 0 ? expanded[0] : null)
    }

    const handTextParserClick = (word: string, originalSentence: string) => {
        const text = originalSentence + ',请解释以上句子中的' + word
        setEditableText(text)
    }

    useEffect(() => {
        getInitialFile()
    }, [getInitialFile])

    const handleActionClick = async (action: Action | undefined, assistantActionText?: string) => {
        if (!action) {
            return
        }
        if (assistantActionText) {
            setFinalText(assistantActionText)
        } else {
            if (!selectedWord) {
                setFinalText(editableText)
            } else {
                setFinalText(selectedWord.text)
            }
        }

        // 保存当前状态
        if (action.parentIds) {
            setParentAction(activateAction)
        }

        // 如果不需要暂时更改状态，只执行当前操作
        setAction(action)
        if (!selectedWord || editableText !== selectedWord?.text) {
            setEditableText(selectedWord?.text ?? '')
        }
        forceTranslate() // 执行操作
    }

    // 只有在selectedWord存在且idx改变时触发
    useEffect(() => {
        if (!selectedWord) {
            console.log('selectedWord is empty, clear translations')
            return
        }
        if (selectedWord.text && selectedWord.idx) {
            const selectedWordTranslations = words.find((w) => w.idx === selectedWord.idx)?.translations || {}
            setEditableText(selectedWord.text)
            setSelectWordIdx(selectedWord.idx)
            if (selectedWordTranslations) {
                setTranslations(selectedWordTranslations)
                if (translations[t('Sentence Analysis')]) {
                    setjsonText(translations[t('Sentence Analysis')].text)
                }
            }
        } else {
            console.debug('word is empty')
        }
    }, [selectedWord?.idx, words])

    useEffect(() => {
        if (!settings) {
            return
        }
        let engineProvider
        if (activateAction && activateAction.model) {
            const [provider, modelName] = activateAction.model.split('&')
            engineProvider = provider as Provider
        } else {
            engineProvider = settings.provider
        }
        const engine = getEngine(engineProvider)
        setEngine(engine)
    }, [settings.apiModel, settings.provider, settings.apiKey, settings, activateAction])

    useEffect(() => {
        setTranslatedLines(translatedText.split('\n'))
    }, [translatedText])
    const [isSpeakingTranslatedText, setIsSpeakingTranslatedText] = useState(false)
    const [errorMessage, setErrorMessage] = useState('')
    const startLoading = useCallback(() => {
        setIsLoading(true)
        useChatStore.setState({ isLoading: true })
    }, [])
    const stopLoading = useCallback(() => {
        setIsLoading(false)
        useChatStore.setState({ isLoading: false })
    }, [])
    const [sourceLang, setSourceLang] = useState<LangCode>('en')
    const [targetLang, setTargetLang] = useState<LangCode>('en')
    const [youglishLang, setYouglishLang] = useState<LangCode>('en')
    const [ActivatedActionName, setActivatedActionName] = useState('')
    const settingsIsUndefined = settings === undefined
    const [showTextParser, setShowTextParser] = useState(false)
    const [jsonText, setjsonText] = useState('')
    useEffect(() => {
        if (settingsIsUndefined) {
            return
        }

        ;(async () => {
            setTargetLang(() => {
                if (settings?.defaultTargetLanguage) {
                    return settings.defaultTargetLanguage as LangCode
                } else {
                    return 'en'
                }
            })
            setSourceLang(() => {
                if (settings?.defaultTargetLanguage) {
                    return settings.defaultSourceLanguage as LangCode
                } else {
                    return 'zh-Hans'
                }
            })
            setYouglishLang(() => {
                if (settings?.defaultTargetLanguage) {
                    return settings.defaultYouglishLanguage as LangCode
                } else {
                    return 'en'
                }
            })
        })()
    }, [
        isTranslate,
        settingsIsUndefined,
        settings?.defaultTargetLanguage,
        settings?.defaultSourceLanguage,
        settings?.defaultYouglishLanguage,
        props.uuid,
    ])

    useEffect(() => {
        const editor = editorRef.current
        if (!editor) return
        editor.dir = getLangConfig(sourceLang).direction
    }, [sourceLang, actionStr])

    const translatedLanguageDirection = useMemo(() => getLangConfig(sourceLang).direction, [sourceLang])

    const addToAnki = async (deckname: string, front: string, back: string) => {
        const connected = await isConnected()

        if (connected) {
            try {
                await addNewNote(deckname, front, back)
                setActionStr('Note added successfully!')
            } catch (error) {
                console.error('Error adding note:', error)
                setErrorMessage(`Error: ${error}`)
            }
        } else {
            console.debug('Not connected')
            setErrorMessage('Not connected to Anki!')
        }
    }

    // Reposition the popup card to prevent it from extending beyond the screen.
    useEffect(() => {
        const calculateTranslatedContentMaxHeight = (): number => {
            const { innerHeight } = window
            const editorHeight = editorContainerRef.current?.offsetHeight || 0
            const actionButtonsHeight = actionButtonsRef.current?.offsetHeight || 0
            return innerHeight - headerHeight - editorHeight - actionButtonsHeight - documentPadding * 10
        }

        const resizeHandle: ResizeObserverCallback = _.debounce((entries) => {
            // Listen for element height changes
            for (const entry of entries) {
                const $popupCard = entry.target as HTMLElement
                const [maxX, maxY] = calculateMaxXY($popupCard)
                const yList = [maxY, $popupCard.offsetTop].filter((item) => item > documentPadding)
                $popupCard.style.top = `${Math.min(...yList) || documentPadding}px`
                const xList = [maxX, $popupCard.offsetLeft].filter((item) => item > documentPadding)
                $popupCard.style.left = `${Math.min(...xList) || documentPadding}px`

                const $translatedContent = translatedContentRef.current
                if ($translatedContent) {
                    const translatedContentMaxHeight = calculateTranslatedContentMaxHeight()
                    $translatedContent.style.maxHeight = `${translatedContentMaxHeight}px`
                }
            }
        }, 500)

        const observer = new ResizeObserver(resizeHandle)
        queryPopupCardElement().then(($popupCard) => {
            if ($popupCard) {
                const rect = $popupCard.getBoundingClientRect()
                const x = Math.min(window.innerWidth - 600, rect.x)
                $popupCard.style.left = x + 'px'
                observer.observe($popupCard)
            }
        })
        return () => {
            queryPopupCardElement().then(($popupCard) => $popupCard && observer.unobserve($popupCard))
        }
    }, [headerHeight])

    useEffect(() => {
        if (isDesktopApp()) {
            return
        }
        const $header = headerRef.current
        if (!$header) {
            return undefined
        }

        let $popupCard: HTMLDivElement | null = null
        ;(async () => {
            $popupCard = await queryPopupCardElement()
            if (!$popupCard) {
                return
            }
        })()

        let closed = true

        const dragMouseDown = (e: MouseEvent) => {
            closed = false
            e = e || window.event
            e.preventDefault()
            $popupCard?.addEventListener('mouseup', closeDragElement)
            document.addEventListener('mousemove', elementDrag)
            document.addEventListener('mouseup', closeDragElement)
        }

        const elementDrag = async (e: MouseEvent) => {
            e.stopPropagation()
            if (closed || !$popupCard) {
                return
            }
            e = e || window.event
            e.preventDefault()
            const { movementX, movementY } = e
            const [l, t] = overflowCheck($popupCard, { x: movementX, y: movementY })
            $popupCard.style.top = `${t}px`
            $popupCard.style.left = `${l}px`
        }

        const overflowCheck = ($popupCard: HTMLDivElement, movementXY: MovementXY): number[] => {
            let { offsetTop: cardTop, offsetLeft: cardLeft } = $popupCard
            const rect = $popupCard.getBoundingClientRect()
            const { x: movementX, y: movementY } = movementXY
            if (
                rect.left + movementX > documentPadding &&
                rect.right + movementX < document.documentElement.clientWidth - documentPadding
            ) {
                cardLeft = $popupCard.offsetLeft + movementX
            }
            if (
                rect.top + movementY > documentPadding &&
                rect.bottom + movementY < document.documentElement.clientHeight - documentPadding
            ) {
                cardTop = $popupCard.offsetTop + movementY
            }
            return [cardLeft, cardTop]
        }

        const elementScroll = async (e: globalThis.Event) => {
            e.stopPropagation()
            if (closed || !$popupCard) {
                scrollYRef.current = window.scrollY
                return
            }
            e = e || window.event
            e.preventDefault()
            const { scrollY } = window
            const movementY = scrollY - scrollYRef.current
            const [l, t] = overflowCheck($popupCard, { x: 0, y: movementY })
            $popupCard.style.top = `${t}px`
            $popupCard.style.left = `${l}px`
            scrollYRef.current = scrollY
        }

        const closeDragElement = () => {
            closed = true
            $popupCard?.removeEventListener('mouseup', closeDragElement)
            document.removeEventListener('mousemove', elementDrag)
            document.removeEventListener('mouseup', closeDragElement)
        }

        $header.addEventListener('mousedown', dragMouseDown)
        $header.addEventListener('mouseup', closeDragElement)
        document.addEventListener('scroll', elementScroll)

        return () => {
            $header.removeEventListener('mousedown', dragMouseDown)
            $header.removeEventListener('mouseup', closeDragElement)
            document.removeEventListener('scroll', elementScroll)
            closeDragElement()
        }
    }, [headerRef])

    const [isNotLogin, setIsNotLogin] = useState(false)

    const activateActionRef = useRef(activateAction)
    useEffect(() => {
        activateActionRef.current = activateAction
    }, [activateAction])

    useEffect(() => {
        if (!activateAction?.parentIds) {
            if (!selectedWord) {
                setFinalText(editableText)
            } else {
                setFinalText(selectedWord.text)
            }
        }
    }, [activateAction?.parentIds, editableText, selectedWord])

    const finalTextRef = useRef(finalText)

    useEffect(() => {
        finalTextRef.current = finalText
    }, [finalText])

    const translateText = useCallback(
        async (text: string, signal: AbortSignal, actionName?: string) => {
            if (!text || !activateAction?.id) {
                return
            }

            if (text !== selectedWord?.text) {
                if (!activateAction.parentIds) {
                    selectWordNotInCurrentFile(text)
                }
            }
            console.log('translateText before', text)

            text = finalTextRef.current
            console.log('translateText', text)
            console.log('finalText', finalText)
            console.log('editText', editableText)
            console.log('selectedWord text', selectedWord?.text)

            const latestActivateAction = activateAction

            if (!latestActivateAction || !latestActivateAction.id) {
                return // Handle the case where latestActivateAction is undefined
            }
            const action = await actionService.get(latestActivateAction.id)
            if (!action) {
                console.debug('action is undefined')
                return
            }

            if (actionName) {
                setActivatedActionName(actionName)
                setActiveKey(actionName)
            } else {
                setActiveKey(action.name)
                setActivatedActionName(action.name)
            }

            const beforeTranslate = () => {
                const actionStr = 'Processing...'
                setActionStr(actionStr)
                setTranslatedText('')
                setErrorMessage('')
                startLoading()
            }
            const afterTranslate = (reason: string) => {
                stopLoading()
                if (reason !== 'stop') {
                    if (reason === 'length' || reason === 'max_tokens') {
                        toast(t('Chars Limited'), {
                            duration: 5000,
                            icon: '😥',
                        })
                    } else {
                        setActionStr((actionStr_) => {
                            setErrorMessage(`${actionStr_} failed: ${reason}`)
                            return 'Error'
                        })
                    }
                } else {
                    const actionStr = 'Processed'
                    setActionStr(actionStr)
                }
            }
            beforeTranslate()
            const cachedKey = `translate:${settings?.provider ?? ''}:${settings?.apiModel ?? ''}:${action.id}:${
                action.rolePrompt
            }:${action.commandPrompt}:${action.outputRenderingFormat}:${text}:${translationFlag}`
            const cachedValue = cache.get(cachedKey)
            if (cachedValue) {
                afterTranslate('stop')
                setTranslatedText(cachedValue as string)
                return
            }
            let isStopped = false
            try {
                await translate(
                    {
                        activateAction,
                        parentAction: parentAction,
                        detectFrom: sourceLang,
                        detectTo: targetLang,
                        action,
                        signal,
                        text,
                        onStatusCode: (statusCode) => {
                            setIsNotLogin(statusCode === 401 || statusCode === 403)
                        },
                        onMessage: async (message) => {
                            if (!message.content) {
                                return
                            }
                            setTranslatedText((translatedText) => {
                                if (message.isFullText) {
                                    return message.content
                                }
                                if (activateAction.outputRenderingFormat === 'json' && !showTextParser) {
                                    setShowTextParser(true)
                                }
                                if (!selectedWord) {
                                    setTranslations({})
                                }
                                const newTranslatedText = message.isFullText
                                    ? message.content
                                    : translatedText + message.content

                                const actionName = useChatStore.getState().activateAction?.name

                                if (actionName) {
                                    setTranslations((prev) => {
                                        const newTranslations = { ...prev }
                                        if (newTranslations[actionName]) {
                                            newTranslations[actionName] = {
                                                ...newTranslations[actionName],
                                                text: newTranslatedText, // 使用最新的翻译文本更新
                                                format: activateAction?.outputRenderingFormat || 'markdown',
                                            }
                                        } else {
                                            newTranslations[actionName] = {
                                                text: newTranslatedText,
                                                format: activateAction?.outputRenderingFormat || 'markdown',
                                            }
                                        }

                                        return newTranslations
                                    })
                                } else {
                                    setTranslations((prev) => {
                                        const newTranslations = { ...prev }
                                        if (newTranslations[activateAction?.name]) {
                                            newTranslations[activateAction?.name] = {
                                                ...newTranslations[activateAction?.name],
                                                text: newTranslatedText, // 使用最新的翻译文本更新
                                                format: activateAction?.outputRenderingFormat || 'markdown',
                                            }
                                        } else {
                                            newTranslations[activateAction?.name] = {
                                                text: newTranslatedText,
                                                format: activateAction?.outputRenderingFormat || 'markdown',
                                            }
                                        }

                                        return newTranslations
                                    })
                                }

                                return newTranslatedText
                            })
                        },
                        onFinish: (reason) => {
                            afterTranslate(reason)
                            setTranslatedText((translatedText) => {
                                const result = translatedText
                                cache.set(cachedKey, result)
                                const {
                                    messageId,
                                    conversationId,
                                    activateAction,
                                    setIsShowActionList,
                                    updateTranslationText,
                                } = useChatStore.getState()

                                if (activateAction?.name) {
                                    updateTranslationText(translatedText, activateAction?.name, finalText)
                                    setIsShowActionList(true)

                                    handleTranslationUpdate(
                                        selectedWord?.idx || selectWordIdx,
                                        activateAction?.name,
                                        finalText,
                                        translatedText,
                                        activateAction?.outputRenderingFormat || 'markdown',
                                        messageId,
                                        conversationId
                                    )
                                }
                                return result
                            })
                        },
                        onError: (error) => {
                            setActionStr('Error')
                            setErrorMessage(error)
                        },
                    },
                    engine
                )
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
            } catch (error: any) {
                // if error is a AbortError then ignore this error
                if (error.name === 'AbortError') {
                    isStopped = true
                    return
                }
                setActionStr('Error')
                setErrorMessage((error as Error).toString())
            } finally {
                if (!isStopped) {
                    stopLoading()
                    isStopped = true
                }
            }
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [settings?.provider, settings?.apiModel, translationFlag, startLoading, stopLoading]
    )

    const handleTranslationUpdate = async (
        wordIdx: number,
        actionName: string,
        finalText: string,
        translatedText: string,
        outputFormat: ActionOutputRenderingFormat,
        messageId?: string,
        conversationId?: string
    ) => {
        let finalFileId
        if (selectedWord) {
            finalFileId = currentFileId
        } else {
            const category = 'History'
            const currentDate = new Date()
            const formattedDate = currentDate.toISOString().slice(0, 10).replace(/-/g, '/') // 格式化日期
            const fileName = formattedDate
            finalFileId = await fileService.getFileIdByName(category, fileName)
        }
        try {
            if (!finalFileId) {
                return
            }

            await fileService.addOrUpdateTranslationInWord(
                activateAction?.parentIds ? true : false,
                finalFileId,
                actionName,
                wordIdx,
                finalText,
                translatedText,
                outputFormat,
                messageId,
                conversationId
            )
        } catch (error) {
            console.error('Failed to update translation:', error)
        } finally {
            if (activateAction?.parentIds) {
                // 使用辅助动作后返回到父动作
                setAction(parentAction)
            }
        }
    }

    const performActionsTranslations = useCallback(
        async (actions: Action[]) => {
            const originalAction = activateActionRef.current // 保存原始action以便之后恢复
            const controller = new AbortController()
            const { signal } = controller
            for (let i = 0; i < actions.length; i++) {
                const action = actions[i]
                console.log(`处理动作 ${action.name}`)

                // 更新当前激活的动作
                setAction(action) // 假设这是更新当前action的方法

                // 等待更新状态，然后调用翻译函数
                await new Promise((r) => setTimeout(r, 0)) // 确保状态更新完成

                await translateText(editableText, signal, action.name) // 使用更新后的action执行翻译

                // 可能需要处理更多逻辑，比如检查是否有错误，是否需要停止等
            }

            // 恢复原始action
            setAction(originalAction as Action)
            return () => {
                controller.abort()
            }
        },
        [editableText, setAction, translateText]
    )
    useEffect(() => {
        if (translations[t('Sentence analysis')]) {
            setShowTextParser(true)
            if (translatedText) {
                setjsonText(translatedText)
            }

            if (translations[t('Sentence analysis')]) {
                setjsonText(translations[t('Sentence analysis')].text)
            }
        } else {
            setShowTextParser(false)
            setjsonText('')
        }
    }, [translatedText, t, activateAction?.name, translations, selectedWord])

    useEffect(() => {
        console.log('showTextParser', showTextParser)
    }, [showTextParser])

    useEffect(() => {
        if (!finalText) {
            setFinalText(editableText)
        }
    }, [editableText, finalText])

    useEffect(() => {
        const controller = new AbortController()
        const { signal } = controller
        console.log('finalText', finalText)
        console.log('finalTextRef.current', finalTextRef.current)
        translateText(finalTextRef.current, signal)
        return () => {
            controller.abort()
        }
    }, [translateText])

    useEffect(() => {
        if (selectedWord?.text === '') {
            return
        }
        chrome.storage.local.set({ selectedWord: JSON.stringify(selectedWord) })
    }, [selectedWord, translations])

    useEffect(() => {
        if (!props.defaultShowSettings) {
            return
        }
        if (
            settings &&
            ((settings.provider === 'ChatGPT' && !settings.apiModel) ||
                (settings.provider !== 'ChatGPT' && !settings.apiKeys))
        ) {
            setShowSettings(true)
        }
    }, [props.defaultShowSettings, setShowSettings, settings])

    const [isOCRProcessing, setIsOCRProcessing] = useState(false)
    const [showOCRProcessing, setShowOCRProcessing] = useState(false)

    useEffect(() => {
        if (isOCRProcessing) {
            setShowOCRProcessing(true)
            return
        }
        const timer = setTimeout(() => {
            setShowOCRProcessing(false)
        }, 1500)
        return () => {
            clearTimeout(timer)
        }
    }, [isOCRProcessing])

    const editableStopSpeakRef = useRef<() => void>(() => null)
    const translatedStopSpeakRef = useRef<() => void>(() => null)
    useEffect(() => {
        return () => {
            editableStopSpeakRef.current()
            translatedStopSpeakRef.current()
        }
    }, [])
    const handleEditSpeakAction = async () => {
        if (isSpeakingEditableText) {
            editableStopSpeakRef.current()
            setIsSpeakingEditableText(false)
            return
        }
        setIsSpeakingEditableText(true)
        const { stopSpeak } = await speak({
            text: editableText || finalText,
            lang: sourceLang,
            onFinish: () => setIsSpeakingEditableText(false),
        })
        editableStopSpeakRef.current = stopSpeak
    }

    const handlesetEditableText = (text: string) => {
        if (selectedWord) {
            deleteSelectedWord()
        }
        setEditableText(text)
    }

    const handleYouglishSpeakAction = async () => {
        setNewYouGlish(true)
        if (!showYouGlish) {
            setShowYouGlish(true)
        } else {
            setShowYouGlish(false)
        }
    }

    const handleTranslatedSpeakAction = async (messageId?: string, conversationId?: string, text?: string) => {
        if (isSpeakingTranslatedText) {
            translatedStopSpeakRef.current()
            setIsSpeakingTranslatedText(false)
            return
        }
        setIsSpeakingTranslatedText(true)
        const { stopSpeak } = await speak({
            text: text || translatedText,
            lang: targetLang,
            messageId,
            conversationId,
            onFinish: () => setIsSpeakingTranslatedText(false),
        })
        translatedStopSpeakRef.current = stopSpeak
    }

    return (
        <div
            className={clsx(styles.popupCard, {
                'yetone-dark': themeType === 'dark',
            })}
            style={{
                minHeight: '600px',
                background: theme.colors.backgroundPrimary,
                paddingBottom: showSettings ? '0px' : '30px',
            }}
        >
            <div
                style={{
                    display: showSettings ? 'block' : 'none',
                }}
            >
                <InnerSettings
                    onSave={(oldSettings) => {
                        setShowSettings(false)
                        props.onSettingsSave?.(oldSettings)
                    }}
                />
            </div>
            <div
                style={{
                    display: !showSettings ? 'block' : 'none',
                }}
            >
                <div style={props.containerStyle}>
                    <div
                        ref={headerRef}
                        className={styles.popupCardHeaderContainer}
                        data-tauri-drag-region
                        style={{
                            cursor: isDesktopApp() ? 'default' : 'move',
                        }}
                    >
                        <Tooltip content={t('选择使用场景')} placement='bottom'>
                            <Select
                                size='mini'
                                options={[...Object.keys(actionGroups || {}).map((key) => ({ id: key, label: key }))]}
                                value={[{ id: selectedGroup }]}
                                overrides={{
                                    Root: {
                                        style: {
                                            minWidth: '100px',
                                            width: '30%',
                                        },
                                    },
                                }}
                                onChange={({ value }) => {
                                    // 如果 actionGroups 是 undefined，则使用空对象作为默认值
                                    const groupId = value.length > 0 ? value[0].id : Object.keys(actionGroups || {})[0]

                                    if (groupId === 'unlock_features') {
                                        window.open('https://chatgpt-tutor.vercel.app/docs/purchase', '_blank') // 打开新网页
                                    } else {
                                        setSelectedGroup(groupId as string)
                                    }
                                }}
                            />
                        </Tooltip>
                        <div className={styles.popupCardHeaderButtonGroup} ref={headerActionButtonsRef}>
                            {displayedActions?.map((action) => {
                                return (
                                    <Tooltip
                                        key={action.id}
                                        content={action.mode ? t(action.name) : action.name}
                                        placement={isDesktopApp() ? 'bottom' : 'top'}
                                    >
                                        <Button
                                            size='mini'
                                            kind={action.id === activateAction?.id ? 'primary' : 'secondary'}
                                            className={
                                                action.id === activateAction?.id
                                                    ? '__yetone-activate-action'
                                                    : undefined
                                            }
                                            overrides={{
                                                Root: {
                                                    style: {
                                                        height: '27px',
                                                        display: 'flex',
                                                        flexDirection: 'row',
                                                        alignItems: 'center',
                                                        gap: '4px',
                                                    },
                                                },
                                            }}
                                            onClick={() => {
                                                setTranslatedText('')
                                                setAction(action)
                                                if (action) {
                                                    localStorage.setItem('savedAction', JSON.stringify(action))
                                                } else {
                                                    localStorage.removeItem('savedAction')
                                                }
                                            }}
                                        >
                                            {action.icon &&
                                                React.createElement(mdIcons[action.icon as keyof typeof mdIcons], {
                                                    size: 15,
                                                })}
                                            {action.id === activateAction?.id && (
                                                <div
                                                    style={{
                                                        maxWidth: 200,
                                                        whiteSpace: 'nowrap',
                                                        overflow: 'hidden',
                                                        textOverflow: 'ellipsis',
                                                    }}
                                                >
                                                    {action.mode ? t(action.name) : action.name}
                                                </div>
                                            )}
                                        </Button>
                                    </Tooltip>
                                )
                            })}
                        </div>
                        <div className={styles.popupCardHeaderMoreActionsContainer}>
                            <StatefulPopover
                                autoFocus={false}
                                triggerType='hover'
                                showArrow
                                placement='bottom'
                                content={
                                    <StatefulMenu
                                        initialState={{
                                            highlightedIndex: hiddenActions.findIndex(
                                                (action) => action.id === activateAction?.id
                                            ),
                                        }}
                                        onItemSelect={async ({ item }) => {
                                            const actionID = item.id
                                            if (actionID === '__manager__') {
                                                if (isTauri()) {
                                                    const { invoke } = await import('@tauri-apps/api')
                                                    if (!navigator.userAgent.includes('Windows')) {
                                                        await invoke('show_action_manager_window')
                                                    } else {
                                                        const { LogicalSize, WebviewWindow } = await import(
                                                            '@tauri-apps/api/window'
                                                        )
                                                        const windowLabel = 'action_manager'
                                                        let window = WebviewWindow.getByLabel(windowLabel)
                                                        if (!window) {
                                                            window = new WebviewWindow(windowLabel, {
                                                                url: 'src/tauri/action_manager.html',
                                                                decorations: false,
                                                                visible: true,
                                                                focus: true,
                                                            })
                                                        }
                                                        await window.setDecorations(false)
                                                        await window.setSize(new LogicalSize(600, 770))
                                                        await window.center()
                                                        await window.show()
                                                    }
                                                } else {
                                                    setShowActionManager(true)
                                                }
                                                return
                                            }
                                            if (actionID === '__review__') {
                                                setShowReviewManager(true)
                                            }
                                            setAction(actions?.find((a) => a.id === (actionID as number)))
                                        }}
                                        items={[
                                            ...hiddenActions.map((action) => {
                                                return {
                                                    id: action.id,
                                                    label: (
                                                        <div
                                                            style={{
                                                                display: 'flex',
                                                                flexDirection: 'row',
                                                                alignItems: 'center',
                                                                gap: 6,
                                                            }}
                                                        >
                                                            {action.icon
                                                                ? React.createElement(
                                                                      (mdIcons as Record<string, IconType>)[
                                                                          action.icon
                                                                      ],
                                                                      { size: 15 }
                                                                  )
                                                                : undefined}
                                                            {action.mode ? t(action.name) : action.name}
                                                        </div>
                                                    ),
                                                }
                                            }),
                                            { divider: true },
                                            {
                                                id: '__manager__',
                                                label: (
                                                    <div
                                                        style={{
                                                            display: 'flex',
                                                            flexDirection: 'row',
                                                            alignItems: 'center',
                                                            gap: 6,
                                                            fontWeight: 500,
                                                        }}
                                                    >
                                                        <GiPlatform />
                                                        {t('Action Manager')}
                                                    </div>
                                                ),
                                            },
                                            {
                                                id: '__review__',
                                                label: (
                                                    <div
                                                        style={{
                                                            display: 'flex',
                                                            flexDirection: 'row',
                                                            alignItems: 'center',
                                                            gap: 6,
                                                            fontWeight: 500,
                                                        }}
                                                    >
                                                        <GiPlatform />
                                                        {t('Review Manager')}
                                                    </div>
                                                ),
                                            },
                                        ]}
                                    />
                                }
                            >
                                <div className={styles.popupCardHeaderMoreActionsBtn}>
                                    <GrMoreVertical />
                                </div>
                            </StatefulPopover>
                        </div>
                    </div>
                    <div className={styles.popupCardContentContainer}>
                        {settings?.apiURL === defaultAPIURL && (
                            <div>
                                <IpLocationNotification showSettings={showSettings} />
                            </div>
                        )}
                        <div ref={editorContainerRef} className={styles.popupCardEditorContainer}>
                            <div
                                style={{
                                    height: 0,
                                    overflow: 'hidden',
                                }}
                            >
                                {editableText}
                            </div>
                            <CategorySelector />
                            <div style={{ display: 'flex', flexDirection: 'row', width: '100%' }}>
                                <Dropzone noClick={true}>
                                    {({ getRootProps }) => (
                                        <div
                                            {...getRootProps()}
                                            style={{ flex: 1, display: 'flex', flexDirection: 'column' }}
                                        >
                                            <Textarea
                                                inputRef={editorRef}
                                                autoFocus={autoFocus}
                                                overrides={{
                                                    Root: {
                                                        style: {
                                                            fontSize: '15px',
                                                            width: '100%',
                                                            height: '100%',
                                                            borderRadius: '0px',
                                                            minHeight: '220px',
                                                        },
                                                    },
                                                    Input: {
                                                        style: {
                                                            height: '100%',
                                                            fontSize: '15px',
                                                            padding: '4px 8px',
                                                            color:
                                                                themeType === 'dark'
                                                                    ? theme.colors.contentSecondary
                                                                    : theme.colors.contentPrimary,
                                                            fontFamily:
                                                                currentTranslateMode === 'explain-code'
                                                                    ? 'monospace'
                                                                    : 'inherit',
                                                            textalign: 'start',
                                                        },
                                                    },
                                                }}
                                                value={editableText}
                                                size='mini'
                                                resize='vertical'
                                                onChange={(e) => handlesetEditableText(e.target.value)}
                                                onKeyPress={async (e) => {
                                                    if (e.key === 'Enter') {
                                                        forceTranslate()
                                                        if (!e.shiftKey) {
                                                            e.preventDefault()
                                                            e.stopPropagation()
                                                            if (activateAction) {
                                                                setAction(activateAction)
                                                            }
                                                        }
                                                    }
                                                }}
                                            />
                                            <div
                                                style={{
                                                    display: 'flex',
                                                    flexDirection: 'row',
                                                    alignItems: 'center',
                                                    paddingTop: 8,
                                                    transition: 'all 0.3s linear',
                                                    overflow: 'visible',
                                                }}
                                            >
                                                <div
                                                    style={{
                                                        marginRight: 'auto',
                                                    }}
                                                />
                                                <div
                                                    style={{
                                                        display: 'flex',
                                                        flexDirection: 'row',
                                                        alignItems: 'center',
                                                        gap: 10,
                                                    }}
                                                >
                                                    <div
                                                        style={{
                                                            color: '#999',
                                                            fontSize: '12px',
                                                            transform: 'scale(0.9)',
                                                            marginRight: '5px',
                                                        }}
                                                    >
                                                        {
                                                            'Please press <Enter> to submit. Press <Shift+Enter> to start a new line.'
                                                        }
                                                    </div>
                                                    <Button
                                                        size='mini'
                                                        kind='secondary'
                                                        onClick={async (e) => {
                                                            console.log('submit is working')
                                                            e.preventDefault()
                                                            e.stopPropagation()
                                                            if (!activateAction) {
                                                                console.debug('activateAction is null')
                                                                return
                                                            }
                                                            forceTranslate()
                                                        }}
                                                        startEnhancer={<IoIosRocket size={13} />}
                                                        overrides={{
                                                            StartEnhancer: {
                                                                style: {
                                                                    marginRight: '6px',
                                                                },
                                                            },
                                                            BaseButton: {
                                                                style: {
                                                                    fontWeight: 'normal',
                                                                    fontSize: '12px',
                                                                    padding: '4px 8px',
                                                                    cursor: 'pointer',
                                                                },
                                                            },
                                                        }}
                                                    >
                                                        {t('Submit')}
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </Dropzone>
                                <div style={{ flex: 1, display: 'flex' }}>
                                    {' '}
                                    {/* WordListUploader部分占比1/3 */}
                                    <WordListUploader />
                                </div>
                            </div>
                            <div className={styles.actionButtonsContainer}>
                                <StatefulTooltip content={t('Sign out')} showArrow placement='top'>
                                    <div className={styles.actionButton} onClick={() => clerk.signOut()}>
                                        <GoSignOut size={20} />
                                    </div>
                                </StatefulTooltip>
                                <div style={{ marginLeft: 'auto' }}></div>
                                {!!editableText.length && (
                                    <>
                                        <Tooltip content={t('Speak')} placement='bottom'>
                                            <div className={styles.actionButton} onClick={handleEditSpeakAction}>
                                                {isSpeakingEditableText ? (
                                                    <SpeakerMotion />
                                                ) : (
                                                    <RxSpeakerLoud size={15} />
                                                )}
                                            </div>
                                        </Tooltip>
                                        <Tooltip content={t('On/Off Youglish')} placement='bottom'>
                                            <div className={styles.actionButton} onClick={handleYouglishSpeakAction}>
                                                (
                                                <RiSpeakerFill size={15} />)
                                            </div>
                                        </Tooltip>
                                        <Tooltip content={t('Copy to clipboard')} placement='bottom'>
                                            <div className={styles.actionButton}>
                                                <CopyButton text={editableText} styles={styles}></CopyButton>
                                            </div>
                                        </Tooltip>
                                        <Tooltip content={t('Clear input')} placement='bottom'>
                                            <div
                                                className={styles.actionButton}
                                                onClick={() => {
                                                    setEditableText('')
                                                    editorRef.current?.focus()
                                                }}
                                            >
                                                <div className={styles.actionButton}>
                                                    <RxEraser size={15} />
                                                </div>
                                            </div>
                                        </Tooltip>
                                    </>
                                )}
                            </div>
                        </div>
                        {selectedWord?.text !== '' && (
                            <div className={styles.popupCardTranslatedContainer} dir={translatedLanguageDirection}>
                                {actionStr && (
                                    <div
                                        className={clsx({
                                            [styles.actionStr]: true,
                                            [styles.error]: !!errorMessage,
                                        })}
                                    >
                                        <div>{actionStr}</div>
                                        {isLoading ? (
                                            <span className={styles.writing} key={'1'} />
                                        ) : errorMessage ? (
                                            <span key={'2'}>😢</span>
                                        ) : (
                                            <span key={'3'}>👍</span>
                                        )}
                                    </div>
                                )}
                                {errorMessage ? (
                                    <div className={styles.errorMessage}>
                                        <span>{errorMessage}</span>
                                        <Tooltip content={t('Retry')} placement='bottom'>
                                            <div onClick={() => forceTranslate()} className={styles.actionButton}>
                                                <RxReload size={15} />
                                            </div>
                                        </Tooltip>
                                    </div>
                                ) : (
                                    <div
                                        style={{
                                            width: '100%',
                                        }}
                                    >
                                        <div
                                            ref={translatedContentRef}
                                            className={styles.popupCardTranslatedContentContainer}
                                        >
                                            <div>
                                                {showTextParser ? (
                                                    <TextParser
                                                        jsonContent={jsonText}
                                                        setOriginalText={handTextParserClick}
                                                    ></TextParser>
                                                ) : null}
                                                <>
                                                    {Object.entries(translations).map(
                                                        ([actionName, { text, format, messageId, conversationId }]) => (
                                                            <div key={actionName}>
                                                                <Accordion
                                                                    initialState={{
                                                                        expanded: [ActivatedActionName], // 初始时展开的 Panel 的 key
                                                                    }}
                                                                    onChange={({ expanded }) =>
                                                                        handleAccordionChange(expanded)
                                                                    }
                                                                    overrides={{
                                                                        ToggleIcon: {
                                                                            component: () =>
                                                                                actionName === activeKey ? (
                                                                                    <mdIcons.MdArrowDropUp size={24} />
                                                                                ) : (
                                                                                    <mdIcons.MdArrowDropDown
                                                                                        size={24}
                                                                                    />
                                                                                ),
                                                                        },
                                                                    }}
                                                                    accordion={true}
                                                                >
                                                                    {format === 'markdown' ? (
                                                                        <Panel title={actionName} key={actionName}>
                                                                            <>
                                                                                <Markdown>{text}</Markdown>
                                                                            </>
                                                                        </Panel>
                                                                    ) : format === 'latex' ? (
                                                                        <>
                                                                            <Panel title={actionName} key={actionName}>
                                                                                <Latex>{text}</Latex>
                                                                            </Panel>
                                                                            {isLoading && (
                                                                                <span className={styles.caret} />
                                                                            )}
                                                                        </>
                                                                    ) : (
                                                                        text.split('\n').map((line, i) => (
                                                                            <p
                                                                                className={styles.paragraph}
                                                                                key={`p-${i}`}
                                                                            >
                                                                                {i === 0 ? (
                                                                                    <div
                                                                                        style={{
                                                                                            display: 'flex',
                                                                                            alignItems: 'center',
                                                                                            gap: '5px',
                                                                                        }}
                                                                                    >
                                                                                        <Panel
                                                                                            title={actionName}
                                                                                            key={actionName}
                                                                                        >
                                                                                            {line}
                                                                                        </Panel>
                                                                                    </div>
                                                                                ) : (
                                                                                    line
                                                                                )}
                                                                            </p>
                                                                        ))
                                                                    )}
                                                                    <div
                                                                        ref={actionButtonsRef}
                                                                        className={styles.actionButtonsContainer}
                                                                    >
                                                                        <div style={{ marginRight: 'auto' }} />
                                                                        {activeKey === actionName && (
                                                                            <>
                                                                                {!isLoading && (
                                                                                    <Tooltip
                                                                                        content={t('Retry')}
                                                                                        placement='bottom'
                                                                                    >
                                                                                        <div
                                                                                            onClick={() =>
                                                                                                forceTranslate()
                                                                                            }
                                                                                            className={
                                                                                                styles.actionButton
                                                                                            }
                                                                                        >
                                                                                            <RxReload size={15} />
                                                                                        </div>
                                                                                    </Tooltip>
                                                                                )}
                                                                                <Tooltip
                                                                                    content={t('Speak')}
                                                                                    placement='bottom'
                                                                                >
                                                                                    <div
                                                                                        className={styles.actionButton}
                                                                                        onClick={() =>
                                                                                            handleTranslatedSpeakAction(
                                                                                                messageId,
                                                                                                conversationId,
                                                                                                text
                                                                                            )
                                                                                        }
                                                                                    >
                                                                                        {isSpeakingTranslatedText ? (
                                                                                            <SpeakerMotion />
                                                                                        ) : (
                                                                                            <RxSpeakerLoud size={15} />
                                                                                        )}
                                                                                    </div>
                                                                                </Tooltip>
                                                                                <Tooltip
                                                                                    content={t('Copy to clipboard')}
                                                                                    placement='bottom'
                                                                                >
                                                                                    <div
                                                                                        className={styles.actionButton}
                                                                                    >
                                                                                        <CopyButton
                                                                                            text={text}
                                                                                            styles={styles}
                                                                                        ></CopyButton>
                                                                                    </div>
                                                                                </Tooltip>
                                                                                <Tooltip
                                                                                    content={t('Add to Anki')}
                                                                                    placement='bottom'
                                                                                >
                                                                                    <div
                                                                                        onClick={() =>
                                                                                            addToAnki(
                                                                                                selectedGroup +
                                                                                                    ':' +
                                                                                                    actionName.split(
                                                                                                        ':'
                                                                                                    )[0], // assuming key is activateAction.name:editableText
                                                                                                editableText,
                                                                                                text
                                                                                            )
                                                                                        }
                                                                                        className={styles.actionButton}
                                                                                    >
                                                                                        <AiOutlinePlusSquare
                                                                                            size={15}
                                                                                        />
                                                                                    </div>
                                                                                </Tooltip>
                                                                                <Tooltip
                                                                                    content={t(
                                                                                        'Any question to this answer?'
                                                                                    )}
                                                                                    placement='bottom'
                                                                                >
                                                                                    <div
                                                                                        onClick={() =>
                                                                                            toggleMessageCard()
                                                                                        }
                                                                                        className={styles.actionButton}
                                                                                    >
                                                                                        <AiOutlineQuestionCircle
                                                                                            size={15}
                                                                                        />
                                                                                    </div>
                                                                                </Tooltip>
                                                                            </>
                                                                        )}
                                                                    </div>
                                                                </Accordion>
                                                            </div>
                                                        )
                                                    )}
                                                </>
                                            </div>
                                        </div>
                                        <div>
                                            <ActionList
                                                onActionClick={handleActionClick}
                                                performAll={performActionsTranslations}
                                            />
                                        </div>
                                    </div>
                                )}
                                {isNotLogin && settings?.provider === 'ChatGPT' && (
                                    <div
                                    style={{
                                        fontSize: '12px',
                                        color: theme.colors.contentPrimary,
                                    }}
                                >
                                    <span>{t('Please login to ChatGPT Web')}: </span>
                                    <a
                                        href='https://chat.openai.com'
                                        target='_blank'
                                        rel='noreferrer'
                                        style={{
                                            color: theme.colors.contentSecondary,
                                        }}
                                    >
                                        Login
                                    </a>
                                </div>
                                )}
                            </div>
                        )}
                        {isNotLogin && settings?.provider === 'Kimi' && (
                                    <div
                                        style={{
                                            fontSize: '12px',
                                            color: theme.colors.contentPrimary,
                                        }}
                                    >
                                        {isDesktopApp() ? (
                                            <>
                                                {t('Go to the')}{' '}
                                                <a
                                                    target='_blank'
                                                    href={
                                                        settings?.i18n?.toLowerCase().includes('zh')
                                                            ? 'https://github.com/openai-translator/openai-translator/blob/main/docs/kimi-cn.md'
                                                            : 'https://github.com/openai-translator/openai-translator/blob/main/docs/kimi.md'
                                                    }
                                                    rel='noreferrer'
                                                    style={{
                                                        color: theme.colors.contentSecondary,
                                                    }}
                                                >
                                                    Tutorial
                                                </a>{' '}
                                                {t('to get your API Key.')}
                                            </>
                                        ) : (
                                            <>
                                                <span>{t('Please login to Kimi Web')}: </span>
                                                <a
                                                    href='https://kimi.moonshot.cn/'
                                                    target='_blank'
                                                    rel='noreferrer'
                                                    style={{
                                                        color: theme.colors.contentSecondary,
                                                    }}
                                                >
                                                    Login
                                                </a>
                                            </>
                                        )}
                                    </div>
                                )}
                                {isNotLogin && settings?.provider === 'ChatGLM' && (
                                    <div
                                        style={{
                                            fontSize: '12px',
                                            color: theme.colors.contentPrimary,
                                        }}
                                    >
                                        {isDesktopApp() ? (
                                            <>
                                                {t('Go to the')}{' '}
                                                <a
                                                    target='_blank'
                                                    href={
                                                        settings?.i18n?.toLowerCase().includes('zh')
                                                            ? 'https://github.com/openai-translator/openai-translator/blob/main/docs/chatglm-cn.md'
                                                            : 'https://github.com/openai-translator/openai-translator/blob/main/docs/chatglm.md'
                                                    }
                                                    rel='noreferrer'
                                                    style={{
                                                        color: theme.colors.contentSecondary,
                                                    }}
                                                >
                                                    Tutorial
                                                </a>{' '}
                                                {t('to get your API Key.')}
                                            </>
                                        ) : (
                                            <>
                                                <span>{t('Please login to ChatGLM Web')}: </span>
                                                <a
                                                    href='https://chatglm.cn/'
                                                    target='_blank'
                                                    rel='noreferrer'
                                                    style={{
                                                        color: theme.colors.contentSecondary,
                                                    }}
                                                >
                                                    Login
                                                </a>
                                            </>
                                        )}
                                    </div>
                                )}
                    </div>
                </div>
            </div>
            {props.showSettings && (
                <div className={styles.footer}>
                    <Tooltip content={showSettings ? t('Go to Translator') : t('Go to Settings')} placement='right'>
                        <div onClick={() => setShowSettings(!showSettings)}>
                            {showSettings ? <AiOutlineTranslation size={15} /> : <IoSettingsOutline size={15} />}
                        </div>
                    </Tooltip>
                </div>
            )}

            <Modal
                isOpen={!isDesktopApp() && showActionManager}
                onClose={() => {
                    setShowActionManager(false)
                    if (!isDesktopApp()) {
                        refreshActions()
                    }
                }}
                closeable
                size='auto'
                autoFocus
                animate
                role='dialog'
            >
                <ModalHeader>
                    <div
                        style={{
                            padding: 5,
                        }}
                    />
                </ModalHeader>
                <ModalBody>
                    <ActionManager draggable={props.showSettings} />
                </ModalBody>
            </Modal>
            <Modal
                isOpen={isShowMessageCard}
                onClose={() => {
                    toggleMessageCard()
                }}
                closeable
                size='auto'
                autoFocus
                animate
                role='dialog'
            >
                <ModalHeader>
                    <div
                        style={{
                            padding: 5,
                        }}
                    />
                </ModalHeader>
                <ModalBody>
                    <MessageCard />
                </ModalBody>
            </Modal>
            <Modal
                isOpen={showReviewManger}
                onClose={() => {
                    setShowReviewManager(false)
                }}
                closeable
                size='full'
                autoFocus
                animate
                role='dialog'
            >
                <ModalHeader>
                    <div
                        style={{
                            padding: 5,
                        }}
                    />
                </ModalHeader>
                <ModalBody>
                    <ReviewManager />
                </ModalBody>
            </Modal>
            <Toaster />
            <div style={{ display: showYouGlish ? 'block' : 'none' }}>
                <YouGlishComponent
                    query={editableText}
                    triggerYouGlish={showYouGlish}
                    language={LANG_CONFIGS[youglishLang]?.nameEn || 'English'}
                    accent={LANG_CONFIGS[youglishLang]?.accent || 'us'}
                />
            </div>
        </div>
    )
}
