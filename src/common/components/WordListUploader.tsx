import { useState, useEffect } from 'react'
import { useChatStore } from '@/store/file/store'
import { Word } from '../internal-services/db'
import { fileService } from '../internal-services/file'
import { Button, KIND, SIZE } from 'baseui-sd/button'
import { BiFirstPage, BiLastPage } from 'react-icons/bi'
import { Search } from 'baseui-sd/icon'
import { rgb } from 'polished'
import { useTranslation } from 'react-i18next'
const WordListUploader = () => {
    const {
        words,
        selectedWord,
        currentFileId,
        selectedWords,
        selectedCategory,
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

    const handleSearchSubmit = () => {
        searchWord(searchTerm)
        setIsHovering(false)
    }

    const handleWordClick = (word: Word) => {
        selectWord(word)
        setIsShowActionList(false)
    }

    const changePage = async (newPageNumber: number) => {
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

    function formatNextReviewTime(nextReview: number) {
        const current = new Date()
        const diff = nextReview - current.getTime() // difference in milliseconds
        const hours = Math.floor(diff / (1000 * 60 * 60))
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
        return `${hours}h ${minutes}min`
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
            const totalWordCount = await fileService.getTotalWordCount(currentFileId)
            const totalPages = Math.ceil(totalWordCount / itemsPerPage)
            setNumPages(totalPages)
        }

        if (currentFileId) {
            fetchNumPages()
        }
    }, [currentFileId, itemsPerPage])

    useEffect(() => {
        if (!IsInitialized) {
            return
        }
        if (!selectedWords[currentFileId]) {
            loadWords(currentFileId, 1)
            setCurrentPage(1)
            selectWord(words[0])
        }
        if (currentFileId && IsInitialized && selectedWords[currentFileId]) {
            const saveWord = selectedWords[currentFileId]
            if (saveWord) {
                selectWord(saveWord)
                const page = Math.floor((saveWord.idx - 1) / itemsPerPage) + 1
                loadWords(currentFileId, page)
                setCurrentPage(page)
            } else {
                // 处理无有效选中词条的情况
                loadWords(currentFileId, 1)
                setCurrentPage(1)
                selectWord(words[0])
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentFileId, IsInitialized])

    useEffect(() => {
        loadFiles(selectedCategory)
    }, [selectedCategory, loadFiles])

    useEffect(() => {
        loadWords(currentFileId, currentPage)
    }, [currentFileId, currentPage, loadWords])

    useEffect(() => {
        const updateReviewStatus = async () => {
            if (selectedCategory === 'Review' && currentFileId !== 0) {
                const current = new Date()
                const fileWords = (await fileService.fetchFileDetailsById(currentFileId))?.words || []
                const reviewWords = fileWords.filter((word) => word.nextReview && word.nextReview <= new Date())
                // 计算最新的需要复习的单词，即nextReview大于当前时间且最接近当前时间的单词
                if (words.length === 0) {
                    let closest: Word | null = null
                    let latestNextWordNeedToReview = ''

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
                    latestNextWordNeedToReview = formatNextReviewTime(closest.nextReview.getTime())
                    if (latestNextWordNeedToReview) {
                        setActionStr(t('All reviewed. Next review time:') + latestNextWordNeedToReview)
                    } else {
                        setActionStr(t('All reviewed'))
                    }
                } else if (words.length > 0) {
                    setActionStr(t('There are') + '' + reviewWords.length + '' + t('words need to review'))
                    // 根据当前页码计算起始索引和终止索引
                    const startIndex = (currentPage - 1) * itemsPerPage
                    const endIndex = startIndex + itemsPerPage
                    // 切割数组以只包含当前页的单词
                    setDisplayWords(reviewWords.slice(startIndex, endIndex))
                }
            } else {
                setActionStr('')
                setDisplayWords(words)
            }
        }
        updateReviewStatus()
        // 筛除nextReview还没到的单词
        // 后续还要增加reviewCount的筛除
    }, [words, currentPage, selectedCategory, currentFileId, setActionStr, t])
    return (
        <div style={{ height: '100%', overflow: 'auto', width: 'auto' }}>
            <div style={{ minHeight: '160px' }}>
                <ol start={(currentPage - 1) * itemsPerPage + 1}>
                    {displayWords.map((entry, index) => (
                        <li
                            key={index}
                            style={{
                                cursor: 'pointer',
                                backgroundColor:
                                    selectedWord && entry.text === selectedWord.text ? rgb(255, 255, 0) : 'transparent',
                            }}
                            onClick={() => handleWordClick(entry)}
                        >
                            {entry.text}
                        </li>
                    ))}
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
                        placeholder={t('Search word in this file') ?? 'Search word in this file'}
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
                        onKeyDown={(e) => {
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
