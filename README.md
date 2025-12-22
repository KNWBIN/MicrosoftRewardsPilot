<div align="center">

<!-- 语言切换 / Language Switch / 言語切替 -->
**[中文](README.md)** | **[English](docs/README_EN.md)** | **[日本語](docs/README_JA.md)**

---

# MicrosoftRewardsPilot 自动化脚本

**智能化 Microsoft Rewards 积分自动获取工具**

[![GitHub](https://img.shields.io/badge/GitHub-SkyBlue997-blue?style=flat-square&logo=github)](https://github.com/SkyBlue997/MicrosoftRewardsPilot)
[![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)](LICENSE)
[![Docker](https://img.shields.io/badge/Docker-支持-blue?style=flat-square&logo=docker)](https://hub.docker.com)

---

</div>

## 目录

1. [快速开始](#快速开始)
2. [主要配置](#主要配置)
3. [故障排除与测试](#故障排除与测试)
4. [核心功能](#核心功能)
5. [完整配置示例](#完整配置示例)
6. [重要提醒](#重要提醒)

---

## 快速开始

<details>
<summary><strong>本地运行</strong> （点击展开）</summary>

```bash
# 1. 克隆项目
git clone https://github.com/SkyBlue997/MicrosoftRewardsPilot
cd MicrosoftRewardsPilot

# 2. 安装依赖
npm i

# 3. 配置文件
# 复制示例配置文件并编辑
cp config/config.json.example config/config.json
cp config/accounts.json.example config/accounts.json

# 4. 构建运行
npm run build
npm start
```

</details>

<details>
<summary><strong>Docker 部署（推荐）</strong> （点击展开）</summary>

```bash
# 1. 准备配置文件
# 复制示例配置文件并编辑
cp config/config.json.example config/config.json
cp config/accounts.json.example config/accounts.json

# 2. 构建
npm run build

# 3. 启动容器
docker compose up -d

# 4. 查看日志(可选)
docker logs -f microsoftrewardspilot
```

**Docker Compose 配置示例：**

```yaml
services:
  microsoftrewardspilot:
    build: .
    container_name: microsoftrewardspilot
    restart: unless-stopped
    volumes:
      - ./config/accounts.json:/usr/src/microsoftrewardspilot/config/accounts.json:ro
      - ./config/config.json:/usr/src/microsoftrewardspilot/config/config.json:ro
      - ./sessions:/usr/src/microsoftrewardspilot/browser/sessions
    environment:
      - TZ=Asia/Tokyo  # 根据地理位置设置
      - CRON_SCHEDULE=0 9,16 * * *  # 每天9点和16点运行
      - ENABLE_GEO_DETECTION=true  # 启用地理位置检测
      - AUTO_TIMEZONE=true  # 启用自动时区设置
```

</details>

---

## 主要配置

### 基础设置
```json
{
  "headless": true,           // 无头模式运行
  "parallel": true,           // 并行执行任务
  "clusters": 1,              // 集群数量
  "globalTimeout": "45min",   // 全局超时时间
  "runOnZeroPoints": false,   // 零积分时不运行
  "accountDelay": {           // 多账户间隔时间
    "min": "5min",            // 最小间隔5分钟
    "max": "15min"            // 最大间隔15分钟
  }
}
```

### 智能搜索配置
```json
{
  "searchSettings": {
    "useGeoLocaleQueries": true,    // 地理位置查询
    "multiLanguage": {
      "enabled": true,              // 多语言支持
      "autoDetectLocation": true,   // 自动检测位置
      "fallbackLanguage": "en"     // 备用语言
    },
    "autoTimezone": {
      "enabled": true,              // 自动时区
      "setOnStartup": true          // 启动时设置
    },
    "searchDelay": {
      "min": "45s",                 // 最小延迟
      "max": "2.5min"              // 最大延迟
    },
    "humanBehavior": {
      "typingErrorRate": 0.12,      // 打字错误率
      "thinkingPauseEnabled": true, // 思考暂停
      "randomScrollEnabled": true   // 随机滚动
    },
    "antiDetection": {
      "ultraMode": true,            // 终极防检测模式
      "stealthLevel": "ultimate",   // 最高隐身级别
      "dynamicDelayMultiplier": 4.0,// 动态延迟倍数
      "humanErrorSimulation": true, // 人类错误模拟
      "deepPageInteraction": true,  // 深度页面交互
      "sessionBreaking": true       // 智能会话分段
    },
    "chinaRegionAdaptation": {
      "enabled": true,              // 启用中国区域适配
      "useBaiduTrends": true,       // 使用百度热搜
      "useWeiboTrends": true        // 使用微博热搜
    }
  }
}
```
### 任务配置
```json
{
  "workers": {
    "doDailySet": true,        // 每日任务集
    "doMorePromotions": true,  // 推广任务
    "doPunchCards": true,      // 打卡任务
    "doDesktopSearch": true,   // 桌面端搜索
    "doMobileSearch": true,    // 移动端搜索
    "doDailyCheckIn": true,    // 每日签到
    "doReadToEarn": true       // 阅读赚取
  }
}
```

### 弹窗处理配置
```json
{
  "popupHandling": {
    "enabled": false,                    // 是否启用弹窗处理（默认禁用）
    "handleReferralPopups": true,        // 处理推荐弹窗
    "handleStreakProtectionPopups": true,// 处理连击保护弹窗
    "handleStreakRestorePopups": true,   // 处理连击恢复弹窗
    "handleGenericModals": true,         // 处理通用模态框
    "logPopupHandling": true             // 记录弹窗处理日志
  }
}
```

### Passkey处理配置
```json
{
  "passkeyHandling": {
    "enabled": true,              // 是否启用Passkey处理
    "maxAttempts": 5,             // 最大尝试次数
    "skipPasskeySetup": true,     // 跳过Passkey设置
    "useDirectNavigation": true,  // 使用直接导航备选方案
    "logPasskeyHandling": true    // 记录处理日志
  }
}
```

---

## 故障排除与测试

### **移动端2FA验证问题**

**问题：** 移动端任务执行时提示需要双因素认证

**解决方案：** 使用专门的2FA验证助手工具

```bash
# 运行2FA验证助手
npx tsx src/helpers/manual-2fa-helper.ts
```

**使用流程：**
1. 运行命令后选择语言
2. 输入需要验证的邮箱和密码
3. 在打开的浏览器中完成2FA验证步骤
4. 等待OAuth授权完成
5. 工具自动保存移动端会话数据
6. 重新运行自动化程序，移动端任务将跳过2FA验证

### **弹窗处理问题**

**问题：** 程序在弹窗处理时卡住不动，出现无限循环

**现象：** 日志显示重复的弹窗检测信息
```
[REWARDS-POPUP] 🎯 Detected Streak Protection Popup
[REWARDS-POPUP] 🎯 Detected Streak Protection Popup
```

**解决方案：**
1. **立即解决**：在 `config/config.json` 中禁用弹窗处理
```json
{
  "popupHandling": {
    "enabled": false
  }
}
```

2. **选择性启用**：只启用需要的弹窗类型
```json
{
  "popupHandling": {
    "enabled": true,
    "handleReferralPopups": true,
    "handleStreakProtectionPopups": false,
    "handleStreakRestorePopups": false
  }
}
```

### **Passkey设置循环问题**

**问题：** 登录后被重定向到Passkey设置页面，点击"Skip for now"后形成无限循环

**现象：** 程序在 "Starting login process!" 后卡住

**解决方案：** 系统已自动处理Passkey循环问题
- **自动检测**：检测Passkey设置页面
- **多种绕过**：跳过按钮、ESC键、直接导航
- **智能重试**：最多5次尝试，防止无限循环
- **配置控制**：可通过配置调整处理策略

**配置选项：**
```json
{
  "passkeyHandling": {
    "enabled": true,
    "maxAttempts": 5
  }
}
```

### **测试工具**

```bash
# 配置测试
npx tsx tests/test-dynamic-config.ts

# 地理位置检测测试
npx tsx tests/test-geo-language.ts

# 时区设置测试
npx tsx tests/test-timezone-auto.ts

# 弹窗处理功能测试
node tests/popup-handler-test.js

# 弹窗无限循环修复验证
node tests/popup-loop-fix-test.js

# Passkey处理功能测试
node tests/passkey-handling-test.js

# Quiz页面调试（当Quiz失效时使用）
npx tsx src/helpers/quiz-debug.ts "https://rewards.microsoft.com/quiz/xxx"
```

### **常见问题**

<details>
<summary><strong>积分获取受限/检测到自动化行为</strong></summary>

**现象：** 连续多次搜索无积分，或积分获取不完整
**解决方案：** 系统已自动启用终极防检测模式
- **AI级别行为模拟**：真实用户错误、搜索犹豫、意外点击
- **统计学反检测**：非标准时间分布、疲劳算法
- **深度伪装技术**：设备传感器、Canvas指纹噪声
- **会话管理**：智能分段、自动休息
- **预期效果**：4-8小时内恢复95%+积分获取率

</details>

<details>
<summary><strong>Quiz任务失败</strong></summary>

**解决方案：** 使用 `npx tsx src/helpers/quiz-debug.ts <URL>` 分析页面结构变化

</details>

<details>
<summary><strong>地理位置检测失败</strong></summary>

**解决方案：** 检查网络连接，确保能访问地理位置API服务

</details>

<details>
<summary><strong>时区不匹配</strong></summary>

**解决方案：** 检查 `TZ` 环境变量设置是否正确

</details>

<details>
<summary><strong>内存不足</strong></summary>

**解决方案：** 重启容器或检查系统资源使用情况

</details>

### **Docker问题排查**

```bash
# 查看日志
docker logs microsoftrewardspilot

# 测试网络连接
docker exec microsoftrewardspilot ping google.com

# 检查地理位置
docker exec microsoftrewardspilot curl -s http://ip-api.com/json
```

---

## 核心功能

<table>
<tr>
<td width="50%" valign="top">

### **支持任务**
- **每日任务集** - 完成所有日常任务
- **推广任务** - 获取额外积分奖励
- **打卡任务** - 持续积分累积
- **桌面端搜索** - 智能搜索查询
- **移动端搜索** - 移动设备模拟
- **Quiz 挑战** - 10分、30-40分、选择题、ABC题
- **投票活动** - 参与社区投票
- **点击奖励** - 简单点击获取积分
- **每日签到** - 自动签到打卡
- **阅读赚取** - 阅读文章获取积分

</td>
<td width="50%" valign="top">

### **智能特性**
- **多账户支持** - 集群并行处理
- **会话存储** - 免重复登录，支持2FA
- **地理位置检测** - IP检测 + 本地化搜索查询
- **时区同步** - 自动设置匹配时区
- **多语言支持** - 日语、中文、英语等语言适配
- **行为模拟** - 打字错误、随机滚动、思考暂停
- **终极防检测** - AI级别行为模拟、设备传感器注入、Canvas指纹噪声
- **真实用户模拟** - 错误修正、搜索犹豫、意外点击等人类行为
- **统计学反检测** - 非标准时间分布、疲劳算法、会话分段
- **弹窗智能处理** - 自动检测和关闭各种Microsoft Rewards弹窗
- **Passkey循环绕过** - 自动处理Passkey设置循环问题
- **Quiz智能适配** - 多重数据获取策略
- **Docker支持** - 容器化部署
- **自动重试** - 失败任务智能重试
- **详细日志** - 完整的执行记录
- **高性能** - 优化的并发处理
- **灵活配置** - 丰富的自定义选项
- **中国大陆优化** - 百度热搜、微博热搜、本地化查询

</td>
</tr>
</table>



---

## 完整配置示例

<details>
<summary><strong>查看完整 config.json 示例</strong> （点击展开）</summary>

```json
{
  "baseURL": "https://rewards.bing.com",
  "sessionPath": "sessions",
  "headless": true,
  "parallel": false,
  "runOnZeroPoints": false,
  "clusters": 1,
  "saveFingerprint": {
    "mobile": true,
    "desktop": true
  },
  "workers": {
    "doDailySet": true,
    "doMorePromotions": true,
    "doPunchCards": true,
    "doDesktopSearch": true,
    "doMobileSearch": true,
    "doDailyCheckIn": true,
    "doReadToEarn": true
  },
  "searchOnBingLocalQueries": true,
  "globalTimeout": "120min",
  "accountDelay": {
    "min": "8min",
    "max": "20min"
  },
  "searchSettings": {
    "useGeoLocaleQueries": true,
    "scrollRandomResults": true,
    "clickRandomResults": true,
    "searchDelay": {
      "min": "45s",
      "max": "120s"
    },
    "retryMobileSearchAmount": 0,
    "multiLanguage": {
      "enabled": true,
      "autoDetectLocation": true,
      "fallbackLanguage": "en",
      "supportedLanguages": ["ja", "en", "zh-CN", "ko", "de", "fr", "es"]
    },
    "autoTimezone": {
      "enabled": true,
      "setOnStartup": true,
      "validateMatch": true,
      "logChanges": true
    },
    "humanBehavior": {
      "typingErrorRate": 0.08,
      "thinkingPauseEnabled": true,
      "randomScrollEnabled": true,
      "clickRandomEnabled": true,
      "timeBasedDelayEnabled": true,
      "adaptiveDelayEnabled": true,
      "cautionModeEnabled": true
    },
    "antiDetection": {
      "ultraMode": true,
      "stealthLevel": "ultimate",
      "dynamicDelayMultiplier": 4.0,
      "progressiveBackoff": true,
      "maxConsecutiveFailures": 1,
      "cooldownPeriod": "20min",
      "sessionSimulation": true,
      "multitaskingEnabled": true,
      "behaviorRandomization": true,
      "timeBasedScheduling": true,
      "humanErrorSimulation": true,
      "deepPageInteraction": true,
      "canvasNoise": true,
      "sensorDataInjection": true,
      "networkBehaviorMimic": true,
      "sessionBreaking": true,
      "realUserErrors": true
    },
    "chinaRegionAdaptation": {
      "enabled": false,
      "useBaiduTrends": true,
      "useWeiboTrends": true,
      "fallbackToLocalQueries": true
    }
  },
  "logExcludeFunc": [
    "SEARCH-CLOSE-TABS"
  ],
  "webhookLogExcludeFunc": [
    "SEARCH-CLOSE-TABS"
  ],
  "proxy": {
    "proxyGoogleTrends": true,
    "proxyBingTerms": true
  },
  "webhook": {
    "enabled": false,
    "url": ""
  },
  "popupHandling": {
    "enabled": false,
    "handleReferralPopups": true,
    "handleStreakProtectionPopups": true,
    "handleStreakRestorePopups": true,
    "handleGenericModals": true,
    "logPopupHandling": true
  },
  "passkeyHandling": {
    "enabled": true,
    "maxAttempts": 5,
    "skipPasskeySetup": true,
    "useDirectNavigation": true,
    "logPasskeyHandling": true
  }
}
```

</details>


## 重要提醒

<div align="center">

> **风险警告**
> 使用自动化脚本可能导致账户被封禁

> **安全建议**
> 适度使用，系统已自动启用所有反检测功能

> **定期更新**
> 保持脚本为最新版本

</div>

---

<div align="center">

**祝您使用愉快！** 

[![Star History Chart](https://img.shields.io/github/stars/SkyBlue997/MicrosoftRewardsPilot?style=social)](https://github.com/SkyBlue997/MicrosoftRewardsPilot)

*如果这个项目对您有帮助，请考虑给一个 Star！*

</div>

