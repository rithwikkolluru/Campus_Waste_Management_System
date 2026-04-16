# Campus Waste Management System

## Overview
The Campus Waste Management System (EcoCampus) is a comprehensive, full-stack web application designed to facilitate efficient garbage reporting and monitoring within university environments. The platform incentivizes students to actively participate in maintaining a clean campus through a transparent reporting mechanism and an integrated gamification system.

## Project Architecture
The system follows a typical dual-layer client-server architecture, divided into distinct frontend and backend environments.

- **Frontend Environment**: Built with React and Vite, the user interface provides dynamic routing, state context management, and responsive data visualizations.
- **Backend API**: Engineered using Node.js and Express, securely exposing RESTful endpoints.
- **Database Layer**: Handled using PostgreSQL, guaranteeing relational consistency across user identities, reports, and gamification points.

## Repository Structure

The project has been decoupled into distinct operational domains, containing isolated package dependencies for improved maintainability and secure deployment pipelines.

```text
Campus_Waste_Management_System/
│
├── backend/                  # Node.js Server Environment
│   ├── config/               # Database and environment configurations
│   ├── controllers/          # Business logic handlers (Auth, Reporting, KPIs)
│   ├── middleware/           # XSS, logging, and JWT interceptors
│   ├── routes/               # Express routing architectures
│   ├── scripts/              # Schema generation scripts (init_db.js)
│   ├── server.js             # Core Express listener daemon
│   └── package.json          # Isolated backend dependencies (express, pg, bcrypt)
│
├── frontend/                 # React Client Environment
│   ├── public/               # Static assets, SVG icons, generic graphics
│   ├── src/                  # React Source Code
│   │   ├── components/       # Reusable UI elements (Sidebars, Toasts)
│   │   ├── contexts/         # Application State (AuthContext, Notifications)
│   │   ├── pages/            # Main Views (Role-based Dashboards, OTP log on)
│   │   ├── services/         # Client API transaction and abstraction layer
│   │   ├── utils/            # Validation helpers and security sanitization
│   │   └── App.jsx           # Global Router definitions
│   ├── index.html            # Vite HTML mount template
│   ├── vite.config.js        # Vite Build system definitions
│   └── package.json          # Isolated frontend dependencies (react, lucide)
│
└── README.md                 # Deployment & Architectural documentation
```

## Core Capabilities Framework
The application implements highly specialized functionalities segmented by user roles to ensure data integrity and streamlined workflows.

### Dual-Layer Authentication System
1. **Student Access (OTP Flow)**
   - Prioritizes frictionless access using 10-digit mobile number validation.
   - Enforces a 5-minute expiry window and strict retry limits on temporary passcodes.
2. **Staff/Coordinator Access (Credential Flow)**
   - Utilizes standard email and password authentication verified via secure hashing algorithms.
   - Implements JSON Web Token (JWT) session generation, enforcing strict 24-hour active session expiration boundaries.

### Gamification and Limits Enforcement
To prevent abuse while motivating students, the system utilizes an internal points ledger.
- **Micro-rewards**: Users are credited 5 points for every valid, uploaded photograph depicting a campus waste issue.
- **Thresholds**: The server-side controller restricts accumulation to a maximum of 50 points per day, and 500 points per month per user identity.
- **Engagement Dashboard**: The frontend continuously tracks this progression to display objective metric bars, keeping users engaged with their impact over time.

### Report Management Component
- Enables geo-tagged and categorical classification of waste types (e.g., Organic, Plastic, E-Waste).
- Provides campus coordinators with comprehensive metric views, including real-time warnings for High-Priority hazard resolutions via Live Notification Contexts.

## Technology Stack Specifications

### Frontend
- **Framework**: React
- **Build Engine**: Vite
- **Styling Architecture**: Vanilla CSS deploying modern Glassmorphism UX methodologies
- **Routing Engine**: React Router DOM
- **UI Components**: Lucide React

### Backend
- **Runtime Environment**: Node.js
- **Server Framework**: Express.js
- **Session Security**: JsonWebToken (JWT) & bcryptjs
- **Database Driver**: pg (node-postgres)
- **Media Transmissions**: Multer for multipart form and binary data operations

## Setup and Deployment Guidelines

### Prerequisites
Before cloning the repository, ensure your development environment satisfies the following requirements:
- Node.js environment configured natively
- Node Package Manager (NPM)
- PostgreSQL server active on the default TCP port (5432)

### Local Initialization Sequence

1. **Database Schema Configuration**
   Ensure an empty PostgreSQL database named `eco_campus` is accessible, and database credentials are provided correctly in the environment configuration. Execute the database initialization script to apply relational schema constraints:
   ```bash
   node backend/scripts/init_db.js
   ```

2. **Backend Service Bootstrapping**
   Launch the Express listener to supply REST APIs to the client layer:
   ```bash
   node backend/server.js
   ```
   The backend daemon will intercept requests continuously at `http://localhost:8000/`.

3. **Frontend Service Bootstrapping**
   In a secondary terminal context, start the Vite development server:
   ```bash
   cd frontend
   npm run dev
   ```
   Access the graphical user interface securely via `http://localhost:5173`.

### Fallback Demonstration Diagnostics
If the local PostgreSQL database service is unresponsive or absent from the execution environment, the application's React Contexts aggressively intercept network failures and gracefully revert the runtime structure into an offline evaluation state.
- **Testing Student Interfaces**: Submit any valid 10-digit number. A pseudo-passcode will instantly populate directly within the client interface to bypass the requirement.
- **Testing Administrative Interfaces**: Authenticate utilizing the mock credentials `admin@campus.edu` with the password `demo1234`.

---

This project establishes foundational scalability for environmental accountability tracking within heavily structured institutional campuses. For detailed API endpoint specifications, review the Express router abstractions contained within the respective backend directories.
