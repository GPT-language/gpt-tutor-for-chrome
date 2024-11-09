import React, { useState, useEffect, useRef, ChangeEvent } from 'react'
import { useChatStore } from '@/store/file/store'
import { Content } from '../internal-services/db'
import { Button, SIZE } from 'baseui-sd/button'
import { BiFirstPage, BiLastPage } from 'react-icons/bi'
import { rgb } from 'polished'
import { useTranslation } from 'react-i18next'
import toast from 'react-hot-toast'
import { styled } from 'styletron-react'
import { AiOutlineDelete } from 'react-icons/ai'
import { OnChangeParams, Select } from 'baseui-sd/select'

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
        selectedFiles,
        selectedWord,
        currentFileId,
        selectedGroup,
        selectWord,
        addFile,
        loadWords,
        loadFiles,
        setIsShowActionList,
        setShowWordBookManager,
        selectFile,
        deleteFile,
        currentPage,
        setCurrentPage,
        setActionStr,
        showSidebar,
        refreshTextArea,
    } = useChatStore()
    const itemsPerPage = 10
    const { t } = useTranslation()
    const [numPages, setNumPages] = useState<number>(1)
    const [displayWords, setDisplayWords] = useState<Content[]>(words)
    const [isGridView, setIsGridView] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const options = [
        ...selectedFiles.map((file) => ({
            id: file.id,
            label: file.name,
        })),
        { id: 0, label: t('Download') },
        { id: -1, label: t('Upload') },
    ]

    const onChange = (params: OnChangeParams) => {
        if (params.value.length > 0) {
            const selectedId = params.value[0].id as number
            if (selectedId === 0) {
                setShowWordBookManager(true)
            } else if (selectedId === -1) {
                fileInputRef.current?.click()
            } else {
                selectFile(selectedId)
            }
        }
    }

    const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files ? event.target.files[0] : null
        if (file && selectedGroup) {
            await addFile(file, selectedGroup)
        }
    }

    const handleWordClick = (word: Content) => {
        selectWord(word)
        refreshTextArea()
        setIsShowActionList(false)
    }

    const changePage = async (newPageNumber: number) => {
        if (!currentFileId) {
            return
        }
        // 先更新页码，提供即时反馈
        setCurrentPage(newPageNumber)

        // 检查是否需要加载新数据
        const startIndex = (newPageNumber - 1) * itemsPerPage
        const endIndex = startIndex + itemsPerPage
        const pageWords = words.slice(startIndex, endIndex)

        if (pageWords.length < itemsPerPage) {
            // 需要加载更多数据
            const success = await loadWords(currentFileId, newPageNumber, itemsPerPage)
            if (!success) {
                console.error('加载第 ${newPageNumber} 页单词失败')
                toast.error('加载单词失败，请重试')
                // 可以选择回滚到之前的页码
                setCurrentPage(currentPage)
            }
        }

        // 更新显示的单词
        setDisplayWords(words.slice(startIndex, endIndex))
    }

    useEffect(() => {
        setDisplayWords(words.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage))
    }, [words, currentPage, itemsPerPage])

    const nextPageHandler = () => {
        const newPage = currentPage + 1
        console.log('currentPage is', currentPage)
        console.log('newPage is', newPage)
        console.log('numPages is', numPages)
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
        const fetchNumPages = async () => {
            if (!currentFileId) {
                return
            }
            const totalWordCount = words.length || 0
            const totalPages = Math.ceil(totalWordCount / itemsPerPage)
            setNumPages(totalPages)
        }

        if (currentFileId) {
            fetchNumPages()
        }
    }, [currentFileId, itemsPerPage, selectedFiles, words.length])

    useEffect(() => {
        loadFiles(selectedGroup)
    }, [selectedGroup, loadFiles])

    const GridView = ({
        words,
        selectedWord,
        onWordClick,
    }: {
        words: Content[]
        selectedWord: Content
        onWordClick: (word: Content) => void
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
                    value={currentFileId ? [{ id: currentFileId }] : []}
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
                        if (currentFileId) {
                            deleteFile(currentFileId)
                        }
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
