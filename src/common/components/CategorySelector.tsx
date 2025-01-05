import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { Tabs, Tab, FILL } from 'baseui-sd/tabs-motion'
import { StatefulPopover, PLACEMENT } from 'baseui-sd/popover'
import { StatefulMenu } from 'baseui-sd/menu'
import { useStyletron } from 'baseui-sd'
import { AiOutlineDown } from 'react-icons/ai'
import { useChatStore } from '@/store/file/store'
import { useTranslation } from 'react-i18next'
import { Button, KIND, SIZE } from 'baseui-sd/button'
import { BiFirstPage, BiLastPage } from 'react-icons/bi'
import { Tooltip } from './Tooltip'
import debounce from 'lodash-es/debounce'

const MAX_TAB_WIDTH = 120
const MORE_TAB_WIDTH = 80
const MENU_BUTTON_WIDTH = 40

const CategorySelector = () => {
    const [css, theme] = useStyletron()
    const {
        selectedGroup,
        loadFiles,
        setSelectedGroup,
        setShowActionManager,
        setShowReviewManager,
        setShowWordBookManager,
        setShowSettings,
        setShowSidebar,
        showSidebar,
    } = useChatStore()
    const { t } = useTranslation()
    const containerRef = useRef<HTMLDivElement>(null)
    const [tabs, setTabs] = useState<string[]>([])
    const [visibleTabs, setVisibleTabs] = useState<string[]>(tabs)
    const [hiddenTabs, setHiddenTabs] = useState<string[]>([])
    const actionGroups = useChatStore((state) => state.actionGroups)

    const tutorialCompleted = useChatStore((state) => state.settings.tutorialCompleted)

    useEffect(() => {
        setTabs(tutorialCompleted ? [] : ['Example'])
    }, [tutorialCompleted])

    const toggleSidebar = () => {
        setShowSidebar(!showSidebar)
    }

    const renderToggleButton = () => (
        <div data-testid='sidebar-toggle'>
            <Tooltip content={showSidebar ? t('Hide List') : t('Show List')}>
                <Button
                    onClick={toggleSidebar}
                    kind={KIND.tertiary}
                    size={SIZE.compact}
                    style={{ backgroundColor: 'white' }}
                >
                    {showSidebar ? <BiFirstPage /> : <BiLastPage />}
                </Button>
            </Tooltip>
        </div>
    )

    const updateVisibleTabs = useCallback(() => {
        if (!containerRef.current) {
            return
        }

        console.log('Updating visible tabs')
        const containerWidth = containerRef.current.offsetWidth
        const availableWidth = containerWidth - MORE_TAB_WIDTH - MENU_BUTTON_WIDTH
        const allTabs = [...tabs, ...Object.keys(actionGroups || {})]

        let totalWidth = 0
        const newVisibleTabs: string[] = []
        const newHiddenTabs: string[] = []

        allTabs.forEach((tab) => {
            if (tab === selectedGroup || totalWidth + MAX_TAB_WIDTH <= availableWidth) {
                newVisibleTabs.push(tab)
                totalWidth += MAX_TAB_WIDTH
            } else {
                newHiddenTabs.push(tab)
            }
        })

        setVisibleTabs(newVisibleTabs)
        setHiddenTabs(newHiddenTabs)
    }, [actionGroups, selectedGroup, tabs])

    const containerStyles = useMemo(
        () => ({
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: '100%',
            opacity: 1,
            transform: 'translateY(0)',
            transition: 'opacity 0.3s ease, transform 0.3s ease',
        }),
        []
    )

    const innerContainerStyles = useMemo(
        () =>
            css({
                width: '100%',
                borderBottom: '1px solid #e0e0e0',
                backgroundColor: 'white',
                boxSizing: 'border-box',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: 0,
                opacity: 'inherit',
                transform: 'inherit',
                transition: 'inherit',
            }),
        [css]
    )

    const tabsOverrides = useMemo(
        () => ({
            Root: {
                style: {
                    flexGrow: 1,
                    padding: 0,
                    margin: 0,
                    opacity: 'inherit',
                    transform: 'inherit',
                    transition: 'inherit',
                },
                props: {
                    'activateOnFocus': true,
                    'data-testid': 'category-tabs',
                },
            },
            TabList: {
                style: {
                    flexWrap: 'nowrap',
                    padding: 0,
                    margin: 0,
                    opacity: 'inherit',
                    transform: 'inherit',
                    transition: 'inherit',
                },
            },
            TabBorder: {
                style: { display: 'none' },
            },
            Tab: {
                style: {
                    'transition': 'background-color 0.2s ease',
                    ':hover': {
                        backgroundColor: theme.colors.backgroundSecondary,
                    },
                },
            },
        }),
        [theme.colors.backgroundSecondary]
    )

    useEffect(() => {
        const debouncedUpdate = debounce(updateVisibleTabs, 100)
        const resizeObserver = new ResizeObserver(debouncedUpdate)

        updateVisibleTabs() // 初始化调用

        if (containerRef.current) {
            resizeObserver.observe(containerRef.current)
        }

        return () => {
            resizeObserver.disconnect()
            debouncedUpdate.cancel()
        }
    }, [updateVisibleTabs])

    const handleTabChange = useCallback(
        ({ activeKey }: { activeKey: React.Key }) => {
            const category = activeKey.toString()
            if (category === 'more') return
            setSelectedGroup(category)
            loadFiles(category)
            requestAnimationFrame(updateVisibleTabs)
        },
        [loadFiles, setSelectedGroup, updateVisibleTabs]
    )

    const onManagerSelect = (id: string) => {
        if (id === '__manager__') setShowActionManager(true)
        else if (id === '__review__') setShowReviewManager(true)
        else if (id === '__wordbook__') setShowWordBookManager(true)
        else if (id === '__settings__') setShowSettings(true)
    }

    useEffect(() => {
        console.log('[CategorySelector] Mounted with refs:', {
            containerRef: containerRef.current,
            hasDataTestId: containerRef.current?.querySelector('[data-testid="category-tabs"]') !== null,
        })
    }, [])

    return (
        <div style={containerStyles}>
            <div ref={containerRef} className={innerContainerStyles}>
                {renderToggleButton()}
                <Tabs
                    activeKey={selectedGroup}
                    onChange={handleTabChange}
                    fill={FILL.fixed}
                    renderAll={false}
                    overrides={tabsOverrides}
                >
                    {visibleTabs.map((tab) => (
                        <Tab
                            key={tab}
                            title={t(tab)}
                            overrides={{
                                TabPanel: {
                                    style: { display: 'none' }, // 隐藏 TabPanel
                                },
                            }}
                        />
                    ))}
                    {(hiddenTabs.length > 0 || true) && ( // 始终显示 "More" 选项
                        <Tab
                            key='more'
                            overrides={{
                                Tab: {
                                    props: {
                                        'data-testid': 'more-button', // 用于教程定位
                                    },
                                },
                                TabPanel: {
                                    style: { display: 'none' }, // 隐藏 TabPanel
                                },
                            }}
                            title={
                                <StatefulPopover
                                    content={({ close }) => (
                                        <StatefulMenu
                                            items={[
                                                ...hiddenTabs.map((tab) => ({ label: t(tab) })),
                                                { divider: true },
                                                { id: '__manager__', label: t('Action Manager') },
                                                /*                                                 { id: '__review__', label: t('Review Manager') }, */
                                                { id: '__wordbook__', label: t('Word Book Manager') },
                                                { id: '__settings__', label: t('Settings') },
                                            ]}
                                            onItemSelect={({ item }) => {
                                                if (item.id) {
                                                    onManagerSelect(item.id)
                                                } else {
                                                    handleTabChange({ activeKey: item.label })
                                                }
                                                close()
                                            }}
                                        />
                                    )}
                                    placement={PLACEMENT.bottom}
                                >
                                    <div
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            width: '100%',
                                            height: '100%',
                                            cursor: 'pointer', // 添加指针样式
                                        }}
                                    >
                                        <AiOutlineDown style={{ marginLeft: '4px' }} />
                                    </div>
                                </StatefulPopover>
                            }
                        />
                    )}
                </Tabs>
            </div>
        </div>
    )
}

export default CategorySelector
