# The Grand Horizon - Luxury Resort & Spa ???

A full-stack, enterprise-grade Hotel Reservation & Property Management System (PMS) built with modern web technologies, transactional concurrency guarantees, and Ethiopian Birr (ETB) billing.

---

## ?? Key Features

### ??? Guest Booking Journey
- **Real-Time Room Inventory:** Search rooms across dates, guest counts, and luxury suite categories.
- **Dynamic Pricing Engine:** Multi-night calculations with seasonal rates, VAT (15%), and Resort Service Charges (10%).
- **Promotional Vouchers:** Instant discount application (`WELCOME10`, `SUMMER20`, `LUXURY50`).
- **Concierge Upselling & Add-Ons:** Seamlessly book airport transfers, couple's spa treatments, and VIP welcome hampers during checkout or post-booking.
- **Automated Hold System:** Atomic 15-minute reservation hold protects guest selections against double bookings.
- **Folio PDF Invoices:** Instant ETB receipt download powered by PDFKit.

### ?? Staff Property Management System (PMS)
- **Role-Based Access Control (RBAC):** Distinct dashboards for System Admin, General Manager, Front Desk Staff, Housekeepers, and Registered Guests.
- **Front Desk Operations:** Manage Today's Arrivals, Departures, and In-House guests with instant room assignment and ID verification.
- **Housekeeping Live Board:** Real-time room status tracking (`Clean`, `Dirty`, `Inspected`, `Out of Order`) with one-click transitions.

---

## ??? Technology Stack

- **Frontend:** React 19, Vite, Tailwind CSS v4, Lucide Icons, React Router 7, Axios
- **Backend:** Node.js, Express, PostgreSQL, JWT Authentication, PDFKit
- **Database:** PostgreSQL with transactional row-level locks (`SELECT FOR UPDATE`) for double-booking prevention

---

## ?? Quick Start (Local Development)

### Prerequisites
- Node.js (v18+)
- PostgreSQL (running locally on port 5432)

### 1. Database Setup
```bash
# In PostgreSQL, create the database:
CREATE DATABASE hotel_booking_db;
```

### 2. Backend Setup
```bash
cd backend
npm install
cp .env.example .env
# Adjust your DATABASE_URL and JWT_SECRET in .env if needed

# Run migrations and seed data
npm run migrate
npm run seed

# Start development server
npm run dev
# Backend runs at http://localhost:5000
```

### 3. Frontend Setup
```bash
cd frontend
npm install
npm run dev
# Frontend runs at http://localhost:5173
```

---

## ?? Demo Credentials

| Role | Email | Password |
|---|---|---|
| **System Admin** | `admin@grandhorizon.com` | `Admin123!` |
| **Front Desk** | `reception@grandhorizon.com` | `Staff123!` |
| **Housekeeping** | `housekeeping@grandhorizon.com` | `Clean123!` |
| **Guest** | `guest@example.com` | `Guest123!` |

---

## ?? Deployment Guide

### Backend & Database (Render / Railway)
1. Push this repository to GitHub.
2. In **Render**, create a **PostgreSQL Database** (copy the internal/external database URL).
3. Create a new **Web Service** connected to your repo:
   - **Root Directory:** `backend`
   - **Build Command:** `npm install`
   - **Start Command:** `npm run migrate && npm run seed && npm start`
   - **Environment Variables:**
     - `DATABASE_URL`: Your hosted PostgreSQL connection string
     - `NODE_ENV`: `production`
     - `PORT`: `5000`
     - `JWT_SECRET`: Random secure string
     - `JWT_REFRESH_SECRET`: Random secure string
     - `CLIENT_URL`: Your Vercel frontend URL

### Frontend (Vercel)
1. In **Vercel**, import your GitHub repository.
2. Configure project settings:
   - **Framework Preset:** Vite
   - **Root Directory:** `frontend`
3. Add Environment Variable:
   - `VITE_API_URL`: `https://your-backend-api.onrender.com/api/v1`
4. Click **Deploy**.

---

## ?? License
ISC © The Grand Horizon Resort & Spa
