# EcoCampus: Smart Campus Waste Management System ♻️

EcoCampus is an interactive, full-stack campus garbage monitoring and gamified reporting platform. It was built to maintain a cleaner campus environment by incentivizing students to report and document garbage issues. 

## ✨ Key Features
- **OTP Mobile Authentication**: Secure, mobile-first phone number verification for students with daily tracking limits.
- **Role-based Dashboards**: Separated experiences for Students (Phone OTP) and Staff/Coordinators (Secure Email/Password).
- **Gamification Engine**: An achievement-based point system rewarding students 5 points for every valid garbage photo upload, enforcing soft maximum limits of 50 points/day to prevent spam and abuse.
- **Interactive UI**: Rich modern React interfaces using custom glassmorphism styles, live notifications, and real-time report search tables. 

## 🛠️ Technology Stack
- **Frontend**: React, Vite, Lucide-React 
- **Backend API**: Node.js, Express, strict OTP tracking, JWT token session management
- **Database**: PostgreSQL
- **Security**: Strict route limits, 24-hour token bounds, `bcrypt` password checks, input validations.

## 🚀 Setup & Installation

### 1. Database Initialization
Ensure that your local PostgreSQL instance is running on `localhost:5432` with the `eco_campus` database configured in your `.env`.
To run the setup script and apply the schemas:
```bash
node backend/scripts/init_db.js
```

### 2. Backend API
1. Open a terminal to run the Express API:
```bash
node backend/server.js
```
The server will boot up via the Node interpreter at `http://localhost:8000`.

### 3. Frontend Development
1. Start the Vite React development server:
```bash
npm run dev
```
Navigate to `http://localhost:5173`. 

### Testing Credentials (Standalone Fallback)
If the Postgres server is offline, the React `AuthContext` falls back gracefully into an offline UI demo mode.
- **Students**: Use any 10-digit number. The UI will hint the generated OTP to test authentication.
- **Staff Mock User**: `admin@campus.edu` with the password `demo1234`.
