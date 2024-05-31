import { useState, useEffect } from 'react'
import { useChatStore } from '@/store/file/store'
import { Word } from '../internal-services/db'
import { fileService } from '../internal-services/file'
import { Button, KIND, SIZE } from 'baseui-sd/button'
import { BiFirstPage, BiLastPage } from 'react-icons/bi'
import { Search } from 'baseui-sd/icon'
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
    } = useChatStore()
    const itemsPerPage = 10
    const [searchTerm, setSearchTerm] = useState<string>('')
    const [numPages, setNumPages] = useState<number>(1)
    const [IsInitialized, setIsInitialized] = useState<boolean>(false)
    const [currentPage, setCurrentPage] = useState<number>(1)
    const [displayWords, setDisplayWors] = useState<Word[]>(words)
    const [isHovering, setIsHovering] = useState(false)
    useEffect(() => {
        if (words.length > 10) {
            setCurrentPage(1)
            console.log('getDisplayedWords', words)
            const startIndex = 1
            const endIndex = 10
            console.log(words.slice(startIndex - 1, endIndex))
            setDisplayWors(words.slice(startIndex - 1, endIndex))
        } else {
            setDisplayWors(words)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [words, selectedWord?.idx])

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

    useEffect(() => {
        async function initialize() {
            const isInitialized = await getInitialFile() // 确保这个函数是异步的且返回布尔值
            if (isInitialized) {
                setIsInitialized(true)
            }
        }

        initialize()
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
        console.log('selectedWords', selectedWords)
        if (!selectedWords) {
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
                                    selectedWord && entry.text === selectedWord.text ? 'yellow' : 'transparent',
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
                        placeholder='在当前文件中搜索'
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
