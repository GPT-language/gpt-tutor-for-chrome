import { nanoid } from '@/utils/uuid'
import { Topic, getLocalDB } from './db'
import { messageService } from './message'
import { chatService } from '@/services/chat'
import { getSettings } from '../utils'

export interface CreateTopicParams {
    favorite?: 0 | 1
    messages?: string[]
    sessionId: string
    title: string
}

export interface QueryTopicParams {
    current?: number
    pageSize?: number
    sessionId: string
}

class TopicService {
    private get db() {
        return getLocalDB()
    }
    private get settings() {
        return getSettings()
    }
    // **************** Create *************** //

    async create({ title, favorite, sessionId }: CreateTopicParams) {
        const activatedActionName = chatService.getSavedAction?.name
        const topicId = (await chatService.getConversationId(activatedActionName)) as string
        const model = (await this.settings).provider
        const id = model === 'ChatGPT' ? topicId : nanoid()

        const createdAt = Date.now() // 获取当前时间戳
        const updatedAt = Date.now()
        // 构造Topic对象
        const topic: Topic = {
            id,
            title,
            favorite,
            sessionId,
            createdAt,
            updatedAt,
        }

        // 添加topic到数据库
        await this.db.topic.add(topic)
        return topic
    }

    async createTopic(params: CreateTopicParams): Promise<string> {
        const item = await this.create(params)

        if (!item) {
            throw new Error('topic create Error')
        }

        return item.id
    }

    async query({ pageSize = 9999, current = 0, sessionId }: QueryTopicParams): Promise<ChatTopic[]> {
        const offset = current * pageSize

        // get all topics
        const allTopics = await this.db.topic.where('sessionId').equals(sessionId).toArray()

        // 将所有主题按星标消息优先，时间倒序进行排序
        const sortedTopics = allTopics.sort((a, b) => {
            if (a.favorite && !b.favorite) return -1 // a是星标，b不是，a排前面
            if (!a.favorite && b.favorite) return 1 // b是星标，a不是，b排前面

            // 如果星标状态相同，则按时间倒序排序
            return b.createdAt - a.createdAt
        })

        // handle pageSize
        const pagedTopics = sortedTopics.slice(offset, offset + pageSize)

        return pagedTopics
    }

    async getTopics(params: QueryTopicParams): Promise<Topic[]> {
        return this.query(params)
    }

    // 移除conversationId，即sessionId
    // 这里的id应该是指conversationId，而不是topic自身的id

    async removeTopic(id: string) {
        return this.delete(id)
    }

    async delete(id: string) {
        await this.db.topic.delete(id)
        // Delete all messages associated with the topic
        await messageService.batchDeleteBytopicId(id)
    }

    async removeAllTopic() {
        return this.clearTable()
    }

    protected async _clear() {
        const result = await this.db.topic.clear()
        return result
    }

    async clearTable() {
        return this._clear()
    }

    async findById(id: string): Promise<Topic | undefined> {
        return this.db.topic.get(id) || null
    }

    // **************** Update *************** //
    async update(id: string, data: Partial<Topic>) {
        this.db.topic.update(id, data)
    }

    async updateFavorite(id: string, newState?: boolean) {
        return this.toggleFavorite(id, newState)
    }

    async toggleFavorite(id: string, newState?: boolean) {
        const topic = await this.findById(id)
        if (!topic) {
            throw new Error(`Topic with id ${id} not found`)
        }

        // Toggle the 'favorite' status
        const nextState = typeof newState !== 'undefined' ? newState : !topic.favorite

        await this.update(id, { favorite: nextState ? 1 : 0 })

        return nextState
    }

    updateTitle(topicId: string, text: string) {
        const updatedAt = Date.now()
        return this.update(topicId, { title: text, updatedAt: updatedAt })
    }

    async getAllTopics() {
        return this.db.topic.orderBy('updatedAt').toArray()
    }
}

export const topicService = new TopicService()
