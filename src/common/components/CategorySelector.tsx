import { useState, useRef, ChangeEvent, useEffect, useCallback, useMemo } from 'react'
import { Select } from 'baseui-sd/select'
import { AiOutlineUpload, AiOutlineDelete, AiOutlineDown } from 'react-icons/ai'
import { useChatStore } from '@/store/file/store'
import { Button, KIND, SIZE } from 'baseui-sd/button'
import { useTranslation } from 'react-i18next'
import { Action } from '../internal-services/db'
import { Menu, StatefulMenu } from 'baseui-sd/menu'
import { StatefulPopover } from 'baseui-sd/popover'
import debounce from 'lodash-es/debounce'

const MAX_BUTTON_WIDTH = 150; // 设置最大按钮宽度为150px

const CategorySelector = () => {
    const {
        files,
        actions,
        currentFileId,
        selectedGroup,
        addFile,
        selectFile,
        deleteFile,
        setShowWordBookManager,
        setSelectedGroup,
    } = useChatStore()
    const [showSelectBox, setShowSelectBox] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const { t } = useTranslation()
    const actionGroups = actions?.reduce((groups: { [key: string]: Action[] }, action) => {
        if (!action.groups) {
            console.log('no groups', action)
            return groups
        }
        // 每个 action 可能属于多个 group
        action.groups.forEach((group) => {
            if (!groups[group]) {
                groups[group] = []
            }
            groups[group].push(action)
        })
        return groups
    }, {})

    const [visibleCategories, setVisibleCategories] = useState<string[]>([])
    const [hiddenCategories, setHiddenCategories] = useState<string[]>([])
    const containerRef = useRef<HTMLDivElement>(null)

    const updateVisibleCategories = useCallback(() => {
        if (!containerRef.current || !actionGroups) return

        const containerWidth = containerRef.current.offsetWidth
        const moreButtonWidth = 100 // 估计的 "More" 按钮宽度
        let totalWidth = 0
        const visible: string[] = []
        const hidden: string[] = []

        // 确保选中的类别始终可见
        if (selectedGroup) {
            const selectedButton = containerRef.current.querySelector(
                `[data-category="${selectedGroup}"]`
            ) as HTMLElement
            if (selectedButton) {
                const buttonWidth = Math.min(Math.max(selectedButton.offsetWidth, 120), MAX_BUTTON_WIDTH)
                visible.push(selectedGroup)
                totalWidth += buttonWidth
            }
        }

        Object.keys(actionGroups).forEach((cat) => {
            if (cat !== selectedGroup) {
                const button = containerRef.current?.querySelector(`[data-category="${cat}"]`) as HTMLElement
                if (button) {
                    const buttonWidth = Math.min(Math.max(button.offsetWidth, 120), MAX_BUTTON_WIDTH)
                    if (totalWidth + buttonWidth + moreButtonWidth <= containerWidth) {
                        visible.push(cat)
                        totalWidth += buttonWidth
                    } else {
                        hidden.push(cat)
                    }
                }
            }
        })

        setVisibleCategories(visible)
        setHiddenCategories(hidden)
    }, [actionGroups, selectedGroup])

    const debouncedUpdateVisibleCategories = useMemo(
        () => debounce(updateVisibleCategories, 100),
        [updateVisibleCategories]
    )

    useEffect(() => {
        console.log('ResizeObserver effect running')
        const resizeObserver = new ResizeObserver(() => {
            console.log('ResizeObserver callback triggered')
            debouncedUpdateVisibleCategories()
        })

        if (containerRef.current) {
            resizeObserver.observe(containerRef.current)
        }

        return () => {
            console.log('ResizeObserver disconnected')
            resizeObserver.disconnect()
            debouncedUpdateVisibleCategories.cancel()
        }
    }, [debouncedUpdateVisibleCategories])

    useEffect(() => {
        console.log('Initial updateVisibleCategories effect running')
        updateVisibleCategories()
    }, [updateVisibleCategories])

    const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files ? event.target.files[0] : null
        if (file && selectedGroup) {
            addFile(file, selectedGroup)
        }
        setShowSelectBox(false)
    }

    const handleCategoryChange = useCallback(
        (cat: string) => {
            setShowSelectBox(true)
            setSelectedGroup(cat)
            localStorage.setItem('selectedGroup', cat)

            // 调用 updateVisibleCategories 来更新可见和隐藏类别
            setTimeout(updateVisibleCategories, 0)
        },
        [setSelectedGroup, updateVisibleCategories]
    )

    const options = [
        ...files.map((file) => ({
            id: file.id,
            label: file.name,
        })),
        { id: 0, label: t('Download') },
    ]

    const onChange = (params: { value: { id: number; label: string }[] }) => {
        const { value } = params
        if (value.length > 0 && value[0].id === 0) {
            setShowWordBookManager(true)
        } else {
            selectFile(value[0].id)
        }
    }

    // 在渲染前检查 currentFileId 和 files 是否有效
    const validValue = files.some((file) => file.id === currentFileId)
        ? options.filter((option) => option.id === currentFileId)
        : []

    return (
        <div style={{ minHeight: '14px' }}>
            <div style={{ minHeight: '14px', cursor: 'pointer', backgroundColor: 'rgba(0, 0, 0, 0)' }}>
                <div ref={containerRef} style={{ whiteSpace: 'nowrap', overflow: 'hidden' }}>
                    {[selectedGroup, ...Object.keys(actionGroups || {}).filter((cat) => cat !== selectedGroup)].map(
                        (cat) => (
                            <div
                                key={cat}
                                data-category={cat}
                                style={{ display: 'inline-block', position: 'relative' }}
                            >
                                <Button
                                    onClick={() => handleCategoryChange(cat)}
                                    kind={KIND.tertiary}
                                    size={SIZE.compact}
                                    overrides={{
                                        BaseButton: {
                                            style: {
                                                maxWidth: `${MAX_BUTTON_WIDTH}px`,
                                                whiteSpace: 'nowrap',
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                fontWeight: selectedGroup === cat ? 'bold' : 'normal',
                                                display: visibleCategories.includes(cat) ? 'inline-block' : 'none',
                                            },
                                        },
                                    }}
                                >
                                    <u>{t(cat)}</u>
                                </Button>
                            </div>
                        )
                    )}
                    {hiddenCategories.length > 0 && (
                        <StatefulPopover
                            content={({ close }) => (
                                <StatefulMenu
                                    items={[
                                        ...hiddenCategories.filter((cat) => cat !== selectedGroup),
                                        ...(hiddenCategories.includes(selectedGroup) ? [selectedGroup] : []),
                                    ].map((cat) => ({ label: t(cat) }))}
                                    onItemSelect={({ item }) => {
                                        handleCategoryChange(item.label)
                                        close()
                                    }}
                                />
                            )}
                            placement='bottom'
                        >
                            <Button kind={KIND.tertiary} size={SIZE.compact}>
                                {t('More')} <AiOutlineDown style={{ marginLeft: '4px' }} />
                            </Button>
                        </StatefulPopover>
                    )}
                </div>
                {showSelectBox && (
                    <div style={{ display: 'flex', alignItems: 'center', width: '50%', maxWidth: '300px' }}>
                        <Select
                            size={SIZE.compact}
                            options={options}
                            labelKey='label'
                            valueKey='id'
                            onChange={onChange}
                            value={validValue}
                            placeholder={t('Select a file') ?? 'Select a file'}
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
                            title={t('Upload a file') ?? 'Upload a file'}
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
                            title={t('Delete this file') ?? 'Delete this file'}
                            onClick={(e) => {
                                e.stopPropagation()
                                deleteFile(currentFileId)
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
                )}
            </div>
        </div>
    )
}

export default CategorySelector
