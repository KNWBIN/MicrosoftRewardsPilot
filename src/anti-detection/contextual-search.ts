/**
 * 上下文感知搜索生成系统
 * 生成具有逻辑关联性的搜索查询，避免完全随机的搜索模式
 */
export class ContextualSearchGenerator {
    private searchHistory: string[] = []
    private currentTopic: string = ''
    private topicDepth: number = 0
    private sessionInterests: string[] = []
    private lastSearchTime: number = 0
    
    // 主题和相关搜索词库
    private readonly topicDatabase = {
        technology: {
            keywords: ['AI', 'machine learning', 'blockchain', 'cloud computing', 'cybersecurity', 'IoT', 'VR', 'AR', '5G', 'quantum computing'],
            related: ['artificial intelligence applications', 'deep learning tutorial', 'cryptocurrency news', 'cloud storage comparison', 'data privacy', 'smart home devices', 'virtual reality games', 'augmented reality shopping', 'mobile network speed', 'quantum computer breakthrough']
        },
        health: {
            keywords: ['fitness', 'nutrition', 'mental health', 'exercise', 'diet', 'wellness', 'meditation', 'sleep', 'vitamins', 'healthcare'],
            related: ['home workout routines', 'healthy recipes', 'stress management', 'yoga for beginners', 'weight loss tips', 'mindfulness techniques', 'sleep hygiene', 'vitamin D benefits', 'telemedicine services', 'mental health apps']
        },
        travel: {
            keywords: ['vacation', 'hotels', 'flights', 'destinations', 'tourism', 'culture', 'food', 'adventure', 'budget travel', 'luxury travel'],
            related: ['best vacation spots 2024', 'cheap flight deals', 'hotel booking tips', 'local cuisine guide', 'travel insurance', 'solo travel safety', 'family vacation ideas', 'backpacking essentials', 'cultural experiences', 'travel photography']
        },
        entertainment: {
            keywords: ['movies', 'music', 'games', 'books', 'TV shows', 'streaming', 'concerts', 'festivals', 'celebrities', 'sports'],
            related: ['new movie releases', 'music streaming services', 'video game reviews', 'bestselling books', 'TV series recommendations', 'concert tickets', 'music festivals 2024', 'celebrity news', 'sports scores', 'gaming hardware']
        },
        lifestyle: {
            keywords: ['fashion', 'home decor', 'cooking', 'gardening', 'pets', 'relationships', 'parenting', 'hobbies', 'productivity', 'self-improvement'],
            related: ['fashion trends 2024', 'interior design ideas', 'easy recipes', 'plant care tips', 'pet training', 'relationship advice', 'parenting tips', 'new hobbies to try', 'time management', 'personal development']
        },
        business: {
            keywords: ['entrepreneurship', 'investing', 'marketing', 'leadership', 'innovation', 'startups', 'finance', 'economy', 'career', 'networking'],
            related: ['business ideas 2024', 'stock market trends', 'digital marketing strategies', 'leadership skills', 'startup funding', 'personal finance', 'economic outlook', 'career development', 'professional networking', 'investment opportunities']
        },
        education: {
            keywords: ['learning', 'courses', 'skills', 'university', 'online education', 'certification', 'language learning', 'research', 'academic', 'training'],
            related: ['online courses free', 'skill development', 'university rankings', 'language learning apps', 'professional certification', 'research methods', 'academic writing', 'continuing education', 'vocational training', 'educational technology']
        },
        news: {
            keywords: ['current events', 'politics', 'world news', 'local news', 'breaking news', 'weather', 'science news', 'technology news', 'sports news', 'business news'],
            related: ['today headlines', 'political updates', 'international news', 'local weather forecast', 'scientific discoveries', 'tech industry news', 'sports results', 'market updates', 'climate change', 'social issues']
        }
    }
    
    // 日本特定的搜索主题
    private readonly japaneseTopics = {
        culture: ['日本文化', '伝統芸能', '祭り', '茶道', '華道', '書道', '着物', '日本料理', '温泉', '神社仏閣'],
        seasonal: ['桜', '紅葉', '夏祭り', '冬の風物詩', '梅雨', '台風', '雪景色', '花火大会', '初詣', 'お盆'],
        modern: ['アニメ', 'マンガ', 'J-POP', 'ゲーム', 'ファッション', 'グルメ', 'カフェ', 'ショッピング', 'テクノロジー', 'スマートフォン'],
        daily: ['天気予報', 'ニュース', '電車情報', 'レストラン', '映画', 'テレビ番組', 'スポーツ', '健康', '料理レシピ', '旅行']
    }
    
    /**
     * 生成上下文感知的搜索查询
     */
    generateContextualSearch(): string {
        const now = Date.now()
        // Track time since last search for future use
        this.lastSearchTime = now
        
        // 30%概率继续当前话题（如果话题深度未达到上限）
        if (this.currentTopic && this.topicDepth < 4 && Math.random() < 0.3) {
            this.topicDepth++
            const relatedSearch = this.generateRelatedSearch(this.currentTopic)
            this.recordSearch(relatedSearch)
            return relatedSearch
        }
        
        // 选择新话题
        this.selectNewTopic()
        this.topicDepth = 1
        
        const newSearch = this.generateTopicSearch(this.currentTopic)
        this.recordSearch(newSearch)
        return newSearch
    }
    
    /**
     * 选择新的搜索话题
     */
    private selectNewTopic(): void {
        const hour = new Date().getHours()
        const dayOfWeek = new Date().getDay()
        
        // 基于时间调整话题权重
        const timeBasedWeights = this.getTimeBasedTopicWeights(hour, dayOfWeek)
        
        // 避免重复最近的话题
        const availableTopics = Object.keys(this.topicDatabase).filter(topic => 
            !this.sessionInterests.slice(-3).includes(topic)
        )
        
        // 权重选择
        const weightedTopics = availableTopics.map(topic => ({
            topic,
            weight: timeBasedWeights[topic] || 1.0
        }))
        
        this.currentTopic = this.selectWeightedRandom(weightedTopics)
        this.sessionInterests.push(this.currentTopic)
        
        // 限制会话兴趣历史长度
        if (this.sessionInterests.length > 8) {
            this.sessionInterests.shift()
        }
    }
    
    /**
     * 基于时间获取话题权重
     */
    private getTimeBasedTopicWeights(hour: number, dayOfWeek: number): Record<string, number> {
        const weights: Record<string, number> = {}
        
        // 工作时间
        if (hour >= 9 && hour <= 17 && dayOfWeek >= 1 && dayOfWeek <= 5) {
            weights.business = 2.0
            weights.technology = 1.8
            weights.news = 1.5
            weights.education = 1.3
        }
        // 晚上
        else if (hour >= 19 && hour <= 23) {
            weights.entertainment = 2.0
            weights.lifestyle = 1.8
            weights.health = 1.5
        }
        // 周末
        else if (dayOfWeek === 0 || dayOfWeek === 6) {
            weights.travel = 2.0
            weights.entertainment = 1.8
            weights.lifestyle = 1.5
            weights.health = 1.3
        }
        // 深夜/早晨
        else {
            weights.news = 1.5
            weights.health = 1.3
            weights.education = 1.2
        }
        
        return weights
    }
    
    /**
     * 生成话题相关搜索
     */
    private generateTopicSearch(topic: string): string {
        const topicData = this.topicDatabase[topic as keyof typeof this.topicDatabase]
        if (!topicData) return this.generateFallbackSearch()
        
        // 70%概率使用关键词，30%概率使用相关搜索
        if (Math.random() < 0.7) {
            const keyword = topicData.keywords[Math.floor(Math.random() * topicData.keywords.length)]
            return this.enhanceKeyword(keyword || '')
        } else {
            return topicData.related[Math.floor(Math.random() * topicData.related.length)] || ''
        }
    }
    
    /**
     * 生成相关搜索
     */
    private generateRelatedSearch(topic: string): string {
        const topicData = this.topicDatabase[topic as keyof typeof this.topicDatabase]
        if (!topicData) return this.generateFallbackSearch()
        
        // 基于搜索历史生成相关查询
        const lastSearch = this.searchHistory[this.searchHistory.length - 1]
        
        // 尝试生成语义相关的搜索
        if (lastSearch) {
            const relatedTerms = this.findRelatedTerms(lastSearch, topicData)
            if (relatedTerms.length > 0) {
                return relatedTerms[Math.floor(Math.random() * relatedTerms.length)] || ''
            }
        }
        
        // 回退到话题相关搜索
        return topicData.related[Math.floor(Math.random() * topicData.related.length)] || ''
    }
    
    /**
     * 增强关键词
     */
    private enhanceKeyword(keyword: string): string {
        const enhancers = [
            `${keyword} 2024`,
            `best ${keyword}`,
            `${keyword} guide`,
            `${keyword} tips`,
            `${keyword} review`,
            `how to ${keyword}`,
            `${keyword} comparison`,
            `${keyword} benefits`,
            `${keyword} tutorial`,
            `${keyword} news`
        ]
        
        // 30%概率直接使用关键词，70%概率使用增强版本
        if (Math.random() < 0.3) {
            return keyword
        }
        
        return enhancers[Math.floor(Math.random() * enhancers.length)] || ''
    }
    
    /**
     * 查找相关术语
     */
    private findRelatedTerms(searchTerm: string, topicData: any): string[] {
        const related: string[] = []
        
        // 查找包含相似词汇的相关搜索
        const searchWords = searchTerm.toLowerCase().split(' ')
        
        for (const relatedTerm of topicData.related) {
            const relatedWords = relatedTerm.toLowerCase().split(' ')
            const commonWords = searchWords.filter(word => 
                relatedWords.some((relatedWord: string) =>
                    relatedWord.includes(word) || word.includes(relatedWord)
                )
            )
            
            if (commonWords.length > 0) {
                related.push(relatedTerm)
            }
        }
        
        return related
    }
    
    /**
     * 生成回退搜索
     */
    private generateFallbackSearch(): string {
        const fallbackSearches = [
            'weather today',
            'news headlines',
            'movie reviews',
            'restaurant near me',
            'travel destinations',
            'healthy recipes',
            'technology news',
            'sports scores',
            'music streaming',
            'online shopping'
        ]
        
        return fallbackSearches[Math.floor(Math.random() * fallbackSearches.length)] || ''
    }
    
    /**
     * 生成日本本地化搜索
     */
    generateJapaneseLocalizedSearch(): string {
        const categories = Object.keys(this.japaneseTopics)
        const category = categories[Math.floor(Math.random() * categories.length)]
        const topics = this.japaneseTopics[category as keyof typeof this.japaneseTopics]
        
        const baseTerm = topics[Math.floor(Math.random() * topics.length)]
        
        // 添加常见的日语搜索修饰词
        const modifiers = ['とは', 'について', 'の方法', 'おすすめ', '人気', '最新', '2024', 'ランキング', '比較', 'レビュー']
        
        if (Math.random() < 0.6) {
            const modifier = modifiers[Math.floor(Math.random() * modifiers.length)]
            return `${baseTerm} ${modifier}`
        }
        
        return baseTerm || ''
    }
    
    /**
     * 权重随机选择
     */
    private selectWeightedRandom(items: Array<{ topic: string; weight: number }>): string {
        const totalWeight = items.reduce((sum, item) => sum + item.weight, 0)
        let randomWeight = Math.random() * totalWeight
        
        for (const item of items) {
            randomWeight -= item.weight
            if (randomWeight <= 0) {
                return item.topic
            }
        }
        
        return items[0]?.topic || 'general' // fallback
    }
    
    /**
     * 记录搜索
     */
    private recordSearch(search: string): void {
        this.searchHistory.push(search)
        this.lastSearchTime = Date.now()
        
        // 限制搜索历史长度
        if (this.searchHistory.length > 20) {
            this.searchHistory.shift()
        }
    }
    
    /**
     * 获取搜索统计
     */
    getSearchStats(): {
        currentTopic: string
        topicDepth: number
        searchCount: number
        sessionInterests: string[]
        lastSearchTime: number
    } {
        return {
            currentTopic: this.currentTopic,
            topicDepth: this.topicDepth,
            searchCount: this.searchHistory.length,
            sessionInterests: [...this.sessionInterests],
            lastSearchTime: this.lastSearchTime
        }
    }
    
    /**
     * 重置会话
     */
    resetSession(): void {
        this.searchHistory = []
        this.currentTopic = ''
        this.topicDepth = 0
        this.sessionInterests = []
        this.lastSearchTime = 0
    }
}
