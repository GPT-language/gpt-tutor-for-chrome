import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import { Theme, useStyletron } from 'baseui-sd'
import { StatefulMenu } from 'baseui-sd/menu'
import { Action } from '../internal-services/db'
import { Button } from 'baseui-sd/button'
import { useTranslation } from 'react-i18next'
import { useChatStore } from '@/store/file/store'
import { FaArrowUp } from 'react-icons/fa'
import { ChatMessage } from '@/store/file/slices/chat/initialState'
import QuickActionBar from './QuickActionBar'

interface AutocompleteTextareaProps {
    // 1. 增加更多可配置的属性
    editableText: string
    editorRef: React.RefObject<HTMLDivElement>
    selectedText?: string
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
    onSpeak?: () => void
    onYouglish?: () => void
    isSpeaking?: boolean
    onExplainWord?: () => void
    independentText?: string
}

// 3. 提取默认值
const DEFAULT_MIN_HEIGHT = '40px'
const DEFAULT_BG_COLOR = '#f5f5f5'

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
    selectedText,
    editorRef,
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
    onSpeak,
    onYouglish,
    isSpeaking,
    onExplainWord,
    independentText,
}) => {
    const [css] = useStyletron()
    const [showActionMenu, setShowActionMenu] = useState(false)
    const [showGroupMenu, setShowGroupMenu] = useState(false)
    const [groupSearchTerm, setGroupSearchTerm] = useState('')
    const {
        actions,
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
    const actionMenuRef = useRef<HTMLElement>(null)
    const groupMenuRef = useRef<HTMLElement>(null)
    const { t } = useTranslation()
    const actionTagRef = useRef<HTMLSpanElement>(null)
    const groupTagRef = useRef<HTMLSpanElement>(null)
    const [isComposing, setIsComposing] = useState(false) // 添加输入法编辑状态
    const [composingText, setComposingText] = useState<string>('') // 新增：存储输入法编辑中的文本


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
        if (searchTerm) {
            const filtered = selectedActions.filter((action) => action.name.includes(searchTerm))
            setFilteredActions(filtered)
        } else {
            setFilteredActions(selectedActions)
        }
    }, [searchTerm, selectedActions])

    const handleInput = useCallback(() => {
        if (!editorRef.current) return

        const getTextWithoutMentions = (text: string) => {
            if (editorRef.current) {
                const textNodes = Array.from(editorRef.current.childNodes)
                    .filter((node) => node.nodeType === Node.TEXT_NODE)
                    .map((node) => node.textContent)
                    .join('')
                return textNodes.trim()
            }
            return text.trim()
        }

        const handleSetEditableText = async (text: string) => {
            const trimmedText = text.trim()

            // 如果去除空格后的文本与当前 editableText 相同，则不进行任何操作
            if (trimmedText === editableText?.trim()) {
                return
            }

            // 如果text以@开头，为选择动作而不是输入文本，不修改editableText
            if (trimmedText.startsWith('@') || trimmedText.startsWith('/')) {
                console.log('Choose action')
                return
            }

            // 在输入法编辑过程中，保存当前文本状态但不触发onChange
            if (isComposing) {
                setComposingText(text)
            } else {
                // 非输入法编辑状态，正常更新文本
                onChange(text)
            }
        }

        const text = editorRef.current.innerText
        handleSetEditableText(getTextWithoutMentions(text))
        const selection = window.getSelection()

        if (selection && selection.rangeCount > 0) {
            const range = selection.getRangeAt(0)
            const preCaretRange = range.cloneRange()
            preCaretRange.selectNodeContents(editorRef.current)
            preCaretRange.setEnd(range.endContainer, range.endOffset)
            const caretOffset = preCaretRange.toString().length

            // 重置所有菜单状态
            setShowActionMenu(false)
            setShowGroupMenu(false)
            setShowConversationMenu(false)

            // 检查最后输入的字符，只显示对应的菜单
            const lastChar = text.charAt(caretOffset - 1)
            if (lastChar === '@') {
                setShowActionMenu(true)
            } else if (lastChar === '#') {
                setShowGroupMenu(true)
            } else if (lastChar === '~') {
                // 准备对话列表
                const conversations = Object.entries(answers || {}).map(([key, value]) => ({
                    key,
                    messages: value.conversationMessages || [],
                }))
                setAvailableConversations(conversations)
                setShowConversationMenu(true)
            }
        }
    }, [editorRef, editableText, isComposing, onChange, setShowConversationMenu, answers, setAvailableConversations])

    const cleanupText = () => {
        if (!editorRef.current) return

        const textNodes = Array.from(editorRef.current.childNodes).filter(
            (node) => node.nodeType === Node.TEXT_NODE
        ) as Text[]

        textNodes.forEach((textNode) => {
            // 替换文本节点中的 @或者# 符号和~及其后面的文本，直到遇到空格或标点
            const newText =
                textNode.textContent?.replace(/@#~S+/g, '').replace(/@/g, '').replace(/#/g, '').replace(/~/g, '') || ''

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
                    if (actionTagRef.current && actionTagRef.current.textContent) {
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

            // 在所有 action tag 处理完成后执行理
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
        setShowGroupMenu(false)
        cleanupText()
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
        }
    }

    useEffect(() => {
        console.log('activateAction', activateAction)
    }, [activateAction])
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
        if (editorRef.current) {
            setComposingText(editorRef.current.innerText)
        }
    }

    const handleCompositionEnd = () => {
        console.log('Composition end')
        setIsComposing(false)
        // 输入法结束时，使用最终的文本内容更新
        if (editorRef.current) {
            const finalText = editorRef.current.innerText
            onChange(finalText)
        }
    }

    useEffect(() => {
        if (!actionTagRef.current) return

        if (activateAction) {
            // 当有激活的 action 时，显示并设置相关属性
            actionTagRef.current.style.display = 'inline-block'
            actionTagRef.current.setAttribute('data-action-id', activateAction.id?.toString() || '')
            actionTagRef.current.textContent = `@${activateAction.name}`
        } else {
            // 当没有激活的 action 时���隐藏并清空相关属性
            actionTagRef.current.style.display = 'none'
            actionTagRef.current.setAttribute('data-action-id', '')
            actionTagRef.current.textContent = ''
        }
    }, [activateAction])

    useEffect(() => {
        if (!actionTagRef.current) return

        console.log('actionTagRef show', actionTagRef.current.style.display)
        console.log('textContent', actionTagRef.current.textContent)
    }, [activateAction])

    // 处理对话选择
    const handleConversationSelect = (conversation: { key: string; messages: ChatMessage[] }) => {
        setCurrentConversationKey(conversation.key)
        setShowConversationMenu(false)

        // 清理输入框中的 "~"
        cleanupText()
    }

    // 添加 MutationObserver 监听 DOM 变化
    useEffect(() => {
        if (!editorRef.current) return

        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList') {
                    // 检查是否还存在 actionTag
                    const hasActionTag = Array.from(editorRef.current?.children || []).some(
                        (child) => child === actionTagRef.current
                    )

                    // 如果 actionTag 被删除但 activateAction 仍然存在
                    if (!hasActionTag && activateAction) {
                        console.log('set action undefined when mutation', activateAction)
                        setAction(undefined)
                    }
                }
            })
        })

        observer.observe(editorRef.current, {
            childList: true,
            subtree: true,
        })

        return () => observer.disconnect()
    }, [editorRef, activateAction, setAction])

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
            <QuickActionBar
                onSpeak={onSpeak}
                onYouglish={onYouglish}
                onExplainWord={onExplainWord}
                independentText={independentText}
                isSpeaking={isSpeaking}
                disabled={disabled}
                onSubmit={handleSubmit}
            />

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
    zIndex: 100,
    overflowY: 'auto',
    maxHeight: '200px',
    boxShadow: '0 -2px 10px rgba(0,0,0,0.1)',
    backgroundColor: 'white',
    borderRadius: '8px',
} as const

export default TextareaWithActions
