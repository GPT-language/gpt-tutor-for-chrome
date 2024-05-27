import { useState, useRef, ChangeEvent } from 'react'
import { Select } from 'baseui-sd/select'
import { AiOutlineUpload, AiOutlineDelete } from 'react-icons/ai'
import { useChatStore } from '@/store/file/store'
import { fileService } from '../internal-services/file'
const CategorySelector = () => {
    const {
        files,
        categories,
        currentFileId,
        selectedCategory,
        addFile,
        selectFile,
        deleteFile,
        setCurrentFileId,
        addCategory,
        deleteCategory,
        loadFiles,
        deleteWords,
        setSelectedCategory,
    } = useChatStore()
    const [showNewCategoryInput, setShowNewCategoryInput] = useState(false)
    const [newCategory, setNewCategory] = useState('')
    const [hoverCategory, setHoverCategory] = useState<string | null>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files ? event.target.files[0] : null
        if (file && selectedCategory) {
            addFile(file, selectedCategory)
        }
        localStorage.setItem('files', JSON.stringify(files))
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

    const options = files.map((file) => ({
        id: file.id,
        label: file.name,
    }))

    const onChange = ({ value }) => {
        if (value.length) {
            const newFileId = value[0].id // 获取选中项的 id
            selectFile(newFileId)
        }
    }

    // 在渲染前检查 currentFileId 和 files 是否有效
    const validValue =
        currentFileId !== undefined && files.some((file) => file.id === currentFileId)
            ? options.filter((option) => option.id === currentFileId)
            : []

    return (
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
            {showNewCategoryInput && (
                <div>
                    <input
                        type='text'
                        value={newCategory}
                        onChange={(e) => setNewCategory(e.target.value)}
                        placeholder='输入新分类'
                    />
                    <button
                        onClick={() => {
                            handleAddCategory()
                            setShowNewCategoryInput(false)
                        }}
                    >
                        保存
                    </button>
                </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', width: '80%', maxWidth: '300px' }}>
                <Select
                    options={options}
                    labelKey='label'
                    valueKey='id'
                    onChange={onChange}
                    value={validValue}
                    placeholder='Select a file'
                    overrides={{
                        Root: {
                            style: ({ $theme }) => ({
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
                                'borderColor': $theme.colors.borderError,
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

                <AiOutlineUpload
                    title='Upload new file'
                    onClick={(e) => {
                        e.stopPropagation()
                        if (fileInputRef.current) {
                            fileInputRef.current.click()
                        }
                    }}
                    style={{
                        marginLeft: '5px',
                        cursor: 'pointer',
                        color: 'green',
                        fontSize: '18px',
                        flexShrink: 0,
                    }}
                />

                <AiOutlineDelete
                    title='Delete this file'
                    onClick={(e) => {
                        e.stopPropagation()
                        deleteFile(currentFileId)
                        loadFiles(selectedCategory)
                    }}
                    style={{
                        marginLeft: '5px',
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
                <div></div>
            </div>
        </div>
    )
}

export default CategorySelector
