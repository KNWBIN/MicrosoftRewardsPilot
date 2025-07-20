import { BrowserContext, Cookie } from 'rebrowser-playwright'
import { BrowserFingerprintWithHeaders } from 'fingerprint-generator'
import * as fs from 'fs'
import * as path from 'path'


import { Account } from '../interfaces/Account'
import { Config, ConfigSaveFingerprint } from '../interfaces/Config'

// 缓存管理
let configCache: Config | null = null
let accountsCache: Account[] | null = null
let isWatchingFiles = false

// 文件路径缓存
let configFilePath: string | null = null
let accountsFilePath: string | null = null

/**
 * 防抖函数
 */
function debounce(func: () => void, delay: number): () => void {
    let timeoutId: ReturnType<typeof setTimeout> | null = null
    return () => {
        if (timeoutId) {
            clearTimeout(timeoutId)
        }
        timeoutId = setTimeout(func, delay)
    }
}

/**
 * 日志输出函数
 */
function logConfigChange(type: 'config' | 'accounts', action: 'loaded' | 'reloaded' | 'error') {
    const timestamp = new Date().toISOString()
    console.log(`[${timestamp}] CONFIG-LOADER: ${type.toUpperCase()} ${action.toUpperCase()}`)
}

/**
 * 清除配置缓存
 */
export function clearConfigCache(): void {
    configCache = null
    console.log('[CONFIG-LOADER] Config cache cleared')
}

/**
 * 清除账户缓存
 */
export function clearAccountsCache(): void {
    accountsCache = null
    console.log('[CONFIG-LOADER] Accounts cache cleared')
}

/**
 * 手动刷新所有配置
 */
export function refreshAllConfigs(): void {
    clearConfigCache()
    clearAccountsCache()
    console.log('[CONFIG-LOADER] All configurations refreshed manually')
}

/**
 * 监听配置文件变化
 */
function watchConfigFile(filePath: string, reloadCallback: () => void): void {
    if (!fs.existsSync(filePath)) {
        console.warn(`[CONFIG-LOADER] Warning: ${filePath} does not exist, skipping watch`)
        return
    }

    try {
        fs.watch(filePath, (eventType: string) => {
            if (eventType === 'change') {
                console.log(`[CONFIG-LOADER] Detected change in ${path.basename(filePath)}`)
                reloadCallback()
            }
        })
        console.log(`[CONFIG-LOADER] Started watching ${path.basename(filePath)}`)
    } catch (error) {
        console.error(`[CONFIG-LOADER] Error watching ${filePath}:`, error)
    }
}

/**
 * 初始化文件监听
 */
function initFileWatching(): void {
    if (isWatchingFiles) {
        return
    }

    // 获取文件路径
    if (!configFilePath) {
        configFilePath = path.join(process.cwd(), 'config', 'config.json')
    }
    if (!accountsFilePath) {
        let file = 'accounts.json'
        if (process.argv.includes('-dev')) {
            file = 'accounts.dev.json'
        }
        accountsFilePath = path.join(process.cwd(), 'config', file)
    }

    // 创建防抖的重新加载函数
    const debouncedConfigReload = debounce(() => {
        clearConfigCache()
        try {
            loadConfig()
            logConfigChange('config', 'reloaded')
        } catch (error) {
            console.error('[CONFIG-LOADER] Error reloading config:', error)
            logConfigChange('config', 'error')
        }
    }, 1000) // 1秒防抖

    const debouncedAccountsReload = debounce(() => {
        clearAccountsCache()
        try {
            loadAccounts()
            logConfigChange('accounts', 'reloaded')
        } catch (error) {
            console.error('[CONFIG-LOADER] Error reloading accounts:', error)
            logConfigChange('accounts', 'error')
        }
    }, 1000) // 1秒防抖

    // 监听文件变化
    watchConfigFile(configFilePath, debouncedConfigReload)
    watchConfigFile(accountsFilePath, debouncedAccountsReload)

    isWatchingFiles = true
    console.log('[CONFIG-LOADER] File watching initialized')
}

export function loadAccounts(): Account[] {
    try {
        // 如果有缓存，直接返回
        if (accountsCache) {
            return accountsCache
        }

        let file = 'accounts.json'

        // If dev mode, use dev account(s)
        if (process.argv.includes('-dev')) {
            file = 'accounts.dev.json'
        }

        // 使用项目根目录的配置文件，而不是相对于编译后的文件位置
        const accountDir = path.join(process.cwd(), 'config', file)
        accountsFilePath = accountDir // 缓存路径

        // 检查文件是否存在
        if (!fs.existsSync(accountDir)) {
            throw new Error(`Accounts file not found: ${accountDir}`)
        }

        const accounts = fs.readFileSync(accountDir, 'utf-8')
        const parsedAccounts = JSON.parse(accounts)

        // 验证账户数据格式
        if (!Array.isArray(parsedAccounts)) {
            throw new Error('Accounts file must contain an array of accounts')
        }

        // 缓存结果
        accountsCache = parsedAccounts

        // 初始化文件监听（仅在首次加载时）
        if (!isWatchingFiles) {
            initFileWatching()
        }

        logConfigChange('accounts', 'loaded')
        return parsedAccounts
    } catch (error) {
        logConfigChange('accounts', 'error')
        throw new Error(`Failed to load accounts: ${error}`)
    }
}

export function loadConfig(): Config {
    try {
        // 如果有缓存，直接返回
        if (configCache) {
            return configCache
        }

        // 使用项目根目录的配置文件，而不是相对于编译后的文件位置
        const configDir = path.join(process.cwd(), 'config', 'config.json')
        configFilePath = configDir // 缓存路径

        // 检查文件是否存在
        if (!fs.existsSync(configDir)) {
            throw new Error(`Config file not found: ${configDir}`)
        }

        const config = fs.readFileSync(configDir, 'utf-8')
        const configData = JSON.parse(config)

        // 验证配置数据
        if (!configData || typeof configData !== 'object') {
            throw new Error('Config file must contain a valid JSON object')
        }

        // 缓存结果
        configCache = configData

        // 初始化文件监听（仅在首次加载时）
        if (!isWatchingFiles) {
            initFileWatching()
        }

        logConfigChange('config', 'loaded')
        return configData
    } catch (error) {
        logConfigChange('config', 'error')
        throw new Error(`Failed to load config: ${error}`)
    }
}

export async function loadSessionData(sessionPath: string, email: string, isMobile: boolean, saveFingerprint: ConfigSaveFingerprint) {
    try {
        // Fetch cookie file
        const cookieFile = path.join(__dirname, '../browser/', sessionPath, email, `${isMobile ? 'mobile_cookies' : 'desktop_cookies'}.json`)

        let cookies: Cookie[] = []
        if (fs.existsSync(cookieFile)) {
            const cookiesData = await fs.promises.readFile(cookieFile, 'utf-8')
            cookies = JSON.parse(cookiesData)
        }

        // Fetch fingerprint file
        const fingerprintFile = path.join(__dirname, '../browser/', sessionPath, email, `${isMobile ? 'mobile_fingerpint' : 'desktop_fingerpint'}.json`)

        let fingerprint!: BrowserFingerprintWithHeaders
        if (((saveFingerprint.desktop && !isMobile) || (saveFingerprint.mobile && isMobile)) && fs.existsSync(fingerprintFile)) {
            const fingerprintData = await fs.promises.readFile(fingerprintFile, 'utf-8')
            fingerprint = JSON.parse(fingerprintData)
        }

        return {
            cookies: cookies,
            fingerprint: fingerprint
        }

    } catch (error) {
        throw new Error(error as string)
    }
}

export async function saveSessionData(sessionPath: string, browser: BrowserContext, email: string, isMobile: boolean): Promise<string> {
    try {
        const cookies = await browser.cookies()

        // Fetch path
        const sessionDir = path.join(__dirname, '../browser/', sessionPath, email)

        // Create session dir
        if (!fs.existsSync(sessionDir)) {
            await fs.promises.mkdir(sessionDir, { recursive: true })
        }

        // Save cookies to a file
        await fs.promises.writeFile(path.join(sessionDir, `${isMobile ? 'mobile_cookies' : 'desktop_cookies'}.json`), JSON.stringify(cookies))

        return sessionDir
    } catch (error) {
        throw new Error(error as string)
    }
}

export async function saveFingerprintData(sessionPath: string, email: string, isMobile: boolean, fingerpint: BrowserFingerprintWithHeaders): Promise<string> {
    try {
        // Fetch path
        const sessionDir = path.join(__dirname, '../browser/', sessionPath, email)

        // Create session dir
        if (!fs.existsSync(sessionDir)) {
            await fs.promises.mkdir(sessionDir, { recursive: true })
        }

        // Save fingerprint to a file
        await fs.promises.writeFile(path.join(sessionDir, `${isMobile ? 'mobile_fingerpint' : 'desktop_fingerpint'}.json`), JSON.stringify(fingerpint))

        return sessionDir
    } catch (error) {
        throw new Error(error as string)
    }
}