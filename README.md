# 📊 Vegavruddhi Manager Panel

High-level managerial dashboard for regional oversight, performance analytics, team leader delegation, and transactional audit trails.

---

## 📐 Architecture & Port Mapping

```
Manager_Panel/
├── public/           # Static web assets & template HTML
└── src/              # React 19 Frontend Dashboard Application
```

| Service | Technology | Port | Proxy target |
| :--- | :--- | :--- | :--- |
| **Frontend** | React 19, Material-UI v9, Emotion | `3000` (default) | `http://localhost:4000` |

---

## ✨ Key Features

- 📈 **Managerial Overview**: Aggregated transaction volume, onboarding count, and regional conversion rates.
- 👨‍💼 **Team Leader Supervision**: Assign target quotas to TLs and track real-time fulfillment across teams.
- 📑 **Merchant Verification**: Escalation queue for high-value merchant registrations requiring managerial approval.
- ⚡ **Seamless API Integration**: Built-in backend proxy configuration (`http://localhost:4000`) for frictionless local development.

---

## 🛠️ Tech Stack & Dependencies

- **Framework**: React 19 (`react`, `react-dom`)
- **UI Library**: `@mui/material` v9, `@mui/icons-material`, `@emotion/react`, `@emotion/styled`
- **Routing**: `react-router-dom` v6
- **Testing**: React Testing Library, Jest DOM

---

## 🚀 Quick Start Guide

```bash
# 1. Install dependencies
npm install

# 2. Launch development server
npm start
```

Runs by default on `http://localhost:3000`.

---

## 📄 License
Internal Proprietary Software – Vegavruddhi Technologies.
