import React, { useState, useEffect, useCallback } from 'react'
import { StatefulMenu } from 'baseui-sd/menu'
import { Button, SIZE } from 'baseui-sd/button'
import { BiFirstPage, BiLastPage } from 'react-icons/bi'
import { Content } from '../internal-services/db'
import { useStyletron } from 'baseui-sd'

interface WordListMenuProps {
    words: Content[]
    isVisible: boolean
    searchTerm: string
    onWordSelect: (word: Content) => void
    className?: string
}

const WordListMenu: React.FC<WordListMenuProps> = ({ words, isVisible, searchTerm, onWordSelect, className }) => {
    const [css] = useStyletron()
    const [currentPage, setCurrentPage] = useState(1)
    const [filteredWords, setFilteredWords] = useState<Content[]>([])
    const [totalPages, setTotalPages] = useState(1)
    const itemsPerPage = 10

    const updateFilteredWords = useCallback(
        (searchTerm: string, page: number = currentPage) => {
            const filtered = words.filter((word) => word.text.toLowerCase().includes(searchTerm.toLowerCase()))
            const startIndex = (page - 1) * itemsPerPage

            setFilteredWords(filtered.slice(startIndex, startIndex + itemsPerPage))
            setTotalPages(Math.ceil(filtered.length / itemsPerPage))
        },
        [words, currentPage, itemsPerPage]
    )

    useEffect(() => {
        updateFilteredWords(searchTerm)
    }, [searchTerm, updateFilteredWords, words])

    const handlePageChange = (newPage: number) => {
        setCurrentPage(newPage)
        updateFilteredWords(searchTerm, newPage)
    }

    if (!isVisible) return null

    return (
        <div className={className}>
            <StatefulMenu
                items={[
                    ...filteredWords.map((word) => ({
                        label: word.text,
                        word: word,
                    })),
                    {
                        label: 'pagination',
                        disabled: true,
                        renderAll: true,
                        children: (
                            <div
                                className={css({
                                    display: 'flex',
                                    justifyContent: 'center',
                                    padding: '8px',
                                    borderTop: '1px solid #eee',
                                    gap: '8px',
                                })}
                            >
                                <Button
                                    size={SIZE.mini}
                                    kind='secondary'
                                    onClick={() => handlePageChange(currentPage - 1)}
                                    disabled={currentPage === 1}
                                >
                                    <BiFirstPage size={16} />
                                </Button>
                                <span>
                                    {currentPage} / {totalPages}
                                </span>
                                <Button
                                    size={SIZE.mini}
                                    kind='secondary'
                                    onClick={() => handlePageChange(currentPage + 1)}
                                    disabled={currentPage === totalPages}
                                >
                                    <BiLastPage size={16} />
                                </Button>
                            </div>
                        ),
                    },
                ]}
                onItemSelect={({ item }) => {
                    if (item.word) {
                        onWordSelect(item.word)
                    }
                }}
                overrides={{
                    List: {
                        style: {
                            maxHeight: '300px',
                            overflow: 'auto',
                            backgroundColor: 'white',
                        },
                    },
                    Option: {
                        props: {
                            overrides: {
                                ListItem: {
                                    style: ({ $isHighlighted }: { $isHighlighted: boolean }) => ({
                                        backgroundColor: $isHighlighted ? 'rgba(66, 133, 244, 0.1)' : 'white',
                                        cursor: 'pointer',
                                        padding: '8px 16px',
                                    }),
                                },
                            },
                        },
                    },
                }}
            />
        </div>
    )
}

export default WordListMenu
