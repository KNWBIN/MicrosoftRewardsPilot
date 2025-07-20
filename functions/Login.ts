import { Page } from 'rebrowser-playwright'
import * as readline from 'readline'
import * as crypto from 'crypto'
import { AxiosRequestConfig } from 'axios'

import { MicrosoftRewardsBot } from '../src/index'
import { saveSessionData } from '../utils/Load'
import { HumanBehaviorSimulator } from '../src/anti-detection/human-behavior'
import { NextGenAntiDetectionController } from '../src/anti-detection/next-gen-controller'

import { OAuth } from '../interfaces/OAuth'


const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
})

export class Login {
    private bot: MicrosoftRewardsBot
    private clientId: string = '0000000040170455'
    private authBaseUrl: string = 'https://login.live.com/oauth20_authorize.srf'
    private redirectUrl: string = 'https://login.live.com/oauth20_desktop.srf'
    private tokenUrl: string = 'https://login.microsoftonline.com/consumers/oauth2/v2.0/token'
    private scope: string = 'service::prod.rewardsplatform.microsoft.com::MBI_SSL'
    private humanBehavior: HumanBehaviorSimulator
    private nextGenController: NextGenAntiDetectionController // eslint-disable-line @typescript-eslint/no-unused-vars

    constructor(bot: MicrosoftRewardsBot) {
        this.bot = bot
        this.humanBehavior = new HumanBehaviorSimulator()
        this.nextGenController = new NextGenAntiDetectionController()
        // Ensure variable is recognized as used
        void this.nextGenController
    }

    async login(page: Page, email: string, password: string) {

        try {
            this.bot.log(this.bot.isMobile, 'LOGIN', 'Starting login process!')

            // Navigate to the Bing login page
            await page.goto('https://rewards.bing.com/signin')

            await page.waitForLoadState('domcontentloaded').catch(() => { })

            await this.bot.browser.utils.reloadBadPage(page)

            // Check if account is locked
            await this.checkAccountLocked(page)

            const isLoggedIn = await page.waitForSelector('html[data-role-name="RewardsPortal"]', { timeout: 10000 }).then(() => true).catch(() => false)

            if (!isLoggedIn) {
                await this.execLogin(page, email, password)
                this.bot.log(this.bot.isMobile, 'LOGIN', 'Logged into Microsoft successfully')
            } else {
                this.bot.log(this.bot.isMobile, 'LOGIN', 'Already logged in')

                // Check if account is locked
                await this.checkAccountLocked(page)
            }

            // Check if logged in to bing
            await this.checkBingLogin(page)

            // Save session
            await saveSessionData(this.bot.config.sessionPath, page.context(), email, this.bot.isMobile)

            // We're done logging in
            this.bot.log(this.bot.isMobile, 'LOGIN', 'Logged in successfully, saved login session!')

        } catch (error) {
            // Throw and don't continue
            throw this.bot.log(this.bot.isMobile, 'LOGIN', 'An error occurred:' + error, 'error')
        }
    }

    private async execLogin(page: Page, email: string, password: string) {
        try {
            await this.enterEmail(page, email)
            await this.bot.utils.wait(2000)
            await this.bot.browser.utils.reloadBadPage(page)
            await this.bot.utils.wait(2000)
            await this.enterPassword(page, password)
            await this.bot.utils.wait(2000)

            // Check if account is locked
            await this.checkAccountLocked(page)

            await this.bot.browser.utils.reloadBadPage(page)
            await this.checkLoggedIn(page)
        } catch (error) {
            this.bot.log(this.bot.isMobile, 'LOGIN', 'An error occurred: ' + error, 'error')
        }
    }

    private async enterEmail(page: Page, email: string) {
        const emailInputSelector = 'input[type="email"]'

        try {
            // Wait for email field
            const emailField = await page.waitForSelector(emailInputSelector, { state: 'visible', timeout: 2000 }).catch(() => null)
            if (!emailField) {
                this.bot.log(this.bot.isMobile, 'LOGIN', 'Email field not found', 'warn')
                return
            }

            await this.bot.utils.wait(1000)

            // Check if email is prefilled
            const emailPrefilled = await page.waitForSelector('#userDisplayName', { timeout: 5000 }).catch(() => null)
            if (emailPrefilled) {
                this.bot.log(this.bot.isMobile, 'LOGIN', 'Email already prefilled by Microsoft')
            } else {
                // 🎭 使用人类化打字输入邮箱
                await this.humanBehavior.simulateThinking()
                await page.fill(emailInputSelector, '')
                await this.bot.utils.wait(500)
                await this.humanBehavior.humanType(page, email, emailInputSelector)
                await this.bot.utils.wait(1000)
            }

            const nextButton = await page.waitForSelector('button[type="submit"]', { timeout: 2000 }).catch(() => null)
            if (nextButton) {
                // 🎭 使用人类化点击
                await this.humanBehavior.simulateThinking()
                const box = await nextButton.boundingBox()
                if (box) {
                    await this.humanBehavior.humanClick(page, box.x + box.width/2, box.y + box.height/2)
                } else {
                    await nextButton.click()
                }
                await this.bot.utils.wait(2000)
                this.bot.log(this.bot.isMobile, 'LOGIN', 'Email entered successfully')
            } else {
                this.bot.log(this.bot.isMobile, 'LOGIN', 'Next button not found after email entry', 'warn')
            }

        } catch (error) {
            this.bot.log(this.bot.isMobile, 'LOGIN', `Email entry failed: ${error}`, 'error')
        }
    }

    private async enterPassword(page: Page, password: string) {
        const passwordInputSelector = 'input[type="password"]'
        try {
            const viewFooter = await page.waitForSelector('[data-testid="viewFooter"]', { timeout: 2000 }).catch(() => null)
            if (viewFooter) {
                this.bot.log(this.bot.isMobile, 'LOGIN', 'Page "Get a code to sign in" found by "viewFooter"')

                const otherWaysButton = await viewFooter.$('span[role="button"]')
                if (otherWaysButton) {
                    await otherWaysButton.click()
                    await this.bot.utils.wait(5000)

                    const secondListItem = page.locator('[role="listitem"]').nth(1)
                    if (await secondListItem.isVisible()) {
                        await secondListItem.click()
                    }

                }
            }

            // Wait for password field
            const passwordField = await page.waitForSelector(passwordInputSelector, { state: 'visible', timeout: 5000 }).catch(() => null)
            if (!passwordField) {
                this.bot.log(this.bot.isMobile, 'LOGIN', 'Password field not found, possibly 2FA required', 'warn')
                await this.handle2FA(page)
                return
            }

            await this.bot.utils.wait(1000)

            // 🎭 使用人类化密码输入
            await this.humanBehavior.simulateThinking()
            await page.fill(passwordInputSelector, '')
            await this.bot.utils.wait(500)
            await this.humanBehavior.humanType(page, password, passwordInputSelector)
            await this.bot.utils.wait(1000)

            const nextButton = await page.waitForSelector('button[type="submit"]', { timeout: 2000 }).catch(() => null)
            if (nextButton) {
                // 🎭 使用人类化点击
                await this.humanBehavior.simulateThinking()
                const box = await nextButton.boundingBox()
                if (box) {
                    await this.humanBehavior.humanClick(page, box.x + box.width/2, box.y + box.height/2)
                } else {
                    await nextButton.click()
                }
                await this.bot.utils.wait(2000)
                this.bot.log(this.bot.isMobile, 'LOGIN', 'Password entered successfully')
            } else {
                this.bot.log(this.bot.isMobile, 'LOGIN', 'Next button not found after password entry', 'warn')
            }

        } catch (error) {
            this.bot.log(this.bot.isMobile, 'LOGIN', `Password entry failed: ${error}`, 'error')
                await this.handle2FA(page)
        }
    }

    private async handle2FA(page: Page) {
        try {
            // 等待页面加载完成
            await this.bot.utils.wait(3000)
            
            // 检测2FA冲突 - 如果是并行模式，添加随机延迟避免冲突
            if (this.bot.config.parallel) {
                const randomDelay = Math.floor(Math.random() * 10000) + 5000 // 5-15秒随机延迟
                this.bot.log(this.bot.isMobile, 'LOGIN', `Parallel mode detected, waiting ${randomDelay/1000}s to avoid 2FA conflicts`)
                await this.bot.utils.wait(randomDelay)
            }
            
            // 检查是否已经登录成功（可能其他实例已完成登录）
            const isLoggedIn = await page.waitForSelector('html[data-role-name="RewardsPortal"]', { timeout: 3000 }).then(() => true).catch(() => false)
            if (isLoggedIn) {
                this.bot.log(this.bot.isMobile, 'LOGIN', '2FA not required - already logged in')
                return
            }
            
            // 记录当前页面状态
            const currentUrl = page.url()
            this.bot.log(this.bot.isMobile, 'LOGIN', `Current page URL: ${currentUrl}`)
            
            // 检查是否有SMS验证选项
            const smsOption = await page.waitForSelector('input[name="otc"]', { state: 'visible', timeout: 3000 }).catch(() => null)
            if (smsOption) {
                this.bot.log(this.bot.isMobile, 'LOGIN', 'SMS verification detected')
                await this.authSMSVerification(page)
                return
            }
            
            // 检查是否有邮箱验证选项
            const emailOption = await page.waitForSelector('input[name="proofconfirmation"]', { state: 'visible', timeout: 3000 }).catch(() => null)
            if (emailOption) {
                this.bot.log(this.bot.isMobile, 'LOGIN', 'Email verification detected - manual intervention required')
                await this.authEmailVerification(page)
                return
            }
            
            // 尝试获取Authenticator App验证码
            const numberToPress = await this.get2FACode(page)
            if (numberToPress) {
                // 检查是否有并行2FA冲突
                if (this.bot.config.parallel) {
                    this.bot.log(this.bot.isMobile, 'LOGIN', 'Parallel mode: Multiple 2FA requests may cause conflicts', 'warn')
                    this.bot.log(this.bot.isMobile, 'LOGIN', 'If verification fails, try running accounts individually', 'warn')
                }
                
                // Authentictor App verification
                await this.authAppVerification(page, numberToPress)
            } else {
                // 如果在移动端，尝试特殊处理
                if (this.bot.isMobile) {
                    this.bot.log(this.bot.isMobile, 'LOGIN', 'Mobile 2FA: No display code found, trying mobile-specific handling...')
                    
                    // 尝试检测并处理移动端特有的2FA页面
                    const mobile2FAHandled = await this.handleMobile2FAPage(page)
                    if (mobile2FAHandled) {
                        this.bot.log(this.bot.isMobile, 'LOGIN', 'Mobile 2FA handled successfully')
                        return
                    }
                    
                    // 如果是并行模式，可能桌面端已经处理了2FA
                    if (this.bot.config.parallel) {
                        this.bot.log(this.bot.isMobile, 'LOGIN', 'Parallel mode: Desktop may have handled 2FA, waiting...', 'warn')
                        await this.bot.utils.wait(10000) // 等待10秒
                        
                        // 再次检查是否已登录
                        const isNowLoggedIn = await page.waitForSelector('html[data-role-name="RewardsPortal"]', { timeout: 5000 }).then(() => true).catch(() => false)
                        if (isNowLoggedIn) {
                            this.bot.log(this.bot.isMobile, 'LOGIN', 'Login completed by parallel process')
                            return
                        }
                    }
                    
                    throw new Error('Mobile 2FA authentication method not supported - OAuth token may be required')
                } else {
                    // 桌面端找不到2FA验证码
                    this.bot.log(this.bot.isMobile, 'LOGIN', 'Desktop 2FA: No verification method detected')
                    
                    // 检查是否有其他2FA选项
                    await this.tryAlternative2FAMethods(page)
                }
            }
        } catch (error) {
            this.bot.log(this.bot.isMobile, 'LOGIN', `2FA handling failed: ${error}`, 'error')
            throw error
        }
    }

    /**
     * 处理移动端OAuth流程中的2FA验证
     */
    private async handleMobileOAuth2FA(page: Page): Promise<void> {
        try {
            this.bot.log(this.bot.isMobile, 'LOGIN-OAUTH-2FA', 'Attempting to handle mobile OAuth 2FA')
            
            // 使用统一的移动端2FA处理方法
            const handled = await this.handleMobile2FAPage(page)
            if (!handled) {
                throw new Error('Mobile OAuth 2FA requires manual intervention')
            }
            
        } catch (error) {
            this.bot.log(this.bot.isMobile, 'LOGIN-OAUTH-2FA', `Mobile OAuth 2FA handling failed: ${error}`, 'warn')
            throw error
        }
    }

    private async authEmailVerification(page: Page) {
        this.bot.log(this.bot.isMobile, 'LOGIN', 'Email verification required. Please check your email and enter the code.')
        
        const code = await new Promise<string>((resolve) => {
            rl.question('Enter email verification code:\n', (input) => {
                rl.close()
                resolve(input)
            })
        })

        await page.fill('input[name="proofconfirmation"]', code)
        await page.keyboard.press('Enter')
        this.bot.log(this.bot.isMobile, 'LOGIN', 'Email verification code entered successfully')
    }

    private async get2FACode(page: Page): Promise<string | null> {
        try {
            // 首先等待页面稳定
            await this.bot.utils.wait(2000)
            
            // 检查是否存在认证码按钮，如果存在先点击
            const sendCodeButton = await page.waitForSelector('button[aria-describedby="confirmSendTitle"]', { state: 'visible', timeout: 3000 }).catch(() => null)
            if (sendCodeButton) {
                await sendCodeButton.click()
                this.bot.log(this.bot.isMobile, 'LOGIN', 'Clicked send code button')
                await this.bot.utils.wait(3000)
            }
            
            // 增加超时时间到10秒，并尝试多个选择器
            const selectors = [
                '#displaySign',
                'div[data-testid="displaySign"]>span',
                '[data-testid="displaySign"]',
                'span[aria-label*="verification"]',
                '.display-sign-container span'
            ]
            
            let element = null
            for (const selector of selectors) {
                element = await page.waitForSelector(selector, { state: 'visible', timeout: 3000 }).catch(() => null)
                if (element) {
                    this.bot.log(this.bot.isMobile, 'LOGIN', `Found 2FA code element with selector: ${selector}`)
                    break
                }
            }
            
            if (element) {
                const code = await element.textContent()
                this.bot.log(this.bot.isMobile, 'LOGIN', `2FA code found: ${code}`)
                return code
            }
            
            // 如果找不到验证码显示元素，可能是其他类型的2FA
            this.bot.log(this.bot.isMobile, 'LOGIN', 'No 2FA code display element found, checking for other 2FA methods')
            return null
            
        } catch (error) {
            // 如果是并行模式，处理特殊情况
            if (this.bot.config.parallel) {
                this.bot.log(this.bot.isMobile, 'LOGIN', 'Script running in parallel, can only send 1 2FA request per account at a time!', 'log', 'yellow')
                this.bot.log(this.bot.isMobile, 'LOGIN', 'Trying again in 60 seconds! Please wait...', 'log', 'yellow')

                // eslint-disable-next-line no-constant-condition
                while (true) {
                    const button = await page.waitForSelector('button[aria-describedby="pushNotificationsTitle errorDescription"]', { state: 'visible', timeout: 2000 }).catch(() => null)
                    if (button) {
                        await this.bot.utils.wait(60000)
                        await button.click()
                        continue
                    } else {
                        break
                    }
                }
                
                // 重试获取验证码
                return await this.get2FACode(page)
            }
            
            this.bot.log(this.bot.isMobile, 'LOGIN', `Failed to get 2FA code: ${error}`)
            return null
        }
    }

    private async authAppVerification(page: Page, numberToPress: string | null) {
        // eslint-disable-next-line no-constant-condition
        while (true) {
            try {
                this.bot.log(this.bot.isMobile, 'LOGIN', `Press the number ${numberToPress} on your Authenticator app to approve the login`)
                this.bot.log(this.bot.isMobile, 'LOGIN', 'If you press the wrong number or the "DENY" button, try again in 60 seconds')

                await page.waitForSelector('form[name="f1"]', { state: 'detached', timeout: 60000 })

                this.bot.log(this.bot.isMobile, 'LOGIN', 'Login successfully approved!')
                break
            } catch {
                this.bot.log(this.bot.isMobile, 'LOGIN', 'The code is expired. Trying to get a new code...')
                await page.click('button[aria-describedby="pushNotificationsTitle errorDescription"]')
                numberToPress = await this.get2FACode(page)
            }
        }
    }

    private async authSMSVerification(page: Page) {
        this.bot.log(this.bot.isMobile, 'LOGIN', 'SMS 2FA code required. Waiting for user input...')

        const code = await new Promise<string>((resolve) => {
            rl.question('Enter 2FA code:\n', (input) => {
                rl.close()
                resolve(input)
            })
        })

        await page.fill('input[name="otc"]', code)
        await page.keyboard.press('Enter')
        this.bot.log(this.bot.isMobile, 'LOGIN', '2FA code entered successfully')
    }

    private async tryAlternative2FAMethods(page: Page) {
        try {
            this.bot.log(this.bot.isMobile, 'LOGIN', 'Trying alternative 2FA methods...')
            
            // 检查是否有"使用其他方法"链接
            const otherMethodsLink = await page.waitForSelector('a:has-text("Use a different method"), button:has-text("Use a different method")', { timeout: 3000 }).catch(() => null)
            if (otherMethodsLink) {
                await otherMethodsLink.click()
                this.bot.log(this.bot.isMobile, 'LOGIN', 'Clicked "Use a different method"')
                await this.bot.utils.wait(3000)
                
                // 重新尝试检测2FA方法
                const newNumberToPress = await this.get2FACode(page)
                if (newNumberToPress) {
                    await this.authAppVerification(page, newNumberToPress)
                    return
                }
            }
            
            // 检查是否有继续按钮
            const continueButton = await page.waitForSelector('button[type="submit"], input[type="submit"]', { timeout: 3000 }).catch(() => null)
            if (continueButton) {
                await continueButton.click()
                this.bot.log(this.bot.isMobile, 'LOGIN', 'Clicked continue button')
                await this.bot.utils.wait(3000)
                return
            }
            
            // 检查是否有密码重新验证选项
            const passwordField = await page.waitForSelector('input[type="password"]', { timeout: 3000 }).catch(() => null)
            if (passwordField) {
                this.bot.log(this.bot.isMobile, 'LOGIN', 'Password re-verification required', 'warn')
                throw new Error('Password re-verification required - manual intervention needed')
            }
            
            this.bot.log(this.bot.isMobile, 'LOGIN', 'No alternative 2FA methods found', 'warn')
            
        } catch (error) {
            this.bot.log(this.bot.isMobile, 'LOGIN', `Alternative 2FA methods failed: ${error}`, 'error')
            throw error
        }
    }

    async getMobileAccessToken(page: Page, email: string) {
        const authorizeUrl = new URL(this.authBaseUrl)

        authorizeUrl.searchParams.append('response_type', 'code')
        authorizeUrl.searchParams.append('client_id', this.clientId)
        authorizeUrl.searchParams.append('redirect_uri', this.redirectUrl)
        authorizeUrl.searchParams.append('scope', this.scope)
        authorizeUrl.searchParams.append('state', crypto.randomBytes(16).toString('hex'))
        authorizeUrl.searchParams.append('access_type', 'offline_access')
        authorizeUrl.searchParams.append('login_hint', email)

        await page.goto(authorizeUrl.href)

        let currentUrl = new URL(page.url())
        let code: string

        this.bot.log(this.bot.isMobile, 'LOGIN-APP', 'Waiting for authorization...')
        
        // 增加超时时间到2分钟，给用户更多时间处理2FA
        const startTime = Date.now()
        const timeout = 120000 // 2 minutes (从30秒增加到2分钟)
        
        // eslint-disable-next-line no-constant-condition
        while (true) {
            // 检查是否超时
            if (Date.now() - startTime > timeout) {
                this.bot.log(this.bot.isMobile, 'LOGIN-APP', 'OAuth authorization timeout after 2 minutes', 'warn')
                
                // 检查当前页面状态，提供更多信息
                const currentPageUrl = page.url()
                this.bot.log(this.bot.isMobile, 'LOGIN-APP', `Current page: ${currentPageUrl}`)
                
                // 检查是否在2FA页面
                if (currentPageUrl.includes('passkey') || currentPageUrl.includes('interrupt') || currentPageUrl.includes('proofs')) {
                    this.bot.log(this.bot.isMobile, 'LOGIN-APP', 'Detected 2FA page - manual intervention required', 'warn')
                    throw new Error('OAuth authorization timeout - 2FA verification required')
                }
                
                throw new Error('OAuth authorization timeout - user interaction required')
            }
            
            currentUrl = new URL(page.url())
            
            if (currentUrl.hostname === 'login.live.com' && currentUrl.pathname === '/oauth20_desktop.srf') {
                code = currentUrl.searchParams.get('code')!
                break
            }

            // 检查是否需要2FA验证
            if (currentUrl.href.includes('passkey') || currentUrl.href.includes('interrupt')) {
                this.bot.log(this.bot.isMobile, 'LOGIN-APP', 'Detected 2FA requirement during OAuth flow')
                // 尝试处理2FA
                try {
                    await this.handleMobileOAuth2FA(page)
                } catch (twoFAError) {
                    this.bot.log(this.bot.isMobile, 'LOGIN-APP', `2FA handling failed: ${twoFAError}`, 'warn')
                }
            }

            await this.bot.utils.wait(2000) // 减少等待间隔从5秒到2秒，提高响应速度
        }

        const body = new URLSearchParams()
        body.append('grant_type', 'authorization_code')
        body.append('client_id', this.clientId)
        body.append('code', code)
        body.append('redirect_uri', this.redirectUrl)

        const tokenRequest: AxiosRequestConfig = {
            url: this.tokenUrl,
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            data: body.toString()
        }

        const tokenResponse = await this.bot.axios.request(tokenRequest)
        const tokenData: OAuth = await tokenResponse.data

        this.bot.log(this.bot.isMobile, 'LOGIN-APP', 'Successfully authorized')
        return tokenData.access_token
    }

    // Utils

    private async checkLoggedIn(page: Page) {
        const targetHostname = 'rewards.bing.com'
        const targetPathname = '/'

        // eslint-disable-next-line no-constant-condition
        while (true) {
            await this.dismissLoginMessages(page)
            const currentURL = new URL(page.url())
            if (currentURL.hostname === targetHostname && currentURL.pathname === targetPathname) {
                break
            }
        }

        // Wait for login to complete
        await page.waitForSelector('html[data-role-name="RewardsPortal"]', { timeout: 10000 })
        this.bot.log(this.bot.isMobile, 'LOGIN', 'Successfully logged into the rewards portal')
    }

    private async dismissLoginMessages(page: Page) {
        // Use Passekey
        if (await page.waitForSelector('[data-testid="biometricVideo"]', { timeout: 2000 }).catch(() => null)) {
            const skipButton = await page.$('[data-testid="secondaryButton"]')
            if (skipButton) {
                await skipButton.click()
                this.bot.log(this.bot.isMobile, 'DISMISS-ALL-LOGIN-MESSAGES', 'Dismissed "Use Passekey" modal')
                await page.waitForTimeout(500)
            }
        }

        // Use Keep me signed in
        if (await page.waitForSelector('[data-testid="kmsiVideo"]', { timeout: 2000 }).catch(() => null)) {
            const yesButton = await page.$('[data-testid="primaryButton"]')
            if (yesButton) {
                await yesButton.click()
                this.bot.log(this.bot.isMobile, 'DISMISS-ALL-LOGIN-MESSAGES', 'Dismissed "Keep me signed in" modal')
                await page.waitForTimeout(500)
            }
        }

    }

    private async checkBingLogin(page: Page): Promise<void> {
        try {
            this.bot.log(this.bot.isMobile, 'LOGIN-BING', 'Verifying Bing login')
            await page.goto('https://www.bing.com/fd/auth/signin?action=interactive&provider=windows_live_id&return_url=https%3A%2F%2Fwww.bing.com%2F')

            const maxIterations = 5

            for (let iteration = 1; iteration <= maxIterations; iteration++) {
                const currentUrl = new URL(page.url())

                if (currentUrl.hostname === 'www.bing.com' && currentUrl.pathname === '/') {
                    await this.bot.browser.utils.tryDismissAllMessages(page)

                    const loggedIn = await this.checkBingLoginStatus(page)
                    // If mobile browser, skip this step
                    if (loggedIn || this.bot.isMobile) {
                        this.bot.log(this.bot.isMobile, 'LOGIN-BING', 'Bing login verification passed!')
                        break
                    }
                }

                await this.bot.utils.wait(1000)
            }

        } catch (error) {
            this.bot.log(this.bot.isMobile, 'LOGIN-BING', 'An error occurred:' + error, 'error')
        }
    }

    private async checkBingLoginStatus(page: Page): Promise<boolean> {
        try {
            await page.waitForSelector('#id_n', { timeout: 5000 })
            return true
        } catch (error) {
            return false
        }
    }

    private async checkAccountLocked(page: Page) {
        await this.bot.utils.wait(2000)
        const isLocked = await page.waitForSelector('#serviceAbuseLandingTitle', { state: 'visible', timeout: 1000 }).then(() => true).catch(() => false)
        if (isLocked) {
            throw this.bot.log(this.bot.isMobile, 'CHECK-LOCKED', 'This account has been locked! Remove the account from "accounts.json" and restart!', 'error')
        }
    }

    private async handleMobile2FAPage(page: Page): Promise<boolean> {
        try {
            const currentUrl = page.url()
            this.bot.log(this.bot.isMobile, 'LOGIN-MOBILE-2FA', `Handling mobile 2FA page: ${currentUrl}`)
            
            // 在并行模式下，等待一些时间避免与桌面端冲突
            if (this.bot.config.parallel) {
                this.bot.log(this.bot.isMobile, 'LOGIN-MOBILE-2FA', 'Parallel mode: Adding delay to avoid conflicts with desktop 2FA')
                await this.bot.utils.wait(5000)
            }
            
            // 尝试查找移动端特有的2FA元素
            const mobile2FAElements = [
                'input[name="otc"]', // SMS验证码
                'input[name="proofconfirmation"]', // 邮箱验证码
                '#displaySign', // Authenticator显示号码
                '[data-testid="displaySign"]', // 新版Authenticator显示
                'div:has-text("Enter the number shown")', // 移动端Authenticator提示
                'div:has-text("Use your authenticator app")' // Authenticator应用提示
            ]
            
            let foundElement = null
            let elementType = ''
            
            for (const selector of mobile2FAElements) {
                const element = await page.waitForSelector(selector, { state: 'visible', timeout: 2000 }).catch(() => null)
                if (element) {
                    foundElement = element
                    elementType = selector
                    this.bot.log(this.bot.isMobile, 'LOGIN-MOBILE-2FA', `Found mobile 2FA element: ${selector}`)
                    break
                }
            }
            
            if (foundElement) {
                if (elementType.includes('otc')) {
                    // SMS验证
                    this.bot.log(this.bot.isMobile, 'LOGIN-MOBILE-2FA', 'SMS verification detected - requires manual input', 'warn')
                    await this.authSMSVerification(page)
                    return true
                } else if (elementType.includes('proofconfirmation')) {
                    // 邮箱验证
                    this.bot.log(this.bot.isMobile, 'LOGIN-MOBILE-2FA', 'Email verification detected - requires manual input', 'warn')
                    await this.authEmailVerification(page)
                    return true
                } else if (elementType.includes('displaySign') || elementType.includes('Enter the number')) {
                    // Authenticator App验证
                    const code = await foundElement.textContent()
                    if (code && code.trim()) {
                        this.bot.log(this.bot.isMobile, 'LOGIN-MOBILE-2FA', `Found Authenticator code on mobile: ${code}`)
                        
                        // 检查是否与桌面端代码冲突
                        if (this.bot.config.parallel) {
                            this.bot.log(this.bot.isMobile, 'LOGIN-MOBILE-2FA', 'Parallel mode: Mobile Authenticator code may conflict with desktop', 'warn')
                        }
                        
                        await this.authAppVerification(page, code.trim())
                        return true
                    }
                }
            }
            
            // 检查是否是passkey页面
            if (currentUrl.includes('passkey')) {
                this.bot.log(this.bot.isMobile, 'LOGIN-MOBILE-2FA', 'Detected passkey authentication page')
                
                // 查找跳过按钮
                const skipButtons = [
                    'button[data-testid="secondaryButton"]',
                    'a:has-text("Use a different method")',
                    'button:has-text("Skip")',
                    'a:has-text("Skip")',
                    '[data-testid="alternativeVerificationMethodLink"]'
                ]
                
                for (const selector of skipButtons) {
                    const button = await page.waitForSelector(selector, { timeout: 2000 }).catch(() => null)
                    if (button) {
                        await button.click()
                        this.bot.log(this.bot.isMobile, 'LOGIN-MOBILE-2FA', `Clicked skip button: ${selector}`)
                        await this.bot.utils.wait(2000)
                        return true
                    }
                }
            }
            
            // 检查是否有其他验证方法选项
            const otherMethodsButton = await page.waitForSelector('button:has-text("Use a different method"), a:has-text("Use a different method")', { timeout: 3000 }).catch(() => null)
            if (otherMethodsButton) {
                await otherMethodsButton.click()
                this.bot.log(this.bot.isMobile, 'LOGIN-MOBILE-2FA', 'Clicked "Use a different method"')
                await this.bot.utils.wait(2000)
                
                // 查找密码验证选项
                const passwordOption = await page.waitForSelector('span:has-text("Password"), div:has-text("Password")', { timeout: 3000 }).catch(() => null)
                if (passwordOption) {
                    await passwordOption.click()
                    this.bot.log(this.bot.isMobile, 'LOGIN-MOBILE-2FA', 'Selected password verification option')
                    await this.bot.utils.wait(2000)
                    return true
                }
            }
            
            // 检查是否已经可以继续（有时页面会自动跳过）
            const isRewardsPage = await page.waitForSelector('html[data-role-name="RewardsPortal"]', { timeout: 2000 }).catch(() => null)
            if (isRewardsPage) {
                this.bot.log(this.bot.isMobile, 'LOGIN-MOBILE-2FA', 'Already on rewards page - 2FA passed')
                return true
            }
            
            // 检查是否有继续按钮
            const continueButtons = [
                'button[type="submit"]',
                'button:has-text("Continue")',
                'button:has-text("Next")',
                'input[type="submit"]'
            ]
            
            for (const selector of continueButtons) {
                const button = await page.waitForSelector(selector, { timeout: 2000 }).catch(() => null)
                if (button && await button.isVisible()) {
                    await button.click()
                    this.bot.log(this.bot.isMobile, 'LOGIN-MOBILE-2FA', `Clicked continue button: ${selector}`)
                    await this.bot.utils.wait(2000)
                    return true
                }
            }
            
            return false
        } catch (error) {
            this.bot.log(this.bot.isMobile, 'LOGIN-MOBILE-2FA', `Mobile 2FA handling failed: ${error}`, 'warn')
            return false
        }
    }
}