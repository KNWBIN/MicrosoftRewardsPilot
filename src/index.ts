import cluster from 'cluster'
import { Page, BrowserContext } from 'rebrowser-playwright'

import Browser, { ManagedBrowser } from '../browser/Browser'
import BrowserFunc from '../browser/BrowserFunc'
import BrowserUtil from '../browser/BrowserUtil'

import { log } from '../utils/Logger'
import Util from '../utils/Utils'
import { loadAccounts, loadConfig, saveSessionData, refreshAllConfigs } from '../utils/Load'

import { Login } from '../functions/Login'
import { Workers } from '../functions/Workers'
import Activities from '../functions/Activities'

import { Account } from '../interfaces/Account'
import { DashboardData } from '../interfaces/DashboardData'
import Axios from '../utils/Axios'
import { TwoFactorAuthRequiredError, AccountLockedError } from '../interfaces/Errors'


// Main bot class
export class MicrosoftRewardsBot {
    public log: typeof log
    public config
    public utils: Util
    public activities: Activities = new Activities(this)
    public browser: {
        func: BrowserFunc,
        utils: BrowserUtil
    }
    public isMobile: boolean
    public homePage!: Page

    private pointsCanCollect: number = 0
    private pointsInitial: number = 0

    private activeWorkers: number
    private browserFactory: Browser = new Browser(this)
    private accounts: Account[]
    private workers: Workers
    private login = new Login(this)
    private accessToken: string = ''

    public axios!: Axios

    constructor(isMobile: boolean) {
        this.isMobile = isMobile
        this.log = log

        this.accounts = []
        this.utils = new Util()
        this.workers = new Workers(this)
        this.browser = {
            func: new BrowserFunc(this),
            utils: new BrowserUtil(this)
        }
        this.config = loadConfig()
        this.activeWorkers = this.config.clusters
    }

    async initialize() {
        this.accounts = loadAccounts()
        log('main', 'MAIN-CONFIG', `Loaded ${this.accounts.length} accounts for processing`)
    }

    async run() {
        // 刷新配置以确保使用最新设置
        this.config = loadConfig()
        this.accounts = loadAccounts()
        
        log('main', 'MAIN', `Bot started with ${this.config.clusters} clusters`)
        log('main', 'MAIN-CONFIG', `Using ${this.accounts.length} accounts and ${this.config.clusters} clusters`)

        // Only cluster when there's more than 1 cluster demanded
        if (this.config.clusters > 1) {
            if (cluster.isPrimary) {
                this.runMaster()
            } else {
                this.runWorker()
            }
        } else {
            await this.runTasks(this.accounts)
        }
    }

    private runMaster() {
        log('main', 'MAIN-PRIMARY', 'Primary process started')

        const accountChunks = this.utils.chunkArray(this.accounts, this.config.clusters)

        for (let i = 0; i < accountChunks.length; i++) {
            const worker = cluster.fork()
            const chunk = accountChunks[i]
            worker.send({ chunk })
        }

        cluster.on('exit', (worker, code) => {
            this.activeWorkers -= 1

            log('main', 'MAIN-WORKER', `Worker ${worker.process.pid} destroyed | Code: ${code} | Active workers: ${this.activeWorkers}`, 'warn')

            // Check if all workers have exited
            if (this.activeWorkers === 0) {
                log('main', 'MAIN-WORKER', 'All workers destroyed. Exiting main process!', 'warn')
                process.exit(0)
            }
        })
    }

    private runWorker() {
        log('main', 'MAIN-WORKER', `Worker ${process.pid} spawned`)
        // Receive the chunk of accounts from the master
        process.on('message', async ({ chunk }) => {
            await this.runTasks(chunk)
        })
    }

    private async runTasks(accounts: Account[]) {
        let completedAccounts = 0
        let failedAccounts = 0

        for (let i = 0; i < accounts.length; i++) {
            const account = accounts[i]
            if (!account) {
                log('main', 'MAIN-ERROR', `Account at index ${i} is undefined`, 'error')
                continue
            }
            
            const accountNumber = i + 1
            const totalAccounts = accounts.length

            log('main', 'MAIN-WORKER', `[${accountNumber}/${totalAccounts}] Started tasks for account ${account.email}`)

            try {
                // 在处理每个账户前刷新配置，确保使用最新设置
                this.config = loadConfig()

                // 设置账户处理超时（30分钟）
                const accountTimeout = this.utils.stringToMs(this.config.globalTimeout)
                
                await Promise.race([
                    this.processAccount(account),
                    new Promise((_, reject) => 
                        setTimeout(() => reject(new Error('Account processing timeout')), accountTimeout)
                    )
                ])

                completedAccounts++
                log('main', 'MAIN-WORKER', `[${accountNumber}/${totalAccounts}] ✅ Completed tasks for account ${account.email}`, 'log', 'green')

                // 添加账户间的延迟，避免请求过于频繁
                if (i < accounts.length - 1) {
                    // 使用配置文件中的延迟设置，如果没有则使用默认值
                    const accountDelayConfig = this.config.accountDelay || { min: '5min', max: '15min' }
                    const minDelay = this.utils.stringToMs(accountDelayConfig.min)
                    const maxDelay = this.utils.stringToMs(accountDelayConfig.max)
                    const delayMs = this.utils.randomNumber(minDelay, maxDelay)
                    
                    log('main', 'MAIN-WORKER', `⏱️ Waiting ${Math.round(delayMs/60000)} minutes before processing next account...`)
                    log('main', 'MAIN-WORKER', `Next account will start at: ${new Date(Date.now() + delayMs).toLocaleTimeString()}`)
                    
                    // 显示倒计时 - 每5分钟显示一次，避免频繁刷屏
                    let lastDisplayTime = 0
                    const countdownInterval = setInterval(() => {
                        const remaining = delayMs - (Date.now() - startTime)
                        const currentTime = Date.now()
                        
                        if (remaining > 0) {
                            // 每5分钟显示一次，或者是第一次显示
                            if (currentTime - lastDisplayTime >= 300000 || lastDisplayTime === 0) {
                                console.log(`⏳ Time remaining: ${Math.round(remaining/60000)} minutes...`)
                                lastDisplayTime = currentTime
                            }
                        }
                    }, 60000)  // 每1分钟检查一次，但只在满足条件时显示
                    
                    const startTime = Date.now()
                    await this.utils.wait(delayMs)
                    clearInterval(countdownInterval)
                    console.log('\n')  // 换行
                }

            } catch (error) {
                failedAccounts++
                log('main', 'MAIN-ERROR', `[${accountNumber}/${totalAccounts}] ❌ Failed to process account ${account.email}: ${error}`, 'error')
                
                // 记录错误详情但继续处理下一个账户
                log('main', 'MAIN-ERROR', `Account ${account.email} error details: ${error instanceof Error ? error.stack : error}`, 'error')
                
                // 尝试清理可能残留的资源
                try {
                    await this.cleanupAccountResources(account.email)
                } catch (cleanupError) {
                    log('main', 'MAIN-ERROR', `Failed to cleanup resources for ${account.email}: ${cleanupError}`, 'error')
                }

                // 如果失败次数过多，暂停一段时间
                if (failedAccounts >= 2) {
                    log('main', 'MAIN-WORKER', 'Multiple account failures detected, waiting 30s before continuing...', 'warn')
                    await this.utils.wait(30000)
                }
            }
        }

        // 报告最终结果
        log('main', 'MAIN-SUMMARY', 'Task execution completed:', 'log', 'cyan')
        log('main', 'MAIN-SUMMARY', `✅ Successful accounts: ${completedAccounts}/${accounts.length}`, 'log', 'green')
        log('main', 'MAIN-SUMMARY', `❌ Failed accounts: ${failedAccounts}/${accounts.length}`, 'log', failedAccounts > 0 ? 'yellow' : 'green')
        
        log(this.isMobile, 'MAIN-PRIMARY', 'Completed tasks for ALL accounts', 'log', 'green')
        process.exit()
    }

    /**
     * 处理单个账户的任务
     */
    private async processAccount(account: Account): Promise<void> {
        this.axios = new Axios(account.proxy)
        
                    if (this.config.parallel) {
                // 并行处理，但要分别处理错误
                const results = await Promise.allSettled([
                    this.Desktop(account).catch(error => {
                        log('main', 'MAIN-ERROR', `Desktop task failed for ${account.email}: ${error}`, 'error')
                        throw error
                    }),
                    (async () => {
                        const mobileInstance = new MicrosoftRewardsBot(true)
                        mobileInstance.axios = this.axios
                        return mobileInstance.Mobile(account).catch(error => {
                            // 特殊处理2FA错误
                            if (error instanceof TwoFactorAuthRequiredError) {
                                log('main', 'MAIN-2FA-SKIP', `Mobile task skipped for ${account.email}: ${error.message}`, 'warn')
                                return // 不抛出错误，视为成功跳过
                            }
                            log('main', 'MAIN-ERROR', `Mobile task failed for ${account.email}: ${error}`, 'error')
                            throw error
                        })
                    })()
                ])

                // 检查并行任务的结果
                let hasFailure = false
                results.forEach((result, index) => {
                    const taskType = index === 0 ? 'Desktop' : 'Mobile'
                    if (result.status === 'rejected') {
                        log('main', 'MAIN-ERROR', `${taskType} task failed for ${account.email}: ${result.reason}`, 'error')
                        hasFailure = true
                    } else {
                        log('main', 'MAIN-SUCCESS', `${taskType} task completed for ${account.email}`, 'log', 'green')
                    }
                })

                if (hasFailure) {
                    throw new Error('One or more parallel tasks failed')
                }
            } else {
                // 顺序处理
                try {
                    this.isMobile = false
                    await this.Desktop(account)
                    log('main', 'MAIN-SUCCESS', `Desktop task completed for ${account.email}`, 'log', 'green')
                } catch (error) {
                    log('main', 'MAIN-ERROR', `Desktop task failed for ${account.email}: ${error}`, 'error')
                    // 继续执行Mobile任务，不因为Desktop失败而停止
                }

                try {
                    this.isMobile = true
                    await this.Mobile(account)
                    log('main', 'MAIN-SUCCESS', `Mobile task completed for ${account.email}`, 'log', 'green')
                } catch (error) {
                    // 特殊处理2FA错误
                    if (error instanceof TwoFactorAuthRequiredError) {
                        log('main', 'MAIN-2FA-SKIP', `Mobile task skipped for ${account.email}: ${error.message}`, 'warn')
                        // 不视为错误，继续处理下一个账户
                    } else {
                        log('main', 'MAIN-ERROR', `Mobile task failed for ${account.email}: ${error}`, 'error')
                    }
                    // 记录错误但不抛出，允许继续处理下一个账户
                }
            }
    }

    /**
     * 清理账户相关资源
     */
    private async cleanupAccountResources(email: string): Promise<void> {
        try {
            log('main', 'CLEANUP', `Cleaning up resources for account ${email}`)

            // 强制垃圾回收（如果可用）
            if (global.gc) {
                global.gc()
                log('main', 'CLEANUP', 'Forced garbage collection')
            }

            // 给系统时间来清理资源
            await this.utils.wait(2000)

            log('main', 'CLEANUP', `Resource cleanup completed for account ${email}`)
        } catch (error) {
            log('main', 'CLEANUP-ERROR', `Resource cleanup failed for ${email}: ${error}`, 'error')
        }
    }

    /**
     * 手动刷新所有配置
     */
    public refreshConfigs(): void {
        refreshAllConfigs()
        this.config = loadConfig()
        this.accounts = loadAccounts()
        log('main', 'MAIN-CONFIG', 'All configurations manually refreshed')
    }

    // Desktop
    async Desktop(account: Account): Promise<void> {
        let managedBrowser: ManagedBrowser | null = null
        let workerPage

        try {
            managedBrowser = await this.browserFactory.createBrowser(account.proxy, account.email)
            this.homePage = await managedBrowser.context.newPage()

            log(this.isMobile, 'MAIN', 'Starting desktop browser')

            // Login into MS Rewards, then go to rewards homepage
            await this.login.login(this.homePage, account.email, account.password)

            await this.browser.func.goHome(this.homePage)

            const data = await this.browser.func.getDashboardData()

            this.pointsInitial = data.userStatus.availablePoints

            log(this.isMobile, 'MAIN-POINTS', `Current point count: ${this.pointsInitial}`)

            const browserEnarablePoints = await this.browser.func.getBrowserEarnablePoints()

            // Tally all the desktop points
            this.pointsCanCollect = browserEnarablePoints.dailySetPoints +
                browserEnarablePoints.desktopSearchPoints
                + browserEnarablePoints.morePromotionsPoints

            log(this.isMobile, 'MAIN-POINTS', `You can earn ${this.pointsCanCollect} points today`)

            // If runOnZeroPoints is false and 0 points to earn, don't continue
            if (!this.config.runOnZeroPoints && this.pointsCanCollect === 0) {
                log(this.isMobile, 'MAIN', 'No points to earn and "runOnZeroPoints" is set to "false", stopping!', 'log', 'yellow')

                // Close desktop browser
                await this.browser.func.closeBrowser(managedBrowser)
                return
            }

            // Open a new tab to where the tasks are going to be completed
            workerPage = await managedBrowser.context.newPage()

            // Go to homepage on worker page
            await this.browser.func.goHome(workerPage)

            // Execute tasks with individual error handling
            await this.executeDesktopTasks(workerPage, data)

            // Save cookies
            await saveSessionData(this.config.sessionPath, managedBrowser.context, account.email, this.isMobile)

            // Close desktop browser
            await this.browser.func.closeBrowser(managedBrowser)

        } catch (error) {
            log(this.isMobile, 'DESKTOP-ERROR', `Desktop task failed for ${account.email}: ${error}`, 'error')

            // 确保资源被清理
            if (workerPage) {
                try {
                    await workerPage.close()
                } catch (closeError) {
                    // 忽略关闭错误
                }
            }

            if (managedBrowser) {
                try {
                    await this.browser.func.closeBrowser(managedBrowser)
                } catch (closeError) {
                    log(this.isMobile, 'DESKTOP-CLEANUP', `Failed to close managed browser: ${closeError}`, 'error')
                }
            }

            throw error
        }
    }

    /**
     * 执行Desktop任务
     */
    private async executeDesktopTasks(workerPage: Page, data: DashboardData): Promise<void> {
        const tasks = [
            {
                name: 'Daily Set',
                enabled: this.config.workers.doDailySet,
                task: () => this.workers.doDailySet(workerPage, data)
            },
            {
                name: 'More Promotions',
                enabled: this.config.workers.doMorePromotions,
                task: () => this.workers.doMorePromotions(workerPage, data)
            },
            {
                name: 'Punch Cards',
                enabled: this.config.workers.doPunchCards,
                task: () => this.workers.doPunchCard(workerPage, data)
            },
            {
                name: 'Desktop Search',
                enabled: this.config.workers.doDesktopSearch,
                task: () => this.activities.doSearch(workerPage, data)
            }
        ]

        for (const { name, enabled, task } of tasks) {
            if (!enabled) {
                log(this.isMobile, 'DESKTOP-TASK', `Skipping ${name} (disabled in config)`)
                continue
            }

            try {
                log(this.isMobile, 'DESKTOP-TASK', `Starting ${name}...`)
                await task()
                log(this.isMobile, 'DESKTOP-TASK', `✅ Completed ${name}`, 'log', 'green')
            } catch (error) {
                log(this.isMobile, 'DESKTOP-TASK', `❌ Failed ${name}: ${error}`, 'error')
                // 继续执行其他任务，不因为单个任务失败而停止
            }
        }
    }

    // Mobile
    async Mobile(account: Account, retryCount = 0): Promise<void> {
        // 正确读取重试设置，支持0值
        const maxRetries = this.config.searchSettings?.retryMobileSearchAmount !== undefined
            ? this.config.searchSettings.retryMobileSearchAmount
            : 2
        let managedBrowser: ManagedBrowser | null = null

        try {
            managedBrowser = await this.browserFactory.createBrowser(account.proxy, account.email)
            this.homePage = await managedBrowser.context.newPage()

            log(this.isMobile, 'MAIN', `Starting mobile browser (attempt ${retryCount + 1}/${maxRetries + 1})`)

            // Login into MS Rewards, then go to rewards homepage
            await this.login.login(this.homePage, account.email, account.password)
            this.accessToken = await this.login.getMobileAccessToken(this.homePage, account.email)

            await this.browser.func.goHome(this.homePage)

            const data = await this.browser.func.getDashboardData()

            const browserEnarablePoints = await this.browser.func.getBrowserEarnablePoints()
            const appEarnablePoints = await this.browser.func.getAppEarnablePoints(this.accessToken)

            this.pointsCanCollect = browserEnarablePoints.mobileSearchPoints + appEarnablePoints.totalEarnablePoints

            log(this.isMobile, 'MAIN-POINTS', `You can earn ${this.pointsCanCollect} points today (Browser: ${browserEnarablePoints.mobileSearchPoints} points, App: ${appEarnablePoints.totalEarnablePoints} points)`)

            // If runOnZeroPoints is false and 0 points to earn, don't continue
            if (!this.config.runOnZeroPoints && this.pointsCanCollect === 0) {
                log(this.isMobile, 'MAIN', 'No points to earn and "runOnZeroPoints" is set to "false", stopping!', 'log', 'yellow')

                // Close mobile browser
                if (managedBrowser) await this.browser.func.closeBrowser(managedBrowser)
                return
            }

            // Do daily check in
            if (this.config.workers.doDailyCheckIn) {
                try {
                    log(this.isMobile, 'MOBILE-TASK', 'Starting Daily Check-In...')
                await this.activities.doDailyCheckIn(this.accessToken, data)
                    log(this.isMobile, 'MOBILE-TASK', '✅ Completed Daily Check-In')
                } catch (error) {
                    log(this.isMobile, 'MOBILE-TASK', `❌ Daily Check-In failed: ${error}`, 'error')
                }
            } else {
                log(this.isMobile, 'MOBILE-TASK', 'Daily Check-In disabled in config')
            }

            // Do read to earn
            if (this.config.workers.doReadToEarn) {
                try {
                    log(this.isMobile, 'MOBILE-TASK', 'Starting Read to Earn...')
                await this.activities.doReadToEarn(this.accessToken, data)
                    log(this.isMobile, 'MOBILE-TASK', '✅ Completed Read to Earn')
                } catch (error) {
                    log(this.isMobile, 'MOBILE-TASK', `❌ Read to Earn failed: ${error}`, 'error')
                }
            } else {
                log(this.isMobile, 'MOBILE-TASK', 'Read to Earn disabled in config')
            }

            // Do mobile searches
            if (this.config.workers.doMobileSearch) {
                try {
                    log(this.isMobile, 'MOBILE-TASK', 'Starting Mobile Search...')
                await this.performMobileSearches(managedBrowser.context, data, account, retryCount, maxRetries)
                    log(this.isMobile, 'MOBILE-TASK', '✅ Completed Mobile Search')
                } catch (error) {
                    log(this.isMobile, 'MOBILE-TASK', `❌ Mobile Search failed: ${error}`, 'error')
                }
            } else {
                log(this.isMobile, 'MOBILE-TASK', 'Mobile Search disabled in config')
            }

            const afterPointAmount = await this.browser.func.getCurrentPoints()

            log(this.isMobile, 'MAIN-POINTS', `The script collected ${afterPointAmount - this.pointsInitial} points today`)

            // Close mobile browser
            await this.browser.func.closeBrowser(managedBrowser)

        } catch (error) {
            // 确保浏览器被清理
            if (managedBrowser) {
                try {
                    await this.browser.func.closeBrowser(managedBrowser)
                } catch (closeError) {
                    log(this.isMobile, 'MOBILE-CLEANUP', `Failed to close managed browser: ${closeError}`, 'error')
                }
            }
            
            // 特殊处理OAuth授权超时错误
            if (error instanceof Error && error.message.includes('OAuth authorization timeout')) {
                log(this.isMobile, 'MOBILE-OAUTH', `OAuth timeout for ${account.email}: ${error.message}`, 'warn')
                log(this.isMobile, 'MOBILE-OAUTH', 'Mobile task requires user interaction - skipping', 'warn')
                throw new TwoFactorAuthRequiredError('Mobile OAuth requires user interaction - skipping mobile tasks for this account')
            }
            
            // 特殊处理2FA相关错误，直接重新抛出
            if (error instanceof TwoFactorAuthRequiredError || error instanceof AccountLockedError) {
                throw error
            }
            
            throw error
        }
    }

    /**
     * 执行Mobile搜索任务
     */
    private async performMobileSearches(browser: BrowserContext, data: DashboardData, account: Account, retryCount: number, maxRetries: number): Promise<void> {
        // If no mobile searches data found, stop (Does not always exist on new accounts)
        if (!data.userStatus.counters.mobileSearch) {
            log(this.isMobile, 'MAIN', 'Unable to fetch search points, your account is most likely too "new" for this! Try again later!', 'warn')
            return
        }

        // 记录初始搜索积分状态
        const initialMobileSearchPoints = data.userStatus.counters.mobileSearch[0]
        if (initialMobileSearchPoints) {
            const remainingPoints = initialMobileSearchPoints.pointProgressMax - initialMobileSearchPoints.pointProgress
            log(this.isMobile, 'MOBILE-SEARCH-INITIAL', `Initial mobile search status: ${initialMobileSearchPoints.pointProgress}/${initialMobileSearchPoints.pointProgressMax} points (${remainingPoints} remaining)`)
        }

        // Open a new tab to where the tasks are going to be completed
        const workerPage = await browser.newPage()

        try {
            // Go to homepage on worker page
            await this.browser.func.goHome(workerPage)

            log(this.isMobile, 'MOBILE-SEARCH-START', 'Starting mobile search execution...')
            await this.activities.doSearch(workerPage, data)
            log(this.isMobile, 'MOBILE-SEARCH-END', 'Mobile search execution completed')

            // 等待一段时间让积分更新
            await this.utils.wait(3000)

            // Fetch current search points with enhanced checking
            log(this.isMobile, 'MOBILE-SEARCH-CHECK', 'Checking mobile search completion status...')
            const currentSearchCounters = await this.browser.func.getSearchPoints()
            const mobileSearchPoints = currentSearchCounters.mobileSearch?.[0]

            if (mobileSearchPoints) {
                const remainingPoints = mobileSearchPoints.pointProgressMax - mobileSearchPoints.pointProgress
                log(this.isMobile, 'MOBILE-SEARCH-STATUS', `Final mobile search status: ${mobileSearchPoints.pointProgress}/${mobileSearchPoints.pointProgressMax} points (${remainingPoints} remaining)`)

                // 检查是否还有剩余积分
                if (remainingPoints > 0) {
                    // 如果重试次数为0，直接报告完成状态而不重试
                    if (maxRetries === 0) {
                        log(this.isMobile, 'MOBILE-SEARCH-INCOMPLETE', `Mobile search incomplete: ${remainingPoints} points remaining, but retries disabled (retryMobileSearchAmount: 0)`, 'warn')
                        log(this.isMobile, 'MOBILE-SEARCH-SUGGESTION', 'To enable retries, set "retryMobileSearchAmount" to a value > 0 in config.json', 'warn')
                        return
                    }

                    // 如果还在重试范围内
                if (retryCount < maxRetries) {
                    log(this.isMobile, 'MAIN', `Mobile search incomplete (attempt ${retryCount + 1}/${maxRetries + 1}). Retrying with new browser...`, 'log', 'yellow')
                        log(this.isMobile, 'MOBILE-SEARCH-RETRY', `${remainingPoints} points still need to be earned`, 'warn')

                    // Browser will be closed in finally block

                    // Wait a bit before retry
                    await this.utils.wait(5000)

                    // Retry with new instance (but limit recursion depth)
                    await this.Mobile(account, retryCount + 1)
                        return
                    } else {
                        log(this.isMobile, 'MAIN', `Max retry limit of ${maxRetries + 1} reached. Mobile search may be incomplete.`, 'warn')
                        log(this.isMobile, 'MOBILE-SEARCH-FINAL', `${remainingPoints} points were not earned after ${maxRetries + 1} attempts`, 'warn')
                    }
                } else {
                    log(this.isMobile, 'MAIN', 'Mobile searches completed successfully - all points earned!', 'log', 'green')
                }
            } else {
                log(this.isMobile, 'MOBILE-SEARCH-ERROR', 'Unable to verify mobile search completion - no mobile search data found', 'warn')
            }

        } catch (error) {
            log(this.isMobile, 'MOBILE-SEARCH', `Mobile search error: ${error}`, 'error')
            throw error
        } finally {
            // 确保worker页面被关闭
            try {
                if (typeof workerPage !== 'undefined') {
                    await workerPage.close()
                }
            } catch (closeError) {
                // 忽略关闭错误
            }

            // Browser cleanup is handled by the outer catch block
        }
    }

}

async function main() {
    const rewardsBot = new MicrosoftRewardsBot(false)

    try {
        await rewardsBot.initialize()
        await rewardsBot.run()
    } catch (error) {
        log(false, 'MAIN-ERROR', `Error running desktop bot: ${error}`, 'error')
    }
}

// Start the bots
main().catch(error => {
    log('main', 'MAIN-ERROR', `Error running bots: ${error}`, 'error')
    process.exit(1)
})