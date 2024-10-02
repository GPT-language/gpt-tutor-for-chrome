import { ChatMessage } from '@/types/message'

export const getMessageById = (messages: ChatMessage[], id: string) => messages.find((m) => m.id === id)

export const getSlicedMessages = (messages: ChatMessage[]): ChatMessage[] => {
  // if historyCount is not enabled or set to 0, return all messages
  const historyCount = 30

  // if historyCount is positive, return last N messages
  return messages.slice(historyCount)
}

export const getSlicedMessagesByDate = (messages: ChatMessage[]): ChatMessage[] => {
  // 获取当前日期
  const today = new Date()
  today.setHours(0, 0, 0, 0) // 将时间设置为今天的开始

  // 过滤当天的消息
  return messages.filter((m) => {
    const messageDate = new Date(m.createdAt)
    return messageDate >= today
  })
}

export const chatHelpers = {
  getMessageById,
  getSlicedMessages,
  getSlicedMessagesByDate,
}
