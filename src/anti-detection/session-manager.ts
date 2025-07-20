/**
 * 优化的会话管理系统
 * 实现更自然的会话持续时间和生活中断模拟
 */
export class SessionManager {
    private sessionStartTime: number = Date.now()
    private totalSearches: number = 0
    private sessionBreaks: number = 0
    private lastBreakTime: number = 0
    private userProfile: UserProfile
    
    constructor(userProfile?: Partial<UserProfile>) {
        this.userProfile = {
            userType: 'normal',
            activityLevel: 'medium',
            attentionSpan: 'medium',
            multitaskingTendency: 'low',
            ...userProfile
        }
    }
    
    /**
     * 计算会话持续时间
     */
    calculateSessionDuration(): number {
        const hour = new Date().getHours()
        const dayOfWeek = new Date().getDay()
        
        // 基础会话时长（分钟）
        let baseDuration = this.getBaseDurationByProfile()
        
        // 时间调整
        baseDuration = this.applyTimeAdjustment(baseDuration, hour, dayOfWeek)
        
        // 添加随机变化
        const randomFactor = 0.7 + Math.random() * 0.6 // 0.7-1.3倍
        
        return Math.floor(baseDuration * randomFactor * 60 * 1000) // 转换为毫秒
    }
    
    /**
     * 根据用户档案获取基础时长
     */
    private getBaseDurationByProfile(): number {
        const profiles = {
            quick: { min: 5, max: 15 },      // 快速用户：5-15分钟
            normal: { min: 10, max: 30 },    // 普通用户：10-30分钟
            thorough: { min: 20, max: 60 },  // 深度用户：20-60分钟
            casual: { min: 8, max: 25 }      // 休闲用户：8-25分钟
        }
        
        const profile = profiles[this.userProfile.userType]
        return profile.min + Math.random() * (profile.max - profile.min)
    }
    
    /**
     * 应用时间调整
     */
    private applyTimeAdjustment(baseDuration: number, hour: number, dayOfWeek: number): number {
        let multiplier = 1.0
        
        // 工作时间调整
        if (hour >= 9 && hour <= 17 && dayOfWeek >= 1 && dayOfWeek <= 5) {
            multiplier *= 0.6 // 工作时间较短会话
        }
        // 午休时间
        else if (hour >= 12 && hour <= 14) {
            multiplier *= 1.2 // 午休时间稍长
        }
        // 晚上黄金时间
        else if (hour >= 19 && hour <= 22) {
            multiplier *= 1.4 // 晚上时间较长
        }
        // 深夜
        else if (hour >= 23 || hour <= 6) {
            multiplier *= 0.8 // 深夜较短
        }
        // 周末
        if (dayOfWeek === 0 || dayOfWeek === 6) {
            multiplier *= 1.3 // 周末时间更长
        }
        
        return baseDuration * multiplier
    }
    
    /**
     * 检查是否需要休息
     */
    shouldTakeBreak(): boolean {
        const sessionDuration = Date.now() - this.sessionStartTime
        const timeSinceLastBreak = Date.now() - this.lastBreakTime
        
        // 基于用户档案的休息倾向
        const breakTendency = this.getBreakTendency()
        
        // 会话时间越长，休息概率越高
        const sessionFactor = Math.min(sessionDuration / (30 * 60 * 1000), 1.0) // 30分钟为基准
        
        // 距离上次休息时间越长，休息概率越高
        const timeFactor = Math.min(timeSinceLastBreak / (15 * 60 * 1000), 1.0) // 15分钟为基准
        
        // 搜索次数因子
        const searchFactor = Math.min(this.totalSearches / 20, 1.0) // 20次搜索为基准
        
        const breakProbability = breakTendency * sessionFactor * timeFactor * searchFactor
        
        return Math.random() < breakProbability
    }
    
    /**
     * 获取休息倾向
     */
    private getBreakTendency(): number {
        const tendencies = {
            high: 0.15,    // 高注意力用户，经常休息
            medium: 0.08,  // 中等注意力用户
            low: 0.04      // 低注意力用户，很少主动休息
        }
        
        return tendencies[this.userProfile.attentionSpan]
    }
    
    /**
     * 生成休息时长
     */
    generateBreakDuration(): number {
        const breakTypes = [
            { weight: 0.4, min: 30000, max: 120000 },    // 短暂休息：30秒-2分钟
            { weight: 0.3, min: 120000, max: 300000 },   // 中等休息：2-5分钟
            { weight: 0.2, min: 300000, max: 900000 },   // 长休息：5-15分钟
            { weight: 0.1, min: 900000, max: 1800000 }   // 很长休息：15-30分钟
        ]
        
        const selectedBreak = this.selectWeightedRandom(breakTypes)
        const duration = selectedBreak.min + Math.random() * (selectedBreak.max - selectedBreak.min)
        
        this.sessionBreaks++
        this.lastBreakTime = Date.now()
        
        return Math.floor(duration)
    }
    
    /**
     * 模拟生活中断
     */
    simulateLifeInterruption(): { shouldInterrupt: boolean; duration: number; reason: string } {
        const hour = new Date().getHours()
        const interruptions = this.getTimeBasedInterruptions(hour)
        
        // 基础中断概率
        let interruptionProbability = 0.02 // 2%基础概率
        
        // 多任务倾向调整
        if (this.userProfile.multitaskingTendency === 'high') {
            interruptionProbability *= 2.0
        } else if (this.userProfile.multitaskingTendency === 'low') {
            interruptionProbability *= 0.5
        }
        
        if (Math.random() < interruptionProbability) {
            const interruption = interruptions[Math.floor(Math.random() * interruptions.length)]
            return {
                shouldInterrupt: true,
                duration: (interruption?.min || 100) + Math.random() * ((interruption?.max || 500) - (interruption?.min || 100)),
                reason: interruption?.reason || 'unknown'
            }
        }
        
        return { shouldInterrupt: false, duration: 0, reason: '' }
    }
    
    /**
     * 获取基于时间的中断类型
     */
    private getTimeBasedInterruptions(hour: number): Array<{ min: number; max: number; reason: string }> {
        const baseInterruptions = [
            { min: 10000, max: 60000, reason: 'checking phone notification' },
            { min: 30000, max: 180000, reason: 'brief conversation' },
            { min: 60000, max: 300000, reason: 'bathroom break' },
            { min: 120000, max: 600000, reason: 'getting snack/drink' }
        ]
        
        // 工作时间特定中断
        if (hour >= 9 && hour <= 17) {
            baseInterruptions.push(
                { min: 180000, max: 900000, reason: 'work meeting' },
                { min: 60000, max: 300000, reason: 'colleague interruption' }
            )
        }
        
        // 用餐时间
        if ((hour >= 12 && hour <= 14) || (hour >= 18 && hour <= 20)) {
            baseInterruptions.push(
                { min: 600000, max: 2400000, reason: 'meal time' }
            )
        }
        
        // 晚上家庭时间
        if (hour >= 18 && hour <= 22) {
            baseInterruptions.push(
                { min: 300000, max: 1200000, reason: 'family interaction' },
                { min: 120000, max: 600000, reason: 'household chores' }
            )
        }
        
        return baseInterruptions
    }
    
    /**
     * 检查会话是否应该结束
     */
    shouldEndSession(): boolean {
        const sessionDuration = Date.now() - this.sessionStartTime
        const plannedDuration = this.calculateSessionDuration()
        
        // 基本时间检查
        if (sessionDuration >= plannedDuration) {
            return true
        }
        
        // 疲劳因子
        const fatigueLevel = this.calculateFatigueLevel()
        if (fatigueLevel > 0.8 && Math.random() < 0.3) {
            return true
        }
        
        // 随机早期结束（模拟突发事件）
        if (sessionDuration > plannedDuration * 0.5 && Math.random() < 0.05) {
            return true
        }
        
        return false
    }
    
    /**
     * 计算疲劳水平
     */
    private calculateFatigueLevel(): number {
        const sessionDuration = Date.now() - this.sessionStartTime
        const sessionMinutes = sessionDuration / (60 * 1000)
        
        // 基于搜索次数的疲劳
        const searchFatigue = Math.min(this.totalSearches / 30, 1.0)
        
        // 基于时间的疲劳
        const timeFatigue = Math.min(sessionMinutes / 45, 1.0)
        
        // 基于用户档案的疲劳抗性
        const fatigueResistance = {
            high: 0.7,    // 高活跃度用户抗疲劳
            medium: 1.0,  // 中等用户
            low: 1.3      // 低活跃度用户容易疲劳
        }
        
        const resistance = fatigueResistance[this.userProfile.activityLevel]
        
        return Math.min((searchFatigue + timeFatigue) * resistance, 1.0)
    }
    
    /**
     * 权重随机选择
     */
    private selectWeightedRandom<T>(items: Array<{ weight: number } & T>): T {
        const totalWeight = items.reduce((sum, item) => sum + item.weight, 0)
        let randomWeight = Math.random() * totalWeight
        
        for (const item of items) {
            randomWeight -= item.weight
            if (randomWeight <= 0) {
                return item
            }
        }
        
        return items[0] as T // fallback with type assertion
    }
    
    /**
     * 记录搜索
     */
    recordSearch(): void {
        this.totalSearches++
    }
    
    /**
     * 获取会话统计
     */
    getSessionStats(): {
        duration: number
        searches: number
        breaks: number
        fatigueLevel: number
    } {
        return {
            duration: Date.now() - this.sessionStartTime,
            searches: this.totalSearches,
            breaks: this.sessionBreaks,
            fatigueLevel: this.calculateFatigueLevel()
        }
    }
    
    /**
     * 重置会话
     */
    resetSession(): void {
        this.sessionStartTime = Date.now()
        this.totalSearches = 0
        this.sessionBreaks = 0
        this.lastBreakTime = 0
    }
}

/**
 * 用户档案接口
 */
interface UserProfile {
    userType: 'quick' | 'normal' | 'thorough' | 'casual'
    activityLevel: 'high' | 'medium' | 'low'
    attentionSpan: 'high' | 'medium' | 'low'
    multitaskingTendency: 'high' | 'medium' | 'low'
}
