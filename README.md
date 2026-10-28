# TempoWorkers 👷‍♂️🏗️
> **Hyperlocal On-Demand Workforce & Blue-Collar Gig Platform**

[![Node.js](https://img.shields.io/badge/Node.js-v24.x-green.svg)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-v19.x-blue.svg)](https://react.dev/)
[![Express](https://img.shields.io/badge/Express-v5.x-lightgrey.svg)](https://expressjs.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose-brightgreen.svg)](https://mongoosejs.com/)
[![Socket.IO](https://img.shields.io/badge/Socket.IO-v4.x-black.svg)](https://socket.io/)
[![License: ISC](https://img.shields.io/badge/License-ISC-yellow.svg)](https://opensource.org/licenses/ISC)

TempoWorkers connects daily-wage skilled and semi-skilled workers (electricians, plumbers, masons, carpenters, facility cleaners) with local contractors and employers in real time. It features verified OTP logins, geospatial job discovery, real-time Socket.IO chat, escrow payment protection, and multi-language support.

---

## 🚀 Key Platform Features

- **⚡ Dual Dedicated Portals**:
  - **Worker Dashboard**: Real-time job discovery, wage calculator, map search, 1-click apply, saved jobs, earnings history.
  - **Employer Dashboard**: Post jobs with geospatial GPS tagging, review applicant profiles, manage escrows, rate workers.
  - **Admin Control Center**: User moderation, job audit, platform dispute resolution.
- **🔐 Enterprise Security & Auth**:
  - OTP authentication (SMS/Email) with Dev fallback mode.
  - JWT tokens with session revocation (`tokenVersion`).
  - Strict NoSQL Injection protection and input HTML sanitization (XSS prevention).
  - IDOR protection on all application, payment, and chat routes.
- **💬 Real-Time Socket.IO Infrastructure**:
  - Live job broadcast alerts (`job_posted`).
  - Instant applicant notifications to employers.
  - Direct end-to-end encrypted messaging between worker and employer.
- **💳 Escrow Payment Guarantee (Razorpay)**:
  - Employers lock funds in escrow before worker starts job.
  - Secure transfer to worker's linked bank account upon completion verification.
- **🌐 4-Language Localization**:
  - English (`en`), Hindi (`hi` - हिन्दी), Marathi (`mr` - मराठी), Tamil (`ta` - தமிழ்).
- **🗺️ Interactive Geospatial Maps**:
  - Live Leaflet map displaying active gig jobs within custom radii.

---

## 🏛️ System Architecture

```mermaid
graph TD
    Client["React 19 Frontend (Vite + Tailwind + Leaflet)"]
    Server["Express 5 REST API + Socket.IO Server"]
    DB[("MongoDB (Atlas / Memory / Local)")]
    Cache[("Redis Cache & Socket Adapter")]
    PaymentGateway["Razorpay Escrow & Payouts"]

    Client -->|HTTP / REST API| Server
    Client <-->|WebSocket Events| Server
    Server <--> DB
    Server <--> Cache
    Server <--> PaymentGateway
```

---

## ⚡ 1-Click Quickstart (Local Development)

### Windows 1-Click Launch:
Double-click **`start-all.bat`** in the project root. It will:
1. Launch the Backend Server on `http://localhost:5000`
2. Launch the Vite Client on `http://localhost:5173`
3. Automatically launch your browser at `http://localhost:5173`!

### Manual CLI Launch:
```bash
# 1. Clone the repository
git clone https://github.com/anurags-007/tempoworkers.git
cd tempoworkers

# 2. Start Server (Terminal 1)
cd server
npm install
npm run seed     # (Optional: Seeds comprehensive demo users & jobs)
npm run dev      # Starts on http://localhost:5000

# 3. Start Client (Terminal 2)
cd ../client
npm install
npm run dev      # Starts on http://localhost:5173
```

---

## 👥 Pre-Configured Demo Accounts

For client evaluation and live testing, run `npm run seed` inside `server/` to load the following accounts:

| Role | Identifier / Email | Password | Details |
|---|---|---|---|
| **👑 Admin** | `admin@tempoworkers.com` | `Tempo@1234` | Full platform administration |
| **🏢 Employer** | `vikram@apexinfra.com` | `Tempo@1234` | Apex Infra & Construction Ltd |
| **🏢 Employer** | `ananya@urbanliving.in` | `Tempo@1234` | Urban Living Interiors |
| **👷 Worker** | `9811223344` (OTP Login) | *Any / Dev OTP* | Rajesh Kumar (Electrician ⭐4.9) |
| **👷 Worker** | `9822334455` (OTP Login) | *Any / Dev OTP* | Mohammed Aslam (Plumber ⭐4.8) |
| **👷 Worker** | `9833445566` (OTP Login) | *Any / Dev OTP* | Sunita Devi (Deep Cleaning ⭐5.0) |

*(Note: In development mode, `OTP_DEBUG_MODE=true` returns the OTP directly in the API response and logs it to the terminal for instant login).*

---

## 🧪 Automated Testing

TempoWorkers includes a comprehensive 20-point end-to-end integration test suite verifying authentication, job posting, applicant processing, WebSocket events, and live chat:

```bash
cd server
npm test
```

Expected output:
```
==================================================
  Tests Completed: 20 PASSED, 0 FAILED  
==================================================
🎉 ALL 20 INTEGRATION TESTS PASSED WITH 100% SUCCESS!
```

---

## ⚙️ Environment Variables

### Server (`server/.env`)
```ini
# MongoDB Connection String (Leave blank to use built-in In-Memory DB)
MONGO_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/tempoworkers

# JWT Secret
JWT_SECRET=your_super_secret_jwt_key_at_least_32_characters

# Razorpay Keys (For Payments)
RAZORPAY_KEY_ID=rzp_test_xxxx
RAZORPAY_KEY_SECRET=xxxx

# Redis (Optional: Leave blank to disable Redis caching)
REDIS_URL=redis://default:xxxx@host:port

# Email / SMS (Optional: For real email OTP delivery)
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_gmail_app_password

# Server Settings
PORT=5000
NODE_ENV=development
OTP_DEBUG_MODE=true
```

### Client (`client/.env`)
```ini
VITE_API_URL=http://localhost:5000/api
```

---

## 📁 Repository Structure

```
tempoworkers/
├── start-all.bat            # 1-Click Windows Batch startup script
├── start-all.ps1            # 1-Click Windows PowerShell startup script
├── client/                  # React 19 Frontend (Vite)
│   ├── src/
│   │   ├── components/      # Navbar, ProtectedRoute, JobCard, ChatBox
│   │   ├── pages/           # Worker, Employer, Admin dashboards & Login
│   │   ├── locales/         # i18n JSON translations (en, hi, mr, ta)
│   │   ├── hooks/           # useSocket.js real-time event hook
│   │   └── api.js           # Central Axios client with token interceptor
│   └── package.json
└── server/                  # Express 5 Backend
    ├── config/              # MongoDB and Redis connection clients
    ├── controllers/         # Auth, Job, Application, Payment, Chat controllers
    ├── middleware/          # JWT protect, rateLimit, NoSQL sanitization
    ├── models/              # User (Worker/Employer/Admin), Job, Payment, Message
    ├── routes/              # Express API routers
    ├── test/                # Automated End-to-End Test Suite
    ├── seed.js              # Comprehensive demo database seeder
    └── server.js            # Main HTTP & Socket.IO server entrypoint
```

---

## 📜 License
Licensed under the [ISC License](LICENSE). Built for the workforce of tomorrow.
