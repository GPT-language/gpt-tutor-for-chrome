import React, { useEffect, useState } from 'react'
import { SIZE, Select } from 'baseui-sd/select'
import { Button, KIND } from 'baseui-sd/button'
import Slider from 'rc-slider'
import 'rc-slider/assets/index.css'
import { StudyChart, StudyDay, generateStudyPlan } from './StudyChart'
import { fileService } from '../internal-services/file'
import { useTranslation } from 'react-i18next'
import { ReviewSettings, SavedFile } from '../internal-services/db'
import { useChatStore } from '@/store/file'
import { is } from 'date-fns/locale'
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

const getAdjustedMarks = (marks: Record<number, string>, sliderPositions: number[]) => {
    const keys = Object.keys(marks)
        .map(Number)
        .sort((a, b) => a - b)
    const adjustedMarks = {}

    keys.forEach((key, index) => {
        const markLabelOne = marks[key]
        const markLabelTwo = marks[keys[index - 1]]
        if (index > 0 && Math.abs(sliderPositions[index] - sliderPositions[index - 1]) <= 2) {
            // 如果当前滑块位置与前一个滑块位置距离小于2
            adjustedMarks[keys[index - 1]] = simplifyMark(markLabelTwo)
            adjustedMarks[key] = simplifyMark(markLabelOne)
        } else {
            adjustedMarks[key] = marks[key]
        }
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
        array: [0, 5, 15, 30, 60, 240, 1440, 5760, 11520, 21600],
    },
    {
        id: 'standard',
        label: '标准记忆策略',
        array: [0, 5, 30, 60, 240, 2880, 7200, 21600, 43200, 64800],
    },
    {
        id: 'loose',
        label: '松散型记忆策略',
        array: [0, 2880, 5760, 21600, 64800, 129600, 259200, 388800, 525600],
    },
    {
        id: 'custom',
        label: '自定义',
        array: [0, 5, 30, 60, 240, 2880, 7200, 21600, 43200, 64800],
    },
]

interface fileOptions {
    id: number | undefined
    label: string
}

export const ReviewManager = () => {
    const { setActionStr, selectedWord } = useChatStore()
    const [selectedStrategy, setSelectedStrategy] = useState(strategyOptions[0])
    const [sliderValues, setSliderValues] = useState(() => selectedStrategy.array.map(calculateSliderPosition))
    const [startTime, setStartTime] = useState(new Date())
    const [dailyWords, setDailyWords] = useState(10)
    const [savedIntervals, setSavedIntervals] = useState<number[] | []>(selectedStrategy.array)
    const [studyData, setStudyData] = useState<StudyDay[]>([])
    const [currentIndex, setCurrentIndex] = useState(0)
    const { t } = useTranslation()
    const [selectFile, setSelectFile] = useState<SavedFile | null>(null)
    const [timeRange, setTimeRange] = useState('Today')
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
        if (!selectFile?.id) {
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

        strategyOptions[3].array = times // 存储原始分钟数数组作为自定义数组
        setSelectedStrategy(strategyOptions[3])
        setSliderValues(sliderPositions)
        setSavedIntervals(strategyOptions[3].array)
    }

    const handleDailyWordsChange = (value: number) => {
        console.log('handleDailyWordsChange', value)
        setDailyWords(value)
    }

    const marks = selectedStrategy.array.reduce((acc, cur, index) => {
        const position = calculateSliderPosition(cur)
        acc[position] = calculateTimeValue(cur)
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
                    style={{ width: '100%', marginBottom: '10px' }}
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
