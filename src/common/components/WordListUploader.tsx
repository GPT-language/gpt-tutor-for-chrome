import React, { useRef, ChangeEvent, useState, useEffect } from 'react'
import { useChatStore } from '@/store/file/store'
import { Word } from '../internal-services/db'
import { fileService } from '../internal-services/file'

const WordListUploader = () => {
    const {
        words,
        files,
        categories,
        selectedWord,
        currentFileId,
        selectedWords,
        selectedCategory,
        addFile,
        selectFile,
        deleteFile,
        searchWord,
        selectWord,
        setCurrentFileId,
        addCategory,
        deleteCategory,
        loadWords,
        loadFiles,
        deleteWords,
        setSelectedCategory,
        getInitialFile,
    } = useChatStore()
    const fileInputRef = useRef<HTMLInputElement>(null)
    const [showNewCategoryInput, setShowNewCategoryInput] = useState<boolean>(false)
    const [hoverCategory, setHoverCategory] = useState<string | null>(null)
    const [newCategory, setNewCategory] = useState<string>('')
    const [currentPage, setCurrentPage] = useState<number>(1)
    const itemsPerPage = 10
    const [searchTerm, setSearchTerm] = useState<string>('')
    const [numPages, setNumPages] = useState<number>(1)
    const [IsInitialized, setIsInitialized] = useState<boolean>(false)
    const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files ? event.target.files[0] : null
        if (file && selectedCategory) {
            addFile(file, selectedCategory)
        }
        localStorage.setItem('files', JSON.stringify(files))
    }

    const handleFileSelect = (event: ChangeEvent<HTMLSelectElement>) => {
        const fileId = Number(event.target.value)
        console.log('handleFileSelect', fileId)
        selectFile(fileId)
    }

    const getDisplayedWords = () => {
        return words
    }

    const handleCategoryChange = async (cat: string) => {
        setSelectedCategory(cat)
        setHoverCategory(cat)
        localStorage.setItem('currentCategory', JSON.stringify(cat))
        loadFiles(cat)
        deleteWords()
        const files = await fileService.fetchFilesByCategory(cat)
        if (files.length > 0 && files[0].id) {
            setCurrentFileId(files[0].id)
        } else {
            setCurrentFileId(0)
        }
    }

    const handleAddCategory = () => {
        if (newCategory?.trim()) {
            addCategory(newCategory)
        }
        setShowNewCategoryInput(false)
    }

    const handleDeleteCategory = (cat: string) => {
        deleteCategory(cat)
    }

    const handleSearchSubmit = () => {
        searchWord(searchTerm)
    }

    const handleWordClick = (word: Word) => {
        selectWord(word)
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
        if (currentFileId && IsInitialized && selectedWords[currentFileId]) {
            const saveWord = selectedWords[currentFileId]
            if (saveWord) {
                selectWord(saveWord)
                const page = Math.floor((saveWord.idx - 1) / itemsPerPage) + 1
                loadWords(currentFileId, page)
                setCurrentPage(page)
            } else {
                // 处理无有效选中词条的情况
                console.log(`No selected word for fileId: ${currentFileId}`)
                loadWords(currentFileId, 1)
                setCurrentPage(1)
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentFileId, IsInitialized])

    useEffect(() => {
        loadFiles(selectedCategory)
    }, [selectedCategory, loadFiles])

    return (
        <div style={{ height: '100%', overflow: 'auto' }}>
            <div>
                {categories.map((cat) => (
                    <div
                        key={cat}
                        onMouseEnter={() => setHoverCategory(cat)}
                        onMouseLeave={() => setHoverCategory(null)}
                        style={{ display: 'inline-block', position: 'relative' }}
                    >
                        <button
                            onClick={() => handleCategoryChange(cat)}
                            style={{ fontWeight: selectedCategory === cat ? 'bold' : 'normal', cursor: 'pointer' }}
                        >
                            {cat}
                            {hoverCategory === cat && (
                                <span
                                    onClick={() => handleDeleteCategory(cat)}
                                    style={{
                                        position: 'absolute',
                                        top: '-5px',
                                        cursor: 'pointer',
                                        color: 'black',
                                    }}
                                >
                                    x
                                </span>
                            )}
                        </button>
                    </div>
                ))}
                <button onClick={() => setShowNewCategoryInput(true)} style={{ fontWeight: 'normal' }}>
                    +
                </button>
            </div>
            {showNewCategoryInput && (
                <div>
                    <input
                        type='text'
                        value={newCategory}
                        onChange={(e) => setNewCategory(e.target.value)}
                        placeholder='输入新分类'
                    />
                    <button onClick={handleAddCategory}>保存</button>
                </div>
            )}
            <select key={currentFileId} onChange={handleFileSelect} value={currentFileId}>
                {files.map((file) => (
                    <option key={file.id} value={file.id}>
                        {file.name}
                    </option>
                ))}
            </select>

            <span
                onClick={(e) => {
                    e.stopPropagation()
                    deleteFile(currentFileId)
                    loadFiles(selectedCategory)
                }}
                style={{
                    marginLeft: '10px',
                    cursor: 'pointer',
                    color: 'balck',
                }}
            >
                x
            </span>
            <span
                onClick={(e) => {
                    e.stopPropagation()
                    if (fileInputRef.current) {
                        fileInputRef.current.click()
                    }
                }}
                style={{
                    marginLeft: '10px',
                    cursor: 'pointer',
                    color: 'green',
                }}
            >
                +
            </span>
            <input
                ref={fileInputRef}
                type='file'
                onChange={handleFileChange}
                accept='.csv'
                style={{ display: 'none' }}
            />
            <div></div>
            <ol start={(currentPage - 1) * itemsPerPage + 1}>
                {getDisplayedWords().map((entry, index) => (
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
            <div>
                <button onClick={prevPageHandler} disabled={currentPage === 1}>
                    Prev
                </button>
                <button onClick={nextPageHandler} disabled={currentPage === numPages}>
                    Next
                </button>
            </div>
            <div>
                <input
                    type='text'
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder='输入搜索文本'
                />
                <button
                    onClick={handleSearchSubmit}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            handleSearchSubmit()
                        }
                    }}
                >
                    搜索
                </button>
            </div>
        </div>
    )
}

export default WordListUploader
