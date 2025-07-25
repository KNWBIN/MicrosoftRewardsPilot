import { Page } from 'rebrowser-playwright'

/**
 * Microsoft Rewards 弹窗处理系统
 * 统一处理所有类型的弹窗，确保机器人正常运行
 */
export class PopupHandler {
    private static instance: PopupHandler
    private handledPopups: Set<string> = new Set()
    private config: any = null
    private lastProcessingTime: number = 0
    private processingCount: number = 0

    private constructor() {}

    public static getInstance(): PopupHandler {
        if (!PopupHandler.instance) {
            PopupHandler.instance = new PopupHandler()
        }
        return PopupHandler.instance
    }

    /**
     * 设置配置
     */
    setConfig(config: any): void {
        this.config = config
    }
    
    /**
     * 主要的弹窗检测和处理方法
     */
    async handleAllPopups(page: Page, logPrefix: string = 'POPUP-HANDLER'): Promise<boolean> {
        // 检查是否启用弹窗处理
        if (this.config?.popupHandling?.enabled === false) {
            return false
        }

        // 紧急停止机制：防止无限循环
        const currentTime = Date.now()
        if (currentTime - this.lastProcessingTime < 5000) { // 5秒内
            this.processingCount++
            if (this.processingCount > 10) { // 超过10次
                console.log(`[${logPrefix}] 🚨 Emergency stop: Too many popup processing attempts`)
                return false
            }
        } else {
            this.processingCount = 1
        }
        this.lastProcessingTime = currentTime

        let handledAny = false

        try {
            // 1. 处理推荐弹窗
            if (this.config?.popupHandling?.handleReferralPopups !== false) {
                if (await this.handleReferralPopup(page, logPrefix)) {
                    handledAny = true
                }
            }

            // 2. 处理连击保护弹窗
            if (this.config?.popupHandling?.handleStreakProtectionPopups !== false) {
                if (await this.handleStreakProtectionPopup(page, logPrefix)) {
                    handledAny = true
                }
            }

            // 3. 处理连击恢复弹窗
            if (this.config?.popupHandling?.handleStreakRestorePopups !== false) {
                if (await this.handleStreakRestorePopup(page, logPrefix)) {
                    handledAny = true
                }
            }

            // 4. 处理通用模态框
            if (this.config?.popupHandling?.handleGenericModals !== false) {
                if (await this.handleGenericModals(page, logPrefix)) {
                    handledAny = true
                }
            }

            // 5. 处理覆盖层弹窗
            if (await this.handleOverlayPopups(page, logPrefix)) {
                handledAny = true
            }

            // 6. 处理通知弹窗
            if (await this.handleNotificationPopups(page, logPrefix)) {
                handledAny = true
            }

        } catch (error) {
            if (this.config?.popupHandling?.logPopupHandling !== false) {
                console.log(`[${logPrefix}] Error handling popups: ${error}`)
            }
        }

        return handledAny
    }
    
    /**
     * 处理推荐弹窗 (Referral Popup)
     */
    private async handleReferralPopup(page: Page, logPrefix: string): Promise<boolean> {
        const selectors = [
            // 推荐弹窗的可能选择器 - 移除有问题的:has-text选择器
            '[data-testid="referral-popup"]',
            '[data-testid="referral-modal"]',
            '[class*="referral"][class*="popup"]',
            '[class*="referral"][class*="modal"]',
            '[id*="referral"][id*="popup"]',
            '[id*="referral"][id*="modal"]',
            '.referral-container',
            '.invite-modal',
            '.share-popup',
            '[aria-label*="referral"]',
            '[aria-label*="invite"]'
        ]

        return await this.handlePopupBySelectors(page, selectors, 'Referral Popup', logPrefix)
    }
    
    /**
     * 处理连击保护弹窗 (Streak Protection Popup)
     */
    private async handleStreakProtectionPopup(page: Page, logPrefix: string): Promise<boolean> {
        const selectors = [
            // 连击保护弹窗的可能选择器 - 移除有问题的:has-text选择器
            '[data-testid="streak-protection-popup"]',
            '[data-testid="streak-protection-modal"]',
            '[class*="streak"][class*="protection"]',
            '[class*="streak"][class*="popup"]',
            '[id*="streak"][id*="protection"]',
            '.streak-protection-modal',
            '.streak-popup',
            '.protection-modal',
            '[aria-label*="streak protection"]',
            '[aria-label*="Streak Protection"]'
        ]

        return await this.handlePopupBySelectors(page, selectors, 'Streak Protection Popup', logPrefix)
    }
    
    /**
     * 处理连击恢复弹窗 (Streak Restore Popup)
     */
    private async handleStreakRestorePopup(page: Page, logPrefix: string): Promise<boolean> {
        const selectors = [
            // 连击恢复弹窗的可能选择器 - 移除有问题的:has-text选择器
            '[data-testid="streak-restore-popup"]',
            '[data-testid="streak-restore-modal"]',
            '[class*="streak"][class*="restore"]',
            '[class*="streak"][class*="recovery"]',
            '[id*="streak"][id*="restore"]',
            '.streak-restore-modal',
            '.streak-recovery-popup',
            '.restore-modal',
            '[aria-label*="streak restore"]',
            '[aria-label*="Streak Restore"]'
        ]

        return await this.handlePopupBySelectors(page, selectors, 'Streak Restore Popup', logPrefix)
    }
    
    /**
     * 处理通用模态框
     */
    private async handleGenericModals(page: Page, logPrefix: string): Promise<boolean> {
        const selectors = [
            // 通用模态框选择器
            '.modal[style*="display: block"]',
            '.modal.show',
            '.modal.active',
            '.popup[style*="display: block"]',
            '.popup.show',
            '.popup.active',
            '[role="dialog"][aria-hidden="false"]',
            '[role="alertdialog"]',
            '.dialog[open]',
            '.overlay.active',
            '.modal-backdrop + .modal',
            '.rewards-modal',
            '.rewards-popup'
        ]
        
        return await this.handlePopupBySelectors(page, selectors, 'Generic Modal', logPrefix)
    }
    
    /**
     * 处理覆盖层弹窗
     */
    private async handleOverlayPopups(page: Page, logPrefix: string): Promise<boolean> {
        const selectors = [
            // 覆盖层弹窗选择器
            '.overlay:not([style*="display: none"])',
            '.backdrop:not([style*="display: none"])',
            '.modal-overlay:not([style*="display: none"])',
            '.popup-overlay:not([style*="display: none"])',
            '[class*="overlay"][style*="display: block"]',
            '[class*="backdrop"][style*="display: block"]',
            '.fullscreen-modal',
            '.lightbox.active'
        ]
        
        return await this.handlePopupBySelectors(page, selectors, 'Overlay Popup', logPrefix)
    }
    
    /**
     * 处理通知弹窗
     */
    private async handleNotificationPopups(page: Page, logPrefix: string): Promise<boolean> {
        const selectors = [
            // 通知弹窗选择器
            '.notification-popup',
            '.alert-popup',
            '.toast-popup',
            '.banner-popup',
            '[class*="notification"][class*="popup"]',
            '[class*="alert"][class*="modal"]',
            '[data-testid*="notification"]',
            '[data-testid*="alert"]',
            '.rewards-notification',
            '.promo-popup'
        ]
        
        return await this.handlePopupBySelectors(page, selectors, 'Notification Popup', logPrefix)
    }
    
    /**
     * 通用弹窗处理方法 - 增强防重复和超时保护
     */
    private async handlePopupBySelectors(
        page: Page,
        selectors: string[],
        popupType: string,
        logPrefix: string
    ): Promise<boolean> {
        // 添加整体超时保护
        const startTime = Date.now()
        const maxProcessingTime = 10000 // 10秒最大处理时间

        for (const selector of selectors) {
            // 检查是否超时
            if (Date.now() - startTime > maxProcessingTime) {
                console.log(`[${logPrefix}] ⏰ Popup processing timeout for ${popupType}`)
                break
            }

            try {
                // 使用更短的超时时间
                const element = await page.waitForSelector(selector, {
                    state: 'visible',
                    timeout: 500
                }).catch(() => null)

                if (element) {
                    // 使用页面URL和选择器创建更唯一的ID
                    const pageUrl = page.url()
                    const popupId = `${popupType}-${selector}-${pageUrl.split('?')[0]}`

                    // 避免重复处理同一个弹窗
                    if (this.handledPopups.has(popupId)) {
                        console.log(`[${logPrefix}] ⏭️ Skipping already handled ${popupType}`)
                        continue
                    }

                    console.log(`[${logPrefix}] 🎯 Detected ${popupType} with selector: ${selector}`)

                    // 立即标记为已处理，防止重复
                    this.handledPopups.add(popupId)

                    // 尝试关闭弹窗
                    const closed = await this.closePopup(page, element, popupType, logPrefix)

                    if (closed) {
                        console.log(`[${logPrefix}] ✅ Successfully handled ${popupType}`)
                        return true
                    } else {
                        // 如果关闭失败，从已处理列表中移除，但添加到失败列表
                        this.handledPopups.delete(popupId)
                        this.handledPopups.add(`${popupId}-failed`)
                        console.log(`[${logPrefix}] ❌ Failed to close ${popupType}`)
                    }
                }
            } catch (error) {
                // 静默失败，继续尝试下一个选择器
                continue
            }
        }

        return false
    }
    
    /**
     * 关闭弹窗的通用方法 - 增强错误处理和超时保护
     */
    private async closePopup(page: Page, popupElement: any, popupType: string, logPrefix: string): Promise<boolean> {
        const maxAttempts = 3
        const attemptTimeout = 2000 // 每次尝试2秒超时

        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
        // 关闭按钮的可能选择器 - 移除有问题的:has-text选择器
        const closeSelectors = [
            // 标准关闭按钮
            'button[aria-label="Close"]',
            'button[aria-label="close"]',
            'button[title="Close"]',
            'button[title="close"]',
            '.close',
            '.close-btn',
            '.close-button',
            '[data-testid="close"]',
            '[data-testid="close-button"]',

            // X 按钮 - 使用更安全的选择器
            'button[aria-label="×"]',
            'button[aria-label="✕"]',
            'span[aria-label="×"]',
            'span[aria-label="✕"]',
            'button.close',
            'span.close',

            // 取消/跳过按钮 - 使用属性选择器
            'button[value="Cancel"]',
            'button[value="Skip"]',
            'button[data-action="cancel"]',
            'button[data-action="skip"]',
            'button[data-action="dismiss"]',

            // 中文按钮 - 使用属性选择器
            'button[value="取消"]',
            'button[value="跳过"]',
            'button[value="关闭"]',
            'button[aria-label="取消"]',
            'button[aria-label="跳过"]',
            'button[aria-label="关闭"]',

            // 日文按钮 - 使用属性选择器
            'button[value="キャンセル"]',
            'button[value="スキップ"]',
            'button[value="閉じる"]',
            'button[aria-label="キャンセル"]',
            'button[aria-label="スキップ"]',
            'button[aria-label="閉じる"]',

            // 通用按钮类
            '.btn-cancel',
            '.btn-skip',
            '.btn-close',
            '.button-cancel',
            '.button-skip',
            '.button-close'
        ]

                // 首先尝试在弹窗内部查找关闭按钮
                for (const selector of closeSelectors.slice(0, 5)) { // 只尝试前5个最常见的选择器
                    try {
                        const closeButton = await Promise.race([
                            popupElement.$(selector),
                            new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), attemptTimeout))
                        ]) as any

                        if (closeButton) {
                            await closeButton.click()
                            await page.waitForTimeout(500) // 减少等待时间
                            console.log(`[${logPrefix}] 🎯 Closed ${popupType} using selector: ${selector} (attempt ${attempt})`)
                            return true
                        }
                    } catch (error) {
                        continue
                    }
                }

                // 如果弹窗内部没有关闭按钮，尝试ESC键（更快的方法）
                try {
                    await page.keyboard.press('Escape')
                    await page.waitForTimeout(500)
                    console.log(`[${logPrefix}] 🎯 Closed ${popupType} using ESC key (attempt ${attempt})`)
                    return true
                } catch (error) {
                    // 继续下一次尝试
                }

            } catch (error) {
                console.log(`[${logPrefix}] ⚠️ Attempt ${attempt} failed for ${popupType}: ${error}`)
                if (attempt === maxAttempts) {
                    console.log(`[${logPrefix}] ❌ Failed to close ${popupType} after ${maxAttempts} attempts`)
                    return false
                }
                // 短暂等待后重试
                await page.waitForTimeout(500)
            }
        }

        return false
    }
    
    /**
     * 清理已处理的弹窗记录（用于新会话）
     */
    clearHandledPopups(): void {
        this.handledPopups.clear()
    }
    
    /**
     * 检查页面是否有任何弹窗
     */
    async hasAnyPopup(page: Page): Promise<boolean> {
        const allSelectors = [
            // 快速检测常见弹窗
            '.modal[style*="display: block"]',
            '.popup[style*="display: block"]',
            '[role="dialog"][aria-hidden="false"]',
            '.overlay:not([style*="display: none"])',
            '[data-testid*="popup"]',
            '[data-testid*="modal"]',
            '[class*="referral"]',
            '[class*="streak"]'
        ]
        
        for (const selector of allSelectors) {
            try {
                const element = await page.waitForSelector(selector, { 
                    state: 'visible', 
                    timeout: 500 
                }).catch(() => null)
                
                if (element) {
                    return true
                }
            } catch {
                continue
            }
        }
        
        return false
    }
}
