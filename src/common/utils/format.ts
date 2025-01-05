export const formatDate = (timestamp: number): string => {
    const date = new Date(timestamp)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    if (date.toDateString() === today.toDateString()) {
        return '今天'
    } else if (date.toDateString() === yesterday.toDateString()) {
        return '昨天'
    }
    return date.toLocaleDateString()
}