import { useEffect, useState } from 'react'
import { SIZE, Select } from 'baseui-sd/select'
import { Button, KIND } from 'baseui-sd/button'
import Slider from 'rc-slider'
import 'rc-slider/assets/index.css'
import { StudyChart, StudyDay, generateStudyPlan } from './StudyChart'
import { fileService } from '../internal-services/file'
import { useTranslation } from 'react-i18next'
import { ReviewSettings, SavedFile } from '../internal-services/db'
import { useChatStore } from '@/store/file'
type StrategyOption = {
    id: string | number
    label: string
    array: number[]
}

const mapSliderValueToTime = (sliderValue: number) => {
    if (sliderValue <= 60) {
        // First 60 minutes
        return sliderValue // Each unit represents 1 minute
    } else if (sliderValue <= 83) {
        // Hours 1-24
        return 60 + (sliderValue - 60) * 60 // Each unit represents 1 hour
    } else if (sliderValue <= 113) {
        // Days 1-30
        return 1440 + (sliderValue - 83) * 1440 // Each unit represents 1 day
    } else if (sliderValue < 126) {
        // Months 1-12
        return 43200 + (sliderValue - 113) * 43200 // Each unit represents 1 month
    } else {
        // 1 year
        return 525600 // One year in minutes
    }
}

const calculateSliderPosition = (minutes) => {
    if (minutes <= 60) {
        return minutes // First 60 minutes
    } else if (minutes <= 1440) {
        return 60 + Math.ceil((minutes - 60) / 60) // Hours 1-24
    } else if (minutes <= 43200) {
        return 83 + Math.ceil((minutes - 1440) / 1440) // Days 1-30
    } else if (minutes < 525600) {
        return 113 + Math.ceil((minutes - 43200) / 43200) // Months 1-12
    } else {
        return 126 // One year
    }
}

const simplifyMark = (mark) => {
    const regex = /(\d+)([a-zA-Z]*)/ // 正则表达式匹配数字和后面的字母
    const match = mark.match(regex)

    if (!match) return mark // 如果没有匹配，返回原始标记

    const [_, numStr, unit] = match // 解构匹配结果，_ 是整个匹配，numStr 是数字部分，unit 是单位
    const num = parseInt(numStr, 10) // 将数字字符串转换为数字

    return numStr

    // 如果不满足以上任何条件，返回原始标记
    return mark
}

const getAdjustedMarks = (marks: Record<number, { label: string; style: object }>, sliderPositions: number[]) => {
    const keys = Object.keys(marks)
        .map(Number)
        .sort((a, b) => a - b) // 确保按顺序处理标记
    const adjustedMarks: Record<number, { label: string; style: object }> = {}
    let lastPositionUp = false // 用于跟踪上一个标记的显示位置

    keys.forEach((key, index) => {
        const markLabel = marks[key]
        const position = sliderPositions[index]
        let style = markLabel.style

        if (index > 0) {
            const prevPosition = sliderPositions[index - 1]
            if (position < 60 && Math.abs(position - prevPosition) < 10) {
                lastPositionUp = !lastPositionUp
                style = { marginTop: lastPositionUp ? '-40px' : '0px', marginLeft: lastPositionUp ? '0px' : '5px' }
            }
            if (position >= 60 && position < 84 && Math.abs(position - prevPosition) <= 4) {
                lastPositionUp = !lastPositionUp
                style = { marginTop: lastPositionUp ? '-40px' : '0px', marginLeft: lastPositionUp ? '0px' : '5px' }
            }
            if (position >= 84 && position < 114 && Math.abs(position - prevPosition) <= 4) {
                lastPositionUp = !lastPositionUp
                style = { marginTop: lastPositionUp ? '-40px' : '0px', marginLeft: lastPositionUp ? '0px' : '7px' }
            }
            if (position >= 114 && position < 126 && Math.abs(position - prevPosition) < 8) {
                lastPositionUp = !lastPositionUp
                style = {
                    marginTop: lastPositionUp ? '-40px' : '0px',
                    marginLeft: lastPositionUp ? '0px' : '10px',
                }
            }
        }

        adjustedMarks[key] = { ...markLabel, style }
    })

    return adjustedMarks
}

function calculateTimeValue(minutes: number) {
    if (minutes === 0) {
        return '0'
    }
    if (minutes < 60) {
        return `${minutes} min`
    } else if (minutes < 1440) {
        // Less than 1 day, show in hours
        return `${Math.round(minutes / 60)} h`
    } else if (minutes < 43200) {
        // Less than 30 days, show in days
        return `${Math.round(minutes / 1440)} d`
    } else if (minutes < 525600) {
        // Less than 1 year, show in months
        return `${Math.round(minutes / 43200)} mo`
    } else {
        // 1 year
        return `1 yr`
    }
}

export const strategyOptions: StrategyOption[] = [
    {
        id: 'compact',
        label: '紧凑型记忆策略',
        array: [0, 15, 30, 60, 300, 1440, 4320, 7200, 11520, 21600],
    },
    {
        id: 'standard',
        label: '标准记忆策略',
        array: [0, 5, 30, 60, 240, 1440, 5760, 12960, 21600, 36000],
    },
    {
        id: 'loose',
        label: '松散型记忆策略',
        array: [0, 1440, 4320, 14400, 21600, 43200, 129600],
    },
    {
        id: 'daily',
        label: '每日复习',
        array: [0, 1440, 1440, 1440, 1440, 1440, 1440, 1440, 1440, 1440],
    },
    {
        id: 'custom',
        label: '自定义',
        array: [0, 5, 30, 60, 240, 1440, 5760, 12960, 21600, 36000],
    },
]

interface fileOptions {
    id: number | undefined
    label: string
}

export const ReviewManager = () => {
    const { t } = useTranslation()
    const strategyOptions: StrategyOption[] = [
        {
            id: 'compact',
            label: t('Tight Revivew Intervals'),
            array: [0, 15, 30, 60, 300, 1440, 4320, 7200, 11520, 21600],
        },
        {
            id: 'standard',
            label: t('Standard Revivew Intervals'),
            array: [0, 5, 30, 60, 240, 1440, 5760, 12960, 21600, 36000],
        },
        {
            id: 'loose',
            label: t('Loose Revivew Intervals'),
            array: [0, 1440, 4320, 14400, 21600, 43200, 129600],
        },
        {
            id: 'daily',
            label: t('Daily Revivew Intervals'),
            array: [0, 1440, 1440, 1440, 1440, 1440, 1440, 1440, 1440, 1440],
        },
        {
            id: 'custom',
            label: t('Custom Revivew Intervals'),
            array: [0, 5, 30, 60, 240, 1440, 5760, 12960, 21600, 36000],
        },
    ]
    const { setActionStr, selectedWord } = useChatStore()
    const [selectedStrategy, setSelectedStrategy] = useState(strategyOptions[0])
    const [sliderValues, setSliderValues] = useState(() => selectedStrategy.array.map(calculateSliderPosition))
    const [startTime, setStartTime] = useState(new Date())
    const [dailyWords, setDailyWords] = useState(10)
    const [savedIntervals, setSavedIntervals] = useState<number[] | []>(selectedStrategy.array)
    const [studyData, setStudyData] = useState<StudyDay[]>([])
    const [selectFile, setSelectFile] = useState<SavedFile | null>(null)
    const [totalWords, setTotalWords] = useState(100)
    const [fileOptions, setFileOptions] = useState<fileOptions[]>([])

    useEffect(() => {
        const fetchData = async () => {
            const files = await fileService.fetchAllFiles()
            const fileOptions = files.map((file) => ({
                id: file.id,
                label: file.name,
            }))
            setFileOptions(fileOptions)
        }
        fetchData()
    }, [])

    const onFileChange = async ({ value }) => {
        if (value.length) {
            const newFileId = value[0].id // 获取选中项的 id
            const file = await fileService.fetchFileDetailsById(newFileId)
            setTotalWords(file.words.length)
            setSelectFile(file)
            if (file.reviewSettings) {
                setSavedIntervals(file.reviewSettings.interval)
                setDailyWords(file.reviewSettings.dailyWords)
                setStartTime(file.reviewSettings.startTime)
                const strategy: StrategyOption = {
                    id: newFileId,
                    label: file.name,
                    array: file.reviewSettings.interval,
                }
                if (!strategyOptions.find((option) => option.id === newFileId)) {
                    strategyOptions.push(strategy)
                    setSelectedStrategy(strategy)
                }
            }
        }
    }

    const handleStrategyChange = (value: StrategyOption) => {
        setSelectedStrategy(value)
        setSavedIntervals(value.array)
        console.log('Selected strategy:', value)
    }

    useEffect(() => {
        console.log('totalWords is ' + totalWords)
        if (!selectedWord) {
            return
        }
        console.log('actualWors is ' + (totalWords - selectedWord?.idx))
    }, [selectedWord, totalWords])

    // 在渲染前检查 selectFile 和 files 是否有效
    const validValue = selectFile !== undefined ? fileOptions.filter((option) => option.id === selectFile?.id) : []

    useEffect(() => {
        const updateStudyPlan = async () => {
            let isWordInFile = false
            if (selectFile) {
                isWordInFile = await fileService.isWordInFile(
                    selectFile?.id || 0,
                    selectedWord?.idx || 0,
                    selectedWord?.text || ''
                )
            }
            const studyPlan = generateStudyPlan(
                dailyWords,
                isWordInFile && selectedWord ? totalWords - selectedWord.idx : totalWords,
                savedIntervals,
                startTime
            ) // 示例参数
            setStudyData(studyPlan)
        }
        updateStudyPlan()
    }, [dailyWords, savedIntervals, selectFile, selectedWord, startTime, totalWords])

    const handleTimeRangeChange = (index: number) => {
        const ranges = ['Today', 'This Week', 'This Month']
        const newIndex = (index + ranges.length) % ranges.length // 保证index始终有效
        const newRange = ranges[newIndex]
        setTimeRange(newRange)
        console.log(`Switched to: ${newRange}`)
    }

    const handleSave = () => {
        const reviewSettings: ReviewSettings = {
            dailyWords: dailyWords,
            interval: selectedStrategy.array,
            startTime: new Date(),
        }
        if (!selectFile?.id || !selectFile.reviewSettings) {
            return
        }
        const strategy: StrategyOption = {
            id: selectFile?.id,
            label: selectFile?.name,
            array: selectFile.reviewSettings.interval,
        }
        strategyOptions.push(strategy)
        setSelectedStrategy(strategy)
        if (!strategyOptions.find((option) => option.id === selectFile?.id)) {
            strategyOptions.push(strategy)
            setSelectedStrategy(strategy)
        }
        fileService.updateReviewSettings(selectFile?.id, reviewSettings)
        setActionStr(t('Review settings saved'))
    }

    const handleSliderChange = (sliderPositions: number[]) => {
        const times = sliderPositions.map(mapSliderValueToTime)

        strategyOptions[4].array = times // 存储原始分钟数数组作为自定义数组
        setSelectedStrategy(strategyOptions[4])
        setSliderValues(sliderPositions)
        setSavedIntervals(strategyOptions[4].array)
    }

    const handleDailyWordsChange = (value: number) => {
        console.log('handleDailyWordsChange', value)
        setDailyWords(value)
    }

    const marks = selectedStrategy.array.reduce((acc, cur, index) => {
        const position = calculateSliderPosition(cur)
        acc[position] = { label: calculateTimeValue(cur), style: {} } // 初始样式为空对象
        return acc
    }, {})

    const displayMarks = getAdjustedMarks(marks, selectedStrategy.array.map(calculateSliderPosition))

    const wordsMarks = {
        0: '0',
        10: '10',
        20: '20',
        40: '40',
        80: '80',
        100: '100',
        150: '150',
        200: '200',
    }

    useEffect(() => {
        // 当策略更改时更新滑块位置
        setSliderValues(selectedStrategy.array.map(calculateSliderPosition))
    }, [selectedStrategy])

    return (
        <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: '300px', width: '100%' }}>
                <Select
                    size={SIZE.compact}
                    options={fileOptions}
                    labelKey='label'
                    valueKey='id'
                    onChange={onFileChange}
                    value={validValue}
                    placeholder={t('Select a file') ?? 'Select a file'}
                />
                <Select
                    size={SIZE.compact}
                    options={strategyOptions}
                    labelKey='label'
                    valueKey='id'
                    value={[selectedStrategy]}
                    onChange={({ value }) => handleStrategyChange(value[0] as StrategyOption)}
                    placeholder={t('Select a strategy') ?? 'Select a strategy'}
                />
                <Button size='compact' kind={KIND.secondary} onClick={handleSave}>
                    {t('Save')}
                </Button>
            </div>
            <div style={{ marginTop: '20px' }}>
                <p>{t('Set Review Intervals')}</p>
                <Slider
                    pushable={1}
                    range
                    min={0}
                    max={126}
                    value={sliderValues}
                    onChange={(values) => handleSliderChange(values as number[])}
                    marks={displayMarks}
                    style={{ width: '100%', marginBottom: '10px', marginTop: '20px' }}
                />
            </div>
            <div style={{ marginTop: '40px', marginBottom: '20px' }}>
                <p>{t('Set Daily Words')}</p>
                <Slider
                    min={0}
                    max={200}
                    value={dailyWords}
                    onChange={(value) => handleDailyWordsChange(value as number)}
                    marks={wordsMarks}
                    style={{ width: '100%', marginBottom: '10px' }}
                />
            </div>
            <div>
                <StudyChart
                    studyData={studyData}
                    title={`${t('Study Plan Overview')} - ${selectFile?.name ?? 'Default'}`}
                />
            </div>
        </div>
    )
}
