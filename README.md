# Mini ERP + CRM Operations Portal

A full-stack hiring-assignment starter implementing the required ERP/CRM core:
- JWT authentication and roles
- Customer CRM
- Products and inventory
- Stock movements
- Sales challans with transactional stock reduction
- React dashboard

## Architecture Explanation
The application uses a standard full-stack architecture:
- **Frontend**: A React SPA built with Vite and TypeScript, using component-based design. State and routing are managed client-side. The frontend communicates with the backend REST API via Axios/Fetch and stores JWT tokens for session management.
- **Backend**: A Node.js + Express application using TypeScript. It exposes RESTful API endpoints secured by JWT authentication middleware with role-based access control (RBAC). 
- **Database**: A PostgreSQL database managed with Prisma ORM. Prisma handles schema migrations, type-safe queries, and transactional integrity (e.g., updating stock quantities simultaneously with creating challan records).

## Known Limitations / Incomplete Parts
- **Pagination / Filtering**: Basic data grids are implemented, but advanced pagination and filtering on large datasets may be limited.
- **File Uploads**: Product image uploads or challan PDF generation are not fully implemented.
- **Email Notifications**: The system does not currently send real email alerts for low stock or new customer creation.
- **Audit Logs**: Comprehensive logging for every entity change is not fully implemented (only basic stock movements are recorded).

## Setup & Deployment Instructions

### Local Backend Setup
```bash
cd backend
cp .env.example .env
# Edit .env to add your local DATABASE_URL and JWT_SECRET
npm install
npx prisma generate
npx prisma migrate dev --name init
npm run seed
npm run dev
```

### Local Frontend Setup
```bash
cd frontend
# Set VITE_API_URL in .env if the backend is not on http://localhost:4000
npm install
npm run dev
```

### Deployment Instructions
1. **Database**: Provision a managed PostgreSQL instance (e.g., Supabase, Neon, Render).
2. **Backend**: Deploy the Node.js API to a platform like Render, Heroku, or Railway. Set environment variables `DATABASE_URL` and `JWT_SECRET`. Run `npx prisma migrate deploy` during the build step.
3. **Frontend**: Deploy the Vite React app to Vercel, Netlify, or Cloudflare Pages. Set the environment variable `VITE_API_URL` to point to the live backend URL.

## Demo Users
Password for all demo users: `Password123!`

- `admin@example.com` (Admin role)
- `sales@example.com` (Sales role)
- `warehouse@example.com` (Warehouse role)
- `accounts@example.com` (Accounts role)

## Core Business Rule
Draft challans do not reduce stock. Confirming a challan validates all requested quantities inside a database transaction, reduces stock, and records OUT stock movements. Insufficient stock rejects the entire confirmation.
