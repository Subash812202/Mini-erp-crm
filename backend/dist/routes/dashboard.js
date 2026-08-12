"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = require("../config/prisma");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.use(auth_1.auth);
router.get('/stats', async (_req, res, next) => {
    try {
        const [customers, activeCustomers, products, draft, confirmed, stock] = await Promise.all([
            prisma_1.prisma.customer.count(),
            prisma_1.prisma.customer.count({ where: { status: 'ACTIVE' } }),
            prisma_1.prisma.product.count(),
            prisma_1.prisma.challan.count({ where: { status: 'DRAFT' } }),
            prisma_1.prisma.challan.count({ where: { status: 'CONFIRMED' } }),
            prisma_1.prisma.product.aggregate({ _sum: { currentStock: true } })
        ]);
        const lowStockResult = await prisma_1.prisma.$queryRaw `
      SELECT COUNT(*)::int AS count
      FROM "Product"
      WHERE "currentStock" <= "minimumStock"
    `;
        const lowStockCount = lowStockResult[0]?.count ?? 0;
        const inventoryQuantity = Number(stock._sum.currentStock ?? 0);
        res.json({ success: true, data: { customers: Number(customers), activeCustomers: Number(activeCustomers), products: Number(products), lowStock: lowStockCount, draft: Number(draft), confirmed: Number(confirmed), inventoryQuantity } });
    }
    catch (e) {
        next(e);
    }
});
exports.default = router;
