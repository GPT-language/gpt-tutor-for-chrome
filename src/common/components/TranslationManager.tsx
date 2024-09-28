import React, { useCallback, useMemo, useState } from 'react'
import { Block } from 'baseui-sd/block'
import { Button } from 'baseui-sd/button'
import { ChevronDown, ChevronUp } from 'baseui-sd/icon'
import Latex from 'react-latex-next'
import { Markdown } from './Markdown'
import { useChatStore } from '@/store/file/store'
import { Textarea } from 'baseui-sd/textarea'
import { fileService } from '../internal-services/file'
import { Tooltip } from './Tooltip'
import { RxCopy, RxReload, RxSpeakerLoud } from 'react-icons/rx'
import { CopyButton } from './CopyButton'
import { Word } from '../internal-services/db'
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
    forceTranslate: () => void
    handleTranslatedSpeakAction: (messageId: string, conversationId: string, text: string) => void
    messageId: string
    conversationId: string
    finalText: string
    engine: IEngine | undefined
    addToAnki: (deckName: string, front: string, back: string) => void
    addWordToReviewFile: (word: Word, deckName: string) => void
}

const TranslationManager: React.FC<ITranslationManagerProps> = ({
    isLoading,
    isSpeakingTranslatedText,
    styles,
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
    const [expandedActions, setExpandedActions] = useState<Set<string>>(new Set())
    const { currentFileId, translations, setTranslations, selectedWord, selectedGroup, toggleMessageCard } =
        useChatStore()
    const [hoveredParagraph, setHoveredParagraph] = useState<number | null>(null)
    const { t } = useTranslation()
    const [askingParagraph, setAskingParagraph] = useState<number | null>(null)
    const [askQuestion, setAskQuestion] = useState('')
    const [aiAnswer, setAiAnswer] = useState('')
    const handleAsk = useCallback(
        (index: number, actionName: string) => {
            console.log('index is', index)
            console.log('actionName is', actionName)
            if (selectedWord && selectedWord.translations && selectedWord.translations[actionName]) {
                const comments = selectedWord.translations[actionName].comments
                console.log('comments is', comments)
                if (comments) {
                    const comment = comments.find((comment) => comment.idx === index)
                    console.log('comment is', comment)
                    if (comment) {
                        setAiAnswer(comment.text)
                    } else {
                        setAiAnswer('')
                    }
                }
            }
            setAskingParagraph(index)
            setAskQuestion('')
        },
        [selectedWord]
    )

    const handleAskSubmit = useCallback(
        async (text: string, actionName: string, index: number) => {
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
                            setAiAnswer((prevAnswer) => {
                                if (message.isFullText) {
                                    return prevAnswer + message.content
                                }
                                const newTranslatedText = message.isFullText
                                    ? message.content
                                    : prevAnswer + message.content

                                return newTranslatedText
                            })
                        },
                        onFinish: () => {
                            setAiAnswer((prevAnswer) => {
                                // 设置换行+分割线
                                const separator = '\n\n---\n\n'
                                const result = prevAnswer + separator
                                if (selectedWord && selectedWord.translations && currentFileId) {
                                    const updatedTranslations = {
                                        ...selectedWord.translations,
                                        [actionName]: {
                                            ...selectedWord.translations[actionName],
                                            comments: [
                                                ...(selectedWord.translations[actionName]?.comments || []),
                                                {
                                                    idx: index,
                                                    text: result,
                                                    createdAt: new Date(),
                                                    updatedAt: new Date(),
                                                },
                                            ],
                                        },
                                    }
                                    fileService.updateWordTranslations(currentFileId, selectedWord.idx, {
                                        ...selectedWord,
                                        translations: updatedTranslations,
                                    })
                                }
                                return result
                            })
                        },
                        onError: (error) => {
                            setAiAnswer(error)
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
        [askQuestion, currentFileId, engine, selectedWord]
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
    const handleEdit = (actionName: string, paragraphIndex: number, text: string) => {
        setEditingAction(actionName)
        setEditingParagraph(paragraphIndex)
        setEditedText(text)
    }

    const handleSave = useCallback(
        async (actionName: string) => {
            const currentTranslation = translations[actionName]
            const updatedParagraphs = currentTranslation.text
                .split('\n')
                .map((paragraph, index) => (index === editingParagraph ? editedText : paragraph))
            const updatedText = updatedParagraphs.join('\n')

            const updatedTranslations = {
                ...translations,
                [actionName]: {
                    ...currentTranslation,
                    text: updatedText,
                },
            }

            if (selectedWord && currentFileId) {
                try {
                    await fileService.updateWordTranslations(currentFileId, selectedWord.idx, {
                        ...selectedWord,
                        translations: updatedTranslations,
                    })
                    // 只在成功更新后设置状态
                    setTranslations(updatedTranslations)
                } catch (error) {
                    console.error('更新单词翻译失败:', error)
                    // 这里可以添加错误处理逻辑，比如显示一个错误提示
                }
            } else {
                // 如果没有选中的单词或文件ID，只更新本地状态
                setTranslations(updatedTranslations)
            }

            setEditingAction(null)
            setEditingParagraph(null)
        },
        [editingParagraph, editedText, selectedWord, currentFileId, translations, setTranslations]
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

    const renderContent = useMemo(
        () => (actionName: string, text: string, format: string) => {
            const paragraphs = text.split('\n')

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
                                                保存
                                            </Button>
                                            <Button
                                                onClick={handleCancel}
                                                kind='secondary'
                                                size='mini'
                                                style={{ marginRight: '10px' }}
                                            >
                                                取消
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
                                                    handleAskSubmit(paragraph, actionName, index)
                                                }
                                            }}
                                            placeholder='输入您的问题'
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
                                                onClick={() => handleAskSubmit(paragraph, actionName, index)}
                                            >
                                                提交
                                            </Button>
                                            <Button
                                                kind='secondary'
                                                size='mini'
                                                onClick={() => setAskingParagraph(null)}
                                            >
                                                取消
                                            </Button>
                                        </Block>
                                        {aiAnswer && (
                                            <Block
                                                $style={{
                                                    marginTop: '10px',
                                                    backgroundColor: '#f0f0f0',
                                                    padding: '10px',
                                                }}
                                            >
                                                <strong>AI回答：</strong>
                                                <Markdown>{aiAnswer}</Markdown>
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
                                                            handleEdit(actionName, index, paragraph)
                                                        }}
                                                    >
                                                        <CiEdit size={13}/>
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
            aiAnswer,
            hoveredParagraph,
            t,
            handleSave,
            handleAskSubmit,
            handleAsk,
            handleCopy,
        ]
    )

    return (
        <Block>
            {Object.entries(translations).map(([actionName, translation]) => (
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
                            {renderContent(actionName, translation.text, translation.format)}
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
                                            handleTranslatedSpeakAction(messageId, conversationId, translation.text)
                                        }
                                    >
                                        {isSpeakingTranslatedText ? <SpeakerMotion /> : <RxSpeakerLoud size={15} />}
                                    </div>
                                </Tooltip>
                                <Tooltip content={t('Copy to clipboard')} placement='bottom'>
                                    <div className={styles.actionButton}>
                                        <CopyButton text={translation.text} styles={styles} />
                                    </div>
                                </Tooltip>
                                <Tooltip content={t('Add to Anki')}>
                                    <div
                                        onClick={() => addToAnki(selectedGroup, finalText, translation.text)}
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
