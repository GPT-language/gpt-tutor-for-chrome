import React, { useCallback, useMemo, useState, useEffect, useRef } from 'react'
import { Block } from 'baseui-sd/block'
import { Button } from 'baseui-sd/button'
import { ChevronDown, ChevronUp } from 'baseui-sd/icon'
import Latex from 'react-latex-next'
import { Markdown } from './Markdown'
import { useChatStore } from '@/store/file/store'
import { Tooltip } from './Tooltip'
import { RxCopy, RxReload, RxSpeakerLoud } from 'react-icons/rx'
import { CopyButton } from './CopyButton'
import { AiOutlinePlusSquare, AiOutlineQuestionCircle } from 'react-icons/ai'
import SpeakerMotion from './SpeakerMotion'
import { useTranslation } from 'react-i18next'
import { useStyles } from './Translator'
import { askAI } from '../translate'
import { IEngine } from '../engines/interfaces'
import toast from 'react-hot-toast'
import { CiEdit } from 'react-icons/ci'
import { VscReply } from 'react-icons/vsc'
import { Textarea } from 'baseui-sd/textarea'
import TextareaWithActions from './TextAreaWithActions'
import { shallow } from 'zustand/shallow'
import { StatefulPopover, PLACEMENT } from 'baseui-sd/popover'
import { StatefulMenu } from 'baseui-sd/menu'
import debounce from 'lodash-es/debounce'

interface ITranslationManagerProps {
    isLoading: boolean
    isSpeakingTranslatedText: boolean
    styles: ReturnType<typeof useStyles>
    showFullQuoteText: boolean
    setShowFullQuoteText: (show: boolean) => void
    forceTranslate: () => void
    handleTranslatedSpeakAction: (messageId: string, conversationId: string, text: string) => void
    messageId: string
    conversationId: string
    finalText: string
    quoteText: string
    engine: IEngine | undefined
    addToAnki: (deckName: string, front: string, back: string) => void
}

const MAX_TAB_WIDTH = 70 // 每个标签的最大宽度
const MORE_TAB_WIDTH = 30 // More 按钮的宽度
const ACTION_BUTTONS_WIDTH = 40 // 其他操作按钮的宽度

const TranslationManager: React.FC<ITranslationManagerProps> = ({
    isLoading,
    isSpeakingTranslatedText,
    styles,
    showFullQuoteText,
    setShowFullQuoteText,
    forceTranslate,
    handleTranslatedSpeakAction,
    messageId,
    conversationId,
    addToAnki,
    finalText,
    engine,
}) => {
    const [editingAction, setEditingAction] = useState<string | null>(null)
    const [editingParagraph, setEditingParagraph] = useState<number | null>(null)
    const [editedText, setEditedText] = useState('')
    const {
        answers,
        currentFileId,
        setAnswers,
        selectedWord,
        selectedGroup,
        toggleMessageCard,
        updateWordAnswers,
        updateFollowUpAnswer,
        updateSentenceAnswer,
        updateSelectedWordText,
    } = useChatStore()
    const [hoveredParagraph, setHoveredParagraph] = useState<number | null>(null)
    const { t } = useTranslation()
    const [askingParagraph, setAskingParagraph] = useState<number | null>(null)
    const [currentAiAnswer, setCurrentAiAnswer] = useState<string>('')
    const { independentText, setIndependentText } = useChatStore(
        (state) => ({
            independentText: state.independentText,
            setIndependentText: state.setIndependentText,
        }),
        shallow
    )
    const containerRef = useRef<HTMLDivElement>(null)
    const [visibleTabs, setVisibleTabs] = useState<string[]>([])
    const [hiddenTabs, setHiddenTabs] = useState<string[]>([])
    const [expandedActions, setExpandedActions] = useState<string>('')
    const [isManualSelection, setIsManualSelection] = useState(false)

    const handleAsk = useCallback(
        (index: number, actionName?: string) => {
            let existingAnswer
            if (actionName) {
                const followUpAnswers = selectedWord?.answers?.[actionName]?.followUpAnswers || []
                existingAnswer = followUpAnswers.find((followUpAnswer) => followUpAnswer.idx === index)
            } else {
                existingAnswer = selectedWord?.sentenceAnswers?.find((sentenceAnswer) => sentenceAnswer.idx === index)
            }
            if (existingAnswer) {
                setCurrentAiAnswer(existingAnswer.text)
            } else {
                setCurrentAiAnswer('')
            }
            setAskingParagraph(index)
            setIndependentText('')
        },
        [selectedWord?.answers, selectedWord?.sentenceAnswers, setIndependentText]
    )

    // 完成设置，最后通过一个flag来触发

    const handleAskSubmit = useCallback(
        async (text: string, index: number, actionName?: string) => {
            if (!engine) {
                toast(t('Engine not defined') || 'Engine not defined')
                return
            }
            if (!text && !independentText) {
                toast(t('Please input your question') || 'Please input your question')
                return
            }
            console.log('handleAskSubmit', text, index, actionName)
            const abortController = new AbortController()
            const { selectedWord, currentFileId, activateAction } = useChatStore.getState()

            try {
                await askAI(
                    {
                        activateAction,
                        text: independentText,
                        context: text,
                        onMessage: async (message) => {
                            if (!message.content) {
                                return
                            }

                            setCurrentAiAnswer((prevAnswer) => {
                                return prevAnswer + message.content
                            })
                        },
                        onFinish: async () => {
                            const finalAnswer = await new Promise<string>((resolve) => {
                                setCurrentAiAnswer((prevAnswer) => {
                                    const separator = prevAnswer ? '\n\n---\n\n' : ''
                                    const finalAnswer = prevAnswer + separator
                                    resolve(finalAnswer)
                                    return finalAnswer
                                })
                            })

                            if (selectedWord && currentFileId && actionName) {
                                try {
                                    await updateFollowUpAnswer(
                                        currentFileId,
                                        selectedWord.idx,
                                        index,
                                        finalAnswer,
                                        actionName
                                    )
                                    console.log('Follow-up answer updated successfully')
                                } catch (error) {
                                    console.error('Failed to update follow-up answer:', error)
                                }
                            } else if (selectedWord && currentFileId) {
                                try {
                                    await updateSentenceAnswer(currentFileId, selectedWord.idx, index, finalAnswer)
                                    console.log('Sentence answer updated successfully')
                                } catch (error) {
                                    console.error('Failed to update sentence answer:', error)
                                }
                            }
                        },
                        onError: (error) => {
                            setCurrentAiAnswer((prevAnswer) => {
                                if (prevAnswer) {
                                    return prevAnswer + '\n\n---\n\n' + error
                                }
                                return ''
                            })
                        },
                        signal: abortController.signal,
                    },
                    engine
                )
            } catch (error) {
                console.error('提交问题失:', error)
                // 显示错误提示
            }
        },
        [engine, independentText, t, updateFollowUpAnswer, updateSentenceAnswer]
    )

    const handleCopy = useCallback(
        (text: string) => {
            navigator.clipboard.writeText(text)
            // 可以添加一个复制成功的
            toast(t('Copy to clipboard'), {
                duration: 3000,
                icon: '👏',
            })
        },
        [t]
    )
    const handleEdit = useCallback((paragraphIndex: number, text: string, actionName?: string) => {
        setEditingAction(actionName || null)

        setEditingParagraph(paragraphIndex)
        setEditedText(text)
    }, [])

    const handleSaveEditedText = useCallback(
        async (actionName?: string) => {
            console.log('开始保存编辑文本:', {
                actionName,
                editingParagraph,
                editedText,
                answers,
                selectedWord,
                currentFileId,
            })

            // 如果actionName为undefined，则为直接编辑selectedWord的text
            if (!actionName) {
                console.log('直接编辑selectedWord的text', editedText)
                if (editedText) {
                    updateSelectedWordText(editedText)
                    setEditingParagraph(null)
                    toast.success(t('Edit saved successfully'))
                } else {
                    toast.error(t('EditedText is empty'))
                }
                return
            }

            if (!editingParagraph && editingParagraph !== 0) {
                console.warn('编辑段落索引无效:', editingParagraph)
                return
            }

            const currentTranslation = answers[actionName]
            if (!currentTranslation) {
                console.error('未找到对应的translation:', actionName)
                return
            }

            // 添加日志来检查分割前的文本
            console.log('更新前的完整文本:', currentTranslation.text)

            // 使用正确的分隔符分割文本
            const paragraphs = currentTranslation.text.split('\n').filter((p) => p.trim() !== '')
            // console.log('分割后的段落数组:', paragraphs)
            // console.log('要更新的段落索引:', editingParagraph)
            // console.log('更新前的段落内容:', paragraphs[editingParagraph])

            // 更新指定段落
            paragraphs[editingParagraph] = editedText
            // console.log('更新后的段落内容:', paragraphs[editingParagraph])

            // 使用正确的分隔符合并文本
            const updatedText = paragraphs.join('\n')
            // console.log('更新后的完整文本:', updatedText)

            const updatedAnswers = {
                ...answers,
                [actionName]: {
                    ...currentTranslation,
                    text: updatedText,
                },
            }

            if (selectedWord && currentFileId) {
                try {
                    await updateWordAnswers(updatedAnswers)
                    console.log('成功更新answers:', updatedAnswers[actionName].text)
                    setAnswers(updatedAnswers)
                    toast.success(t('Edit saved successfully'))
                } catch (error) {
                    console.error('更新翻译失败:', error)
                    toast.error(t('Failed to save edit'))
                }
            } else {
                setAnswers(updatedAnswers)
            }

            setEditingAction(null)
            setEditingParagraph(null)
            setEditedText('')
        },
        [
            editingParagraph,
            answers,
            editedText,
            selectedWord,
            currentFileId,
            updateSelectedWordText,
            updateWordAnswers,
            setAnswers,
            t,
        ]
    )

    const handleCancel = () => {
        setEditingAction(null)
        setEditingParagraph(null)
        setEditedText('')
    }

    const splitIntoParagraphsAndSentences = (text: string): string[] => {
        if (!text) {
            return []
        }
        // 首先按段落分割
        const paragraphs = text.split('\n').filter(Boolean)

        // 然后对每个段落进行句子分割
        return paragraphs.flatMap((paragraph) => {
            // 检查是否为编号列表项
            if (/^\d+\.\s/.test(paragraph)) {
                return paragraph // 如果是编号列表项，直接返回整个段落
            }
            // 使用正则表达式来分割句子，但避免分割常见的缩写和数字后的句号
            const sentences = paragraph
                .split(/(?<=[.!?])\s+(?=[A-Z])/)
                .map((sentence) => sentence.trim())
                .filter(Boolean)
            // todo: 实现其它语言的句

            // 如果段落只有一个句子，直接返回；否则返回分割后的句子
            return sentences.length === 1 ? paragraph : sentences
        })
    }

    const handleTextSelection = useCallback(() => {
        console.log('handleTextSelection', askingParagraph)
        if (askingParagraph === null) return
        console.log('window.getSelection()', window.getSelection()?.toString().trim())
        const selectedText = window.getSelection()?.toString().trim()
        if (selectedText) {
            setIndependentText(selectedText)
        }
    }, [askingParagraph, setIndependentText])

    const renderContent = useMemo(
        () => (text: string, format: string, actionName?: string) => {
            const paragraphs = splitIntoParagraphsAndSentences(text)
            const content = (
                <>
                    {paragraphs.map((paragraph, index) =>
                        paragraph.trim() === '' && editingAction !== actionName ? null : (
                            <Block
                                key={`p-${index}`}
                                marginBottom='10px'
                                position='relative'
                                onMouseEnter={() => setHoveredParagraph(index)}
                                onMouseLeave={() => setHoveredParagraph(null)}
                                $style={{
                                    width: '100%',
                                }}
                            >
                                {(editingAction === actionName ||
                                    (editingAction === null && actionName === undefined)) &&
                                editingParagraph === index ? (
                                    <Block $style={{ width: '95%', margin: '10px' }}>
                                        <Textarea
                                            value={editedText}
                                            onChange={(e) => setEditedText(e.currentTarget.value)}
                                            placeholder={t('Edit text') || 'Edit text'}
                                        />
                                        <Block
                                            display='flex'
                                            justifyContent='flex-end'
                                            marginTop='10px'
                                            width='100%'
                                            $style={{ gap: '10px' }}
                                        >
                                            <Button
                                                onClick={() => handleSaveEditedText(actionName)}
                                                kind='primary'
                                                size='mini'
                                            >
                                                {t('Save')}
                                            </Button>
                                            <Button onClick={handleCancel} kind='secondary' size='mini'>
                                                {t('Cancel')}
                                            </Button>
                                        </Block>
                                    </Block>
                                ) : askingParagraph === index ? (
                                    <>
                                        <Block
                                            $style={{ fontStyle: 'italic', marginBottom: '10px', userSelect: 'text' }}
                                            onMouseUp={handleTextSelection}
                                        >
                                            <Markdown>{paragraph}</Markdown>
                                        </Block>
                                        <TextareaWithActions
                                            editableText={independentText}
                                            onChange={(value: string) => {
                                                setIndependentText(value)
                                            }}
                                            onSubmit={() => handleAskSubmit(paragraph, index, actionName)}
                                            placeholder={t('Input your question') || 'Input your question'}
                                            minHeight='80px'
                                            showSubmitButton={false}
                                            showClearButton={false}
                                        />
                                        <Block
                                            display='flex'
                                            justifyContent='flex-end'
                                            marginTop='10px'
                                            width='100%'
                                            $style={{ gap: '10px' }}
                                        >
                                            <Button
                                                kind='primary'
                                                size='mini'
                                                onClick={() => handleAskSubmit(paragraph, index, actionName)}
                                            >
                                                {t('Submit')}
                                            </Button>
                                            <Button
                                                kind='secondary'
                                                size='mini'
                                                onClick={() => setAskingParagraph(null)}
                                            >
                                                {t('Cancel')}
                                            </Button>
                                        </Block>
                                        {currentAiAnswer && (
                                            <Block
                                                $style={{
                                                    marginTop: '10px',
                                                    backgroundColor: '#f0f0f0',
                                                    padding: '10px',
                                                }}
                                            >
                                                <Markdown>{currentAiAnswer}</Markdown>
                                            </Block>
                                        )}
                                    </>
                                ) : (
                                    <Block
                                        width='100%'
                                        $style={{
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            position: 'relative',
                                        }}
                                    >
                                        <Block $style={{ flex: 1 }}>
                                            {format === 'markdown' ? <Markdown>{paragraph}</Markdown> : paragraph}
                                        </Block>
                                        {hoveredParagraph === index && (
                                            <Block
                                                display='flex'
                                                alignItems='center'
                                                position='relative'
                                                top='50%'
                                                $style={{
                                                    backgroundColor: 'rgba(255, 255, 255, 0.8)', // 半透明背景
                                                    padding: '0 4px', // 添加一些内边距
                                                }}
                                            >
                                                <Tooltip content={t('Edit')} placement='bottom'>
                                                    <Button
                                                        size='mini'
                                                        kind='tertiary'
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            handleEdit(index, paragraph, actionName)
                                                        }}
                                                    >
                                                        <CiEdit size={13} />
                                                    </Button>
                                                </Tooltip>
                                                <Tooltip content={t('Ask')} placement='bottom'>
                                                    <Button
                                                        size='mini'
                                                        kind='tertiary'
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            handleAsk(index, actionName)
                                                        }}
                                                    >
                                                        <VscReply size={13} />
                                                    </Button>
                                                </Tooltip>
                                                <Tooltip content={t('Copy')} placement='bottom'>
                                                    <Button
                                                        size='mini'
                                                        kind='tertiary'
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            handleCopy(paragraph)
                                                        }}
                                                    >
                                                        <RxCopy size={13} />
                                                    </Button>
                                                </Tooltip>
                                                <Tooltip content={t('Speak')} placement='bottom'>
                                                    <div
                                                        className={styles.actionButton}
                                                        onClick={() =>
                                                            handleTranslatedSpeakAction(
                                                                messageId,
                                                                conversationId,
                                                                paragraph
                                                            )
                                                        }
                                                    >
                                                        {isSpeakingTranslatedText ? (
                                                            <SpeakerMotion />
                                                        ) : (
                                                            <RxSpeakerLoud size={13} />
                                                        )}
                                                    </div>
                                                </Tooltip>
                                            </Block>
                                        )}
                                    </Block>
                                )}
                            </Block>
                        )
                    )}
                </>
            )
            switch (format) {
                case 'markdown':
                case 'text':
                    if (showFullQuoteText) {
                        return (
                            <Block>
                                <Button onClick={() => setShowFullQuoteText(false)} size='mini'>
                                    {t('Show Less')}
                                </Button>
                                {content}
                            </Block>
                        )
                    } else {
                        return content
                    }
                case 'latex':
                    return <Latex>{text}</Latex>
                default:
                    return <Block>{text}</Block>
            }
        },
        [
            editingAction,
            handleTextSelection,
            editingParagraph,
            editedText,
            t,
            askingParagraph,
            independentText,
            currentAiAnswer,
            hoveredParagraph,
            styles.actionButton,
            isSpeakingTranslatedText,
            handleSaveEditedText,
            setIndependentText,
            handleAskSubmit,
            handleEdit,
            handleAsk,
            handleCopy,
            handleTranslatedSpeakAction,
            messageId,
            conversationId,
            showFullQuoteText,
            setShowFullQuoteText,
        ]
    )

    // 当 answers 更新时，选择最新的标签
    useEffect(() => {
        if (!answers) return
        const currentActions = Object.keys(answers)
        if (currentActions.length > 0) {
            const latestAction = currentActions[currentActions.length - 1]
            console.log('[AnswerManager] Selecting latest action:', latestAction)
            setExpandedActions(latestAction)
        }
    }, [answers]) // 只依赖 answers 的变化

    // 处理标签切换
    const handleTabChange = useCallback((actionName: string) => {
        console.log('[AnswerManager] Switching to tab:', actionName)
        setExpandedActions(actionName)
    }, [])

    // 更新可见标签的逻辑保持不变
    const updateVisibleTabs = useCallback(() => {
        if (!containerRef.current || !answers) return

        const containerWidth = containerRef.current.offsetWidth
        const availableWidth = containerWidth - ACTION_BUTTONS_WIDTH
        const allTabs = Object.keys(answers)

        let totalWidth = 0
        const newVisibleTabs: string[] = []
        const newHiddenTabs: string[] = []

        // 确保当前选中的标签始终可见
        if (expandedActions && allTabs.includes(expandedActions)) {
            newVisibleTabs.push(expandedActions)
            totalWidth += MAX_TAB_WIDTH
        }

        // 处理其他标签
        allTabs.forEach((tab) => {
            if (tab === expandedActions) return // 过已添加的选中标签

            const isLastVisibleTab = newVisibleTabs.length === allTabs.length - 1
            const needsMoreButton = !isLastVisibleTab
            const spaceNeeded = needsMoreButton ? MORE_TAB_WIDTH : 0

            if (totalWidth + MAX_TAB_WIDTH + spaceNeeded <= availableWidth) {
                newVisibleTabs.push(tab)
                totalWidth += MAX_TAB_WIDTH
            } else {
                newHiddenTabs.push(tab)
            }
        })

        setVisibleTabs(newVisibleTabs)
        setHiddenTabs(newHiddenTabs)
    }, [answers, expandedActions])

    useEffect(() => {
        const debouncedUpdate = debounce(updateVisibleTabs, 100)
        const resizeObserver = new ResizeObserver(debouncedUpdate)

        updateVisibleTabs() // 初始化调用

        if (containerRef.current) {
            resizeObserver.observe(containerRef.current)
        }

        return () => {
            resizeObserver.disconnect()
            debouncedUpdate.cancel()
        }
    }, [updateVisibleTabs])

    if (showFullQuoteText && selectedWord?.text) {
        return <Block>{renderContent(selectedWord.text, 'markdown', undefined)}</Block>
    }

    return (
        <Block data-testid='answer-manager'>
            <Block
                ref={containerRef}
                display='flex'
                alignItems='center'
                marginBottom='16px'
                $style={{
                    borderBottom: '1px solid #e0e0e0',
                    gap: '4px',
                    width: '100%',
                }}
            >
                {visibleTabs.map((actionName) => (
                    <Block
                        key={actionName}
                        padding='4px 8px'
                        onClick={() => handleTabChange(actionName)}
                        $style={{
                            cursor: 'pointer',
                            borderBottom: expandedActions === actionName ? '2px solid #276EF1' : '2px solid transparent',
                            color: expandedActions === actionName ? '#276EF1' : 'inherit',
                            whiteSpace: 'nowrap',
                            transition: 'all 0.2s',
                            fontSize: '12px',
                            ':hover': {
                                backgroundColor: 'rgba(39, 110, 241, 0.1)',
                            }
                        }}
                    >
                        {actionName}
                    </Block>
                ))}

                {/* More 下拉菜单 */}
                {hiddenTabs.length > 0 && (
                    <StatefulPopover
                        content={({ close }) => (
                            <StatefulMenu
                                items={hiddenTabs.map((key) => ({ id: key, label: key }))}
                                onItemSelect={({ item }) => {
                                    handleTabChange(item.id)
                                    close()
                                }}
                                overrides={{
                                    List: {
                                        style: {
                                            maxWidth: '300px',
                                            width: 'auto',
                                            minWidth: '150px',
                                        },
                                    },
                                    Option: {
                                        props: {
                                            getStyles: () => ({
                                                whiteSpace: 'normal',
                                                wordBreak: 'break-word',
                                            }),
                                        },
                                    },
                                }}
                            />
                        )}
                        placement={PLACEMENT.bottomLeft}
                    >
                        <Block
                            padding='4px 8px'
                            display='flex'
                            alignItems='center'
                            $style={{
                                'cursor': 'pointer',
                                'fontSize': '12px',
                                'borderBottom': '2px solid transparent',
                                ':hover': {
                                    backgroundColor: 'rgba(39, 110, 241, 0.1)',
                                },
                            }}
                        >
                            {t('More')} <ChevronDown size={12} style={{ marginLeft: '4px' }} />
                        </Block>
                    </StatefulPopover>
                )}
            </Block>

            {/* 内容区域添加日志 */}
            {Object.entries(answers || {}).map(([actionName, answer]) => {
                return (
                    expandedActions === actionName && (
                        <Block key={actionName} width='100%'>
                            {renderContent(answer.text, answer.format, actionName)}
                            <Block className={styles.actionButtonsContainer} data-testid='answer-actions'>
                                {!isLoading && (
                                    <Tooltip content={t('Retry')} placement='bottom'>
                                        <div onClick={() => forceTranslate()} className={styles.actionButton}>
                                            <RxReload size={15} />
                                        </div>
                                    </Tooltip>
                                )}
                                <Tooltip content={t('Speak')} placement='bottom'>
                                    <div
                                        className={styles.actionButton}
                                        onClick={() =>
                                            handleTranslatedSpeakAction(messageId, conversationId, answer.text)
                                        }
                                    >
                                        {isSpeakingTranslatedText ? <SpeakerMotion /> : <RxSpeakerLoud size={15} />}
                                    </div>
                                </Tooltip>
                                <Tooltip content={t('Copy to clipboard')} placement='bottom'>
                                    <div className={styles.actionButton}>
                                        <CopyButton text={answer.text} styles={styles} />
                                    </div>
                                </Tooltip>
                                <Tooltip content={t('Add to Anki')}>
                                    <div
                                        data-testid='add-to-anki-button'
                                        onClick={() => addToAnki(selectedGroup, finalText, answer.text)}
                                        className={styles.actionButton}
                                    >
                                        <AiOutlinePlusSquare size={15} />
                                    </div>
                                </Tooltip>
                                <Tooltip content={t('Any question to this answer?')} placement='bottom'>
                                    <div onClick={() => toggleMessageCard()} className={styles.actionButton}>
                                        <AiOutlineQuestionCircle size={15} />
                                    </div>
                                </Tooltip>
                            </Block>
                        </Block>
                    )
                )
            })}
        </Block>
    )
}

export default TranslationManager
