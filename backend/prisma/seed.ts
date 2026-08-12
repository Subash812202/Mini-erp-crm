import { PrismaClient, Role, CustomerType, CustomerStatus, MovementType, ChallanStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  await prisma.challanItem.deleteMany();
  await prisma.challan.deleteMany();
  await prisma.stockMovement.deleteMany();
  await prisma.followUpNote.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.product.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash('Password123!', 10);
  const users = await Promise.all([
    prisma.user.create({ data: { name: 'Admin User', email: 'admin@example.com', passwordHash, role: Role.ADMIN } }),
    prisma.user.create({ data: { name: 'Sales User', email: 'sales@example.com', passwordHash, role: Role.SALES } }),
    prisma.user.create({ data: { name: 'Warehouse User', email: 'warehouse@example.com', passwordHash, role: Role.WAREHOUSE } }),
    prisma.user.create({ data: { name: 'Accounts User', email: 'accounts@example.com', passwordHash, role: Role.ACCOUNTS } })
  ]);

  const customers = await Promise.all(Array.from({ length: 10 }, (_, i) => prisma.customer.create({
    data: {
      name: `Customer ${i + 1}`, mobile: `90000000${String(i).padStart(2, '0')}`,
      email: `customer${i + 1}@example.com`, businessName: `Business ${i + 1}`,
      customerType: [CustomerType.RETAIL, CustomerType.WHOLESALE, CustomerType.DISTRIBUTOR][i % 3],
      address: `Address ${i + 1}`, status: i % 3 === 0 ? CustomerStatus.LEAD : CustomerStatus.ACTIVE,
      notes: 'Seed customer'
    }
  })));

  const products = await Promise.all(Array.from({ length: 15 }, (_, i) => prisma.product.create({
    data: {
      name: `Product ${i + 1}`, sku: `SKU-${String(i + 1).padStart(3, '0')}`,
      category: ['Electronics', 'Office', 'General'][i % 3],
      unitPrice: 100 + i * 25, currentStock: 20 + i * 5,
      minimumStock: 10, warehouse: 'Main Warehouse'
    }
  })));

  for (const p of products.slice(0, 5)) {
    await prisma.stockMovement.create({ data: { productId: p.id, quantity: p.currentStock, type: MovementType.IN, reason: 'Opening stock', createdById: users[2].id } });
  }

  await prisma.challan.create({
    data: {
      number: 'CH-SEED-001', customerId: customers[0].id, createdById: users[1].id,
      status: ChallanStatus.DRAFT, totalQty: 2, totalAmount: 200,
      items: { create: [{ productId: products[0].id, productName: products[0].name, sku: products[0].sku, unitPrice: products[0].unitPrice, quantity: 2, total: 200 }] }
    }
  });

  console.log('Seed complete');
}

main().finally(() => prisma.$disconnect());
