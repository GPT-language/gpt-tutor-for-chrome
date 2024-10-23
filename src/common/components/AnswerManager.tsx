import React, { useCallback, useMemo, useState } from 'react'
import { Block } from 'baseui-sd/block'
import { Button } from 'baseui-sd/button'
import { ChevronDown, ChevronUp } from 'baseui-sd/icon'
import Latex from 'react-latex-next'
import { Markdown } from './Markdown'
import { useChatStore } from '@/store/file/store'
import { Textarea } from 'baseui-sd/textarea'
import { Tooltip } from './Tooltip'
import { RxCopy, RxReload, RxSpeakerLoud } from 'react-icons/rx'
import { CopyButton } from './CopyButton'
import { AiOutlinePlusSquare, AiOutlineQuestionCircle } from 'react-icons/ai'
import SpeakerMotion from './SpeakerMotion'
import { useTranslation } from 'react-i18next'
import { useStyles } from './Translator'
import { simpleTranslate } from '../translate'
import { IEngine } from '../engines/interfaces'
import toast from 'react-hot-toast'
import { CiEdit } from 'react-icons/ci'
import { VscReply } from 'react-icons/vsc'

interface ITranslationManagerProps {
    isLoading: boolean
    isSpeakingTranslatedText: boolean
    styles: ReturnType<typeof useStyles>
    showFullQuoteText: boolean
    forceTranslate: () => void
    handleTranslatedSpeakAction: (messageId: string, conversationId: string, text: string) => void
    messageId: string
    conversationId: string
    finalText: string
    quoteText: string
    engine: IEngine | undefined
    addToAnki: (deckName: string, front: string, back: string) => void
}

const TranslationManager: React.FC<ITranslationManagerProps> = ({
    isLoading,
    isSpeakingTranslatedText,
    styles,
    showFullQuoteText,
    forceTranslate,
    handleTranslatedSpeakAction,
    messageId,
    conversationId,
    addToAnki,
    finalText,
    quoteText,
    engine,
}) => {
    const [editingAction, setEditingAction] = useState<string | null>(null)
    const [editingParagraph, setEditingParagraph] = useState<number | null>(null)
    const [editedText, setEditedText] = useState('')
    const [expandedActions, setExpandedActions] = useState<Set<string>>(new Set())
    const {
        currentFileId,
        answers,
        setAnswers,
        selectedWord,
        selectedGroup,
        toggleMessageCard,
        updateWordAnswer,
        updateFollowUpAnswer,
        updateSentenceAnswer,
    } = useChatStore()
    const [hoveredParagraph, setHoveredParagraph] = useState<number | null>(null)
    const { t } = useTranslation()
    const [askingParagraph, setAskingParagraph] = useState<number | null>(null)
    const [askQuestion, setAskQuestion] = useState('')
    const [currentAiAnswer, setCurrentAiAnswer] = useState<string>('')

    const handleAsk = useCallback(
        (index: number, actionName?: string) => {
            let existingAnswer
            console.log('actionName when ask', actionName)
            console.log('index', index)
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
            setAskQuestion('')
        },
        [selectedWord]
    )

    const handleAskSubmit = useCallback(
        async (text: string, index: number, actionName?: string) => {
            if (!engine) {
                console.error('引擎未定义')
                return
            }
            const abortController = new AbortController()

            try {
                await simpleTranslate(
                    {
                        text: askQuestion,
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
                console.error('提交问题失败:', error)
                // 显示错误提示
            }
        },
        [askQuestion, currentFileId, engine, selectedWord, updateFollowUpAnswer, updateSentenceAnswer]
    )

    const handleCopy = useCallback(
        (text: string) => {
            navigator.clipboard.writeText(text)
            // 可以添加一个复制成功的提示
            toast(t('Copy to clipboard'), {
                duration: 3000,
                icon: '👏',
            })
        },
        [t]
    )
    const handleEdit = (paragraphIndex: number, text: string, actionName?: string) => {
        if (actionName) {
            setEditingAction(actionName)
        }
        setEditingParagraph(paragraphIndex)
        setEditedText(text)
    }

    const handleSave = useCallback(
        async (actionName: string) => {
            const currentTranslation = answers[actionName]
            const updatedParagraphs = currentTranslation.text
                .split('\n')
                .map((paragraph, index) => (index === editingParagraph ? editedText : paragraph))
            const updatedText = updatedParagraphs.join('\n')

            const updateWordAnswers = {
                ...answers,
                [actionName]: {
                    ...currentTranslation,
                    text: updatedText,
                },
            }

            if (selectedWord && currentFileId) {
                try {
                    updateWordAnswer(actionName, updatedText)
                    // 只在成功更新后设置状态
                    setAnswers(updateWordAnswers)
                } catch (error) {
                    console.error('更新单词翻译失败:', error)
                    // 这里可以添加错误处理逻辑，比如显示一个错误提示
                }
            } else {
                // 如果没有选中的单词或文件ID，只更新本地状态
                setAnswers(updateWordAnswers)
            }

            setEditingAction(null)
            setEditingParagraph(null)
        },
        [answers, selectedWord, currentFileId, editingParagraph, editedText, updateWordAnswer, setAnswers]
    )

    const handleCancel = () => {
        setEditingAction(null)
        setEditingParagraph(null)
        setEditedText('')
    }

    const toggleExpand = (actionName: string) => {
        setExpandedActions((prev) => {
            const newSet = new Set(prev)
            if (newSet.has(actionName)) {
                newSet.delete(actionName)
            } else {
                newSet.add(actionName)
            }
            return newSet
        })
    }

    const splitIntoParagraphsAndSentences = (text: string): string[] => {
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
            // todo: 实现其它语言的分句

            // 如果段落只有一个句子，直接返回；否则返回分割后的句子
            return sentences.length === 1 ? paragraph : sentences
        })
    }

    const renderContent = useMemo(
        () => (text: string, format: string, actionName?: string) => {
            const paragraphs = splitIntoParagraphsAndSentences(text)

            switch (format) {
                case 'markdown':
                case 'text':
                    return paragraphs.map((paragraph, index) =>
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
                                {editingAction === actionName && editingParagraph === index ? (
                                    <Block $style={{ width: '95%', alignItems: 'center', margin: '10px' }}>
                                        <Textarea
                                            value={askingParagraph === index ? askQuestion : editedText}
                                            onChange={(e) => setEditedText(e.currentTarget.value)}
                                            autoFocus
                                            rows={editedText.split('\n').length}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    handleSave(actionName)
                                                }
                                            }}
                                            overrides={{
                                                Input: {
                                                    style: {
                                                        minHeight: '100px',
                                                        resize: 'vertical',
                                                        width: '100%',
                                                    },
                                                },
                                            }}
                                        />
                                        <Block
                                            display='flex'
                                            justifyContent='flex-end'
                                            marginTop='10px'
                                            width='100%'
                                            $style={{ gap: '10px' }}
                                        >
                                            <Button onClick={() => handleSave(actionName)} kind='primary' size='mini'>
                                                {t('Save')}
                                            </Button>
                                            <Button
                                                onClick={handleCancel}
                                                kind='secondary'
                                                size='mini'
                                                style={{ marginRight: '10px' }}
                                            >
                                                {t('Cancel')}
                                            </Button>
                                        </Block>
                                    </Block>
                                ) : askingParagraph === index ? (
                                    <>
                                        <Block $style={{ fontStyle: 'italic', marginBottom: '10px' }}>
                                            <Markdown>{paragraph}</Markdown>
                                        </Block>
                                        <Textarea
                                            value={askQuestion}
                                            onChange={(e) => setAskQuestion(e.currentTarget.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    handleAskSubmit(paragraph, index, actionName)
                                                }
                                            }}
                                            placeholder={t('Input your question') || 'Input your question'}
                                            autoFocus
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
                    )
                case 'latex':
                    return <Latex>{text}</Latex>
                default:
                    return <Block>{text}</Block>
            }
        },
        [
            editingAction,
            editingParagraph,
            askingParagraph,
            askQuestion,
            editedText,
            currentAiAnswer,
            hoveredParagraph,
            t,
            styles.actionButton,
            isSpeakingTranslatedText,
            handleSave,
            handleAskSubmit,
            handleAsk,
            handleCopy,
            handleTranslatedSpeakAction,
            messageId,
            conversationId,
        ]
    )

    if (showFullQuoteText) {
        return <Block>{renderContent(quoteText, 'markdown', undefined)}</Block>
    }

    return (
        <Block>
            {Object.entries(answers).map(([actionName, answer]) => (
                <Block key={actionName} marginBottom={'20px'} width='100%'>
                    <Block
                        onClick={() => toggleExpand(actionName)}
                        display='flex'
                        alignItems='center'
                        $style={{ cursor: 'pointer' }}
                        backgroundColor={'inherit'}
                        padding={'4px 8px'}
                    >
                        {expandedActions.has(actionName) ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
                        <Block marginLeft={'10px'}>{actionName}</Block>
                    </Block>
                    {expandedActions.has(actionName) && (
                        <Block width='100%'>
                            {renderContent(answer.text, answer.format, actionName)}
                            <Block className={styles.actionButtonsContainer}>
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
                    )}
                </Block>
            ))}
        </Block>
    )
}

export default TranslationManager
