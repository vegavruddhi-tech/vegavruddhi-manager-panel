# 📊 Vegavruddhi Manager Panel

A comprehensive executive management portal designed for regional managers, area sales leads, and corporate executives to supervise field operations, monitor target quotas, track Team Leader (TL) performance, approve merchant registrations, and analyze overall organizational productivity.

---

## 🎯 1. Purpose of the Panel
The **Manager Panel** provides macro-level operational oversight across regional territories. It aggregates data submitted by Field Sales Executives (FSEs) and reviewed by Team Leaders (TLs), giving upper management real-time visibility into onboarding targets, financial volume, team performance, and high-value approvals without getting bogged down in day-to-day ground operations.

---

## 👥 2. Target Users & User Roles

| User Role | Target Audience | Primary Responsibilities | Access & Privileges |
| :--- | :--- | :--- | :--- |
| **Regional Manager** | Senior Business & Sales Managers | Regional target allocation, team leader oversight, high-value transaction sign-offs | Read access across all regional TLs and FSEs; write access for target updates & approvals |
| **Area Sales Manager** | Area Leads supervising multiple TLs | Monitoring daily team productivity, resolving field escalations | Read access for assigned territory data; approval rights for merchant registrations |

---

## ✨ 3. Features & Functionalities

### 📈 Executive Performance Dashboard (`Dashboard.js`)
- **Macro KPI Summary**: Displays total onboarded merchants, active Team Leaders, active FSE count, total balance transfer volume, and target completion rate.
- **Team Performance Charts**: Visual trends showing target vs. achievement breakdown by Team Leader and region.
- **Top Performers & Leaderboards**: Ranks top Team Leaders and field executives based on verified onboarding volume.

### 📝 Merchant Registration & Audit (`MerchantForm.js`)
- **Merchant Form Review**: Inspect merchant onboarding entries submitted by field teams.
- **Form Verification Queue**: High-level audit trail allowing managers to inspect store photos, GST/PAN credentials, and banking proofs.
- **Escalated Approval Handling**: Final sign-off mechanism for high-value merchant balance transfer requests.

### 👤 Profile & Regional Settings (`Profile.js` & `Register.js`)
- **Manager Profile Management**: Update personal info, credentials, and notification preferences.
- **Push Notification Subscriptions (`pushSubscriptionHelper.js`)**: Real-time push alert setup for urgent field escalations and daily quota summaries.

---

## 📄 4. Section, Page & Module Breakdown

| Page / File | Module Purpose | Key Elements & Components | User Actions Available |
| :--- | :--- | :--- | :--- |
| [`pages/Dashboard.js`](file:///c:/VegaProject/Manager_Panel/src/pages/Dashboard.js) | Main Operational Control Center | KPI Cards, Recharts visualizers, TL performance tables | Filter by region/date range, export summary data |
| [`pages/MerchantForm.js`](file:///c:/VegaProject/Manager_Panel/src/pages/MerchantForm.js) | Merchant Audit & Review Module | Merchant details card, verification document viewer | Approve, reject, or request TL re-verification |
| [`pages/Profile.js`](file:///c:/VegaProject/Manager_Panel/src/pages/Profile.js) | Manager Settings & Profile | Account info, password update, notification toggles | Edit profile, toggle alert notifications |
| [`pages/Login.js`](file:///c:/VegaProject/Manager_Panel/src/pages/Login.js) | Authentication Portal | Email/Password login inputs, session validation | Log in to manager dashboard |
| [`pages/Register.js`](file:///c:/VegaProject/Manager_Panel/src/pages/Register.js) | Account Provisioning Form | User registration inputs, manager code validation | Create new manager account |

---

## 🔄 5. Complete End-to-End Workflow

```
[ FSE Submits Form ] ──► [ TL Audits & Approves ] ──► [ MANAGER PANEL ]
                                                             │
                                   ┌─────────────────────────┴────────────────────────┐
                                   ▼                                                  ▼
                        [ Review Regional KPIs ]                           [ Audit High-Value BTs ]
                                   │                                                  │
                                   ▼                                                  ▼
                        [ Update Quota Allocation ]                       [ Final Manager Approval ]
```

1. **Daily Monitoring**: Manager logs in to the **Dashboard** to review morning target metrics and active TL counts.
2. **Quota Management**: Manager inspects regional target compliance and adjusts month-end expectations per TL.
3. **Escalation Review**: When a high-value merchant registration or balance transfer requires sign-off, it lands in the Manager's approval queue.
4. **Sign-Off & Escalation**: Manager verifies documents on `MerchantForm.js` and approves the transaction, notifying the Admin Panel.

---

## ⚡ 6. Key Actions & Operations

- **Approve / Reject Merchant Registrations**: Authorize high-value balance transfers and merchant onboarding applications.
- **Delegate Targets to Team Leaders**: Set daily, weekly, and monthly onboarding goals for individual TL teams.
- **Inspect Regional Performance**: Filter analytics by territory, Team Leader, or date range.
- **Push Alert Subscriptions**: Enable browser push notifications for instant alerts on critical target milestones.

---

## 🔗 7. Cross-Panel Connections & Integrations

- ⬆️ **Admin Panel (`Vegavruddhi-admin-tideBT`)**: Escalates global policy approvals and syncs master database records.
- ⬇️ **Team Leader Panel (`Team_Leader-` / `Vegavruddhi-Tl-tideBT`)**: Receives assigned target quotas from Manager Panel and sends team audit data upwards.
- ⬇️ **Employee Panel (`Vegavruddhi-employee-tideBT`)**: Indirectly receives merchant submission feedback forwarded via Team Leaders.

---

## 🛠️ 8. Tech Stack & Environment Setup

- **Frontend**: React 19, Material-UI (`@mui/material` v9), Emotion, React Router v6
- **Proxy Configuration**: `"proxy": "http://localhost:4000"` in `package.json`

### Startup Instructions
```bash
cd c:\VegaProject\Manager_Panel
npm install
npm start   # Runs on http://localhost:3000
```

---

## 📄 License
Internal Proprietary Software – Vegavruddhi Technologies. All Rights Reserved.
