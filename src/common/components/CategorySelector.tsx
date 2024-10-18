import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { Tabs, Tab, FILL } from 'baseui-sd/tabs-motion'
import { StatefulPopover, PLACEMENT } from 'baseui-sd/popover'
import { StatefulMenu } from 'baseui-sd/menu'
import { useStyletron } from 'baseui-sd'
import { AiOutlineDown } from 'react-icons/ai'
import { useChatStore } from '@/store/file/store'
import { useTranslation } from 'react-i18next'
import { Action } from '../internal-services/db'
import debounce from 'lodash-es/debounce'
import { Button, KIND, SIZE } from 'baseui-sd/button'
import { BiFirstPage, BiLastPage } from 'react-icons/bi'
import { Tooltip } from './Tooltip'

const MAX_TAB_WIDTH = 120
const MORE_TAB_WIDTH = 80
const MENU_BUTTON_WIDTH = 40

const CategorySelector = () => {
    const [css] = useStyletron()
    const {
        actions,
        selectedGroup,
        loadFiles,
        setSelectedGroup,
        setShowActionManager,
        setShowReviewManager,
        setShowWordBookManager,
        setShowSidebar,
        showSidebar,
    } = useChatStore()
    const { t } = useTranslation()
    const containerRef = useRef<HTMLDivElement>(null)

    const actionGroups = useMemo(() => {
        return actions?.reduce((groups: { [key: string]: Action[] }, action) => {
            if (!action.groups) return groups
            action.groups.forEach((group) => {
                if (!groups[group]) groups[group] = []
                groups[group].push(action)
            })
            return groups
        }, {})
    }, [actions])

    const [visibleTabs, setVisibleTabs] = useState<string[]>([])
    const [hiddenTabs, setHiddenTabs] = useState<string[]>([])

    const toggleSidebar = () => {
        setShowSidebar(!showSidebar)
    }

    const renderToggleButton = () => (
        <>
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
        </>
    )

    const updateVisibleTabs = useCallback(() => {
        if (!containerRef.current || !actionGroups) return

        const containerWidth = containerRef.current.offsetWidth
        const availableWidth = containerWidth - MORE_TAB_WIDTH - MENU_BUTTON_WIDTH
        const allTabs = Object.keys(actionGroups)
        const visible: string[] = []
        const hidden: string[] = []

        let totalWidth = 0
        allTabs.forEach((tab) => {
            if (tab === selectedGroup || totalWidth + MAX_TAB_WIDTH <= availableWidth) {
                visible.push(tab)
                totalWidth += MAX_TAB_WIDTH
            } else {
                hidden.push(tab)
            }
        })

        setVisibleTabs(visible)
        setHiddenTabs(hidden)
    }, [actionGroups, selectedGroup])

    const debouncedUpdateVisibleTabs = useMemo(() => debounce(updateVisibleTabs, 100), [updateVisibleTabs])

    useEffect(() => {
        const resizeObserver = new ResizeObserver(debouncedUpdateVisibleTabs)
        if (containerRef.current) resizeObserver.observe(containerRef.current)
        return () => {
            resizeObserver.disconnect()
            debouncedUpdateVisibleTabs.cancel()
        }
    }, [debouncedUpdateVisibleTabs])

    useEffect(() => {
        updateVisibleTabs()
    }, [updateVisibleTabs])

    const handleTabChange = useCallback(
        ({ activeKey }: { activeKey: React.Key }) => {
            const category = activeKey.toString()
            if (category === 'more') return
            setSelectedGroup(category)
            loadFiles(category)
            setTimeout(updateVisibleTabs, 0)
        },
        [loadFiles, setSelectedGroup, updateVisibleTabs]
    )

    const onManagerSelect = (id: string) => {
        if (id === '__manager__') setShowActionManager(true)
        else if (id === '__review__') setShowReviewManager(true)
        else if (id === '__wordbook__') setShowWordBookManager(true)
    }

    return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
            <div
                ref={containerRef}
                className={css({
                    width: '100%',
                    borderBottom: '1px solid #e0e0e0',
                    backgroundColor: 'white',
                    boxSizing: 'border-box',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: 0,
                })}
            >
                {renderToggleButton()}
                <Tabs
                    activeKey={selectedGroup}
                    onChange={handleTabChange}
                    fill={FILL.fixed}
                    renderAll={false}
                    overrides={{
                        Root: {
                            style: { flexGrow: 1, padding: 0, margin: 0 },
                            props: {
                                activateOnFocus: true,
                            },
                        },
                        TabList: {
                            style: { flexWrap: 'nowrap', padding: 0, margin: 0 },
                        },
                        TabBorder: {
                            style: { display: 'none' },
                        },
                    }}
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
                                                { id: '__review__', label: t('Review Manager') },
                                                { id: '__wordbook__', label: t('Word Book Manager') },
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
                                        {t('More')} <AiOutlineDown style={{ marginLeft: '4px' }} />
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
