# Comprehensive Project Documentation: Mini ERP + CRM

## 1. Project Overview
This project is a full-stack Minimum Viable Product (MVP) of an ERP and CRM system. It is designed to manage customers, product inventory, and sales processes (challans/orders). The system enforces role-based access control (RBAC) and ensures transactional integrity when processing sales and deducting stock.

## 2. Technology Stack
- **Frontend**: React.js, TypeScript, Vite, Tailwind CSS (or standard CSS), Axios, React Router.
- **Backend**: Node.js, Express.js, TypeScript, JSON Web Tokens (JWT) for authentication.
- **Database**: PostgreSQL (Relational Database).
- **ORM**: Prisma (for schema modeling, migrations, and type-safe database queries).

## 3. Architecture
The application uses a decoupled client-server architecture:
- **Client (Frontend)**: A Single Page Application (SPA). It maintains user sessions securely via JWTs stored in memory/localStorage. It communicates with the backend exclusively through RESTful JSON endpoints.
- **Server (Backend)**: A stateless Express REST API. All routes (except login) are protected by a middleware that verifies the JWT and the user's role. 
- **Database Layer**: Prisma ORM acts as the bridge between the Node.js backend and the PostgreSQL database. It handles complex operations, such as creating a challan and simultaneously deducting stock using database transactions to prevent race conditions.

## 4. Key Features & Business Logic
### Authentication & Authorization
- Users log in with an email and password.
- Passwords are securely hashed using `bcryptjs`.
- Upon successful login, the server issues a JWT.
- **Roles**: 
  - `ADMIN`: Full access to all modules.
  - `SALES`: Can view customers, create challans, and view products.
  - `WAREHOUSE`: Can manage product inventory and stock movements.
  - `ACCOUNTS`: Can view financial data and challans.

### Customer Management (CRM)
- Customers can be categorized as `RETAIL`, `WHOLESALE`, or `DISTRIBUTOR`.
- Customers have a status (`LEAD`, `ACTIVE`, `INACTIVE`).
- Users can track follow-up notes for each customer.

### Inventory Management (ERP)
- Products have SKUs, categories, unit prices, and current stock levels.
- **Stock Movements**: Every change in stock (addition or deduction) is recorded in a ledger (`StockMovement`), providing a complete audit trail of inventory changes.

### Sales & Challans
- A "Challan" represents a sales order or dispatch note.
- **Core Business Rule**: 
  - Creating a challan in `DRAFT` status does **not** affect inventory.
  - When a challan is `CONFIRMED`, the backend uses a Prisma Transaction to:
    1. Verify sufficient stock exists for all items.
    2. Deduct the stock quantities from the products.
    3. Create `OUT` stock movement records for the audit trail.
    4. Update the challan status to `CONFIRMED`.
  - If any product lacks sufficient stock, the entire transaction is rolled back, preventing partial stock deductions.

## 5. Database Schema (Prisma)
- **User**: `id, name, email, passwordHash, role`
- **Customer**: `id, name, mobile, email, type, status, notes`
- **FollowUpNote**: `id, customerId, note, date, createdById`
- **Product**: `id, name, sku, category, unitPrice, currentStock, minStock`
- **StockMovement**: `id, productId, quantity, type (IN/OUT), reason, createdById`
- **Challan**: `id, number, customerId, status (DRAFT/CONFIRMED), totalQty, totalAmount, createdById`
- **ChallanItem**: `id, challanId, productId, quantity, unitPrice, total`

## 6. Local Setup Instructions

### Prerequisites
- Node.js (v18+)
- PostgreSQL installed locally (or a cloud URL like Supabase/Neon).

### Backend Setup
```bash
cd backend
# 1. Duplicate environment file
cp .env.example .env
# 2. Add your PostgreSQL URL to .env
# 3. Install dependencies
npm install
# 4. Generate Prisma Client
npx prisma generate
# 5. Run Database Migrations
npx prisma migrate dev --name init
# 6. Seed the Database with test data
npm run seed
# 7. Start the server
npm run dev
```

### Frontend Setup
```bash
cd frontend
# 1. Install dependencies
npm install
# 2. Add your backend URL to .env (if not localhost:4000)
# echo "VITE_API_URL=http://localhost:4000/api" > .env
# 3. Start the Vite dev server
npm run dev
```

## 7. Production Deployment Guide

### A. Database & Backend (Railway)
1. Go to **Railway.app** and provision a **PostgreSQL** database.
2. Create a new **GitHub Repo** service and select this project.
3. In the Railway service settings, set the **Root Directory** to `/backend`.
4. Add Environment Variables:
   - `DATABASE_URL`: Your Railway Postgres connection string.
   - `JWT_SECRET`: A random secure string.
5. Railway will automatically run `npm run build` (which includes `prisma generate` and `tsc`) and then start the server.
6. Generate a public domain in the Networking settings (e.g., `https://my-backend.up.railway.app`).

### B. Frontend (Vercel)
1. Go to **Vercel.com** and create a new project.
2. Import this GitHub repository.
3. In the setup screen, change the **Root Directory** to `frontend`.
4. Ensure the framework is set to **Vite**.
5. Add the Environment Variable:
   - `VITE_API_URL`: The public domain URL generated by Railway in the previous step.
6. Deploy.

## 8. Test Credentials
Use the password `Password123!` for all following accounts:
- `admin@example.com`
- `sales@example.com`
- `warehouse@example.com`
- `accounts@example.com`
