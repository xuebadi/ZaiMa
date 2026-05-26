# 在吗
<img width="200" height="200" alt="ZaiMa" src="https://github.com/user-attachments/assets/612b71d4-cfea-4c49-95bd-58a7b3243116" />
> 一个中文生存签到应用，灵感来自「死了么」。

每天按时签到「我在」，确认你还好好的。超时未签到，自动通知紧急联系人。

## 📥 下载安装

[![下载 APK](https://img.shields.io/badge/下载-在吗%20v1.0.2-red?style=for-the-badge&logo=android)](https://github.com/xuebadi/ZaiMa/releases/download/v1.0.2/ZaiMa-v1.0.2-release.apk)

> Android 7.0+ | 48MB | 无需连接开发服务器

## ✨ 功能

- 🏠 **每日签到** — 一键点击「我在」确认生存状态
- ⏰ **签到倒计时** — 实时显示距签到截止的剩余时间
- 📋 **签到记录** — 完整的历史时间线，连续签到天数统计
- ⚙️ **灵活设置** — 自定义签到截止时间、提前提醒分钟数
- 📱 **紧急联系人** — 超时未签到时，**自动发送短信**通知紧急联系人（无需手动确认）
- 🎨 **暗黑主题** — 全局深色UI，夜间使用更舒适

## 📸 界面预览

| 首页 | 记录 | 设置 |
|:---:|:---:|:---:|
| 🏠 签到主界面 | 📋 历史时间线 | ⚙️ 个人配置 |

## 🛠 技术栈

| 技术 | 版本 | 用途 |
|------|------|------|
| React Native | 0.76.9 | 跨平台框架 |
| TypeScript | 5.x | 类型安全 |
| React Navigation | 6.x | 页面导航 |
| AsyncStorage | 1.23.1 | 本地数据持久化 |
| React Native Screens | 3.35.0 | 原生屏幕优化 |
| Hermes | - | JS 引擎 |

## 📦 构建

### 环境要求

- Node.js ≥ 18
- JDK 17
- Android SDK（compileSdk 35, minSdk 24）
- Gradle 8.10.2

### 克隆项目

```bash
git clone https://github.com/xuebadi/ZaiMa.git
cd ZaiMa
```

### 安装依赖

```bash
npm install
```

### 构建 APK

```bash
# Debug 版本
cd android && ./gradlew assembleDebug

# Release 版本（需配置签名）
cd android && ./gradlew assembleRelease
```

构建产物位于 `android/app/build/outputs/apk/`

## 📱 使用方法

1. **首次打开** — 设置签到截止时间（默认每天 22:00）
2. **添加紧急联系人** — 在设置页输入联系人姓名和手机号
3. **每日签到** — 在截止时间前点击「我在」按钮
4. **超时后果** — 超过截止时间未签到，系统将自动向紧急联系人发送短信

## 📂 项目结构

```
ZaiMa/
├── App.tsx                    # 应用入口 & 导航配置
├── src/
│   ├── screens/
│   │   ├── HomeScreen.tsx     # 签到主界面
│   │   ├── HistoryScreen.tsx  # 签到历史
│   │   └── SettingsScreen.tsx # 设置页
│   └── utils/
│       ├── storage.ts         # 本地存储工具
│       └── notifications.ts   # 通知/提醒工具
├── android/                   # Android 原生项目
└── ios/                       # iOS 原生项目
```

## ⚠️ 注意事项

- Release APK（48MB）已内置 JS Bundle，可独立运行，无需连接开发服务器
- 推送提醒功能使用应用内 Alert 实现，如需系统级推送通知，可集成推送 SDK
- **紧急短信自动发送**：使用 Android SmsManager 后台静默发送，无需用户点击确认
- 需要授权「短信发送权限」（SEND_SMS），首次打开时会自动请求
- 长短信会自动拆分发送（支持 multipart SMS）

## 📄 许可证

MIT License
