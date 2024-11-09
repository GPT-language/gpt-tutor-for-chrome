import { Bar } from 'react-chartjs-2'
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js'
import { format, addMinutes } from 'date-fns'
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend)

export type StudyDay = {
  date: string
  newWords: number
  reviewWords: number
}

export const generateStudyPlan = (
  dailyWords: number,
  totalWords: number,
  reviewIntervals: number[],
  start: Date
): StudyDay[] => {
  const daysRequired = Math.ceil(totalWords / dailyWords)
  const studyPlan: StudyDay[] = []

  // 准备一个字典来追踪每天的复习单词
  const reviewsByDate: Record<string, number> = {}
  let cumulativeWords = 0
  let lastReviewDay = 0

  for (let day = 0; day < daysRequired; day++) {
    const currentDate = addMinutes(start, day * 1440) // 每天递增
    const dateString = format(currentDate, 'MM-dd')

    // 初始化每天的学习单词和复习单词
    studyPlan.push({
      date: dateString,
      newWords: dailyWords,
      reviewWords: reviewsByDate[dateString] || 0, // 若已有复习单词则添加，否则为0
    })

    // 累计新学习的单词
    cumulativeWords += dailyWords
    if (cumulativeWords > totalWords) {
      // 如果超出总单词数，调整最后一天的单词数
      studyPlan[studyPlan.length - 1].newWords -= cumulativeWords - totalWords
      break
    }

    // 计划复习单词
    reviewIntervals.forEach((interval) => {
      const reviewDate = addMinutes(currentDate, interval) // 计算复习时间
      const reviewDateString = format(reviewDate, 'MM-dd')
      if (!reviewsByDate[reviewDateString]) {
        reviewsByDate[reviewDateString] = 0 // 若无该日数据则初始化
      }
      reviewsByDate[reviewDateString] += dailyWords // 累计该日的复习单词数
      const reviewDayIndex = (interval + day * 1440) / 1440
      if (reviewDayIndex > lastReviewDay) {
        lastReviewDay = reviewDayIndex
      }
    })
  }

  // 更新studyPlan中的复习单词数
  studyPlan.forEach((day) => {
    day.reviewWords = reviewsByDate[day.date] // 分配累积的复习单词
  })

  while (studyPlan.length <= lastReviewDay) {
    const additionalDay = addMinutes(start, studyPlan.length * 1440)
    const additionalDayString = format(additionalDay, 'MM-dd')
    studyPlan.push({
      date: additionalDayString,
      newWords: 0,
      reviewWords: reviewsByDate[additionalDayString] || 0,
    })
  }

  return studyPlan
}

export const StudyChart = ({ studyData, title }: { studyData: StudyDay[]; title: string }) => {
  const data = {
    labels: studyData.map((day) => day.date),
    datasets: [
      {
        label: 'New Words',
        data: studyData.map((day) => day.newWords),
        backgroundColor: 'rgba(255, 99, 132, 0.5)',
      },
      {
        label: 'Review Words',
        data: studyData.map((day) => day.reviewWords),
        backgroundColor: 'rgba(54, 162, 235, 0.5)',
      },
    ],
  }

  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: title,
      },
    },
  }

  return <Bar data={data} options={options} />
}
