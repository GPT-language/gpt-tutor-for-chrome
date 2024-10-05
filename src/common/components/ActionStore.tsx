import React, { useState, useEffect } from 'react'
import { Select } from 'baseui-sd/select'
import { Button } from 'baseui-sd/button'
import { Spinner } from 'baseui-sd/spinner'
import { StyledBody } from 'baseui-sd/card'
import { Tabs, Tab } from 'baseui-sd/tabs-motion'
import { useTranslation } from 'react-i18next'
import toast from 'react-hot-toast'
import { useStyletron } from 'baseui-sd'
import { useTheme } from '../hooks/useTheme'
import { useChatStore } from '@/store/file/store'

const GITHUB_TOKEN = import.meta.env.VITE_REACT_APP_GITHUB_TOKEN

const fetchWithAuth = (url: string) => {
    return fetch(url, {
        headers: {
            Authorization: `token ${GITHUB_TOKEN}`,
            Accept: 'application/vnd.github.v3+json',
        },
    })
}

interface WordBook {
    name: string
    path: string
    language: string
    category: string
    type: string
}

const GitHubRepo = {
    owner: 'GPT-language',
    repo: 'gpt-tutor-resources',
    branch: 'main',
}

// ... 其他导入和常量定义保持不变

const ActionStore: React.FC = () => {
    const [activeTab, setActiveTab] = useState<string>('language')
    const [languages, setLanguages] = useState<string[]>([])
    const [selectedLanguage, setSelectedLanguage] = useState<string | null>(null)
    const [categories, setCategories] = useState<string[]>([])
    const [category, setSelectedCategory] = useState<string | null>(null)
    const [fileTypes, setFileTypes] = useState<string[]>([])
    const [fileType, setSelectedFileType] = useState<string | null>(null)
    const [wordBooks, setWordBooks] = useState<WordBook[]>([])
    const [selectedWordBook, setSelectedWordBook] = useState<WordBook | null>(null)
    const [loading, setLoading] = useState<boolean>(false)
    const { t } = useTranslation()

    const [css, theme] = useStyletron()
    const { themeType } = useTheme()
    const styles = useStyles({ theme, themeType })

    useEffect(() => {
        const fetchLanguages = async () => {
            try {
                console.log(t('Starting to fetch language list'))
                const response = await fetchWithAuth(
                    `https://api.github.com/repos/${GitHubRepo.owner}/${GitHubRepo.repo}/contents?ref=${GitHubRepo.branch}`
                )
                const data = await response.json()
                const languageList = data.filter((item: any) => item.type === 'dir').map((item: any) => item.name)
                console.log(t('Fetched language list:'), languageList)
                setLanguages(languageList)
            } catch (error) {
                console.error(t('Error fetching language list:'), error)
            }
        }
        fetchLanguages()
    }, [])

    useEffect(() => {
        const fetchCategories = async () => {
            if (selectedLanguage) {
                try {
                    console.log(t('Starting to fetch category list'))
                    const response = await fetchWithAuth(
                        `https://api.github.com/repos/${GitHubRepo.owner}/${GitHubRepo.repo}/contents/${selectedLanguage}?ref=${GitHubRepo.branch}`
                    )
                    const data = await response.json()
                    const categoryList = data.filter((item: any) => item.type === 'dir').map((item: any) => item.name)
                    console.log(t('Fetched category list:'), categoryList)
                    setCategories(categoryList)
                } catch (error) {
                    console.error(t('Error fetching category list:'), error)
                }
            }
        }
        fetchCategories()
    }, [selectedLanguage, t])

    useEffect(() => {
        const fetchFileTypes = async () => {
            if (selectedLanguage && category) {
                try {
                    console.log(t('Starting to fetch file type list'))
                    const response = await fetchWithAuth(
                        `https://api.github.com/repos/${GitHubRepo.owner}/${GitHubRepo.repo}/contents/${selectedLanguage}/${category}?ref=${GitHubRepo.branch}`
                    )
                    const data = await response.json()
                    const fileTypeList = data.filter((item: any) => item.type === 'dir').map((item: any) => item.name)
                    console.log(t('Fetched file type list:'), fileTypeList)
                    setFileTypes(fileTypeList)
                } catch (error) {
                    console.error(t('Error fetching file type list:'), error)
                }
            }
        }
        fetchFileTypes()
    }, [selectedLanguage, category, t])

    useEffect(() => {
        const fetchWordBooks = async () => {
            if (selectedLanguage && category && fileType) {
                try {
                    console.log(t('Starting to fetch word book list'))
                    const response = await fetchWithAuth(
                        `https://api.github.com/repos/${GitHubRepo.owner}/${GitHubRepo.repo}/contents/${selectedLanguage}/${category}/${fileType}?ref=${GitHubRepo.branch}`
                    )
                    const data = await response.json()
                    const books = data
                        .filter((item: any) => item.name.endsWith('.json'))
                        .map((item: any) => ({
                            name: item.name.replace('.json', ''),
                            path: item.path,
                            language: selectedLanguage,
                            category: category,
                            type: fileType,
                        }))
                    console.log(t('Fetched word book list:'), books)
                    setWordBooks(books)
                } catch (error) {
                    console.error(t('Error fetching word book list:'), error)
                }
            }
        }
        fetchWordBooks()
    }, [selectedLanguage, category, fileType, t])

    const handleDownload = async () => {
        if (selectedWordBook) {
            setLoading(true)
            try {
                const response = await fetchWithAuth(
                    `https://raw.githubusercontent.com/${GitHubRepo.owner}/${GitHubRepo.repo}/${GitHubRepo.branch}/${selectedWordBook.path}`
                )
                const data = await response.json() // 改为 .json()

                useChatStore.getState().actions.push(data)

                toast.success(t('Actions loaded successfully!'))
                // 等待1s
                await new Promise((resolve) => setTimeout(resolve, 1000))
            } catch (error) {
                console.error(t('Error loading actions:'), error)
                toast.error(t('Failed to load actions'))
            } finally {
                setLoading(false)
            }
        }
    }

    return (
        <div className={styles.actionList}>
            <StyledBody>
                <Tabs activeKey={activeTab} onChange={({ activeKey }) => setActiveTab(activeKey as string)}>
                    <Tab title={t('Language')} key='language'>
                        <Select
                            options={languages.map((lang) => ({ label: lang, id: lang }))}
                            onChange={(params) => {
                                const selectedLang = (params.option?.id as string) || null
                                console.log(t('Selected language:'), selectedLang)
                                setSelectedLanguage(selectedLang)
                                setSelectedCategory(null)
                                setSelectedFileType(null)
                                setSelectedWordBook(null)
                                if (selectedLang) setActiveTab('category')
                            }}
                            value={selectedLanguage ? [{ label: selectedLanguage, id: selectedLanguage }] : []}
                            placeholder={t('Select the language of word book')}
                        />
                    </Tab>
                    {selectedLanguage && (
                        <Tab title={t('Category')} key='category'>
                            <Select
                                options={categories.map((cat) => ({ label: cat, id: cat }))}
                                onChange={(params) => {
                                    const selectedCat = (params.option?.id as string) || null
                                    console.log(t('Selected category:'), selectedCat)
                                    setSelectedCategory(selectedCat)
                                    setSelectedFileType(null)
                                    setSelectedWordBook(null)
                                    if (selectedCat) setActiveTab('fileType')
                                }}
                                value={category ? [{ label: category, id: category }] : []}
                                placeholder={t('Select a category')}
                            />
                        </Tab>
                    )}
                    {selectedLanguage && category && (
                        <Tab title={t('Action Group Type')} key='fileType'>
                            <Select
                                options={fileTypes.map((type) => ({ label: type, id: type }))}
                                onChange={(params) => {
                                    const selectedType = (params.option?.id as string) || null
                                    console.log(t('Selected word book type:'), selectedType)
                                    setSelectedFileType(selectedType)
                                    setSelectedWordBook(null)
                                    if (selectedType) setActiveTab('wordbook')
                                }}
                                value={fileType ? [{ label: fileType, id: fileType }] : []}
                                placeholder={t('Select a Action Group type')}
                            />
                        </Tab>
                    )}
                    {selectedLanguage && category && fileType && (
                        <Tab title={t('Action Group')} key='wordbook'>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div style={{ flex: 1 }}>
                                    <Select
                                        options={wordBooks.map((book) => ({ label: book.name, id: book.path }))}
                                        onChange={(params) => {
                                            const selected = wordBooks.find((book) => book.path === params.option?.id)
                                            console.log(t('Selected word book:'), selected)
                                            setSelectedWordBook(selected || null)
                                        }}
                                        value={
                                            selectedWordBook
                                                ? [{ label: selectedWordBook.name, id: selectedWordBook.path }]
                                                : []
                                        }
                                        placeholder={t('Select a Action Group')}
                                    />
                                </div>
                                {selectedWordBook && (
                                    <Button onClick={handleDownload} disabled={loading} size='compact' kind='secondary'>
                                        {loading ? <Spinner /> : t('Download')}
                                    </Button>
                                )}
                            </div>
                        </Tab>
                    )}
                </Tabs>
            </StyledBody>
        </div>
    )
}

const useStyles = ({ theme, themeType }: { theme: any; themeType: string }) => ({
    actionList: {
        width: '100%',
        padding: '20px',
        backgroundColor: themeType === 'dark' ? theme.colors.backgroundSecondary : theme.colors.backgroundPrimary,
        borderRadius: theme.borders.radius300,
    },
})

export default ActionStore
