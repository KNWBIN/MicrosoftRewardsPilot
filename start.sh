#!/bin/bash

# 1. 配置时区
echo "$TZ" > /etc/timezone
ln -snf "/usr/share/zoneinfo/$TZ" /etc/localtime
dpkg-reconfigure -f noninteractive tzdata

# 2. 设置环境变量（带默认值）
export ENABLE_ULTRA_ANTI_DETECTION=${ENABLE_ULTRA_ANTI_DETECTION:-true}
export STEALTH_LEVEL=${STEALTH_LEVEL:-ultimate}
export DYNAMIC_DELAY_MULTIPLIER=${DYNAMIC_DELAY_MULTIPLIER:-4.0}
export MAX_CONSECUTIVE_FAILURES=${MAX_CONSECUTIVE_FAILURES:-1}
export COOLDOWN_PERIOD=${COOLDOWN_PERIOD:-20min}

# 3. 生成cron配置文件
envsubst < /etc/cron.d/microsoftrewardspilot-cron.template > /etc/cron.d/microsoftrewardspilot-cron
chmod 0644 /etc/cron.d/microsoftrewardspilot-cron

# 4. 初始化日志文件
touch /var/log/cron.log

# 5. 启动cron服务
crontab /etc/cron.d/microsoftrewardspilot-cron
cron -f &  # 后台运行

# 6. 条件启动应用
if [ "$RUN_ON_START" = "true" ]; then
  echo "[启动脚本] 检测到 RUN_ON_START=true，立即执行任务..."
  npm start
else
  echo "[启动脚本] RUN_ON_START未启用，跳过立即执行"
fi

# 7. 持续输出日志（保持前台进程）
echo "[启动脚本] 开始监控 cron 日志..."
tail -f /var/log/cron.log