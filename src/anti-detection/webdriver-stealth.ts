import { Page } from 'rebrowser-playwright'

/**
 * 深度WebDriver隐藏系统
 * 完全移除自动化检测特征，模拟真实浏览器环境
 */
export class WebDriverStealth {
    
    /**
     * 注入完整的隐身脚本
     */
    static async injectStealthScript(page: Page): Promise<void> {
        await page.addInitScript(() => {
            // 1. 完全移除webdriver属性
            Object.defineProperty(navigator, 'webdriver', {
                get: () => undefined,
                configurable: true
            })
            
            // 删除原型链上的webdriver属性
            delete Object.getPrototypeOf(navigator).webdriver
            
            // 2. 修复Chrome对象，使其看起来像真实浏览器
            Object.defineProperty(window, 'chrome', {
                writable: true,
                enumerable: true,
                configurable: false,
                value: {
                    runtime: {
                        onConnect: undefined,
                        onMessage: undefined,
                        PlatformOs: {
                            MAC: 'mac',
                            WIN: 'win',
                            ANDROID: 'android',
                            CROS: 'cros',
                            LINUX: 'linux',
                            OPENBSD: 'openbsd'
                        }
                    },
                    loadTimes: function() {
                        const now = Date.now() / 1000
                        return {
                            commitLoadTime: now - Math.random() * 10,
                            connectionInfo: 'http/1.1',
                            finishDocumentLoadTime: now - Math.random() * 5,
                            finishLoadTime: now - Math.random() * 3,
                            firstPaintAfterLoadTime: now - Math.random() * 2,
                            firstPaintTime: now - Math.random() * 8,
                            navigationType: 'Other',
                            numTabsInWindow: 1 + Math.floor(Math.random() * 8),
                            requestTime: now - Math.random() * 15,
                            startLoadTime: now - Math.random() * 12,
                            wasAlternateProtocolAvailable: false,
                            wasFetchedViaSpdy: false,
                            wasNpnNegotiated: false
                        }
                    },
                    csi: function() {
                        return {
                            onloadT: Date.now(),
                            pageT: Math.random() * 1000,
                            startE: Date.now() - Math.random() * 1000,
                            tran: Math.floor(Math.random() * 20)
                        }
                    },
                    app: {
                        isInstalled: false,
                        InstallState: {
                            DISABLED: 'disabled',
                            INSTALLED: 'installed',
                            NOT_INSTALLED: 'not_installed'
                        },
                        RunningState: {
                            CANNOT_RUN: 'cannot_run',
                            READY_TO_RUN: 'ready_to_run',
                            RUNNING: 'running'
                        }
                    }
                }
            })
            
            // 3. 修复权限API
            const originalQuery = window.navigator.permissions.query
            window.navigator.permissions.query = (parameters) => (
                parameters.name === 'notifications' ?
                    Promise.resolve({
                        state: Notification.permission,
                        name: 'notifications',
                        onchange: null,
                        addEventListener: () => {},
                        removeEventListener: () => {},
                        dispatchEvent: () => false
                    } as PermissionStatus) :
                    originalQuery(parameters)
            )
            
            // 4. 修复插件检测，模拟真实浏览器插件
            Object.defineProperty(navigator, 'plugins', {
                get: () => [
                    {
                        name: 'Chrome PDF Plugin',
                        filename: 'internal-pdf-viewer',
                        description: 'Portable Document Format',
                        length: 1,
                        0: {
                            type: 'application/x-google-chrome-pdf',
                            suffixes: 'pdf',
                            description: 'Portable Document Format'
                        }
                    },
                    {
                        name: 'Native Client',
                        filename: 'internal-nacl-plugin',
                        description: '',
                        length: 2,
                        0: {
                            type: 'application/x-nacl',
                            suffixes: '',
                            description: 'Native Client Executable'
                        },
                        1: {
                            type: 'application/x-pnacl',
                            suffixes: '',
                            description: 'Portable Native Client Executable'
                        }
                    }
                ]
            })
            
            // 5. 修复语言检测
            Object.defineProperty(navigator, 'languages', {
                get: () => ['ja-JP', 'ja', 'en-US', 'en']
            })
            
            // 6. 修复内存信息
            Object.defineProperty(navigator, 'deviceMemory', {
                get: () => 4 + Math.floor(Math.random() * 4) // 4-8GB
            })
            
            // 7. 修复硬件并发
            Object.defineProperty(navigator, 'hardwareConcurrency', {
                get: () => 4 + Math.floor(Math.random() * 4) // 4-8核
            })
            
            // 8. 修复连接信息
            Object.defineProperty(navigator, 'connection', {
                get: () => ({
                    effectiveType: '4g',
                    rtt: 50 + Math.floor(Math.random() * 100),
                    downlink: 5 + Math.random() * 10,
                    saveData: false
                })
            })
            
            // 9. 隐藏自动化相关的window属性
            Object.defineProperty(window, 'outerHeight', {
                get: () => window.innerHeight + 85 + Math.floor(Math.random() * 10)
            })
            
            Object.defineProperty(window, 'outerWidth', {
                get: () => window.innerWidth + Math.floor(Math.random() * 10)
            })
            
            // 10. 修复Date对象，避免时间检测
            const originalDate = Date;
            (window as any).Date = class extends originalDate {
                constructor(...args: any[]) {
                    if (args.length === 0) {
                        super()
                        // 添加微小的随机延迟
                        const randomOffset = Math.floor(Math.random() * 10)
                        this.setTime(this.getTime() + randomOffset)
                    } else {
                        super(...(args as []))
                    }
                }

                static override now() {
                    return originalDate.now() + Math.floor(Math.random() * 10)
                }
            }
            
            // 11. 修复Math.random，避免种子检测
            const originalRandom = Math.random
            Math.random = () => {
                // 使用crypto API增加随机性
                if (window.crypto && window.crypto.getRandomValues) {
                    const array = new Uint32Array(1)
                    window.crypto.getRandomValues(array)
                    return (array[0] || 0) / 4294967296
                }
                return originalRandom()
            }
            
            // 12. 修复Screen对象
            Object.defineProperty(screen, 'availHeight', {
                get: () => screen.height - 40 - Math.floor(Math.random() * 10)
            })
            
            Object.defineProperty(screen, 'availWidth', {
                get: () => screen.width - Math.floor(Math.random() * 10)
            })
            
            // 13. 添加真实的错误处理
            window.addEventListener('error', (e) => {
                // 模拟真实浏览器的错误处理
                if (Math.random() < 0.1) {
                    console.warn('Script error:', e.message)
                }
            })
            
            // 14. 修复toString方法，避免函数检测
            const originalToString = Function.prototype.toString
            Function.prototype.toString = function() {
                if (this === (navigator as any).webdriver) {
                    return 'function webdriver() { [native code] }'
                }
                return originalToString.call(this)
            }
            
            // 15. 添加真实的性能API
            if (window.performance && window.performance.mark) {
                window.performance.mark('stealth-injection-complete')
            }
        })
    }
    
    /**
     * 注入移动端特定的隐身特征
     */
    static async injectMobileStealth(page: Page): Promise<void> {
        await page.addInitScript(() => {
            // 移动端特定的触摸事件
            if (!('ontouchstart' in window)) {
                Object.defineProperty(window, 'ontouchstart', {
                    value: null,
                    writable: true
                })
            }
            
            // 移动端设备方向
            Object.defineProperty(screen, 'orientation', {
                get: () => ({
                    angle: Math.random() > 0.7 ? 90 : 0,
                    type: Math.random() > 0.7 ? 'landscape-primary' : 'portrait-primary'
                })
            })
            
            // 移动端用户代理数据
            if ((navigator as any).userAgentData) {
                Object.defineProperty((navigator as any).userAgentData, 'mobile', {
                    get: () => true
                })
                
                Object.defineProperty((navigator as any).userAgentData, 'platform', {
                    get: () => 'Android'
                })
            }
        })
    }
    
    /**
     * 注入Canvas指纹噪声
     */
    static async injectCanvasNoise(page: Page): Promise<void> {
        await page.addInitScript(() => {
            const originalToDataURL = HTMLCanvasElement.prototype.toDataURL
            const originalGetImageData = CanvasRenderingContext2D.prototype.getImageData
            
            // Canvas toDataURL噪声
            HTMLCanvasElement.prototype.toDataURL = function(type?: string, quality?: number) {
                const context = this.getContext('2d')
                if (context) {
                    // 添加不可见的随机像素
                    const imageData = context.getImageData(0, 0, this.width, this.height)
                    const data = imageData.data
                    
                    for (let i = 0; i < data.length; i += 4) {
                        if (Math.random() < 0.001) { // 0.1%的像素添加噪声
                            data[i] = Math.min(255, (data[i] || 0) + Math.floor(Math.random() * 3) - 1)
                            data[i + 1] = Math.min(255, (data[i + 1] || 0) + Math.floor(Math.random() * 3) - 1)
                            data[i + 2] = Math.min(255, (data[i + 2] || 0) + Math.floor(Math.random() * 3) - 1)
                        }
                    }
                    
                    context.putImageData(imageData, 0, 0)
                }
                
                return originalToDataURL.call(this, type, quality)
            }
            
            // Canvas getImageData噪声
            CanvasRenderingContext2D.prototype.getImageData = function(sx: number, sy: number, sw: number, sh: number) {
                const imageData = originalGetImageData.call(this, sx, sy, sw, sh)
                const data = imageData.data
                
                // 添加微小噪声
                for (let i = 0; i < data.length; i += 4) {
                    if (Math.random() < 0.0005) {
                        data[i] = Math.min(255, Math.max(0, (data[i] || 0) + Math.floor(Math.random() * 3) - 1))
                    }
                }
                
                return imageData
            }
        })
    }
}
