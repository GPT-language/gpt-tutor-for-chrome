import React, { Key, useCallback, useEffect, useLayoutEffect, useMemo, useReducer, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import toast, { Toaster } from 'react-hot-toast'
import { Client as Styletron } from 'styletron-engine-atomic'
import { Provider as StyletronProvider, useStyletron } from 'styletron-react'
import { BaseProvider } from 'baseui-sd'
import { createUseStyles } from 'react-jss'
import { AiOutlineTranslation, AiOutlinePlusSquare, AiOutlineQuestionCircle, AiOutlineStar } from 'react-icons/ai'
import { IoSettingsOutline } from 'react-icons/io5'
import * as mdIcons from 'react-icons/md'
import { getLangConfig, LangCode } from './lang/lang'
import { translate } from '../translate'
import { RxEraser, RxReload, RxSpeakerLoud } from 'react-icons/rx'
import { RiSpeakerFill } from 'react-icons/ri'
import { calculateMaxXY, queryPopupCardElement } from '../../browser-extension/content_script/utils'
import { clsx } from 'clsx'
import { ErrorBoundary } from 'react-error-boundary'
import { ErrorFallback } from '../components/ErrorFallback'
import { defaultAPIURL, isDesktopApp, isTauri } from '../utils'
import { InnerSettings } from './Settings'
import { documentPadding } from '../../browser-extension/content_script/consts'
import Dropzone from 'react-dropzone'
import { addNewNote, isConnected } from '../anki/anki-connect'
import SpeakerMotion from '../components/SpeakerMotion'
import IpLocationNotification from '../components/IpLocationNotification'
import { HighlightInTextarea } from '../highlight-in-textarea'
import LRUCache from 'lru-cache'
import { ISettings, IThemedStyleProps } from '../types'
import { useTheme } from '../hooks/useTheme'
import { speak } from '../tts'
import { Tooltip } from './Tooltip'
import { useSettings } from '../hooks/useSettings'
import { Modal, ModalBody, ModalHeader, ModalFooter, ModalButton } from 'baseui-sd/modal'
import { setupAnalysis } from '../analysis'
import { Action, ActionOutputRenderingFormat, Answer, Word } from '../internal-services/db'
import { CopyButton } from './CopyButton'
import { ActionManager } from './ActionManager'
import 'katex/dist/katex.min.css'
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
import CategorySelector from './CategorySelector'
import MessageCard from './MessageCard'
import { ReviewManager } from './ReviewSettings'
import WordBookViewer from './WordBookViewer'
import { StatefulTooltip } from 'baseui-sd/tooltip'
import { checkForUpdates, getFilenameForLanguage, getLocalData, updateLastCheckedSha } from '../services/github'
import { parseDiff, Diff, Hunk } from 'react-diff-view'
import 'react-diff-view/style/index.css'
import AutocompleteTextarea from './TextArea'
import { isSettingsComplete } from '@/utils/auth'
import { shallow } from 'zustand/shallow'
import TranslationManager from './TranslationManager'
import QuotePreview from './QuotePreview'
import { Notification, KIND } from 'baseui-sd/notification'
import { StyledLink } from 'baseui-sd/link'

const cache = new LRUCache({
    max: 500,
    maxSize: 5000,
    sizeCalculation: (_value, _key) => {
        return 1
    },
})

export const useStyles = createUseStyles({
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
                  'zIndex': 1000,
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
        justifyContent: 'center',
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
        flexDirection: 'row',
        padding: '16px',
        gap: '10px',
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
        marginTop: '20px',
        marginRight: 'auto',
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
        setActions,
        words,
        setAction,
        isShowMessageCard,
        toggleMessageCard,
        showActionManager,
        setShowActionManager,
        showSettings,
        setShowSettings,
        actionStr,
        setActionStr,
        showWordBookManager,
        setShowWordBookManager,
        showReviewManager,
        setShowReviewManager,
        answers,
        setAnswers,
        selectedGroup,
        messageId,
        conversationId,
        updateWordAnswer,
        addWordToFile,
        actions,
        chatUser,
        setUser,
    } = useChatStore()
    const [refreshActionsFlag, refreshActions] = useReducer((x: number) => x + 1, 0)

    const [answerFlag, forceTranslate] = useReducer((x: number) => x + 1, 0)

    const editorRef = useRef<HTMLTextAreaElement>(null)
    const highlightRef = useRef<HighlightInTextarea | null>(null)
    const { t, i18n } = useTranslation()
    const { settings } = useSettings()
    const settingsRef = useRef(settings)
    const [finalText, setFinalText] = useState('')
    const [quoteText, setQuoteText] = useState('')
    const [selectedActions, setSelectedActions] = useState<Action[]>([])
    const [showFullQuoteText, setShowFullQuoteText] = useState(false)

    useEffect(() => {
        settingsRef.current = settings
    }, [settings])

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

    const [displayedActions, setDisplayedActions] = useState<Action[]>([])
    const [hiddenActions, setHiddenActions] = useState<Action[]>([])
    const [displayedActionsMaxCount, setDisplayedActionsMaxCount] = useState(6)

    useEffect(() => {
        refreshActions()
    }, [])

    useEffect(() => {
        if (!settings?.i18n) return
    
        const loadLanguageData = async () => {
            let languageCode = settings.i18n
            console.log('Loading language data for:', languageCode)
    
            const lastLoadedLanguage = localStorage.getItem('lastLoadedLanguage')
    
            const githubToken = import.meta.env.VITE_REACT_APP_GITHUB_TOKEN
            const baseUrl = 'https://api.github.com/repos/GPT-language/gpt-tutor-resources/contents/default'
            const headers = {
                Authorization: `token ${githubToken}`,
                Accept: 'application/vnd.github.v3.raw',
            }
            const isActionExist = actions.length > 0 ? true : false
    
            const filename = getFilenameForLanguage(languageCode || 'en')
    
            try {
                if (lastLoadedLanguage === languageCode && isActionExist) {
                    console.log('Language data already loaded')
                    return
                }
    
                // 创建一个新的数组，只包含非 'built-in' 和 'Free to ask' 模式的 action
                const filteredActions = actions.filter(action => action.mode !== 'built-in' && action.mode !== "Free to ask")
                console.log('Filtered out built-in actions')
    
                let remoteData
                let latestSha
                try {
                    // 获取文件内容
                    const contentResponse = await fetch(`${baseUrl}/${filename}`, { headers })
                    if (!contentResponse.ok) {
                        throw new Error(`HTTP error! status: ${contentResponse.status}`)
                    }
                    remoteData = await contentResponse.json()
    
                    // 获取最新的 commit SHA
                    const commitsResponse = await fetch(
                        `https://api.github.com/repos/GPT-language/gpt-tutor-resources/commits?path=default/${filename}&per_page=1`,
                        { headers }
                    )
                    if (!commitsResponse.ok) {
                        throw new Error(`HTTP error! status: ${commitsResponse.status}`)
                    }
                    const commits = await commitsResponse.json()
                    latestSha = commits[0].sha
                } catch (error) {
                    console.warn('Failed to fetch data from GitHub, using local data instead:', error)
                    if (!languageCode) {
                        languageCode = 'en'
                    }
                    remoteData = getLocalData(languageCode)
                }
    
                // 创建一个新的数组，包含过滤后的 actions 和远程数据
                const newActions = [...filteredActions, ...remoteData]
    
                // 更新 actions
                setActions(newActions)
    
                // 更新最后加载的语言、时间和 SHA
                localStorage.setItem('lastLoadedLanguage', languageCode || 'en')
                localStorage.setItem(`${languageCode}_last_check_time`, Date.now().toString())
                if (latestSha && languageCode) {
                    updateLastCheckedSha(languageCode, latestSha)
                }
    
                console.log('Language data loaded and updated successfully')
                refreshActions()
            } catch (error) {
                console.error('Error loading language data:', error)
            }
        }
    
        loadLanguageData()
    }, [settings?.i18n, actions, setActions, refreshActions])

    // 检查功能更新

    const handleCheckForUpdates = async () => {
        if (!settings?.i18n) return
        const languageCode = settings.i18n
        const lastCheckedSha = localStorage.getItem(`${languageCode}_last_checked_sha`)

        // 如果没有存储 SHA，说明是初次加载，直接返回
        if (!lastCheckedSha) {
            console.log('Initial load, skipping update check')
            return
        }

        const now = Date.now()
        const lastCheckTime = parseInt(localStorage.getItem(`${settings.i18n}_last_check_time`) || '0', 10)
        const timeSinceLastCheck = now - lastCheckTime
        const checkInterval = 24 * 60 * 60 * 1000 // 24小时，以毫秒为单位

        if (timeSinceLastCheck < checkInterval) {
            console.log('Too soon to check for updates')
            return
        }

        const result = await checkForUpdates(settings.i18n)
        if (result && result.latestSha !== lastCheckedSha) {
            setUpdateContent(result.updatedContent)
            setLatestCommitSha(result.latestSha)
            setShowUpdateModal(true)
        } else {
            console.log('No new updates available')
            // 即使没有更新，也更新最后检查时间
            updateLastCheckedSha(settings.i18n, lastCheckedSha || '')
        }
    }

    const handleUpdate = async () => {
        if (!settings?.i18n) {
            console.log('未找到i18n设置，更新过程已终止。')
            return
        }

        try {
            const languageCode = settings.i18n
            const filename = getFilenameForLanguage(languageCode)
            const baseUrl = 'https://api.github.com/repos/GPT-language/gpt-tutor-resources/contents/default'
            const headers = {
                Authorization: `token ${import.meta.env.VITE_REACT_APP_GITHUB_TOKEN}`,
                Accept: 'application/vnd.github.v3.raw',
            }

            toast(t('Updating...'))

            let remoteData: Action[]
            try {
                const response = await fetch(`${baseUrl}/${filename}`, { headers })
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`)
                }
                remoteData = await response.json()
            } catch (error) {
                console.warn('从GitHub获取数据失败，使用本地数据代替:', error)
                remoteData = getLocalData(languageCode)
            }

            // 删除所有 mode 为 'built-in' 和 'Free to ask' 的 action，以免重复
            actions.forEach((action) => {
                if (action.mode === 'built-in' || action.mode === "Free to ask") {
                    actions.splice(actions.indexOf(action), 1)
                }
            })
            // 使用 bulkPut 更新所有数据
            actions.push(...remoteData)

            if (latestCommitSha) {
                updateLastCheckedSha(languageCode, latestCommitSha)
            }

            refreshActions()
            setShowUpdateModal(false)
            toast.success(t('Update Success'))
        } catch (error) {
            toast(t('Update Failed'))
            console.error('更新数据时出错:', error)
            // setErrorMessage('更新失败，请稍后重试');
        }
    }

    const handleSkipUpdate = () => {
        if (settings?.i18n && latestCommitSha) {
            updateLastCheckedSha(settings.i18n, latestCommitSha)
        }
        setShowUpdateModal(false)
    }


    useEffect(() => {
        if (!settings?.i18n) return

        handleCheckForUpdates()

        const checkForUpdatesInterval = setInterval(handleCheckForUpdates, 24 * 60 * 60 * 1000) // 每24小时检查一次

        return () => clearInterval(checkForUpdatesInterval)
    }, [settings?.i18n])

    useEffect(() => {
        console.log('actions is exist？', actions)
        if (actions) {
            console.log('actions', actions)
            setActions(actions)
        }
    }, [actions, setActions])


    useEffect(() => {
        // eslint-disable-next-line react-hooks/exhaustive-deps
        if (!actions) {
            console.log('no actions')
            setDisplayedActions([])
            setHiddenActions([])
            return
        }

        const filteredActions = actions.filter((action) => {
            if (action.groups && action.groups.length > 0) {
                return action.groups.includes(selectedGroup)
            }
            return []
        })

        setSelectedActions(filteredActions)

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
    }, [actions, selectedGroup, activateAction, displayedActionsMaxCount, refreshActionsFlag, setActions])

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
                setQuoteText(text)
            }
        }

        chrome.runtime.onMessage.addListener(handleRuntimeMessage)

        // 清理函数
        return () => {
            chrome.runtime.onMessage.removeListener(handleRuntimeMessage)
        }
    }, [quoteText, props.text, props.uuid, selectedWord])

    const { theme, themeType } = useTheme()
    const styles = useStyles({ theme, themeType, isDesktopApp: isDesktopApp() })
    const [isLoading, setIsLoading] = useState(false)
    const [newYouGlish, setNewYouGlish] = useState(false)
    const [showYouGlish, setShowYouGlish] = useState(false)
    const [showAnkiNote, setShowAnkiNote] = useState(false)
    const [selectWordIdx, setSelectWordIdx] = useState(0)
    const [isSpeakingEditableText, setIsSpeakingEditableText] = useState(false)
    const [translatedText, setTranslatedText] = useState('')
    const [translatedLines, setTranslatedLines] = useState<string[]>([])
    const [engine, setEngine] = useState<IEngine | undefined>(undefined)
    const [activeKey, setActiveKey] = useState<Key | null>(null)
    const [parentAction, setParentAction] = useState<Action | undefined>(undefined)
    const [showUpdateModal, setShowUpdateModal] = useState(false)
    const [latestCommitSha, setLatestCommitSha] = useState<string | null>(null)
    const [updateContent, setUpdateContent] = useState<Record<string, any>>({})
    const [isOpenToAsk, setIsOpenToAsk] = useState(true)
    const lastModifiedRef = useRef<string | null>(null)
    const isSettingComplete = isSettingsComplete(settings, props.defaultShowSettings)

    const handleAccordionChange = (expanded: Array<React.Key>) => {
        setActiveKey(expanded.length > 0 ? expanded[0] : null)
    }

    const handTextParserClick = (word: string, originalSentence: string) => {
        const text = originalSentence + ',请解释以上句子中的' + word
        setEditableText(text)
    }

    const handleActionClick = async (action: Action | undefined, assistantActionText?: string) => {
        if (!action) {
            return
        }

        if (!selectedWord) {
            setFinalText(editableText)
        } else {
            setFinalText(selectedWord.text)
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

    // 1. 检查是否完成设置
    // 2. 如果没有完成设置，检查用户信息（是否订阅，是否足够积分）
    // 3.如果积分不足，跳转到pricing页面
    // 4. 翻译

    const handleSubmit = useCallback(
        async (e?: React.FormEvent) => {
            if (e) {
                e.preventDefault()
                e.stopPropagation()
            }

            forceTranslate()
        },
        [activateAction, forceTranslate]
    )

    // 如果没有设置activateAction，则设置为开放提问
    useEffect(() => {
        if (!activateAction) {
            setIsOpenToAsk(true)
        } else {
            setIsOpenToAsk(false)
        }
    }, [activateAction])

    // 重新打开时设置选择的动作和文本都为空
    useEffect(() => {
        if (isOpenToAsk) {
            setAction(undefined)
            setEditableText('')
            setFinalText('')
        }
    }, [])

    useEffect(() => {
        if (!settingsRef.current) {
            return
        }
        let engineProvider
        if (activateAction && activateAction.model) {
            const [provider, modelName] = activateAction.model.split('&')
            engineProvider = provider as Provider
        } else {
            engineProvider = settingsRef.current.provider
        }
        const engine = getEngine(engineProvider)
        setEngine(engine)
    }, [settingsRef.current?.provider, activateAction])

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
    const [sourceLang, setSourceLang] = useState<LangCode[]>(['en'])
    const [targetLang, setTargetLang] = useState<LangCode>('en')
    const [youglishLang, setYouglishLang] = useState<LangCode>('en')
    const [ActivatedActionName, setActivatedActionName] = useState('')
    const settingsIsUndefined = settings === undefined
    const [showTextParser, setShowTextParser] = useState(false)
    const [jsonText, setjsonText] = useState('')
    const { editableText, setEditableText } = useChatStore(
        (state) => ({
            editableText: state.editableText,
            setEditableText: state.setEditableText,
        }),
        shallow
    )

    // 设置语言
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
                    return settings.defaultSourceLanguage as LangCode[]
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
        editor.dir = getLangConfig(sourceLang[0]).direction
    }, [sourceLang, actionStr])

    const translatedLanguageDirection = useMemo(() => getLangConfig(sourceLang[0]).direction, [sourceLang[0]])

    const addToAnki = async (deckname: string, front: string, back: string) => {
        const connected = await isConnected()

        if (connected) {
            try {
                await addNewNote(deckname, front, back)
                toast.success(t('Added to review'))
            } catch (error) {
                console.error('Error adding note:', error)
                toast.error(`Error: ${error}`)
            }
        } else {
            console.debug('Anki Not connected')
            setShowAnkiNote(true)
            toast.error('Anki Not connected', { duration: 5000 })
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
        const newText = quoteText || editableText || selectedWord?.text || ''
        setFinalText(newText)
    }, [quoteText, editableText, selectedWord])

    const finalTextRef = useRef(finalText)

    useEffect(() => {
        finalTextRef.current = finalText
    }, [finalText])

    const translateText = useCallback(
        async (text: string, signal: AbortSignal, actionName?: string) => {
            let fileId: number
            let wordIdx: number
            const historyFileName = t('History')
            if (!text) {
                return
            }
            if (text !== selectedWord?.text) {
                const word: Word = { idx: 0, text: text, reviewCount: 0, answers: {} }
                const result = await addWordToFile(word, historyFileName)
                if (result) {
                    fileId = result.fileId
                    wordIdx = result.wordIdx
                } else {
                    console.error('Failed to add word to history file')
                    return // 如果添加失败，可能需要提前返回或采取其他措施
                }
            } else {
                fileId = currentFileId || 0
                wordIdx = selectedWord?.idx || 0
            }

            // 确保 fileId 和 wordIdx 都是有效的
            if (!fileId || !wordIdx) {
                console.error('Invalid fileId or wordIdx', { fileId, wordIdx })
                return // 如果 fileId 或 wordIdx 无效，提前返回
            }

            if (actionName) {
                setActivatedActionName(actionName)
                setActiveKey(actionName)
            } else {
                setActiveKey(t('Open Question'))
                setActivatedActionName('Open Question')
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
            const cachedKey = `translate:${settings?.provider ?? ''}:${settings?.apiModel ?? ''}:${text}:${answerFlag}`
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
                        activateAction: activateAction ? activateAction : undefined,
                        parentAction: parentAction,
                        detectFrom: sourceLang[0],
                        detectTo: targetLang,
                        context: quoteText,
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
                                if (activateAction?.outputRenderingFormat === 'json' && !showTextParser) {
                                    setShowTextParser(true)
                                }
                                const newTranslatedText = message.isFullText
                                    ? message.content
                                    : translatedText + message.content

                                const actionName =
                                    useChatStore.getState().activateAction?.name ||
                                    t('Open Question') ||
                                    'Open Question'
                                if (actionName) {
                                    // 更新 answers
                                    const newAnswers = {
                                        ...answers,
                                        [actionName]: {
                                            text: newTranslatedText,
                                            format: activateAction?.outputRenderingFormat || 'markdown',
                                        },
                                    }
                                    setAnswers(newAnswers)
                                }

                                return newTranslatedText
                            })
                        },
                        onFinish: (reason) => {
                            afterTranslate(reason)
                            setTranslatedText((translatedText) => {
                                const result = translatedText
                                cache.set(cachedKey, result)
                                const actionName =
                                    useChatStore.getState().activateAction?.name ||
                                    t('Open Question') ||
                                    'Open Question'
                                if (messageId && conversationId) {
                                    updateWordAnswer(
                                        fileId,
                                        wordIdx,
                                        actionName,
                                        result,
                                        activateAction?.outputRenderingFormat || 'markdown',
                                        messageId,
                                        conversationId
                                    )
                                } else {
                                    updateWordAnswer(
                                        fileId,
                                        wordIdx,
                                        actionName,
                                        result,
                                        activateAction?.outputRenderingFormat || 'markdown'
                                    )
                                }

                                return result
                            })
                        },
                        onError: (error:any) => {
                            if (error && typeof error === 'object') {
                                console.log('忽略空对象错误')
                                return
                            }                
                            setActionStr('Error')
                            console.log('error in translateText:', error)
                            if (settings?.provider === 'Subscribe' && error && typeof error === 'object') {
                                setIsNotLogin(true)
                                setErrorMessage(t('余额不足或者时间到期，请在one-api中进行充值和设置') || '余额不足或者时间到期，请在one-api中进行充值和设置')
                            } else {
                                setErrorMessage(error.toString())
                            }
                        },
                    },
                    engine,
                    isOpenToAsk
                )
            } catch (error: any) {
                if (error.name === 'AbortError') {
                    isStopped = true
                    return
                }
                if (error && typeof error === 'object') {
                    console.log('忽略空对象错误')
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
        [settings?.provider, settings?.apiModel, answerFlag, startLoading, stopLoading, updateWordAnswer,]
    )

    useEffect(() => {
        if (answers[t('Sentence analysis')]) {
            setShowTextParser(true)
            if (translatedText) {
                setjsonText(translatedText)
            }

            if (answers[t('Sentence analysis')]) {
                setjsonText(answers[t('Sentence analysis')].text)
            }
        } else {
            setShowTextParser(false)
            setjsonText('')
        }
    }, [translatedText, t, activateAction?.name, answers, selectedWord])

    useEffect(() => {
        const controller = new AbortController()
        const { signal } = controller
        translateText(finalTextRef.current, signal)
        return () => {
            controller.abort()
        }
    }, [translateText])

    useEffect(() => {
        if (!props.defaultShowSettings) {
            return
        }
        if (settings && (settings.provider === 'ChatGLM' || settings.provider === 'Kimi')) {
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
            text: quoteText || editableText || finalText,
            lang: sourceLang[0],
            onFinish: () => setIsSpeakingEditableText(false),
        })
        editableStopSpeakRef.current = stopSpeak
    }

    const handlesetEditableText = (text: string) => {
        // 如果text以@开头，为选择动作而不是输入文本，不修改editableText
        if (text.includes('@')) {
            console.log('Choose action')
            return
        }
        if (selectedWord && text !== selectedWord.text) {
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

    function formatPatchForParseDiff(filename: string, patch: string): string {
        const header = `diff --git a/${filename} b/${filename}\n--- a/${filename}\n+++ b/${filename}\n`
        return header + patch
    }

    const DiffView: React.FC<{ filename: string; patch: string }> = ({ filename, patch }) => {
        const [css] = useStyletron()
        let files

        try {
            const formattedPatch = formatPatchForParseDiff(filename, patch)
            files = parseDiff(formattedPatch)
        } catch (error) {
            console.error('Error parsing diff:', error)
            return <div>Error parsing diff. Please check the console for details.</div>
        }

        if (!files || files.length === 0) {
            return <div>No changes detected in the diff.</div>
        }

        return (
            <div
                className={css({
                    fontSize: '12px',
                    fontFamily: 'monospace',
                    backgroundColor: '#f0f0f0',
                    padding: '10px',
                    borderRadius: '4px',
                })}
            >
                {files.map((file) => (
                    <Diff key={file.oldPath + file.newPath} viewType='unified' diffType={file.type} hunks={file.hunks}>
                        {(hunks) => hunks.map((hunk) => <Hunk key={hunk.content} hunk={hunk} />)}
                    </Diff>
                ))}
            </div>
        )
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
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                        <CategorySelector />
                        <div className={styles.popupCardContentContainer}>
                            {settings?.apiURL === defaultAPIURL && (
                                <div>
                                    <IpLocationNotification showSettings={showSettings} />
                                </div>
                            )}
                            <div
                                ref={editorContainerRef}
                                className={styles.popupCardEditorContainer}
                                style={{ display: 'block' }}
                            >
                                {quoteText && !showFullQuoteText && (
                                    <QuotePreview
                                        text={quoteText}
                                        onShowMore={() => {
                                            setShowFullQuoteText(true)
                                        }}
                                        onClose={() => {
                                            setQuoteText('')
                                        }}
                                        previewLength={200}
                                    />
                                )}
                                <div style={{ display: 'flex', flexDirection: 'row', height: '100%' }}>
                                    <WordListUploader />
                                    {showFullQuoteText ? null : (
                                        <AutocompleteTextarea
                                            selectedActions={selectedActions}
                                            isSettingComplete={isSettingComplete}
                                            onActionSelect={setAction}
                                            onChange={handlesetEditableText}
                                            onSubmit={handleSubmit}
                                        />
                                    )}
                                </div>
                                {showFullQuoteText ? null : (
                                    <div className={styles.actionButtonsContainer}>
                                        <div style={{ marginLeft: 'auto' }}></div>
                                        {!!editableText.length && (
                                            <>
                                                <Tooltip content={t('Speak')} placement='bottom'>
                                                    <div
                                                        className={styles.actionButton}
                                                        onClick={handleEditSpeakAction}
                                                    >
                                                        {isSpeakingEditableText ? (
                                                            <SpeakerMotion />
                                                        ) : (
                                                            <RxSpeakerLoud size={15} />
                                                        )}
                                                    </div>
                                                </Tooltip>
                                                <Tooltip content={t('On/Off Youglish')} placement='bottom'>
                                                    <div
                                                        className={styles.actionButton}
                                                        onClick={handleYouglishSpeakAction}
                                                    >
                                                        (
                                                        <RiSpeakerFill size={15} />)
                                                    </div>
                                                </Tooltip>
                                                <Tooltip content={t('Copy to clipboard')} placement='bottom'>
                                                    <div className={styles.actionButton}>
                                                        <CopyButton text={editableText} styles={styles}></CopyButton>
                                                    </div>
                                                </Tooltip>
                                                <Tooltip
                                                    content={t('Clear input and selected function')}
                                                    placement='bottom'
                                                >
                                                    <div
                                                        className={styles.actionButton}
                                                        onClick={() => {
                                                            setEditableText('')
                                                            setAction(undefined)
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
                                )}
                                {selectedWord?.text !== '' && (
                                    <div
                                        className={styles.popupCardTranslatedContainer}
                                        dir={translatedLanguageDirection}
                                    >
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
                                                    <div
                                                        onClick={() => forceTranslate()}
                                                        className={styles.actionButton}
                                                    >
                                                        <RxReload size={15} />
                                                    </div>
                                                </Tooltip>
                                            </div>
                                        ) : (
                                            <div
                                                style={{
                                                    marginTop: '20px',
                                                    width: '100%',
                                                }}
                                            >
                                                <div
                                                    ref={translatedContentRef}
                                                    className={styles.popupCardTranslatedContentContainer}
                                                >
                                                    <div style={{ width: '100%' }}>
                                                        {showTextParser ? (
                                                            <TextParser
                                                                jsonContent={jsonText}
                                                                setOriginalText={handTextParserClick}
                                                            ></TextParser>
                                                        ) : null}
                                                        <>
                                                            <TranslationManager
                                                                isLoading={isLoading}
                                                                isSpeakingTranslatedText={isSpeakingTranslatedText}
                                                                styles={styles}
                                                                showFullQuoteText={showFullQuoteText}
                                                                forceTranslate={forceTranslate}
                                                                handleTranslatedSpeakAction={
                                                                    handleTranslatedSpeakAction
                                                                }
                                                                messageId={messageId}
                                                                conversationId={conversationId}
                                                                finalText={finalText}
                                                                quoteText={quoteText}
                                                                engine={engine}
                                                                addToAnki={addToAnki}
                                                            />
                                                        </>
                                                    </div>
                                                </div>
                                                <div>
                                                    <ActionList onActionClick={handleActionClick} />
                                                </div>
                                                <Dropzone noClick={true}>
                                                    {({ getRootProps }) => (
                                                        <div
                                                            {...getRootProps()}
                                                            style={{
                                                                flex: 1,
                                                                display: 'flex',
                                                                flexDirection: 'column',
                                                            }}
                                                        >
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
                                                            </div>
                                                        </div>
                                                    )}
                                                </Dropzone>
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
                                    </div>
                                )}
                                {isNotLogin && settings?.provider === 'ChatGLM' && (
                                    <div
                                        style={{
                                            fontSize: '12px',
                                            color: theme.colors.contentPrimary,
                                        }}
                                    >
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
                                    </div>
                                )}
                                {isNotLogin && settings?.provider === 'Subscribe' && (
                                    <div
                                        style={{
                                            fontSize: '12px',
                                            color: theme.colors.contentPrimary,
                                        }}
                                    >
                                        <>
                                            <span>{t('打开one-api进行充值')}: </span>
                                            <a
                                                href='https://tutor-chatgpt.zeabur.app/login'
                                                target='_blank'
                                                rel='noreferrer'
                                                style={{
                                                    color: theme.colors.contentSecondary,
                                                }}
                                            >
                                                Login
                                            </a>
                                        </>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
                <div className={styles.footer}>
                    <Tooltip content={showSettings ? t('Go to Translator') : t('Go to Settings')} placement='right'>
                        <div onClick={() => setShowSettings(!showSettings)}>
                            {showSettings ? <AiOutlineTranslation size={15} /> : <IoSettingsOutline size={15} />}
                        </div>
                    </Tooltip>
                </div>

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
            <Modal onClose={() => setShowUpdateModal(false)} isOpen={showUpdateModal}>
                <ModalHeader>更新可用</ModalHeader>
                <ModalBody>
                    <h3>{t('There is a new update available. Please check the changes below.')}</h3>
                    <div style={{ maxHeight: '300px', overflow: 'auto' }}>
                        {Object.entries(updateContent).map(([filename, content]) => (
                            <div key={filename}>
                                {content && content.patch ? (
                                    <DiffView filename={filename} patch={content.patch} />
                                ) : (
                                    <p>{t('Unable to display the update content for this file')}</p>
                                )}
                            </div>
                        ))}
                    </div>
                </ModalBody>
                <ModalFooter>
                    <ModalButton kind='tertiary' onClick={handleSkipUpdate}>
                        {t('Skip this update')}
                    </ModalButton>
                    <ModalButton onClick={handleUpdate}>{t('Update')}</ModalButton>
                </ModalFooter>
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
                isOpen={showReviewManager}
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
            <Modal
                isOpen={showWordBookManager}
                onClose={() => {
                    setShowWordBookManager(false)
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
                    <WordBookViewer />
                </ModalBody>
            </Modal>
            <Toaster />

            {showYouGlish && (
                <div>
                    <YouGlishComponent
                        query={finalText}
                        triggerYouGlish={showYouGlish}
                        language={LANG_CONFIGS[youglishLang]?.nameEn || 'English'}
                        accent={LANG_CONFIGS[youglishLang]?.accent || 'us'}
                    />
                </div>
            )}
            {showAnkiNote && (
                <Notification kind={KIND.warning} closeable onClose={() => setShowAnkiNote(false)}>
                    {() => (
                        <>
                            {t('Not connected to Anki!')}
                            <StyledLink
                                href='https://www.tutorchatgpt.com/docs/settings#anki%E8%AE%BE%E7%BD%AE'
                                target='_blank'
                                rel='noopener noreferrer'
                            >
                                {t('Click here to learn how to set up Anki')}
                            </StyledLink>
                        </>
                    )}
                </Notification>
            )}
        </div>
    )
}
