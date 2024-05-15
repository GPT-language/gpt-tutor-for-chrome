import React, { useState, useEffect, ChangeEvent } from 'react'
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
    const [itemsPerPage, setItemsPerPage] = useState(10) // 或者其他根据用户选择的值
    const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files ? event.target.files[0] : null
        if (file) {
            parse(file, {
                complete: async (results: { data: string[][] }) => {
                    const words = results.data.map((entry: string[], index: number) => ({
                        idx: index + 1,
                        text: entry[0],
                        translations: {},
                    }))
                    setWords(words)
                    setCurrentPage(1) // Reset to first page upon new file upload
                    const fileId = await fileService.addFile(file.name, words)
                    if (fileId) {
                        localStorage.setItem('currentFileId', fileId.toString())
                    }
                },
                header: false,
            })
        }
    }

    useEffect(() => {
        const loadWords = async () => {
            // 假设你有方法从数据库获取所有文件或特定文件的词汇
            const someFileId = Number(localStorage.getItem('currentFileId'))
            if (someFileId) {
                const fileDetails = await fileService.fetchFileDetails(someFileId) // 使用适当的文件ID
                if (fileDetails) {
                    setWords(fileDetails.words)
                }
            }
        }

        loadWords()
    }, [])

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

    const handleWordClick = async (entry: Word) => {
        setOriginalText({ text: entry.text, idx: entry.idx, translations: entry.translations })
        setSelectedWord(entry.text)
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
                            backgroundColor: entry.text === selectedWord ? 'yellow' : 'transparent',
                        }}
                        onClick={() => handleWordClick(entry)}
                    >
                        {entry.idx}.{entry.text}
                    </li>
                ))}
            </ol>
        </div>
    )
}

export default WordListUploader
