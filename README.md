# 重要事务记录 / 闹钟提醒网站（云端同步版）

一个基于 Vue 3 + TDesign + CloudBase 的单页面任务管理应用，支持**云端实时同步**、任务 CRUD、闹钟提醒、浏览器通知、多端协作等功能。

## 核心特性

### 云端同步
- **实时多端同步**: 基于 CloudBase `watch()` 实时监听，一端操作，所有在线端即时更新
- **共享数据模式**: 所有用户共享同一份数据库，用户A创建的任务用户B立即可见
- **离线降级**: 云端不可用时自动切换到 localStorage 本地存储，恢复后无缝衔接
- **同步状态指示**: 页面顶部显示连接状态（已连接/连接中/离线/本地）

### 任务管理
- 创建、编辑、删除、完成任务
- 分类系统：工作/个人/健康/财务/其他
- 优先级标记：高/中/低三档
- 搜索和多维度筛选

### 闹钟提醒
- 自定义日期+时间闹钟
- 倒计时显示
- 浏览器通知 + 音效提示
- 所有用户共享闹钟列表

## 技术架构

| 层级 | 技术方案 |
|------|----------|
| 前端框架 | Vue 3.5 (Composition API) |
| UI 组件 | TDesign Vue Next 1.20 |
| 云数据库 | CloudBase NoSQL (`tasks` + `alarms` 集合) |
| 实时同步 | CloudBase `watch()` 实时监听 |
| 认证方式 | 匿名登录 + accessKey 自动会话 |
| 离线备份 | localStorage 双写保障 |

## 数据库设计

### tasks 集合
```javascript
{
  _id: "auto_generated",
  title: "任务标题",
  description: "描述文字",
  category: "work|personal|health|finance|other",
  priority: "high|medium|low",
  dueDate: "2026-05-29",
  dueTime: "17:00",
  completed: false,
  createdAt: 1716988800000,
  updatedAt: 1716988800000
}
```

### alarms 集合
```javascript
{
  _id: "auto_generated",
  label: "闹钟名称",
  date: "2026-05-29",
  time: "09:00",
  dismissed: false,
  triggered: false
}
```

## 部署信息

| 环境 | 地址 |
|------|------|
| **CloudBase 公网访问** | https://cwz-d2glf6xtm409cbb3a-1438121806.tcloudbaseapp.com/ |
| **直接访问 task-reminder** | https://cwz-d2glf6xtm409cbb3a-1438121806.tcloudbaseapp.com/task-reminder.html |
| **环境 ID** | `cwz-d2glf6xtm409cbb3a` |
| **区域** | ap-shanghai |
| **数据库控制台** | https://tcb.cloud.tencent.com/dev?envId=cwz-d2glf6xtm409cbb3a#/db/doc |
| **静态托管控制台** | https://tcb.cloud.tencent.com/dev?envId=cwz-d2glf6xtm409cbb3a#/static-hosting |

## 多端使用

1. 在任意设备/浏览器打开上述地址
2. 网页自动连接 CloudBase 云端数据库
3. 任一用户添加的任务/闹钟，其他所有打开的页面会**实时同步更新**
4. 无需登录注册即可使用（匿名认证）

## 项目文件

- `task-reminder.html` — 完整的单页应用（含 HTML/CSS/JS + CloudBase SDK）
