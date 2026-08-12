# Mini ERP + CRM Operations Portal

A full-stack hiring-assignment starter implementing the required ERP/CRM core:
- JWT authentication and roles
- Customer CRM
- Products and inventory
- Stock movements
- Sales challans with transactional stock reduction
- React dashboard

## Stack
Frontend: React + TypeScript + Vite
Backend: Node.js + TypeScript + Express
Database: PostgreSQL + Prisma

## Setup

### Backend
```bash
cd backend
cp .env.example .env
npm install
npx prisma generate
npx prisma migrate dev --name init
npm run seed
npm run dev
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

Set `VITE_API_URL` in frontend/.env if the backend is not on http://localhost:4000.

## Demo users
Password for all demo users: `Password123!`

- admin@example.com
- sales@example.com
- warehouse@example.com
- accounts@example.com

## Core business rule
Draft challans do not reduce stock. Confirming a challan validates all requested quantities inside a database transaction, reduces stock, and records OUT stock movements. Insufficient stock rejects the entire confirmation.
