# TaskTap

[![中文](https://img.shields.io/badge/中文-README-red)](README_CN.md)

A Vue 3 + TDesign single-page application for **task management, habit tracking, and alarm reminders**. Works fully offline or syncs across devices via CloudBase.

## Live Demo

👉 **[https://cwz-d2glf6xtm409cbb3a-1438121806.tcloudbaseapp.com/task-reminder.html](https://cwz-d2glf6xtm409cbb3a-1438121806.tcloudbaseapp.com/task-reminder.html)**

Open and use instantly. Register an account to enable automatic cloud sync across all your devices.

## Quick Start

The easiest way: **just open `task-reminder.html` in your browser.**

```bash
# Clone the repo
git clone https://github.com/cwzjason/TaskTap.git
cd TaskTap

# Open in browser
# Windows: start task-reminder.html
# Mac: open task-reminder.html
```

Works immediately — data is stored in your browser's localStorage (local mode).

## Features

### Multi-language Support 🌍
- Switch between **中文 / English / 日本語**
- Language preference saved automatically to localStorage
- Toggle languages on both login and main screens
- ~100 translation keys covering all UI text

### User Authentication
- Register / Login / Logout / Delete account
- SHA256 + random salt password encryption for security
- Cloud data isolated per user (openid), invisible to others
- Local mode available (no registration required)

### Task Management
- Create, edit, and delete tasks
- Categories: Work / Personal / Health / Finance / Other
- Priorities: High / Medium / Low
- Search and multi-dimensional filtering
- Mark tasks as complete

### Check-in System
- **Daily Check-in**: Once per day (perfect for running, reading, and other daily habits)
- **Count Check-in**: Unlimited times (great for watching 100 videos, solving 100 problems, etc.)
- Circular water-ball progress animation
- Calendar view to view/edit check-in records for any day
- Quick +1 / -1 operations

### Alarm Reminders
- Custom date + time alarms
- Countdown display
- Browser notification alerts

## Enable Cloud Sync (Optional)

The app uses local storage by default. To sync across devices, configure CloudBase:

1. Create an environment on [CloudBase Console](https://console.cloud.tencent.com/tcb)
2. Create two NoSQL collections: `tasks` and `alarms`
3. Set collection permissions to `read: true, write: true`
4. Update `ENV_ID` in `task-reminder.html` with your environment ID

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Vue 3.5 (Composition API) |
| UI | TDesign Vue Next 1.20 (CDN) |
| Database (optional) | CloudBase NoSQL |
| Offline | localStorage |

## Project Structure

```
TaskTap/
├── task-reminder.html    # Main app (single file, zero-config)
├── cloudfunctions/       # CloudBase cloud functions (optional)
│   ├── auth-api/         # Authentication functions
│   └── task-api/         # Task functions
├── task-api-backend/     # Backend API (optional)
├── README.md             # English README (you are here)
└── README_CN.md          # 中文 README
```

## License

MIT
