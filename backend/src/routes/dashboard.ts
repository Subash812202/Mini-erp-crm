import { Router } from 'express';
import { prisma } from '../config/prisma';
import { auth } from '../middleware/auth';

const router = Router();
router.use(auth);

router.get('/stats', async (_req, res, next) => {
  try {
    const [customers, activeCustomers, products, draft, confirmed, stock] = await Promise.all([
      prisma.customer.count(),
      prisma.customer.count({ where: { status: 'ACTIVE' } }),
      prisma.product.count(),
      prisma.challan.count({ where: { status: 'DRAFT' } }),
      prisma.challan.count({ where: { status: 'CONFIRMED' } }),
      prisma.product.aggregate({ _sum: { currentStock: true } })
    ]);
    const lowStockResult = await prisma.$queryRaw<{ count: number }[]>`
      SELECT COUNT(*)::int AS count
      FROM "Product"
      WHERE "currentStock" <= "minimumStock"
    `;
    const lowStockCount = lowStockResult[0]?.count ?? 0;
    const inventoryQuantity = Number(stock._sum.currentStock ?? 0);
    res.json({ success: true, data: { customers: Number(customers), activeCustomers: Number(activeCustomers), products: Number(products), lowStock: lowStockCount, draft: Number(draft), confirmed: Number(confirmed), inventoryQuantity } });
  } catch (e) { next(e); }
});

export default router;
