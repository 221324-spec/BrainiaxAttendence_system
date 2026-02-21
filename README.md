# Attendance & Time Tracking System

A full-stack attendance management system built with React, TypeScript, Express, and MongoDB.

## Architecture

```
catts/
├── server/          # Express + TypeScript backend
│   └── src/
│       ├── config/         # Environment configuration
│       ├── controllers/    # Request handlers
│       ├── cron/           # Scheduled jobs (midnight absent-marking)
│       ├── middleware/      # Auth, validation, error handling
│       ├── models/         # Mongoose schemas (User, Attendance, AuditLog)
│       ├── routes/         # Express route definitions
│       ├── services/       # Business logic layer
│       ├── validators/     # Zod validation schemas
│       ├── seed.ts         # Database seeder
│       └── server.ts       # App entry point
│
├── client/          # React + TypeScript frontend
│   └── src/
│       ├── api/            # Axios API client & endpoints
│       ├── components/     # Shared components (Layout, ProtectedRoute)
│       ├── context/        # React context (AuthContext)
│       ├── pages/          # Page components
│       └── types/          # TypeScript interfaces
```

## Tech Stack

### Backend
- **Runtime:** Node.js + TypeScript
- **Framework:** Express
- **Database:** MongoDB Atlas (Mongoose ODM)
- **Authentication:** JWT + Argon2 password hashing
- **Validation:** Zod
- **Scheduling:** node-cron
- **Security:** Helmet, CORS, express-rate-limit

### Frontend
- **Framework:** React 18 + TypeScript
- **Styling:** Tailwind CSS
- **State/Data:** TanStack React Query
- **HTTP Client:** Axios
- **Routing:** React Router v6
- **Notifications:** react-hot-toast

## Getting Started

### Prerequisites
- Node.js 18+
- MongoDB (local or Atlas connection string)

### 1. Install Dependencies
```bash
npm run install:all
```

### 2. Configure Environment
Edit `server/.env`:
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/catts
JWT_SECRET=your-secure-random-secret
JWT_EXPIRES_IN=8h
CORS_ORIGIN=http://localhost:5173
```

### 3. Seed Database
```bash
npm run seed
```
Creates an admin and 5 sample employees.

### 4. Start Development
In two terminal windows:
```bash
# Terminal 1 – Backend
npm run dev:server

# Terminal 2 – Frontend
npm run dev:client
```

Backend runs on `http://localhost:5000`  
Frontend runs on `http://localhost:5173`

## Demo Credentials

| Role     | Email             | Password    |
|----------|-------------------|-------------|
| Admin    | admin@catts.com   | password123 |
| Employee | john@catts.com    | password123 |
| Employee | jane@catts.com    | password123 |
| Employee | bob@catts.com     | password123 |
| Employee | alice@catts.com   | password123 |
| Employee | charlie@catts.com | password123 |

## Features

### Authentication
- JWT-based login with role-based access control
- Protected routes (admin vs employee)
- Token auto-refresh with 401 interception

### Employee Dashboard
- **Punch In** — once per day, large button
- **Punch Out** — only after punch-in, auto-calculates total work minutes
- Monthly attendance summary (present, absent, half-days, avg hours)
- Attendance history table (month-to-date)

### Admin Dashboard
- **Stats cards:** Total employees, Present today, Absent today, Attendance %
- **Auto-refresh** every 60 seconds (toggleable)
- **Manual refresh** button
- **Today's attendance table** — live view of all employees
- **CSV Export** — select employee + month, downloads sanitized CSV
  - Columns: Date, Punch In, Punch Out, Total Hours, Status
  - File naming: `employeeName_MM_YYYY.csv`
  - CSV injection prevention (cell sanitization)
  - All exports logged in AuditLog collection

### Midnight Cron Job
- Runs at 23:59 daily
- Automatically marks employees without attendance as "absent"

### Database Design
- **User** — name, email, password (argon2), role, department
- **Attendance** — userId (ref), date, punchIn, punchOut, totalWorkMinutes, status
  - Unique compound index: `(userId, date)`
  - Index on `date`
- **AuditLog** — action, performedBy (ref), targetUserId, details, ipAddress

## API Endpoints

### Auth
| Method | Endpoint          | Description          |
|--------|-------------------|----------------------|
| POST   | /api/auth/register | Register new user   |
| POST   | /api/auth/login    | Login               |
| GET    | /api/auth/me       | Get current user    |

### Attendance (Employee)
| Method | Endpoint                | Description              |
|--------|-------------------------|--------------------------|
| POST   | /api/attendance/punch-in | Punch in for today      |
| POST   | /api/attendance/punch-out| Punch out for today     |
| GET    | /api/attendance/today    | Today's status          |
| GET    | /api/attendance/history  | Monthly history         |
| GET    | /api/attendance/summary  | Monthly summary stats   |

### Admin
| Method | Endpoint                       | Description                   |
|--------|--------------------------------|-------------------------------|
| GET    | /api/admin/dashboard           | Dashboard statistics          |
| GET    | /api/admin/employees           | All employees list            |
| GET    | /api/admin/employees/status    | Employees with today's status |
| GET    | /api/admin/export/:employeeId  | Export CSV attendance          |
