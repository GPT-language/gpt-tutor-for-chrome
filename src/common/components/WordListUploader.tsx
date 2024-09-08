import React, { useState, useEffect, useRef } from 'react'
import { useChatStore } from '@/store/file/store'
import { Word } from '../internal-services/db'
import { fileService } from '../internal-services/file'
import { Button, KIND, SIZE } from 'baseui-sd/button'
import { BiFirstPage, BiLastPage } from 'react-icons/bi'
import { Search } from 'baseui-sd/icon'
import { rgb } from 'polished'
import { useTranslation } from 'react-i18next'
import toast from 'react-hot-toast'

const WordListUploader = () => {
    const {
        words,
        selectedWord,
        currentFileId,
        selectedWords,
        selectedGroup,
        searchWord,
        selectWord,
        loadWords,
        loadFiles,
        getInitialFile,
        setIsShowActionList,
        currentPage,
        setCurrentPage,
        setActionStr,
    } = useChatStore()
    const itemsPerPage = 10
    const { t } = useTranslation()
    const [searchTerm, setSearchTerm] = useState<string>('')
    const [numPages, setNumPages] = useState<number>(1)
    const [IsInitialized, setIsInitialized] = useState<boolean>(false)
    const [isHovering, setIsHovering] = useState(false)
    const [displayWords, setDisplayWords] = useState<Word[]>(words)
    const [currentTime, setCurrentTime] = useState<Date>(new Date())
    const [latestNextWordNeedToReview, setLatestNextWordNeedToReview] = useState<Date | null>(null)
    const reminderIntervalRef = useRef<NodeJS.Timeout | null>(null)
    const reviewWordsCountRef = useRef(0)
    const hasShownReviewNotificationRef = useRef(false)

    const handleSearchSubmit = () => {
        searchWord(searchTerm)
        setIsHovering(false)
    }

    const handleWordClick = (word: Word) => {
        selectWord(word)
        setIsShowActionList(false)
    }

    const changePage = async (newPageNumber: number) => {
        if (!currentFileId) {
            return
        }
        const success = await loadWords(currentFileId, newPageNumber)
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
            loadWords(currentFileId, 1)
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
                loadWords(currentFileId, page)
                setCurrentPage(page)
            } else {
                console.log('No valid selected word, loading first page')
                loadWords(currentFileId, 1)
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
        loadWords(currentFileId, currentPage)
    }, [currentFileId, currentPage, loadWords])

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

    return (
        <div style={{ height: '100%', overflow: 'auto', width: 'auto' }}>
            <div style={{ minHeight: '160px' }}>
                <ol start={(currentPage - 1) * itemsPerPage + 1}>
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
                <Button size={SIZE.mini} kind='secondary' onClick={nextPageHandler} disabled={currentPage === numPages}>
                    <BiLastPage size={16} />
                </Button>
            </div>
            <div
                onMouseEnter={() => setIsHovering(true)}
                style={{ display: 'flex', marginTop: '10px', marginLeft: '20px', maxHeight: '20px' }}
            >
                {isHovering ? (
                    <input
                        style={{ width: '120px' }} // 确保输入框的宽度与 div 一致
                        type='text'
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder={t('Search Word') ?? 'Search Word'}
                    />
                ) : (
                    <div
                        style={{
                            width: '120px',
                            height: '20px', // 指定高度以匹配 input 默认高度，可以根据实际情况调整
                            background: 'transparent', // 可选，确保背景透明
                            border: 'none', // 可选，移除边框
                            display: 'inline-block', // 确保与 input 的显示方式一臀
                        }}
                    ></div>
                )}
                <div onMouseEnter={() => setIsHovering(true)} onMouseLeave={() => setIsHovering(false)}>
                    <Button
                        kind={KIND.tertiary}
                        size='mini'
                        onClick={handleSearchSubmit}
                        onKeyDown={(e: React.KeyboardEvent) => {
                            if (e.key === 'Enter') {
                                handleSearchSubmit()
                            }
                        }}
                    >
                        <Search size='18px' title='' />
                    </Button>
                </div>
            </div>
        </div>
    )
}

export default WordListUploader
