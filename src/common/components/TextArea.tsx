import React, { useState, useRef, useEffect } from 'react'
import { useStyletron } from 'baseui-sd'
import { StatefulMenu } from 'baseui-sd/menu'
import { Action } from '../internal-services/db'
import { actionService } from '../services/action'
import { Button } from 'baseui-sd/button'
import { IoIosRocket } from 'react-icons/io'
import { useTranslation } from 'react-i18next'
import { useChatStore } from '@/store/file/store'

interface AutocompleteTextareaProps {
    selectedActions: Action[]
    onActionSelect: (action: Action) => void
    onChange: (value: string) => void
    onSubmit: () => void
}

const AutocompleteTextarea: React.FC<AutocompleteTextareaProps> = ({
    selectedActions,
    onActionSelect,
    onChange,
    onSubmit,
}) => {
    const [css] = useStyletron()
    const [showActionMenu, setShowActionMenu] = useState(false)
    const { editableText } = useChatStore()
    const [searchTerm, setSearchTerm] = useState('')
    const [filteredActions, setFilteredActions] = useState<Action[]>([])
    const editorRef = useRef<HTMLDivElement>(null)
    const menuRef = useRef<HTMLElement>(null)
    const { t } = useTranslation()
    useEffect(() => {
        if (searchTerm) {
            const filtered = selectedActions.filter((action) => action.name.includes(searchTerm))
            setFilteredActions(filtered)
        } else {
            setFilteredActions(selectedActions)
        }
    }, [searchTerm, selectedActions])

    useEffect(() => {
        if (showActionMenu && menuRef.current) {
            menuRef.current.focus()
        }
    }, [showActionMenu])

    useEffect(() => {
        if (editorRef.current) {
            if (editableText) {
                editorRef.current.innerText = editableText
            } else {
                editorRef.current.innerText = ''
            }
        }
    }, [editableText])

    const getTextWithoutMentions = (text: string) => {
        const functionNames = selectedActions.map((action) => action.name)
        const functionRegex = new RegExp(`@(${functionNames.join('|')})(?=\\s|$)`, 'gu')
        return text.replace(functionRegex, '').trim()
    }

    const handleInput = () => {
        if (editorRef.current) {
            const text = editorRef.current.innerText
            onChange(getTextWithoutMentions(text))

            const selection = window.getSelection()
            if (selection && selection.rangeCount > 0) {
                const range = selection.getRangeAt(0)
                const preCaretRange = range.cloneRange()
                preCaretRange.selectNodeContents(editorRef.current)
                preCaretRange.setEnd(range.endContainer, range.endOffset)
                const caretOffset = preCaretRange.toString().length

                const lastAtIndex = text.lastIndexOf('@', caretOffset)
                if (lastAtIndex !== -1 && caretOffset - lastAtIndex <= 20) {
                    const searchText = text.slice(lastAtIndex + 1, caretOffset)
                    setSearchTerm(searchText)
                    setShowActionMenu(true)
                } else {
                    setShowActionMenu(false)
                    setSearchTerm('')
                }
            }
        }
    }

    const handleActionSelect = async (action: Action) => {
        onActionSelect(action)
        setShowActionMenu(false)
        setSearchTerm('')
        if (editorRef.current) {
            const selection = window.getSelection()
            if (selection && selection.rangeCount > 0) {
                const range = selection.getRangeAt(0)
                const preCaretRange = range.cloneRange()
                preCaretRange.selectNodeContents(editorRef.current)
                preCaretRange.setEnd(range.endContainer, range.endOffset)
                const caretOffset = preCaretRange.toString().length

                const text = editorRef.current.innerText
                const lastAtIndex = text.lastIndexOf('@', caretOffset)
                const textWithoutMentions = getTextWithoutMentions(text)
                const newText =
                    '@' +
                    action.name +
                    ' ' +
                    textWithoutMentions.substring(0, lastAtIndex).replace(/[@#`]/g, '') +
                    textWithoutMentions.substring(caretOffset)
                editorRef.current.innerText = newText
                handleInput()

                // 将光标移到插入的@mention之后
                const newCaretPosition = lastAtIndex + action.name.length + 2
                const newRange = document.createRange()
                const textNode = editorRef.current.firstChild
                if (textNode) {
                    newRange.setStart(textNode, newCaretPosition)
                    newRange.setEnd(textNode, newCaretPosition)
                    selection.removeAllRanges()
                    selection.addRange(newRange)
                }
            } else {
                // 如果没有检测到输入@，则设置select默认的action
                const defaultAction = await actionService.get(36)
                if (defaultAction) {
                    handleActionSelect(defaultAction)
                }
            }
        }
    }

    const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
        if (e.key === 'Enter') {
            if (e.shiftKey) {
                // Shift + Enter: 插入换行符
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
                    handleInput() // 触发内容更新
                }
            } else {
                // 仅 Enter: 提交
                e.preventDefault()
                onSubmit()
            }
        }
    }

    return (
        <div className={css({ position: 'relative', width: 'auto', alignItems: 'center' })}>
            <div
                ref={editorRef}
                contentEditable
                onInput={handleInput}
                onKeyDown={handleKeyDown}
                className={css({
                    border: '1px solid #ccc',
                    minHeight: '100px',
                    padding: '8px',
                    whiteSpace: 'pre-wrap',
                    alignItems: 'center',
                    overflow: 'auto', // 当输入内容超过当前宽度时自动切换到下一行
                    backgroundColor: '#f5f5f5', // 设置背景颜色为浅灰色
                })}
            />
            {showActionMenu && filteredActions.length > 0 && (
                <div
                    className={css({
                        position: 'absolute',
                        left: 0,
                        right: 0,
                        top: '100%',
                        marginTop: '4px',
                        zIndex: 1000,
                        overflow: 'visible',
                    })}
                >
                    <StatefulMenu
                        rootRef={menuRef}
                        initialState={{
                            highlightedIndex: 0,
                        }}
                        items={filteredActions.map((action) => ({
                            label: action.name,
                            action: action,
                        }))}
                        onItemSelect={({ item }) => handleActionSelect(item.action)}
                    />
                </div>
            )}
            <div
                style={{
                    display: 'flex',
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 10,
                    marginTop: '10px',
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
                    <li>{t('Input any question or input @ to choose a function.')}</li>
                    <li>{t('Press <Enter> to submit. Press <Shift+Enter> to start a new line.')}</li>
                </div>
                <Button
                    size='mini'
                    kind='secondary'
                    onClick={onSubmit}
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
    )
}

export default AutocompleteTextarea
