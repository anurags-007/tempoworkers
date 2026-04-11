# Tempoworkers 👷‍♂️🏗️

Tempoworkers is a specialized platform designed to bridge the gap between daily wage workers and employers. Built with the MERN stack, it offers a seamless, real-time experience for job posting, discovery, and communication.

## 🚀 Key Features

- **Dual Roles**: Dedicated dashboards for both **Employers** (to post jobs and manage applications) and **Workers** (to find and apply for jobs).
- **Secure Authentication**: Supports both **OTP-based login** (via email) and traditional password-based authentication.
- **Real-time Communication**: Integrated **Chat System** powered by Socket.io for instant interaction between employers and workers.
- **Secure Payments**: Integrated **Razorpay** for handling wage payments and transactions securely.
- **Multi-language Support**: Fully localized in **English**, **Hindi (हिंदी)**, **Marathi (मराठी)**, and **Tamil (தமிழ்)** using i18next.
- **Interactive Map**: Location-based job search and posting using Leaflet maps.
- **Modern UI**: Smooth animations with Framer Motion and a responsive design using Tailwind CSS.
- **Security First**: 
  - Express-based rate limiting.
  - NoSQL injection protection.
  - Security headers (HSTS, XSS protection).
  - JWT for secure session management.

## 🛠️ Tech Stack

### Frontend
- **Framework**: React (Vite)
- **Styling**: Tailwind CSS, Framer Motion (Animations)
- **Icons**: Lucide-React
- **State/Routing**: React Router DOM, React Hooks
- **Communication**: Socket.io-client, Axios
- **Localization**: i18next

### Backend
- **Runtime**: Node.js, Express
- **Database**: MongoDB (Mongoose)
- **Real-time**: Socket.io
- **Auth**: JWT, BcryptJS
- **Communication**: Nodemailer (OTP delivery)
- **Payments**: Razorpay

## ⚙️ Installation & Setup

### 1. Clone the repository
```bash
git clone https://github.com/anurags-007/tempoworkers.git
cd tempoworkers
```

### 2. Frontend Setup (Client)
```bash
cd client
npm install
npm run dev
```

### 3. Backend Setup (Server)
```bash
cd server
npm install
# Create a .env file based on the environment variables section below
npm run dev
```

## 🔐 Environment Variables

### Server (`server/.env`)
- `MONGO_URI`: Your MongoDB connection string.
- `JWT_SECRET`: Secret key for JWT signing.
- `EMAIL_USER`: NodeMailer email address (for OTP).
- `EMAIL_PASS`: NodeMailer email password.
- `RAZORPAY_KEY_ID`: Razorpay API Key ID.
- `RAZORPAY_KEY_SECRET`: Razorpay API Key Secret.
- `PORT`: (Optional) Port number (default: 5000).

## 📂 Project Structure

```
Tempoworkers/
├── client/              # React frontend (Vite)
│   ├── src/
│   │   ├── components/  # Reusable UI components
│   │   ├── pages/       # Dashboard and Landing pages
│   │   ├── locales/     # Translation files (JSON)
│   │   └── hooks/       # Custom React hooks
├── server/              # Express backend
│   ├── config/          # Database configuration
│   ├── controllers/     # API logic
│   ├── models/          # Mongoose schemas
│   ├── routes/          # API endpoints
│   └── middleware/      # Auth and Security middleware
```

## 📄 License

This project is licensed under the ISC License.

