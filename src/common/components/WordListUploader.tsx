import React, { useState, useEffect, useRef, ChangeEvent } from 'react'
import { useChatStore } from '@/store/file/store'
import { Word } from '../internal-services/db'
import { fileService } from '../internal-services/file'
import { Button, KIND, SIZE } from 'baseui-sd/button'
import { BiFirstPage, BiLastPage } from 'react-icons/bi'
import { rgb } from 'polished'
import { useTranslation } from 'react-i18next'
import toast from 'react-hot-toast'
import { BsClockHistory, BsArrowRepeat } from 'react-icons/bs'
import { styled } from 'styletron-react'
import { AiOutlineDelete } from 'react-icons/ai'
import { Select } from 'baseui-sd/select'

const SidebarContainer = styled('div', ({ $showSidebar }: { $showSidebar: boolean }) => ({
    width: $showSidebar ? '250px' : '0px',
    height: $showSidebar ? '100%' : '0px',
    marginRight: '10px',
    backgroundColor: '#f5f5f5',
    transition: 'width 0.3s ease',
    overflow: 'hidden',
    boxShadow: '2px 0 5px rgba(0,0,0,0.1)',
    position: 'relative',
}))

const ContentContainer = styled('div', {
    padding: '10px',
    overflowY: 'auto',
    height: '100%',
})

const WordListUploader = () => {
    const {
        words,
        files,
        selectedWord,
        currentFileId,
        selectedWords,
        selectedGroup,
        selectWord,
        addFile,
        loadWords,
        loadFiles,
        getInitialFile,
        setIsShowActionList,
        setShowWordBookManager,
        selectFile,
        deleteFile,
        currentPage,
        setCurrentPage,
        setActionStr,
        showSidebar,
        setSelectedGroup,
        refreshTextArea,
    } = useChatStore()
    const itemsPerPage = 10
    const { t } = useTranslation()
    const [numPages, setNumPages] = useState<number>(1)
    const [IsInitialized, setIsInitialized] = useState<boolean>(false)
    const [displayWords, setDisplayWords] = useState<Word[]>(words)
    const [currentTime, setCurrentTime] = useState<Date>(new Date())
    const [latestNextWordNeedToReview, setLatestNextWordNeedToReview] = useState<Date | null>(null)
    const reminderIntervalRef = useRef<NodeJS.Timeout | null>(null)
    const reviewWordsCountRef = useRef(0)
    const hasShownReviewNotificationRef = useRef(false)
    const [isGridView, setIsGridView] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const options = [
        ...files.map((file) => ({
            id: file.id,
            label: file.name,
        })),
        { id: 0, label: t('Download') },
        { id: -1, label: t('Upload') },
    ]

    const handleSliderChange = (value: number | number[]) => {
        if (Array.isArray(value)) {
            selectFile(value[0])
        } else {
            selectFile(value)
        }
    }

    const onChange = (params: { value: { id: number; label: string }[] }) => {
        const { value } = params
        if (value.length > 0) {
            if (value[0].id === 0) {
                setShowWordBookManager(true)
            } else if (value[0].id === -1) {
                // 新增的逻辑
                fileInputRef.current?.click()
            } else {
                selectFile(value[0].id)
            }
        }
    }

    const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files ? event.target.files[0] : null
        if (file && selectedGroup) {
            addFile(file, selectedGroup)
        }
    }
    // 在渲染前检查 currentFileId 和 files 是否有效
    const validValue = files.some((file) => file.id === currentFileId)
        ? options.filter((option) => option.id === currentFileId)
        : []
    const handleWordClick = (word: Word) => {
        selectWord(word)
        refreshTextArea()
        setIsShowActionList(false)
    }

    const changePage = async (newPageNumber: number) => {
        if (!currentFileId) {
            return
        }
        const success = await loadWords(currentFileId, newPageNumber, itemsPerPage)
        if (success) {
            setCurrentPage(newPageNumber)
        } else {
            console.error('Failed to load words for page', newPageNumber)
        }
    }

    const nextPageHandler = () => {
        const newPage = currentPage + 1
        if (newPage <= numPages) {
            changePage(newPage)
        }
    }

    const prevPageHandler = () => {
        const newPage = currentPage - 1
        if (newPage >= 1) {
            changePage(newPage)
        }
    }
    function formatNextReviewTime(ms: number) {
        let seconds = Math.floor(ms / 1000)
        let minutes = Math.floor(seconds / 60)
        let hours = Math.floor(minutes / 60)
        const days = Math.floor(hours / 24)
        seconds = seconds % 60
        minutes = minutes % 60
        hours = hours % 24
        if (minutes < 1) {
            return `${seconds}s`
        } else if (hours < 1) {
            return `${minutes}min ${seconds}s`
        } else if (days < 1) {
            return `${hours}h ${minutes}min ${seconds}s`
        } else {
            return `${days}d ${hours}h ${minutes}min ${seconds}s`
        }
    }

    useEffect(() => {
        async function initialize() {
            const isInitialized = await getInitialFile()
            if (isInitialized) {
                setIsInitialized(true)
            }
        }

        initialize()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    useEffect(() => {
        const fetchNumPages = async () => {
            if (!currentFileId) {
                return
            }
            const totalWordCount = await fileService.getTotalWordCount(currentFileId)
            const totalPages = Math.ceil(totalWordCount / itemsPerPage)
            setNumPages(totalPages)
        }

        if (currentFileId) {
            fetchNumPages()
        }
    }, [currentFileId, itemsPerPage])

    useEffect(() => {
        if (!IsInitialized || !currentFileId) {
            console.log('Not initialized or no current file')
            return
        }

        if (!selectedWords[currentFileId]) {
            console.log('No selected word for current file, loading first page')
            loadWords(currentFileId, 1, itemsPerPage)
            setCurrentPage(1)
            selectWord(words[0])
        } else {
            console.log('Selected word exists for current file')
            const saveWord = selectedWords[currentFileId]
            if (saveWord) {
                console.log('Selecting saved word:', saveWord)
                selectWord(saveWord)
                const page = Math.floor((saveWord.idx - 1) / itemsPerPage) + 1
                console.log('Calculated page:', page)
                loadWords(currentFileId, page, itemsPerPage)
                setCurrentPage(page)
            } else {
                console.log('No valid selected word, loading first page')
                loadWords(currentFileId, 1, itemsPerPage)
                setCurrentPage(1)
                selectWord(words[0])
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentFileId, IsInitialized])

    useEffect(() => {
        loadFiles(selectedGroup)
    }, [selectedGroup, loadFiles])

    useEffect(() => {
        if (!currentFileId) {
            return
        }
        loadWords(currentFileId, currentPage, itemsPerPage)
    }, [currentFileId, currentPage, loadWords, itemsPerPage])

    useEffect(() => {
        const current = new Date()
        const updateReviewStatus = async () => {
            if (!currentFileId) {
                setDisplayWords([])
                return
            }
            const fileWords = (await fileService.fetchFileDetailsById(currentFileId))?.words || []
            const reviewWords = fileWords.filter(
                (word) => !word.completed && word.nextReview && word.nextReview <= new Date()
            )
            reviewWordsCountRef.current = reviewWords.length // 更新 ref
            if (reviewWords.length > 0 && !hasShownReviewNotificationRef.current) {
                hasShownReviewNotificationRef.current = true
                toast(t('There are ') + reviewWords.length + t(' words need to review'), {
                    icon: '🔔',
                    duration: 5000,
                })
            }
            if (selectedGroup === 'Review') {
                // 计算最新的需要复习的单词，即nextReview大于当前时间且最接近当前时间的单词
                if (words.length === 0) {
                    let closest: Word | null = null

                    fileWords.forEach((word) => {
                        if (!word.nextReview) {
                            return
                        }
                        if (word.nextReview > current) {
                            if (
                                !closest ||
                                (closest.nextReview &&
                                    word.nextReview.getTime() - current.getTime() <
                                        closest.nextReview.getTime() - current.getTime())
                            ) {
                                closest = word
                            }
                        }
                    })
                    setLatestNextWordNeedToReview(closest ? closest.nextReview : null)
                    setDisplayWords([])
                } else if (words.length > 0) {
                    setLatestNextWordNeedToReview(null)
                    setActionStr(t('There are ') + reviewWordsCountRef.current + t(' words need to review'))
                    // 根据当前页码计算起始索引和终止索引
                    const startIndex = (currentPage - 1) * itemsPerPage
                    const endIndex = startIndex + itemsPerPage
                    console.log('startIndex', startIndex)
                    console.log('endIndex', endIndex)
                    // 切割数组以只包含当前页的单词
                    setDisplayWords(reviewWords.slice(startIndex, endIndex))
                } else {
                    // 如果没有需要复习的单词，清除定时提醒
                    if (reminderIntervalRef.current) {
                        clearInterval(reminderIntervalRef.current)
                        reminderIntervalRef.current = null
                    }
                }
            } else {
                setDisplayWords(words)
            }
        }
        updateReviewStatus()
    }, [words, currentPage, selectedGroup, currentFileId, setActionStr, t, hasShownReviewNotificationRef])

    useEffect(() => {
        if (reviewWordsCountRef.current === 0) {
            if (reminderIntervalRef.current) {
                clearInterval(reminderIntervalRef.current)
                reminderIntervalRef.current = null
            }
            return
        }
        const showReminder = () => {
            toast(t('There are ') + reviewWordsCountRef.current + t(' words need to review'), {
                icon: '🔔',
                duration: 5000,
            })
        }
        showReminder() // 立即显示一次提醒

        reminderIntervalRef.current = setInterval(showReminder, 10 * 1000) // 每10分钟提醒一次

        return () => {
            if (reminderIntervalRef.current) {
                clearInterval(reminderIntervalRef.current)
            }
        }
    }, [t])

    useEffect(() => {
        if (selectedGroup !== 'Review' || !currentFileId) {
            return
        }
        if (words.length !== 0) {
            return
        }
        if (latestNextWordNeedToReview && currentFileId) {
            const reviewTimer = latestNextWordNeedToReview.getTime() - currentTime.getTime()
            setActionStr(t('All reviewed. Next review time:') + formatNextReviewTime(reviewTimer))
        } else {
            setActionStr(t('All reviewed'))
        }
    }, [currentFileId, currentTime, latestNextWordNeedToReview, selectedGroup, setActionStr, t, words.length])

    useEffect(() => {
        const intervalId = setInterval(() => {
            setCurrentTime(new Date())
        }, 1000) // 每秒更新一次

        return () => clearInterval(intervalId) // 清理定时器
    }, []) // 空依赖数组，确保只在组件挂载时设置定时器

    const renderViewTabs = () => (
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'space-between' }}>
            <Button
                onClick={() => setSelectedGroup('History')}
                kind={KIND.tertiary}
                size={SIZE.compact}
                style={selectedGroup === 'History' ? { backgroundColor: 'lightgray' } : {}}
            >
                <BsClockHistory />
            </Button>
            <Button
                onClick={() => setSelectedGroup('Review')}
                kind={KIND.tertiary}
                size={SIZE.compact}
                style={selectedGroup === 'Review' ? { backgroundColor: 'lightgray' } : {}}
            >
                <BsArrowRepeat />
            </Button>
        </div>
    )

    const GridView = ({
        words,
        selectedWord,
        onWordClick,
    }: {
        words: Word[]
        selectedWord: Word
        onWordClick: (word: Word) => void
    }) => {
        const containerRef = useRef(null)
        const [itemsPerRow, setItemsPerRow] = useState(2)

        useEffect(() => {
            const updateItemsPerRow = () => {
                if (containerRef.current) {
                    const containerWidth = containerRef.current.offsetWidth
                    const itemWidth = 100 // 假设每个单词项的最小宽度为150px
                    const newItemsPerRow = Math.max(2, Math.floor(containerWidth / itemWidth))
                    setItemsPerRow(newItemsPerRow)
                }
            }

            updateItemsPerRow()
            window.addEventListener('resize', updateItemsPerRow)
            return () => window.removeEventListener('resize', updateItemsPerRow)
        }, [])

        return (
            <div ref={containerRef} style={{ display: 'flex', flexWrap: 'wrap', flexBasis: '30%', maxWidth: '250px' }}>
                {words.map((word, index) => (
                    <div
                        key={index}
                        style={{
                            width: `${100 / itemsPerRow}%`,
                            padding: '10px',
                            boxSizing: 'border-box',
                            cursor: 'pointer',
                            backgroundColor:
                                selectedWord && word.text === selectedWord.text ? rgb(255, 255, 0) : 'transparent',
                        }}
                        onClick={() => onWordClick(word)}
                    >
                        {word.text}
                    </div>
                ))}
            </div>
        )
    }

    return (
        <SidebarContainer $showSidebar={showSidebar}>
            <div
                style={{
                    display: 'flex',
                    flexDirection: 'row',
                    width: '70%',
                    padding: '0 10px',
                }}
            >
                <Select
                    size={SIZE.compact}
                    options={options}
                    labelKey='label'
                    valueKey='id'
                    onChange={onChange}
                    value={validValue}
                    placeholder={t('Select a file') ?? 'Select a file'}
                    overrides={{
                        Root: {
                            style: () => ({
                                flexGrow: 1,
                                flexShrink: 1,
                                flexBasis: '0%', // 允许Select缩减至极小的宽度
                            }),
                        },
                        ControlContainer: {
                            style: ({ $theme }) => ({
                                'fontSize': '14px', // 调整字体大小
                                'lineHeight': '12px', // 调整行高
                                'height': '38px',
                                'maxWidth': '300px',
                                'backgroundColor': 'rgba(255, 255, 255, 0.5)',
                                ':hover': {
                                    borderColor: $theme.colors.borderPositive,
                                },
                            }),
                        },
                        DropdownListItem: {
                            style: ({ $theme }) => ({
                                'maxWidth': '300px',
                                'backgroundColor': $theme.colors.backgroundSecondary,
                                ':hover': {
                                    backgroundColor: $theme.colors.backgroundTertiary,
                                },
                                'overflow': 'visible',
                            }),
                        },
                        Placeholder: {
                            style: ({ $theme }) => ({
                                color: $theme.colors.contentSecondary,
                            }),
                        },
                        SingleValue: {
                            style: ({ $theme }) => ({
                                color: $theme.colors.contentPrimary,
                            }),
                        },
                    }}
                />

                <AiOutlineDelete
                    title={t('Delete this file') ?? 'Delete this file'}
                    onClick={(e) => {
                        e.stopPropagation()
                        deleteFile(currentFileId)
                    }}
                    style={{
                        marginLeft: '5px',
                        marginTop: '10px',
                        cursor: 'pointer',
                        color: 'black',
                        fontSize: '18px',
                        flexShrink: 0,
                    }}
                />
                <input
                    ref={fileInputRef}
                    type='file'
                    onChange={handleFileChange}
                    accept='.csv'
                    style={{ display: 'none' }}
                />
            </div>
            <ContentContainer>
                <div style={{ minHeight: '160px', width: '100%' }}>
                    {isGridView ? (
                        <GridView
                            words={displayWords}
                            selectedWord={selectedWord ?? words[0]}
                            onWordClick={handleWordClick}
                        />
                    ) : (
                        <ol start={(currentPage - 1) * itemsPerPage + 1} style={{ paddingLeft: '20px', margin: 0 }}>
                            {displayWords.map((entry, index) => {
                                // 检查 entry 和 entry.text 是否存在
                                if (!entry || typeof entry.text !== 'string') {
                                    return null // 如果 entry 或 entry.text 无效，则不渲染这个项
                                }

                                const displayText = entry.text.includes(' ')
                                    ? entry.text.split(' ').length > 15
                                        ? entry.text.split(' ').slice(0, 10).join(' ') + '...'
                                        : entry.text
                                    : entry.text.length > 12
                                    ? entry.text.substring(0, 10) + '...'
                                    : entry.text

                                return (
                                    <li
                                        key={index}
                                        style={{
                                            marginLeft: '0px',
                                            paddingLeft: '5px',
                                            cursor: 'pointer',
                                            backgroundColor:
                                                selectedWord && entry.text === selectedWord.text
                                                    ? rgb(255, 255, 0)
                                                    : 'transparent',
                                        }}
                                        onClick={() => handleWordClick(entry)}
                                    >
                                        {displayText}
                                    </li>
                                )
                            })}
                        </ol>
                    )}
                </div>
                <div
                    style={{
                        display: 'flex',
                        justifyContent: 'center',
                        gap: '20px',
                        width: '100%',
                        alignItems: 'center',
                    }}
                >
                    <Button size={SIZE.mini} kind='secondary' onClick={prevPageHandler} disabled={currentPage === 1}>
                        <BiFirstPage size={16} />
                    </Button>
                    <span>{currentPage}</span>
                    <Button
                        size={SIZE.mini}
                        kind='secondary'
                        onClick={nextPageHandler}
                        disabled={currentPage === numPages}
                    >
                        <BiLastPage size={16} />
                    </Button>
                </div>
            </ContentContainer>
        </SidebarContainer>
    )
}

export default WordListUploader
