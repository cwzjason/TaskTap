# TaskTap

[![English](https://img.shields.io/badge/English-README-blue)](README.md)

一个基于 Vue 3 + TDesign 的单页面应用，支持**任务管理、打卡追踪、闹钟提醒**，可纯本地使用或接入 CloudBase 云端同步。

## 在线体验

👉 **[https://cwz-d2glf6xtm409cbb3a-1438121806.tcloudbaseapp.com/task-reminder.html](https://cwz-d2glf6xtm409cbb3a-1438121806.tcloudbaseapp.com/task-reminder.html)**

打开即可使用，注册账号后数据自动云端同步，支持多设备访问。

## 快速开始

最简单的方式：**直接用浏览器打开 `task-reminder.html`**

```bash
# 克隆项目
git clone https://github.com/cwzjason/TaskTap.git
cd TaskTap

# 双击打开或用浏览器打开
# Windows: start task-reminder.html
# Mac: open task-reminder.html
```

打开后即可使用，数据保存在浏览器 localStorage 中（本地模式）。

## 功能一览

### 多语言支持 🌍
- 支持**中文 / English / 日本語**三种语言切换
- 语言偏好自动保存至 localStorage
- 登录页和主界面均可一键切换语言
- 全局约 100 个翻译 key，覆盖所有 UI 文本

### 用户认证
- 注册 / 登录 / 退出 / 注销账号
- SHA256 + 随机盐值密码加密，安全可靠
- 云端数据按用户隔离（openid），互不可见
- 支持本地模式（无需注册即可使用）

### 任务管理
- 创建、编辑、删除任务
- 分类：工作 / 个人 / 健康 / 财务 / 其他
- 优先级：高 / 中 / 低
- 搜索和多维度筛选
- 完成标记

### 打卡系统
- **每日打卡**：每天一次（适合跑步、阅读等每日习惯）
- **计数打卡**：不限次数（适合看100个视频、做100道题等）
- 圆形水球进度动画展示
- 日历视图查看/修改任意天的打卡记录
- +1 / -1 快速操作

### 闹钟提醒
- 自定义日期+时间闹钟
- 倒计时显示
- 浏览器通知提醒

## 启用云端同步（可选）

默认使用本地存储。如需多设备同步，配置 CloudBase：

1. 在 [CloudBase 控制台](https://console.cloud.tencent.com/tcb) 创建环境
2. 创建 `tasks` 和 `alarms` 两个 NoSQL 集合
3. 将集合权限设为 `read: true, write: true`
4. 修改 `task-reminder.html` 中的 `ENV_ID` 为你的环境 ID

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | Vue 3.5 (Composition API) |
| UI | TDesign Vue Next 1.20 (CDN) |
| 数据库（可选） | CloudBase NoSQL |
| 离线 | localStorage |

## 项目结构

```
TaskTap/
├── task-reminder.html    # 主应用（单文件，开箱即用）
├── cloudfunctions/       # CloudBase 云函数（可选）
│   ├── auth-api/         # 认证相关云函数
│   └── task-api/         # 任务相关云函数
├── task-api-backend/     # 后端 API（可选）
├── README.md             # English README
└── README_CN.md          # 中文 README
```

## License

MIT
