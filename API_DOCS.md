# Mini ERP + CRM - API Documentation

Base URL: `/api`
All protected endpoints require an Authorization header:
`Authorization: Bearer <JWT_TOKEN>`

---

## 1. Authentication
### Login
- **URL**: `/api/auth/login`
- **Method**: `POST`
- **Body**:
  ```json
  {
    "email": "admin@example.com",
    "password": "Password123!"
  }
  ```
- **Response** (200 OK):
  ```json
  {
    "token": "eyJhbG...",
    "user": {
      "id": 1,
      "name": "Admin User",
      "email": "admin@example.com",
      "role": "ADMIN"
    }
  }
  ```

---

## 2. Dashboard
### Get Dashboard Metrics
- **URL**: `/api/dashboard`
- **Method**: `GET`
- **Auth**: Required
- **Response** (200 OK):
  ```json
  {
    "totalCustomers": 10,
    "totalProducts": 15,
    "recentChallans": [...],
    "lowStockAlerts": [...]
  }
  ```

---

## 3. Customers
### Get All Customers
- **URL**: `/api/customers`
- **Method**: `GET`
- **Auth**: Required (Sales, Admin)
- **Response** (200 OK): `[ { ...customer objects } ]`

### Create Customer
- **URL**: `/api/customers`
- **Method**: `POST`
- **Auth**: Required (Sales, Admin)
- **Body**:
  ```json
  {
    "name": "John Doe",
    "email": "john@example.com",
    "mobile": "9876543210",
    "businessName": "Doe Inc",
    "customerType": "RETAIL",
    "address": "123 Street"
  }
  ```

---

## 4. Products & Stock
### Get All Products
- **URL**: `/api/products`
- **Method**: `GET`
- **Auth**: Required
- **Response** (200 OK): `[ { "id": 1, "name": "Product A", "currentStock": 20, ... } ]`

### Add Stock Movement
- **URL**: `/api/products/:id/movements`
- **Method**: `POST`
- **Auth**: Required (Warehouse, Admin)
- **Body**:
  ```json
  {
    "quantity": 50,
    "type": "IN",
    "reason": "Restock from supplier"
  }
  ```

---

## 5. Challans (Sales Orders)
### Get All Challans
- **URL**: `/api/challans`
- **Method**: `GET`
- **Auth**: Required
- **Response** (200 OK): `[ { "id": 1, "number": "CH-001", "status": "DRAFT", ... } ]`

### Create Challan
- **URL**: `/api/challans`
- **Method**: `POST`
- **Auth**: Required (Sales, Admin)
- **Body**:
  ```json
  {
    "customerId": 1,
    "items": [
      {
        "productId": 1,
        "quantity": 2,
        "unitPrice": 100
      }
    ]
  }
  ```

### Confirm Challan
- **URL**: `/api/challans/:id/confirm`
- **Method**: `POST`
- **Auth**: Required (Sales, Admin)
- **Description**: Moves a draft challan to CONFIRMED status and automatically deducts stock quantities.
