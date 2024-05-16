import React, { useState, useEffect, ChangeEvent, useRef } from 'react'
import { parse } from 'papaparse'
import { fileService } from '@/common/internal-services/file' // 调整路径以匹配你的项目结构
import { Word } from '../internal-services/db'

interface WordListUploaderProps {
    setOriginalText: (entry: Word) => void
}

const WordListUploader: React.FC<WordListUploaderProps> = ({ setOriginalText }) => {
    const [words, setWords] = useState<Word[]>([])
    const [currentPage, setCurrentPage] = useState(1)
    const [selectedWord, setSelectedWord] = useState<string | null>(null)
    const itemsPerPage = 10
    const [category, setCategory] = useState<string>('单词')
    const [fileNames, setFileNames] = useState<{ id: number; name: string }[]>([])
    const [currentFileId, setCurrentFileId] = useState<number>(
        localStorage.getItem('currentFileId') ? Number(localStorage.getItem('currentFileId')) : 0
    )
    const [isInitialized, setIsInitialized] = useState<boolean>(false)
    const [newCategory, setNewCategory] = useState<string>('')
    const [showNewCategoryInput, setShowNewCategoryInput] = useState<boolean>(false)
    const defaultCategories = ['单词', '表达', '语法', '默认']
    const [categories, setCategories] = useState<string[]>(() => {
        const savedCategories = localStorage.getItem('categories')
        return savedCategories ? JSON.parse(savedCategories) : defaultCategories
    })
    const [searchTerm, setSearchTerm] = useState<string>('')
    const [hoveredCategory, setHoveredCategory] = useState<string | null>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files ? event.target.files[0] : null
        if (file) {
            parse(file, {
                complete: async (results: { data: string[][] }) => {
                    console.log(category)
                    const words = results.data.map((entry: string[], index: number) => ({
                        idx: index + 1,
                        text: entry[0],
                        translations: {},
                    }))
                    const fileId = await fileService.addFile(file.name, words, category)
                    setWords(words)
                    setCurrentPage(1) // Reset to first page upon new file upload
                    setCurrentFileId(fileId)
                    setFileNames((prev) => [...prev, { id: fileId, name: file.name }])
                    if (fileId) {
                        localStorage.setItem('currentFileId', fileId.toString())
                        updateCurrentPage(fileId, 1)
                    }
                },
                header: false,
            })
        }
    }

    const loadWords = async () => {
        const savedFileId = currentFileId || Number(localStorage.getItem('currentFileId'))
        if (savedFileId) {
            const fileDetails = await fileService.fetchFileDetails(savedFileId)
            if (fileDetails) {
                setWords(fileDetails.words)
                const savedPages = JSON.parse(localStorage.getItem('currentPages') || '{}')
                console.log('savedPages', savedPages)
                if (savedPages[savedFileId]) {
                    console.log('savedPages[savedFileId]', savedPages[savedFileId])
                    setCurrentPage(savedPages[savedFileId])
                } else {
                    setCurrentPage(1)
                }
            }
        }
        setIsInitialized(true) // 初始化完成
    }

    useEffect(() => {
        loadWords()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentFileId])

    useEffect(() => {
        // 保存分类到 localStorage
        localStorage.setItem('categories', JSON.stringify(categories))
    }, [categories])

    const updateCurrentPage = (fileId: number, page: number) => {
        console.log('updateCurrentPage', fileId, page)
        const savedPages = JSON.parse(localStorage.getItem('currentPages') || '{}')
        savedPages[fileId] = page
        localStorage.setItem('currentPages', JSON.stringify(savedPages))
        console.log('savedPages updated', savedPages)
    }

    useEffect(() => {
        const loadFileNames = async () => {
            const files = await fileService.fetchFilesName(category)
            setFileNames(files)
        }

        loadFileNames()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [category])

    useEffect(() => {
        if (fileNames.length === 1) {
            setCurrentFileId(fileNames[0].id)
        }
    }, [fileNames])

    useEffect(() => {
        if (isInitialized && currentFileId !== null) {
            updateCurrentPage(currentFileId, currentPage)
        }
    }, [currentPage, currentFileId, isInitialized])

    const numPages = Math.ceil(words.length / itemsPerPage)

    const handleSearch = () => {
        const foundWord = words.find((word) => word.text.includes(searchTerm))
        if (foundWord) {
            const pageIndex = Math.floor((foundWord.idx - 1) / itemsPerPage) + 1
            setCurrentPage(pageIndex)
            handleWordClick(foundWord)
        } else {
            alert('未找到该单词')
        }
    }

    const nextPage = () => {
        setCurrentPage((prev) => {
            const newPage = prev < numPages ? prev + 1 : prev
            console.log('nextPage', newPage, numPages)
            return newPage
        })
    }

    const prevPage = () => {
        setCurrentPage((prev) => {
            const newPage = prev > 1 ? prev - 1 : prev
            console.log('prevPage', newPage, numPages)
            return newPage
        })
    }

    const handleWordClick = async (entry: Word) => {
        setOriginalText({ text: entry.text, idx: entry.idx, translations: entry.translations })
        setSelectedWord(entry.text)
        const updatedTranslations = await fileService.getTranslationsByWordIndex(currentFileId, entry.idx - 1)
        const updatedEntry = { ...entry, translations: updatedTranslations }
        updateWordInState(updatedEntry)
    }

    const updateWordInState = (updatedEntry: Word) => {
        setWords((prevWords) => prevWords.map((word) => (word.idx === updatedEntry.idx ? updatedEntry : word)))
    }

    const handleFileSelect = (event: ChangeEvent<HTMLSelectElement>) => {
        const fileId = Number(event.target.value)
        setCurrentFileId(fileId)
        console.log('handleFileSelect', fileId)
        localStorage.setItem('currentFileId', fileId.toString())
        const savedPages = JSON.parse(localStorage.getItem('currentPages') || '{}')
        if (savedPages[fileId]) {
            setCurrentPage(savedPages[fileId])
        } else {
            setCurrentPage(1)
        }
    }

    const getDisplayedWords = () => {
        return words.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
    }

    const handleAddCategory = () => {
        if (newCategory.trim()) {
            setCategories((prev) => [...prev, newCategory])
            setCategory(newCategory)
            setNewCategory('')
            setShowNewCategoryInput(false)
        }
    }

    const handleDeleteCategory = (cat: string) => {
        setCategories((prev) => prev.filter((category) => category !== cat))
        if (category === cat) {
            setCategory('默认')
        }
    }

    const handleDeleteFile = async (fileId: number) => {
        await fileService.deleteFile(fileId)
        setWords([])
        setCurrentFileId(0)
        setFileNames((prev) => prev.filter((file) => file.id !== fileId))
        localStorage.removeItem('currentFileId')
        const savedPages = JSON.parse(localStorage.getItem('currentPages') || '{}')
        if (savedPages[fileId]) {
            delete savedPages[fileId]
            localStorage.setItem('currentPages', JSON.stringify(savedPages))
        }
    }

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
                            onClick={() => setCategory(cat)}
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
                        value={newCategory}
                        onChange={(e) => setNewCategory(e.target.value)}
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
                    handleDeleteFile(currentFileId)
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
                            backgroundColor: entry.text === selectedWord ? 'yellow' : 'transparent',
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
                <input
                    type='text'
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder='输入搜索文本'
                />
                <button onClick={handleSearch}>搜索</button>
            </div>
        </div>
    )
}

export default WordListUploader
