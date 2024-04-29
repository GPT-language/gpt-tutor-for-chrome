import { Topic } from '@/common/internal-services/db'

export interface ChatTopicState {
    activeTopicId?: string
    isSearchingTopic: boolean
    searchTopics: Topic[]
    topicLoadingId?: string
    topicRenamingId?: string
    topicSearchKeywords: string
    topics: Topic[]
    /**
     * whether topics have fetched
     */
    topicsInit: boolean
}

export const initialTopicState: ChatTopicState = {
    activeTopicId: 'test',
    isSearchingTopic: false,
    searchTopics: [],
    topicSearchKeywords: '',
    topics: [],
    topicsInit: false,
}
