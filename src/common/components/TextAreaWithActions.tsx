import React, { useState, useRef, useEffect, useMemo } from 'react'
import { Theme, useStyletron } from 'baseui-sd'
import { StatefulMenu } from 'baseui-sd/menu'
import { Action } from '../internal-services/db'
import { Button } from 'baseui-sd/button'
import { IoIosRocket, IoIosArrowUp, IoIosInformationCircle } from 'react-icons/io'
import { useTranslation } from 'react-i18next'
import { useChatStore } from '@/store/file/store'
import { LabelSmall } from 'baseui-sd/typography'
import { IoClose } from 'react-icons/io5'
import { FaArrowUp } from 'react-icons/fa'
import { ChatMessage } from '@/store/file/slices/chat/initialState'

interface AutocompleteTextareaProps {
    // 1. 增加更多可配置的属性
    editableText: string
    placeholder?: string // 占位符文本
    minHeight?: string // 最小高度
    maxHeight?: string // 最大高度
    backgroundColor?: string // 背景颜色
    showSubmitButton?: boolean // 是否显示提交按钮
    showClearButton?: boolean // 是否显示清除按钮
    submitButtonText?: string // 提交按钮文本
    clearButtonText?: string // 清除按钮文本
    disabled?: boolean // 是否禁用
    paragraph?: string // 当前段落

    // 2. 回调函数
    onChange: (text: string) => void
    onSubmit?: () => void // 设为可选
    onClear?: () => void // 清空回调
    onFocus?: () => void // 获得焦点回调
    onBlur?: () => void // 失去焦点回调
}

// 3. 提取默认值
const DEFAULT_MIN_HEIGHT = '40px'
const DEFAULT_BG_COLOR = '#f5f5f5'
const DEFAULT_PADDING = '8px'

// 1. 提取样式常量
const TEXTAREA_STYLES = {
    border: '1px solid rgba(0, 0, 0, 0.15)',
    borderRadius: '8px',
    padding: '12px 16px',
    minHeight: '48px',
    transition: 'all 0.2s ease',
    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
} as const


const TextareaWithActions: React.FC<AutocompleteTextareaProps> = ({
    editableText,
    placeholder = '',
    minHeight = DEFAULT_MIN_HEIGHT,
    maxHeight,
    backgroundColor = DEFAULT_BG_COLOR,
    showSubmitButton = true,
    disabled = false,
    onChange,
    onSubmit,
    onClear,
    onFocus,
    onBlur,
}) => {
    const [css] = useStyletron()
    const [showActionMenu, setShowActionMenu] = useState(false)
    const [showGroupMenu, setShowGroupMenu] = useState(false)
    const [groupSearchTerm, setGroupSearchTerm] = useState('')
    const {
        selectedActions,
        activateAction,
        setEditableText,
        setAction,
        actionGroups,
        selectedGroup,
        setSelectedGroup,
        settings,
        updateSettings,
        showConversationMenu,
        setShowConversationMenu,
        availableConversations,
        setAvailableConversations,
        setCurrentConversationKey,
        generateNewConversationKey,
        answers,
    } = useChatStore()
    const [searchTerm, setSearchTerm] = useState('')
    const [filteredActions, setFilteredActions] = useState<Action[]>([])
    const editorRef = useRef<HTMLDivElement>(null)
    const actionMenuRef = useRef<HTMLElement>(null)
    const groupMenuRef = useRef<HTMLElement>(null)
    const { t } = useTranslation()
    const actionTagRef = useRef<HTMLSpanElement>(null)
    const groupTagRef = useRef<HTMLSpanElement>(null)
    const [isComposing, setIsComposing] = useState(false) // 添加输入法编辑状态
    const learningLang = settings.defaultLearningLanguage
    const userLang = settings.defaultUserLanguage

    const handleHideInputTip = () => {
        updateSettings({
            ...settings,
            hideInputTip: true,
        })
    }

    const handleHideEmptyActionsTip = () => {
        updateSettings({
            ...settings,
            hideEmptyActionsTip: true,
        })
    }

    // 获取所有可用的 groups
    const availableGroups = useMemo(() => {
        return Object.keys(actionGroups).map((group) => ({
            name: group,
            id: group,
        }))
    }, [actionGroups])

    // 过滤 groups
    const filteredGroups = useMemo(() => {
        if (!groupSearchTerm) return availableGroups
        return availableGroups.filter((group) => group.name.toLowerCase().includes(groupSearchTerm.toLowerCase()))
    }, [availableGroups, groupSearchTerm])

    const handleSetEditableText = async (text: string) => {
        // 去除首尾空格
        const trimmedText = text.trim()

        // 如果去除空格后的文本与当前 editableText 相同，则不任何操作
        if (trimmedText === editableText?.trim()) {
            return
        }

        // 如果text以@开头，为选择动作而不是输入文本，不修改editableText
        if (trimmedText.startsWith('@') || trimmedText.startsWith('/')) {
            console.log('Choose action')
            return
        }

        // 设置新的editableText，保留原始的空格
        onChange(text)
    }

    const handleClear = () => {
        if (editorRef.current) {
            editorRef.current.innerHTML = ''
        }

        if (editableText) {
            setEditableText('')
        }

        if (activateAction) {
            setAction(undefined)
        }
    }

    useEffect(() => {
        // 如果正在使用输入法输入，不触发防抖更新
        if (isComposing) {
            return
        }

        // 创建防抖定时器
        const debounceTimer = setTimeout(() => {
            if (!editorRef.current) return
            console.log('Updating text with debounce:', editableText)

            // 保存现有的 tags
            const existingActionTag = Array.from(editorRef.current.children).find(
                (child) => child instanceof HTMLElement && child.hasAttribute('data-action-id')
            ) as HTMLElement | undefined

            const existingGroupTag = Array.from(editorRef.current.children).find(
                (child) => child instanceof HTMLElement && child.hasAttribute('data-group-name')
            ) as HTMLElement | undefined

            // 清空当前内容
            editorRef.current.innerHTML = ''

            // 按顺序重新插入元素：group tag、空格、action tag、新文本
            if (existingGroupTag) {
                editorRef.current.appendChild(existingGroupTag)
                editorRef.current.appendChild(document.createTextNode(' '))
            }

            if (existingActionTag) {
                editorRef.current.appendChild(existingActionTag)
                editorRef.current.appendChild(document.createTextNode(' '))
            }

            // 添加新的文本内容
            editorRef.current.appendChild(document.createTextNode(editableText || ''))

            // 触发 onChange 回调
            onChange(editableText)

            // 将光标移到文本末尾
            const selection = window.getSelection()
            const range = document.createRange()
            range.selectNodeContents(editorRef.current)
            range.collapse(false)
            selection?.removeAllRanges()
            selection?.addRange(range)
        }, 300) //

        // 清理定时器
        return () => {
            clearTimeout(debounceTimer)
        }
    }, [editableText, onChange, isComposing])

    useEffect(() => {
        if (searchTerm) {
            const filtered = selectedActions.filter((action) => action.name.includes(searchTerm))
            setFilteredActions(filtered)
        } else {
            setFilteredActions(selectedActions)
        }
    }, [searchTerm, selectedActions])

    const getTextWithoutMentions = (text: string) => {
        if (editorRef.current) {
            // 获取纯文本内容，忽略 action tags
            const textNodes = Array.from(editorRef.current.childNodes)
                .filter((node) => node.nodeType === Node.TEXT_NODE)
                .map((node) => node.textContent)
                .join('')
            return textNodes.trim()
        }
        return text.trim()
    }

    const handleInput = () => {
        if (editorRef.current) {
            const text = editorRef.current.innerText
            const selection = window.getSelection()
            if (selection && selection.rangeCount > 0) {
                const range = selection.getRangeAt(0)
                const preCaretRange = range.cloneRange()
                preCaretRange.selectNodeContents(editorRef.current)
                preCaretRange.setEnd(range.endContainer, range.endOffset)
                const caretOffset = preCaretRange.toString().length

                // 检查@符号
                const lastAtIndex = text.lastIndexOf('@', caretOffset)
                if (lastAtIndex !== -1 && caretOffset - lastAtIndex <= 20) {
                    setShowActionMenu(true)
                }

                // 检查/符号
                const lastSlashIndex = text.lastIndexOf('#', caretOffset)
                if (lastSlashIndex !== -1 && caretOffset - lastSlashIndex <= 20) {
                    setShowGroupMenu(true)
                }

                // 检查 "~" 符号
                const lastGreaterThanIndex = text.lastIndexOf('~', caretOffset)
                if (lastGreaterThanIndex !== -1 && caretOffset - lastGreaterThanIndex <= 20) {
                    // 准备对话列表
                    const conversations = Object.entries(answers || {}).map(([key, value]) => ({
                        key,
                        messages: value.conversationMessages || [],
                    }))
                    setAvailableConversations(conversations)
                    setShowConversationMenu(true)
                } else {
                    setShowConversationMenu(false)
                }
            }

            handleSetEditableText(getTextWithoutMentions(text))
        }
    }

    const cleanupText = () => {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const textNodes = Array.from(editorRef.current!.childNodes).filter(
            (node) => node.nodeType === Node.TEXT_NODE
        ) as Text[]

        textNodes.forEach((textNode) => {
            // 替换文本节点中的 @或者/ 符号及其后面的文本，直到遇到空格或标点
            const newText =
                textNode.textContent?.replace(/@\S+/g, '').replace(/\/\S+/g, '').replace(/@/g, '').replace(/\//g, '') ||
                ''

            // 清理可留下的多余空格
            textNode.textContent = newText.replace(/\s+/g, ' ')
        })
    }

    const handleActionSelect = async (action: Action) => {
        setAction(action)
        setSearchTerm('')
        if (editorRef.current) {
            const selection = window.getSelection()
            if (selection && selection.rangeCount > 0) {
                // 检查是否已存在 action tag
                const existingActionTag = Array.from(editorRef.current.children).find(
                    (child) => child instanceof HTMLElement && child.hasAttribute('data-action-id')
                ) as HTMLElement | undefined

                if (existingActionTag) {
                    // 如果存在 action tag，直接更新内容和属性
                    existingActionTag.setAttribute('data-action-id', action.id?.toString() || '')
                    existingActionTag.textContent = `@${action.name}`
                } else {
                    // 如果不存在，创建新的 action tag
                    if (actionTagRef.current) {
                        // 使用预设的 actionTag
                        actionTagRef.current.style.display = 'inline-block'
                        actionTagRef.current.setAttribute('data-action-id', action.id?.toString() || '')
                        actionTagRef.current.textContent = `@${action.name}`

                        // 插入空格
                        const space = document.createTextNode(' ')
                        editorRef.current.appendChild(space)

                        // 将光标移动到标签后面
                        const newRange = document.createRange()
                        newRange.setStartAfter(space)
                        newRange.setEndAfter(space)
                        selection.removeAllRanges()
                        selection.addRange(newRange)
                    }
                }
            }

            // 在所有 action tag 处理完成后执行清理
            cleanupText()
        }
        setShowActionMenu(false)
        handleInput()
        // 自动聚焦
        editorRef.current?.focus()
    }

    const handleGroupSelect = (group: { name: string }) => {
        setSelectedGroup(group.name)
        setGroupSearchTerm('')
        if (editorRef.current) {
            const selection = window.getSelection()
            if (selection && selection.rangeCount > 0) {
                // 检查是否存在 action tag
                const existingActionTag = Array.from(editorRef.current.children).find(
                    (child) => child instanceof HTMLElement && child.hasAttribute('data-action-id')
                ) as HTMLElement | undefined

                // 检查是否已存在 group tag
                const existingGroupTag = Array.from(editorRef.current.children).find(
                    (child) => child instanceof HTMLElement && child.hasAttribute('data-group-name')
                ) as HTMLElement | undefined

                // 创建新的 group tag
                const groupTag = document.createElement('span')
                groupTag.contentEditable = 'false'
                groupTag.className = css({
                    backgroundColor: 'rgb(241, 230, 230)',
                    borderRadius: '3px',
                    padding: '2px 4px',
                    margin: '0 2px',
                    color: '#825447',
                    fontSize: '0.9em',
                    cursor: 'pointer',
                    userSelect: 'none',
                    display: 'inline-block',
                })
                groupTag.setAttribute('data-group-name', group.name)
                groupTag.textContent = `/${group.name}`

                if (existingGroupTag) {
                    // 如果已存在 group tag，直接替换内容
                    existingGroupTag.setAttribute('data-group-name', group.name)
                    existingGroupTag.textContent = `/${group.name}`
                } else {
                    // 如果存在 action tag，在其前面插入 group tag
                    if (existingActionTag) {
                        // 按顺序插入元素：group tag、空格、action tag、剩余文本
                        editorRef.current.appendChild(groupTag)
                        editorRef.current.appendChild(document.createTextNode(' '))
                        editorRef.current.appendChild(existingActionTag)
                    } else {
                        // 如果不存在任何 tag，按原来的逻辑处理

                        editorRef.current.appendChild(groupTag)
                        const space = document.createTextNode(' ')
                        editorRef.current.appendChild(space)
                    }
                }

                // 将光标移动到适当位置
                const newRange = document.createRange()
                const lastNode = editorRef.current.lastChild
                newRange.setStartAfter(lastNode || groupTag)
                newRange.setEndAfter(lastNode || groupTag)
                selection.removeAllRanges()
                selection.addRange(newRange)
            }

            // 在所有 action tag 处理完成后执行清理
            cleanupText()
        }
        setShowGroupMenu(false)
        handleInput()
    }

    const handleSubmit = () => {
        // 设置一定的延迟，等待selectedWord被设置为undefined
        setTimeout(() => {
            onSubmit?.()
        }, 200)
    }

    const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
        if (e.key === 'Enter') {
            if (e.shiftKey) {
                e.preventDefault()
                const selection = window.getSelection()
                const range = selection?.getRangeAt(0)
                if (range) {
                    const br = document.createElement('br')
                    range.deleteContents()
                    range.insertNode(br)
                    range.setStartAfter(br)
                    range.setEndAfter(br)
                    selection?.removeAllRanges()
                    selection?.addRange(range)
                    handleInput()
                }
            } else {
                e.preventDefault()
                handleSubmit()
            }
        } else if (e.key === 'ArrowDown') {
            if (actionMenuRef.current) {
                e.preventDefault()
                actionMenuRef.current.focus()
            }
            if (groupMenuRef.current) {
                e.preventDefault()
                groupMenuRef.current.focus()
            }
        } else if (e.key === 'Backspace') {
            const selection = window.getSelection()
            if (selection && selection.rangeCount > 0) {
                const range = selection.getRangeAt(0)
                const startContainer = range.startContainer

                // 处理文本节点的情
                if (startContainer.nodeType === Node.TEXT_NODE) {
                    const textBeforeCursor = startContainer.textContent?.substring(0, range.startOffset) || ''
                    const isFirstPosition = textBeforeCursor === ' ' || textBeforeCursor === ''

                    const previousSibling = startContainer.previousSibling
                    if (
                        isFirstPosition &&
                        previousSibling instanceof HTMLElement &&
                        previousSibling.hasAttribute('data-action-id')
                    ) {
                        e.preventDefault()
                        // 不删除元素，而是隐藏并重置状态
                        previousSibling.style.display = 'none'
                        previousSibling.setAttribute('data-action-id', '')
                        previousSibling.textContent = ''
                        setAction(undefined)
                        handleInput()
                        return
                    }
                }

                // 处理空文本节点的情况
                if (
                    startContainer.nodeType === Node.TEXT_NODE &&
                    (!startContainer.textContent || startContainer.textContent.trim() === '')
                ) {
                    const previousSibling = startContainer.previousSibling
                    if (previousSibling instanceof HTMLElement && previousSibling.hasAttribute('data-action-id')) {
                        e.preventDefault()
                        // 同样是隐藏而不是删除
                        previousSibling.style.display = 'none'
                        previousSibling.setAttribute('data-action-id', '')
                        previousSibling.textContent = ''
                        setAction(undefined)
                        handleInput()
                        return
                    }
                }
            }
        }
    }

    // 2. 修改文本框样式配置
    const textareaStyles = {
        ...TEXTAREA_STYLES,
        'width': 'auto',
        'minHeight': minHeight,
        'maxHeight': maxHeight,
        'whiteSpace': 'pre-wrap' as const,
        'alignItems': 'center',
        'overflow': 'auto',
        backgroundColor,
        'opacity': disabled ? 0.5 : 1,
        'cursor': disabled ? 'not-allowed' : 'text',

        // 3. 添加hover和focus状态
        ':hover': {
            borderColor: 'rgba(0, 0, 0, 0.25)',
            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)',
        },
        ':focus': {
            outline: 'none',
            borderColor: '#4285f4',
            boxShadow: '0 0 0 2px rgba(66, 133, 244, 0.2)',
        },

        // 4. 添加placeholder样式
        '::before': {
            content: 'attr(data-placeholder)',
            color: '#999',
            position: 'absolute',
            pointerEvents: 'none',
            display: 'block',
            opacity: editableText ? 0 : 1,
        },
    }

    // 添加输入法事件处理
    const handleCompositionStart = () => {
        console.log('Composition start')
        setIsComposing(true)
    }

    const handleCompositionEnd = () => {
        console.log('Composition end')
        setIsComposing(false)
    }

    useEffect(() => {
        console.log('activateAction', activateAction)
    }, [activateAction])

    useEffect(() => {
        if (!actionTagRef.current) return

        if (activateAction) {
            // 当有激活的 action 时，显示并设置相关属性
            actionTagRef.current.style.display = 'inline-block'
            actionTagRef.current.setAttribute('data-action-id', activateAction.id?.toString() || '')
            actionTagRef.current.textContent = `@${activateAction.name}`
        } else {
            // 当没有激活的 action 时，隐藏并清空相关属性
            actionTagRef.current.style.display = 'none'
            actionTagRef.current.setAttribute('data-action-id', '')
            actionTagRef.current.textContent = ''
        }
    }, [activateAction])

    // 处理对话选择
    const handleConversationSelect = (conversation: { key: string; messages: ChatMessage[] }) => {
        setCurrentConversationKey(conversation.key)
        setShowConversationMenu(false)

        // 清理输入框中的 ">" 符号
        if (editorRef.current) {
            const text = editorRef.current.innerText
            const cleanedText = text.replace(/>[^\s]*$/, '').trim()
            editorRef.current.innerText = cleanedText
            handleSetEditableText(cleanedText)
        }
    }

    return (
        <div
            className={css({
                position: 'relative',
                flexGrow: 1,
                alignItems: 'stretch',
                width: '100%',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                // 添加外层容器阴影
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
                borderRadius: '8px',
                backgroundColor: 'white',
            })}
        >
            {!settings.hideInputTip && (
                <LabelSmall
                    marginBottom='4px'
                    color='gray'
                    display='flex'
                    alignItems='center'
                    $style={{
                        gap: '4px',
                        position: 'relative',
                        paddingRight: '24px',
                        marginBottom: '18px',
                    }}
                >
                    <IoIosRocket size={14} />
                    {t('Input @ to select an action, input / to select an action group, and input Enter to submit')}
                    <div
                        onClick={handleHideInputTip}
                        className={css({
                            'position': 'absolute',
                            'right': '0',
                            'top': '50%',
                            'transform': 'translateY(-50%)',
                            'cursor': 'pointer',
                            'padding': '4px',
                            'display': 'flex',
                            'alignItems': 'center',
                            'justifyContent': 'center',
                            'color': 'gray',
                            'transition': 'all 0.2s ease',
                            'borderRadius': '50%',
                            ':hover': {
                                backgroundColor: 'rgba(0, 0, 0, 0.05)',
                                color: 'darkgray',
                            },
                        })}
                    >
                        <IoClose size={14} />
                    </div>
                </LabelSmall>
            )}

            <div
                ref={editorRef}
                contentEditable={!disabled}
                onInput={handleInput}
                onKeyDown={handleKeyDown}
                onFocus={onFocus}
                onBlur={onBlur}
                onCompositionStart={handleCompositionStart}
                onCompositionEnd={handleCompositionEnd}
                className={css(textareaStyles)}
                data-placeholder={placeholder}
                data-testid='textarea-with-actions'
            >
                <span
                    ref={groupTagRef}
                    contentEditable={false}
                    className={css({
                        backgroundColor: 'rgb(241, 230, 230)',
                        borderRadius: '3px',
                        padding: '2px 4px',
                        margin: '0 2px',
                        color: '#825447',
                        fontSize: '0.9em',
                        cursor: 'pointer',
                        userSelect: 'none',
                        display: 'none', // 默认隐藏
                    })}
                    data-group-name={selectedGroup || ''}
                />

                {/* 预设 action 标签 */}
                <span
                    ref={actionTagRef}
                    contentEditable={false}
                    className={css({
                        backgroundColor: 'rgb(230, 236, 241)',
                        borderRadius: '3px',
                        padding: '2px 4px',
                        margin: '0 2px',
                        color: '#476582',
                        fontSize: '0.9em',
                        cursor: 'pointer',
                        userSelect: 'none',
                        display: 'none', // 默认隐藏
                        textContent: `@${activateAction?.name}`,
                    })}
                    data-action-id={activateAction?.id?.toString() || ''}
                />
            </div>

            {showSubmitButton && (
                <Button
                    size='mini'
                    kind='secondary'
                    onClick={handleSubmit}
                    disabled={disabled}
                    startEnhancer={<FaArrowUp size={10} />}
                    overrides={{
                        BaseButton: {
                            style: {
                                'position': 'absolute',
                                'right': '8px',
                                'bottom': '18px',
                                'width': '32px',
                                'height': '32px',
                                'borderRadius': '50%',
                                'padding': '0',
                                'display': 'flex',
                                'alignItems': 'center',
                                'justifyContent': 'center',
                                'backgroundColor': '#4285f4',
                                'minWidth': '32px',
                                'boxShadow': '0 2px 4px rgba(0,0,0,0.1)',
                                ':hover': {
                                    backgroundColor: '#3367d6',
                                },
                            },
                        },
                        StartEnhancer: {
                            style: {
                                marginRight: '0',
                                color: 'white',
                            },
                        },
                    }}
                />
            )}

            {selectedActions.length === 0 && !settings.hideEmptyActionsTip && (
                <LabelSmall
                    marginTop='8px'
                    color='#825447'
                    display='flex'
                    alignItems='flex-start'
                    $style={{
                        gap: '8px',
                        backgroundColor: 'rgb(241, 230, 230)',
                        padding: '12px',
                        borderRadius: '8px',
                        fontSize: '13px',
                        lineHeight: '1.5',
                        position: 'relative',
                    }}
                >
                    <IoIosInformationCircle
                        size={18}
                        style={{
                            flexShrink: 0,
                            marginTop: '2px',
                            color: '#825447',
                        }}
                    />
                    <div
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '8px',
                            flex: 1,
                        }}
                    >
                        <span>{t('There are no available actions')}</span>
                        <div
                            style={{
                                display: 'flex',
                                gap: '8px',
                                flexWrap: 'wrap',
                            }}
                        >
                            <a
                                href={`${
                                    import.meta.env.DEV
                                        ? 'http://localhost:3000'
                                        : 'https://gpt-tutor-website-with-stripe.vercel.app'
                                }/actionStore?targetLang=${learningLang}&lang=${userLang}`}
                                target='_blank'
                                rel='noreferrer'
                                className={css({
                                    'color': '#825447',
                                    'textDecoration': 'none',
                                    'fontSize': '12px',
                                    'padding': '6px 12px',
                                    'borderRadius': '4px',
                                    'backgroundColor': 'rgba(130, 84, 71, 0.1)',
                                    'display': 'flex',
                                    'alignItems': 'center',
                                    'gap': '4px',
                                    'transition': 'all 0.2s ease',
                                    ':hover': {
                                        backgroundColor: 'rgba(130, 84, 71, 0.2)',
                                        transform: 'translateY(-1px)',
                                    },
                                })}
                            >
                                {t('Go to the action store')}
                            </a>
                            <a
                                href='#'
                                onClick={(e) => {
                                    e.preventDefault()
                                    useChatStore.getState().setShowActionManager(true)
                                }}
                                className={css({
                                    'color': '#825447',
                                    'textDecoration': 'none',
                                    'fontSize': '12px',
                                    'padding': '6px 12px',
                                    'borderRadius': '4px',
                                    'backgroundColor': 'rgba(130, 84, 71, 0.1)',
                                    'display': 'flex',
                                    'alignItems': 'center',
                                    'gap': '4px',
                                    'transition': 'all 0.2s ease',
                                    ':hover': {
                                        backgroundColor: 'rgba(130, 84, 71, 0.2)',
                                        transform: 'translateY(-1px)',
                                    },
                                })}
                            >
                                {t('Create a new action')}
                            </a>
                        </div>
                    </div>
                    <div
                        onClick={handleHideEmptyActionsTip}
                        className={css({
                            'position': 'absolute',
                            'right': '8px',
                            'top': '8px',
                            'cursor': 'pointer',
                            'padding': '4px',
                            'display': 'flex',
                            'alignItems': 'center',
                            'justifyContent': 'center',
                            'color': '#825447',
                            'transition': 'all 0.2s ease',
                            'borderRadius': '50%',
                            ':hover': {
                                backgroundColor: 'rgba(130, 84, 71, 0.1)',
                            },
                        })}
                    >
                        <IoClose size={14} />
                    </div>
                </LabelSmall>
            )}

            {showActionMenu && selectedActions.length > 0 && filteredActions.length > 0 && (
                <div
                    className={css({
                        ...menuStyles,
                        position: 'absolute',
                        bottom: '100%',
                        left: '0',
                        right: '0',
                    })}
                >
                    <StatefulMenu
                        rootRef={actionMenuRef}
                        items={filteredActions.map((action) => ({
                            label: action.name,
                            action: action,
                        }))}
                        onItemSelect={({ item }) => handleActionSelect(item.action)}
                        overrides={{
                            List: {
                                style: {
                                    maxHeight: '200px',
                                    overflow: 'auto',
                                    backgroundColor: 'white',
                                },
                            },
                            Option: {
                                style: {
                                    cursor: 'pointer',
                                },
                            },
                        }}
                    />
                </div>
            )}

            {showGroupMenu && filteredGroups.length > 0 && (
                <div
                    className={css({
                        ...menuStyles,
                        position: 'absolute',
                        bottom: '100%',
                        left: '0',
                        right: '0',
                    })}
                >
                    <StatefulMenu
                        rootRef={groupMenuRef}
                        items={filteredGroups.map((group) => ({
                            label: group.name,
                            group: group,
                        }))}
                        onItemSelect={({ item }) => handleGroupSelect(item.group)}
                        overrides={{
                            List: {
                                style: {
                                    maxHeight: '200px',
                                    overflow: 'auto',
                                    backgroundColor: 'white',
                                },
                            },
                            Option: {
                                style: {
                                    cursor: 'pointer',
                                },
                            },
                        }}
                    />
                </div>
            )}

            {/* 添加对话选择菜单 */}
            {showConversationMenu && (
                <div className={css(menuStyles)}>
                    <StatefulMenu
                        items={[
                            // 添加新对话选项
                            {
                                label: t('Add New Conversation'),
                                isNew: true,
                            },
                            // 分隔线
                            { label: '---', disabled: true },
                            // 现有对话列表
                            ...availableConversations.map((conv) => ({
                                label: conv.key,
                                conversation: conv,
                            })),
                        ]}
                        onItemSelect={({ item }) => {
                            if (item.isNew) {
                                // 处理新建对话
                                const newKey = generateNewConversationKey()
                                setCurrentConversationKey(newKey)
                            } else {
                                // 处理选择现有对话
                                handleConversationSelect(item.conversation)
                            }
                            setShowConversationMenu(false)

                            // 清理输入框中的 "~" 符号
                            if (editorRef.current) {
                                const text = editorRef.current.innerText
                                const cleanedText = text.replace(/~[^\s]*$/, '').trim()
                                editorRef.current.innerText = cleanedText
                                handleSetEditableText(cleanedText)
                            }
                        }}
                        overrides={{
                            List: {
                                style: {
                                    backgroundColor: 'white',
                                },
                            },
                            Option: {
                                props: {
                                    overrides: {
                                        ListItem: {
                                            style: ({
                                                $theme,
                                                $isHighlighted,
                                            }: {
                                                $theme: Theme
                                                $isHighlighted: boolean
                                            }) => ({
                                                // 为新建对话选项添加特殊样式
                                                ...(($isHighlighted || $theme) && {}),
                                                backgroundColor: $isHighlighted ? 'rgba(66, 133, 244, 0.1)' : 'white',
                                                color: '#476582',
                                                cursor: 'pointer',
                                                padding: '12px 16px',
                                                // 分隔线样式
                                                borderBottom: ({ label }: { label: string }) =>
                                                    label === '---' ? '1px solid #eee' : 'none',
                                                height: ({ label }: { label: string }) =>
                                                    label === '---' ? '1px' : 'auto',
                                                margin: ({ label }: { label: string }) =>
                                                    label === '---' ? '8px 0' : '0',
                                            }),
                                        },
                                    },
                                },
                            },
                        }}
                    />
                </div>
            )}

            <div
                style={{
                    position: 'absolute',
                    right: 0,
                    bottom: '-10px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                }}
            ></div>
        </div>
    )
}

const menuStyles = {
    position: 'absolute',
    left: '0',
    right: '0',
    bottom: '100%',
    marginBottom: '4px',
    zIndex: 1000,
    overflowY: 'auto',
    maxHeight: '200px',
    boxShadow: '0 -2px 10px rgba(0,0,0,0.1)',
    backgroundColor: 'white',
    borderRadius: '8px',
} as const

export default TextareaWithActions
