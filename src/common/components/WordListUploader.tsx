import React, { useState, useEffect, ChangeEvent } from 'react'
import { parse } from 'papaparse'

interface WordListUploaderProps {
    setOriginalText: (word: string) => void
}

interface WordEntry {
    word: string
}

const WordListUploader: React.FC<WordListUploaderProps> = ({ setOriginalText }) => {
    const [words, setWords] = useState<WordEntry[]>([])
    const [currentPage, setCurrentPage] = useState(1)
    const [selectedWord, setSelectedWord] = useState<string | null>(null)
    const [itemsPerPage, setItemsPerPage] = useState(10) // 或者其他根据用户选择的值

    const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files ? event.target.files[0] : null
        if (file) {
            parse(file, {
                complete: (results: { data: string[][] }) => {
                    const words = results.data.map((entry: string[]) => ({
                        word: entry[0],
                    }))
                    setWords(words)
                    setCurrentPage(1) // Reset to first page upon new file upload
                },
                header: false,
            })
        }
    }

    const numPages = Math.ceil(words.length / itemsPerPage)

    const nextPage = () => {
        setCurrentPage((prev) => (prev < numPages ? prev + 1 : prev))
    }

    const prevPage = () => {
        setCurrentPage((prev) => (prev > 1 ? prev - 1 : prev))
    }

    // 当组件加载时，尝试从localStorage恢复状态
    useEffect(() => {
        const savedPage = localStorage.getItem('currentPage')
        if (savedPage) {
            setCurrentPage(Number(savedPage))
        }
    }, [])

    // 监听组件卸载事件，保存当前页面到 localStorage
    useEffect(() => {
        return () => {
            localStorage.setItem('currentPage', currentPage.toString())
        }
    }, [currentPage])

    const handleWordClick = (word: string) => {
        setOriginalText(word)
        setSelectedWord(word)
    }

    const getDisplayedWords = () => {
        return words.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
    }

    return (
        <div style={{ height: '100%', overflow: 'auto' }}>
            <input type='file' onChange={handleFileChange} accept='.csv' />
            <div>
                <button onClick={prevPage} disabled={currentPage === 1}>
                    Prev
                </button>
                <button onClick={nextPage} disabled={currentPage === numPages}>
                    Next
                </button>
                <select value={itemsPerPage} onChange={(e) => setItemsPerPage(Number(e.target.value))}>
                    <option value='5'>5</option>
                    <option value='10'>10</option>
                    <option value='20'>20</option>
                </select>
            </div>
            <ol start={(currentPage - 1) * itemsPerPage + 1}>
                {getDisplayedWords().map((entry, index) => (
                    <li
                        key={index}
                        style={{
                            cursor: 'pointer',
                            backgroundColor: entry.word === selectedWord ? 'yellow' : 'transparent',
                        }}
                        onClick={() => handleWordClick(entry.word)}
                    >
                        {entry.word}
                    </li>
                ))}
            </ol>
        </div>
    )
}

export default WordListUploader
