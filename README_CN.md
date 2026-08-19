# TaskTap

[![English](https://img.shields.io/badge/English-README-blue)](README.md)

一个基于 Vue 3 + TDesign 的单页面应用，支持**任务管理、打卡追踪、闹钟提醒**，可纯本地使用，也可通过 Vercel + Supabase 云端同步。

## 在线体验

👉 **[https://task-tap-virid.vercel.app/](https://task-tap-virid.vercel.app/)**

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
- 云端数据按用户隔离，互不可见
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

## 启用云端同步（可选，Vercel + Supabase）

默认使用本地存储。如需多设备同步，部署 `/api/*` 无服务器后端：

1. 在 [Supabase](https://supabase.com) 创建项目，建 4 张表：`users`、`sessions`、`tasks`、`alarms`
2. 在 [Vercel](https://vercel.com) 中添加环境变量 `SUPABASE_URL` 和 `SUPABASE_SERVICE_ROLE_KEY`
3. 部署后，注册/登录和数据同步会自动走 `/api/*` 接口

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | Vue 3.5 (Composition API) |
| UI | TDesign Vue Next 1.20 (CDN) |
| 后端（可选） | Vercel Serverless Functions |
| 数据库（可选） | Supabase (PostgreSQL) |
| 离线 | localStorage |

## 项目结构

```
TaskTap/
├── task-reminder.html    # 主应用（单文件，开箱即用）
├── api/                  # Vercel Serverless 接口（认证 / 任务 / 闹钟）
├── vercel.json           # Vercel 配置
├── README.md             # English README
└── README_CN.md          # 中文 README
```

## License

MIT
