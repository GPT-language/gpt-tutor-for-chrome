import React, { useState, useRef, useEffect } from 'react'
import { useStyletron } from 'baseui-sd'
import { StatefulMenu } from 'baseui-sd/menu'
import { Action } from '../internal-services/db'
import { Button } from 'baseui-sd/button'
import { IoIosRocket } from 'react-icons/io'
import { useTranslation } from 'react-i18next'
import { useChatStore } from '@/store/file/store'
import toast from 'react-hot-toast'

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
    const { editableText, activateAction, refreshTextAreaFlag, selectedWord } = useChatStore()
    const [searchTerm, setSearchTerm] = useState('')
    const [filteredActions, setFilteredActions] = useState<Action[]>([])
    const editableTextRef = useRef<string>('')
    const editorRef = useRef<HTMLDivElement>(null)
    const menuRef = useRef<HTMLElement>(null)
    const { t } = useTranslation()

    useEffect(() => {
        editableTextRef.current = editableText
        console.log('editableTextRef.current', editableTextRef.current)
    }, [editableText])

    useEffect(() => {
        if (searchTerm) {
            const filtered = selectedActions.filter((action) => action.name.includes(searchTerm))
            setFilteredActions(filtered)
        } else {
            setFilteredActions(selectedActions)
        }
    }, [searchTerm, selectedActions])

    // 当editorRef.current.innerText存在时，
    useEffect(() => {
        if (editorRef.current) {
            if (editableText && activateAction) {
                // 加上之前被@mention的文本
                editorRef.current.innerText = '@' + activateAction.name + ' ' + editableTextRef.current
            } else if (editableText) {
                editorRef.current.innerText = editableTextRef.current
            } else if (activateAction) {
                editorRef.current.innerText = '@' + activateAction.name + ' '
            } else if (selectedWord?.text) {
                editorRef.current.innerText = selectedWord.text
            } else {
                editorRef.current.innerText = ''
            }
        }

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [refreshTextAreaFlag])

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
                if (editorRef.current) {
                    const textContent = editorRef.current.textContent || ''
                    const finalPosition = Math.min(newCaretPosition, textContent.length)

                    // 使用 TreeWalker 遍历所有文本节点
                    const treeWalker = document.createTreeWalker(editorRef.current, NodeFilter.SHOW_TEXT)
                    let currentLength = 0
                    let currentNode = treeWalker.nextNode()

                    while (currentNode) {
                        const nodeLength = currentNode.textContent?.length || 0
                        if (currentLength + nodeLength >= finalPosition) {
                            const offset = finalPosition - currentLength
                            newRange.setStart(currentNode, offset)
                            newRange.setEnd(currentNode, offset)
                            selection.removeAllRanges()
                            selection.addRange(newRange)
                            break
                        }
                        currentLength += nodeLength
                        currentNode = treeWalker.nextNode()
                    }

                    // 如果没有找到合适的节点（这种情况不应该发生，但为了安全起见）
                    if (!currentNode) {
                        // 将光标设置在最后一个文本节点的末尾
                        const lastTextNode = editorRef.current.lastChild
                        if (lastTextNode && lastTextNode.nodeType === Node.TEXT_NODE) {
                            newRange.setStartAfter(lastTextNode)
                            newRange.setEndAfter(lastTextNode)
                            selection.removeAllRanges()
                            selection.addRange(newRange)
                        }
                    }
                }
            } else {
                // 如果没有检测到输入@，则设置select默认的action
                const defaultAction = selectedActions.find((action) => action.mode === 'Free to ask')
                if (defaultAction) {
                    handleActionSelect(defaultAction)
                } else {
                    toast.error('Please choose a function.')
                }
            }
        }
        setShowActionMenu(false)
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
        } else if (e.key === 'ArrowDown') {
            // 如果输入键盘中↓，则设置menuRef.current.focus()
            e.preventDefault()
            if (menuRef.current) {
                menuRef.current.focus()
            } else {
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
            }
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
            })}
        >
            <div
                ref={editorRef}
                contentEditable
                onInput={handleInput}
                onKeyDown={handleKeyDown}
                className={css({
                    width: 'auto',
                    border: '1px solid #ccc',
                    minHeight: '100px',
                    padding: '8px',
                    marginBottom: '20px',
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
                        overflowY: 'auto',
                        maxHeight: '200px',
                        boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
                    })}
                >
                    <StatefulMenu
                        rootRef={menuRef}
                        items={filteredActions.map((action) => ({
                            label: action.name,
                            action: action,
                        }))}
                        onItemSelect={({ item }) => handleActionSelect(item.action)}
                        overrides={{
                            List: {
                                style: {
                                    maxHeight: 'none', // 移除 StatefulMenu 的默认最大高度
                                    overflow: 'visible', // 确保内容不被裁剪
                                },
                            },
                        }}
                    />
                </div>
            )}
            <Button
                size='mini'
                kind='secondary'
                onClick={onSubmit}
                startEnhancer={<IoIosRocket size={13} />}
                overrides={{
                    BaseButton: {
                        style: {
                            width: 'auto',
                            position: 'absolute',
                            right: 0,
                            bottom: '-10px',
                            fontWeight: 'normal',
                            fontSize: '12px',
                            padding: '4px 8px',
                            cursor: 'pointer',
                        },
                    },
                    StartEnhancer: {
                        style: {
                            marginRight: '6px',
                        },
                    },
                }}
            >
                {t('Submit')}
            </Button>
        </div>
    )
}

export default AutocompleteTextarea
