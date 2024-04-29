import { ChatStore } from '../../store'
import { Topic } from '@/common/internal-services/db'

const currentTopics = (s: ChatStore): Topic[] => s.topics

const currentActiveTopic = (s: ChatStore): Topic | undefined => {
    return s.topics.find((topic) => topic.id === s.activeTopicId)
}
const searchTopics = (s: ChatStore): Topic[] => s.searchTopics

const displayTopics = (s: ChatStore): Topic[] => (s.isSearchingTopic ? searchTopics(s) : currentTopics(s))

const currentUnFavTopics = (s: ChatStore): Topic[] => s.topics.filter((s) => !s.favorite)

const currentTopicLength = (s: ChatStore): number => currentTopics(s).length

const getTopicById =
    (id: string) =>
    (s: ChatStore): Topic | undefined =>
        currentTopics(s).find((topic) => topic.id === id)

export const topicSelectors = {
    currentActiveTopic,
    currentTopicLength,
    currentTopics,
    currentUnFavTopics,
    displayTopics,
    getTopicById,
    searchTopics,
}
