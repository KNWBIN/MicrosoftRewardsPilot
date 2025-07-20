/**
 * 反检测系统共享类型定义
 */

// 基础类型
export type ThreatLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
export type SystemMode = 'CONSERVATIVE' | 'BALANCED' | 'AGGRESSIVE' | 'QUANTUM' | 'STEALTH' | 'BIOMIMETIC'

// 核心接口
export interface DetectionEvent {
    timestamp: number
    type: string
    severity: number
    context: string
}

export interface StrategyMetrics {
    successCount: number
    failureCount: number
    lastUsed: number
    averageResponseTime: number
}

export interface SessionMetrics {
    failures: boolean[]
    actionIntervals: number[]
    mousePatterns: number[]
    keyboardPatterns: number[]
    networkRequestIntervals: number[]
}

export interface AntiDetectionStrategy {
    id: string
    delayMultiplier: number
    stealthLevel: number
    randomnessLevel: number
    behaviorComplexity: number
}

export interface OperationContext {
    timeOfDay: number
    accountAge: number
    recentFailures: number
    detectionEvents: number
    systemLoad: number
    networkAnomalies: number
}

export interface OperationFeedback {
    success: boolean
    responseTime: number
    detectionSignals: string[]
}

export interface BehaviorPattern {
    id: string
    actions: string[]
    timing: number[]
    effectiveness: number
}

export interface DetectionSystemProfile {
    vendor: string
    version: string
    capabilities: string[]
    weaknesses: string[]
    confidence: number
}

// 量子系统类型
export interface QuantumState {
    amplitude: number
    phase: number
    entangled: boolean
}

export interface Action {
    type: string
    parameters: any
    probability: number
}

// 生物仿生系统类型
export interface DetectionBarrier {
    strength: number
    complexity: number
    type: string
}

export interface DetectionThreat {
    type: string
    signature: string
    severity: number
}

export interface Experience {
    pathway: string
    outcome: 'success' | 'failure'
    intensity: number
}

// 网络相关类型
export interface NetworkProfile {
    connectionType: string
    bandwidth: number
    latency: number
    jitter: number
    packetLoss: number
}

// 复杂数学类型
export interface Complex {
    real: number
    imag: number
}
