import React, { useCallback, useMemo, useRef, useState } from 'react'
import { Block } from 'baseui-sd/block'
import { Button } from 'baseui-sd/button'
import Latex from 'react-latex-next'
import { Markdown } from './Markdown'
import { useChatStore } from '@/store/file/store'
import { Tooltip } from './Tooltip'
import { RxCopy, RxSpeakerLoud } from 'react-icons/rx'
import SpeakerMotion from './SpeakerMotion'
import { useTranslation } from 'react-i18next'
import { useStyles } from './Translator'
import { askAIWithoutHistory } from '../translate'
import { IEngine } from '../engines/interfaces'
import toast from 'react-hot-toast'
import { CiEdit } from 'react-icons/ci'
import { VscReply } from 'react-icons/vsc'
import { Textarea } from 'baseui-sd/textarea'
import TextareaWithActions from './TextAreaWithActions'
import { shallow } from 'zustand/shallow'
import ConversationView from './ConversationView'
import { ChatMessage } from '@/store/file/slices/chat/initialState'

interface ITranslationManagerProps {
    isLoading: boolean
    styles: ReturnType<typeof useStyles>
    showFullQuoteText: boolean
    setShowFullQuoteText: (show: boolean) => void
    forceTranslate: () => void
    messageId: string
    conversationId: string
    finalText: string
    quoteText: string
    engine: IEngine | undefined
}

const TranslationManager: React.FC<ITranslationManagerProps> = ({
    styles,
    showFullQuoteText,
    setShowFullQuoteText,
    messageId,
    conversationId,
    engine,
}) => {
    const [editingAction, setEditingAction] = useState<string | null>(null)
    const [editingParagraph, setEditingParagraph] = useState<number | null>(null)
    const [editedText, setEditedText] = useState('')
    const editorRef = useRef<HTMLDivElement>(null)
    const {
        answers,
        currentFileId,
        setAnswers,
        selectedWord,
        updateWordAnswers,
        updateFollowUpAnswer,
        editSentenceAnswer: updateSentenceAnswer,
    } = useChatStore()
    const [hoveredParagraph, setHoveredParagraph] = useState<number | null>(null)
    const { t } = useTranslation()
    const [askingParagraph, setAskingParagraph] = useState<number | null>(null)
    const [selectedText, setSelectedText] = useState<string>('')
    const [currentAiAnswer, setCurrentAiAnswer] = useState<string>('')
    const { independentText, setIndependentText } = useChatStore(
        (state) => ({
            independentText: state.independentText,
            setIndependentText: state.setIndependentText,
        }),
        shallow
    )
    const { isSpeaking, speakingMessageId, startSpeak, stopSpeak } = useChatStore((state) => ({
        isSpeaking: state.isSpeaking,
        speakingMessageId: state.speakingMessageId,
        startSpeak: state.startSpeak,
        stopSpeak: state.stopSpeak,
    }))

    const handleCopyMessage = (text: string) => {
        navigator.clipboard.writeText(text)
        toast.success(t('Copied to clipboard'))
    }

    const handleSpeakMessage = useCallback(
        async (text: string) => {
            if (isSpeaking && speakingMessageId === messageId) {
                stopSpeak()
            } else {
                await startSpeak({
                    text,
                    messageId,
                    conversationId,
                })
            }
        },
        [isSpeaking, speakingMessageId, messageId, stopSpeak, startSpeak, conversationId]
    )

    const handleAsk = useCallback(
        (index: number, saveKey?: string) => {
            let existingAnswer
            if (saveKey) {
                const followUpAnswers = selectedWord?.answers?.[saveKey]?.followUpAnswers || []
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
        async (text: string, index: number, saveKey?: string) => {
            if (!engine) {
                toast(t('Engine not defined') || 'Engine not defined')
                return
            }
            if (!text && !independentText) {
                toast(t('Please input your question') || 'Please input your question')
                return
            }
            console.log('handleAskSubmit', text, index, saveKey)
            const abortController = new AbortController()
            const { selectedWord, currentFileId, activateAction } = useChatStore.getState()

            try {
                await askAIWithoutHistory(
                    {
                        activateAction,
                        text: independentText,
                        context: text,
                        onMessage: async (message) => {
                            if (!message.content) {
                                return
                            }

                            setCurrentAiAnswer((currentAiAnswer) => {
                                if (message.isFullText) {
                                    return message.content
                                }
                                const newCurrentAiAnswer = message.isFullText
                                    ? message.content
                                    : currentAiAnswer + message.content
                                return newCurrentAiAnswer
                            })
                        },
                        onFinished: async () => {
                            setCurrentAiAnswer((currentAiAnswer) => {
                                const result = currentAiAnswer + '\n\n---\n\n'
                                return result
                            })

                            if (selectedWord && currentFileId && saveKey) {
                                try {
                                    await updateFollowUpAnswer(
                                        currentFileId,
                                        selectedWord.idx,
                                        index,
                                        finalAnswer,
                                        saveKey
                                    )
                                    console.log('Follow-up answer updated successfully')
                                } catch (error) {
                                    console.error('Failed to update follow-up answer:', error)
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
        [engine, independentText, t, updateFollowUpAnswer]
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
    const handleEdit = useCallback((paragraphIndex: number, text: string, saveKey?: string) => {
        setEditingAction(saveKey || null)

        setEditingParagraph(paragraphIndex)
        setEditedText(text)
    }, [])

    const handleSaveEditedText = useCallback(
        async (messageId: string, saveKey?: string) => {
            console.log('开始保存编辑文本:', {
                saveKey,
                editingParagraph,
                editedText,
                answers,
                selectedWord,
                currentFileId,
            })

            if (!saveKey) {
                console.error('There is no saveKey')
                return
            }

            if (!editingParagraph && editingParagraph !== 0) {
                console.warn('编辑段落索引无效:', editingParagraph)
                return
            }

            // 获取conversationMessages 中对应 messageId 的消息内容
            const currentTranslation = answers[saveKey]
            if (!currentTranslation) {
                console.error('未找到对应的translation:', saveKey)
                return
            }
            const messageContent = currentTranslation.conversationMessages?.find((message: ChatMessage) => {
                if (message.messageId === messageId) {
                    return message
                }
            })

            // 添加日志来检查分割前的文本
            // console.log('更新前的完整文本:', messageContent?.content)

            // 使用正确的分隔符分割本
            const paragraphs = messageContent?.content.split('\n').filter((p) => p.trim() !== '') || []
            // console.log('分割后的段落数组:', paragraphs)
            // console.log('要更新的段落索引:', editingParagraph)
            // console.log('更新前的段落内容:', paragraphs[editingParagraph])

            // 更新指定段落
            paragraphs[editingParagraph] = editedText
            // console.log('更新后的段落内容:', paragraphs[editingParagraph])

            // 使用正确的分隔符合并文本
            const updatedText = paragraphs.join('\n')
            // console.log('更新后的完整文本:', updatedText)

            // 找到对话记录中需要更新的message

            // 更新 conversationMessages 中对应 messageId 的消息内容
            const updatedMessages =
                currentTranslation.conversationMessages?.map((message: ChatMessage) => {
                    if (message.messageId === messageId) {
                        return {
                            ...message,
                            content: updatedText,
                        }
                    }
                    return message
                }) || []

            const updatedAnswers = {
                ...answers,
                [saveKey]: {
                    ...currentTranslation,
                    conversationMessages: updatedMessages,
                },
            }

            if (selectedWord && currentFileId) {
                try {
                    await updateWordAnswers(updatedAnswers)
                    console.log('成功更新answers:', updatedAnswers[saveKey].text)
                    setAnswers(updatedAnswers)
                    toast.success(t('Edit saved successfully'))
                } catch (error) {
                    console.error('更新失败:', error)
                    toast.error(t('Failed to save edit'))
                }
            } else {
                setAnswers(updatedAnswers)
            }

            setEditingAction(null)
            setEditingParagraph(null)
            setEditedText('')
        },
        [editingParagraph, editedText, answers, selectedWord, currentFileId, updateWordAnswers, setAnswers, t]
    )

    const handleCancel = () => {
        setEditingAction(null)
        setEditingParagraph(null)
        setEditedText('')
    }

    const splitIntoParagraphsAndSentences = (text: string): string[] => {
        if (!text) return []

        const paragraphs = text.split('\n').filter(Boolean)

        return paragraphs.flatMap((paragraph) => {
            // 处理特殊格式
            if (/^[•\-\d]+[\.\)]\s/.test(paragraph)) return paragraph // 处理列表项
            if (/^```/.test(paragraph)) return paragraph // 处理代码块
            if (/^\s*[#>]/.test(paragraph)) return paragraph // 处理标题和引用

            // 多语言句子分割
            const sentencePatterns = {
                // 英文句子
                en: /(?<=[.!?])\s+(?=[A-Z])/,
                // 中文句子 (以句号、问号、感叹号、分号等结尾)
                zh: /(?<=[。！？；])/,
                // 可以继续添加其他语言的规则
            }

            // 检测语言（简单判断，可以根据需要使用更复杂的语言检测）
            const hasChineseChars = /[\u4e00-\u9fa5]/.test(paragraph)
            const pattern = hasChineseChars ? sentencePatterns.zh : sentencePatterns.en

            const sentences = paragraph
                .split(pattern)
                .map((s) => s.trim())
                .filter(Boolean)

            // 如果分割后只有一个句子，返回原段落
            return sentences.length === 1 ? paragraph : sentences
        })
    }

    const handleTextSelection = useCallback(() => {
        console.log('handleTextSelection', askingParagraph)
        if (askingParagraph === null) return
        console.log('window.getSelection()', window.getSelection()?.toString().trim())
        const selectedText = window.getSelection()?.toString().trim()
        if (selectedText) {
            setSelectedText(selectedText)
            editorRef.current?.appendChild(document.createTextNode(selectedText))
        }
    }, [askingParagraph])

    const renderContent = useMemo(
        () => (text: string, format: string, messageId?: string, saveKey?: string) => {
            const paragraphs = splitIntoParagraphsAndSentences(text)
            const content = (
                <>
                    {paragraphs.map((paragraph, index) =>
                        paragraph.trim() === '' && editingAction !== saveKey ? null : (
                            <Block
                                key={`p-${index}`}
                                marginBottom='10px'
                                position='relative'
                                // 设置换行

                                onMouseEnter={() => setHoveredParagraph(index)}
                                onMouseLeave={() => setHoveredParagraph(null)}
                                $style={{
                                    width: '100%',
                                    whiteSpace: 'pre-wrap',
                                }}
                            >
                                {(editingAction === saveKey || (editingAction === null && saveKey === undefined)) &&
                                editingParagraph === index &&
                                messageId ? (
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
                                                onClick={() => handleSaveEditedText(messageId, saveKey)}
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
                                            selectedText={selectedText}
                                            editorRef={editorRef}
                                            onChange={(value: string) => {
                                                setIndependentText(value)
                                            }}
                                            onSubmit={() => handleAskSubmit(paragraph, index, saveKey)}
                                            minHeight='80px'
                                            showSubmitButton={false}
                                            showClearButton={false}
                                        />
                                        <Block
                                            display='flex'
                                            justifyContent='flex-start'
                                            marginTop='10px'
                                            width='100%'
                                            $style={{
                                                gap: '10px',
                                                flexDirection: 'row',
                                                marginLeft: '0px',
                                            }}
                                        >
                                            <Button
                                                kind='primary'
                                                size='mini'
                                                onClick={() => handleAskSubmit(paragraph, index, saveKey)}
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
                                                    width: '100%', // 确保块级元素占满容器宽度
                                                    overflowWrap: 'break-word', // 允许长单词断行
                                                    wordWrap: 'break-word', // 兼容性支持
                                                    whiteSpace: 'pre-wrap', // 保留换行符并自动换行
                                                    maxWidth: '100%', // 限制最大宽度
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
                                            flexWrap: 'wrap',
                                        }}
                                    >
                                        <Block
                                            $style={{
                                                flex: '1 1 auto',
                                                minWidth: 0,
                                                wordWrap: 'break-word',
                                                overflowWrap: 'break-word',
                                            }}
                                        >
                                            {format === 'markdown' ? <Markdown>{paragraph}</Markdown> : paragraph}
                                        </Block>
                                        {hoveredParagraph === index && (
                                            <Block
                                                display='flex'
                                                alignItems='center'
                                                position='relative'
                                                top='50%'
                                                $style={{
                                                    backgroundColor: 'transparent', // 半透明背景
                                                    padding: '0 4px', // 添加一些内边距
                                                    marginLeft: '8px',
                                                }}
                                            >
                                                <Tooltip content={t('Edit')} placement='bottom'>
                                                    <Button
                                                        size='mini'
                                                        kind='tertiary'
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            e.preventDefault()
                                                            handleEdit(index, paragraph, saveKey)
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
                                                            e.preventDefault()
                                                            handleAsk(index, saveKey)
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
                                                            e.preventDefault()
                                                            handleCopy(paragraph)
                                                        }}
                                                    >
                                                        <RxCopy size={13} />
                                                    </Button>
                                                </Tooltip>
                                                <Tooltip content={t('Speak')} placement='bottom'>
                                                    <div
                                                        className={styles.actionButton}
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            e.preventDefault()
                                                            handleSpeakMessage(paragraph)
                                                        }}
                                                    >
                                                        {isSpeaking ? <SpeakerMotion /> : <RxSpeakerLoud size={13} />}
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
            editingParagraph,
            editedText,
            t,
            askingParagraph,
            handleTextSelection,
            independentText,
            selectedText,
            currentAiAnswer,
            hoveredParagraph,
            styles.actionButton,
            isSpeaking,
            handleSaveEditedText,
            setIndependentText,
            handleAskSubmit,
            handleEdit,
            handleAsk,
            handleCopy,
            handleSpeakMessage,
            showFullQuoteText,
            setShowFullQuoteText,
        ]
    )

    if (showFullQuoteText && selectedWord?.text) {
        return <Block>{renderContent(selectedWord.text, 'markdown')}</Block>
    }

    return (
        <Block data-testid='answer-manager'>
            <ConversationView
                onCopy={handleCopyMessage}
                onSpeak={handleSpeakMessage}
                isSpeaking={isSpeaking && speakingMessageId === messageId}
                renderContent={renderContent}
            />
        </Block>
    )
}

export default TranslationManager
