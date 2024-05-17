import React, { useRef, ChangeEvent, useState, useEffect } from 'react'
import { useChatStore } from '@/store/file/store' // 确保正确导入你的 store
import { Word } from '../internal-services/db'
import { fileService } from '../internal-services/file'

const WordListUploader = () => {
    const {
        words,
        currentPage,
        currentFileId,
        currentCategory,
        fileNames,
        categories,
        searchTerm,
        selectedWord,
        addFile,
        selectFile,
        deleteFile,
        nextPage,
        prevPage,
        searchWord,
        selectWord,
        addCategory,
        deleteCategory,
        setCurrentFileId,
        loadWords,
        setFileNames,
    } = useChatStore()
    const [hoveredCategory, setHoveredCategory] = useState<string | null>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const [showNewCategoryInput, setShowNewCategoryInput] = useState<boolean>(false)
    const [category, setCategory] = useState<string>('')
    const [isInitialized, setIsInitialized] = useState<boolean>(false)
    const itemsPerPage = 10
    const numPages = Math.ceil(words.length / itemsPerPage)
    const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files ? event.target.files[0] : null
        if (file) {
            addFile(file, currentCategory) // Assumes 'Category' is managed elsewhere or provided as a default
        }
    }

    const handleFileSelect = (event: ChangeEvent<HTMLSelectElement>) => {
        const fileId = Number(event.target.value)
        selectFile(fileId)
    }

    const getDisplayedWords = () => {
        return words.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
    }

    const handleCategoryChange = (cat: string) => {
        setCategory(cat)
        localStorage.setItem('currentCategory', cat)
    }

    const handleAddCategory = () => {
        if (category.trim()) {
            addCategory(category)
            setCategory('')
        }
        setShowNewCategoryInput(false)
    }

    const handleDeleteCategory = (cat: string) => {
        deleteCategory(cat)
    }

    const handleSearchSubmit = () => {
        searchWord()
    }

    const updateCurrentPage = (fileId: number, page: number) => {
        console.log('updateCurrentPage', fileId, page)
        const savedPages = JSON.parse(localStorage.getItem('currentPages') || '{}')
        savedPages[fileId] = page
        localStorage.setItem('currentPages', JSON.stringify(savedPages))
        console.log('savedPages updated', savedPages)
    }

    const handleWordClick = (word: Word) => {
        selectWord(word)
    }

    useEffect(() => {
        const loadFileNames = async () => {
            const files = await fileService.fetchFilesName(currentCategory)
            setFileNames(files)
        }

        loadFileNames()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [category])

    useEffect(() => {
        if (fileNames.length === 1) {
            setCurrentFileId(fileNames[0].id)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [fileNames])

    useEffect(() => {
        if (currentFileId) {
            loadWords(currentFileId)
        }
        setIsInitialized(true)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentFileId])

    useEffect(() => {
        if (selectedWord) {
            selectWord(selectedWord)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedWord])

    useEffect(() => {
        localStorage.setItem('selectedWord', JSON.stringify(selectedWord))
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedWord.text])

    useEffect(() => {
        localStorage.setItem('categories', JSON.stringify(categories))
    }, [categories])

    useEffect(() => {
        localStorage.setItem('currentPage', JSON.stringify(currentPage))
    }, [currentPage])

    useEffect(() => {
        localStorage.setItem('currentFileId', JSON.stringify(currentFileId))
    }, [currentFileId])

    useEffect(() => {
        localStorage.setItem('category', JSON.stringify(category))
    }, [category])

    useEffect(() => {
        if (isInitialized && currentFileId !== null) {
            updateCurrentPage(currentFileId, currentPage)
        }
    }, [currentPage, currentFileId, isInitialized])

    useEffect(() => {
        if (fileNames.length === 1 && currentFileId === 0) {
            setCurrentFileId(fileNames[0].id)
        }
    }, [fileNames, currentFileId, setCurrentFileId])

    return (
        <div style={{ height: '100%', overflow: 'auto' }}>
            <div>
                {categories.map((cat) => (
                    <div
                        key={cat}
                        onMouseEnter={() => setHoveredCategory(cat)}
                        onMouseLeave={() => setHoveredCategory(null)}
                        style={{ display: 'inline-block', position: 'relative' }}
                    >
                        <button
                            onClick={() => handleCategoryChange(cat)}
                            style={{ fontWeight: category === cat ? 'bold' : 'normal' }}
                        >
                            {cat}
                            {hoveredCategory === cat && (
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
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        placeholder='输入新分类'
                    />
                    <button onClick={handleAddCategory}>保存</button>
                </div>
            )}
            <select onChange={handleFileSelect} value={currentFileId}>
                {fileNames.map((file) => (
                    <option key={file.id} value={file.id}>
                        {file.name}
                    </option>
                ))}
            </select>
            <span
                onClick={(e) => {
                    e.stopPropagation()
                    deleteFile(currentFileId)
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
                            backgroundColor: entry.text === selectedWord.text ? 'yellow' : 'transparent',
                        }}
                        onClick={() => handleWordClick(entry)}
                    >
                        {entry.text}
                    </li>
                ))}
            </ol>
            <div>
                <button onClick={prevPage} disabled={currentPage === 1}>
                    Prev
                </button>
                <button onClick={nextPage} disabled={currentPage === numPages}>
                    Next
                </button>
            </div>
            <div>
                <input type='text' value={searchTerm} placeholder='输入搜索文本' />
                <button onClick={handleSearchSubmit}>搜索</button>
            </div>
        </div>
    )
}

export default WordListUploader
