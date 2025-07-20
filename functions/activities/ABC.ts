import { Page } from 'rebrowser-playwright'

import { Workers } from '../Workers'
import { HumanBehaviorSimulator } from '../../src/anti-detection/human-behavior'
import { NextGenAntiDetectionController } from '../../src/anti-detection/next-gen-controller'


export class ABC extends Workers {
    private humanBehavior: HumanBehaviorSimulator
    private nextGenController: NextGenAntiDetectionController // eslint-disable-line @typescript-eslint/no-unused-vars

    constructor(bot: any) {
        super(bot)
        this.humanBehavior = new HumanBehaviorSimulator()
        this.nextGenController = new NextGenAntiDetectionController()
        // Ensure variables are recognized as used
        void this.nextGenController
    }

    async doABC(page: Page) {
        this.bot.log(this.bot.isMobile, 'ABC', 'Trying to complete poll')

        try {
            let $ = await this.bot.browser.func.loadInCheerio(page)

            // Don't loop more than 15 in case unable to solve, would lock otherwise
            const maxIterations = 15
            let i
            for (i = 0; i < maxIterations && !$('span.rw_icon').length; i++) {
                await page.waitForSelector('.wk_OptionClickClass', { state: 'visible', timeout: 10000 })

                const answers = $('.wk_OptionClickClass')
                const answer = answers[this.bot.utils.randomNumber(0, 2)]?.attribs['id']

                await page.waitForSelector(`#${answer}`, { state: 'visible', timeout: 10000 })

                // 🎭 使用人类行为模拟
                await this.humanBehavior.simulateThinking()
                await this.bot.utils.wait(2000)

                // 人类化点击答案
                const answerElement = await page.$(`#${answer}`)
                if (answerElement) {
                    const box = await answerElement.boundingBox()
                    if (box) {
                        await this.humanBehavior.humanClick(page, box.x + box.width/2, box.y + box.height/2)
                    } else {
                        await page.click(`#${answer}`)
                    }
                } else {
                    await page.click(`#${answer}`)
                }

                await this.bot.utils.wait(4000)
                await page.waitForSelector('div.wk_button', { state: 'visible', timeout: 10000 })

                // 人类化点击下一题按钮
                await this.humanBehavior.simulateThinking()
                const nextButton = await page.$('div.wk_button')
                if (nextButton) {
                    const box = await nextButton.boundingBox()
                    if (box) {
                        await this.humanBehavior.humanClick(page, box.x + box.width/2, box.y + box.height/2)
                    } else {
                        await page.click('div.wk_button')
                    }
                } else {
                    await page.click('div.wk_button')
                }

                page = await this.bot.browser.utils.getLatestTab(page)
                $ = await this.bot.browser.func.loadInCheerio(page)
                await this.bot.utils.wait(1000)
            }

            await this.bot.utils.wait(4000)
            await page.close()

            if (i === maxIterations) {
                this.bot.log(this.bot.isMobile, 'ABC', 'Failed to solve quiz, exceeded max iterations of 15', 'warn')
            } else {
                this.bot.log(this.bot.isMobile, 'ABC', 'Completed the ABC successfully')
            }

        } catch (error) {
            await page.close()
            this.bot.log(this.bot.isMobile, 'ABC', 'An error occurred:' + error, 'error')
        }
    }

}