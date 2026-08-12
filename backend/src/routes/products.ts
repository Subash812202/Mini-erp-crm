import { Router } from 'express';
import { prisma } from '../config/prisma';
import { auth, allow, AuthRequest } from '../middleware/auth';
import { Role } from '@prisma/client';

const router = Router();
router.use(auth);

router.get('/', async (req, res, next) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 10));
    const search = String(req.query.search || '');
    const where = search ? { OR: [{ name: { contains: search, mode: 'insensitive' as const } }, { sku: { contains: search, mode: 'insensitive' as const } }, { category: { contains: search, mode: 'insensitive' as const } }] } : {};
    const [data, total] = await Promise.all([
      prisma.product.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit }),
      prisma.product.count({ where })
    ]);
    res.json({ success: true, data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (e) { next(e); }
});

router.post('/', allow(Role.ADMIN, Role.WAREHOUSE), async (req: AuthRequest, res, next) => {
  try {
    const openingStock = Number(req.body.openingStock ?? req.body.currentStock ?? 0);
    if (openingStock < 0) {
      return res.status(400).json({ success: false, message: 'Opening stock cannot be negative' });
    }
    const productData: any = {
      name: req.body.name,
      sku: req.body.sku,
      category: req.body.unit ?? req.body.category ?? '',
      unitPrice: Number(req.body.unitPrice),
      currentStock: openingStock,
      minimumStock: Number(req.body.minimumStock ?? 0),
      warehouse: req.body.warehouse ?? ''
    };
    const p = await prisma.product.create({ data: productData });
    if (openingStock > 0) {
      await prisma.stockMovement.create({ data: { productId: p.id, quantity: openingStock, type: 'IN', reason: 'Opening stock', createdById: req.user!.id } });
    }
    res.status(201).json({ success: true, data: p });
  } catch (e: any) {
    if (e.code === 'P2002') {
      return res.status(400).json({ success: false, message: 'SKU must be unique' });
    }
    next(e);
  }
});

router.get('/stock/movements', allow(Role.ADMIN, Role.WAREHOUSE, Role.ACCOUNTS), async (_req, res, next) => {
  try {
    const data = await prisma.stockMovement.findMany({ include: { product: true, createdBy: { select: { name: true } } }, orderBy: { createdAt: 'desc' }, take: 100 });
    res.json({ success: true, data });
  } catch (e) { next(e); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const p = await prisma.product.findUnique({ where: { id: Number(req.params.id) } });
    if (!p) return res.status(404).json({ success: false, message: 'Product not found' });
    res.json({ success: true, data: p });
  } catch (e) { next(e); }
});

router.put('/:id', allow(Role.ADMIN, Role.WAREHOUSE), async (req: AuthRequest, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ success: false, message: 'Invalid product ID' });
    }
    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }
    const updateData: any = {};
    if (req.body.name !== undefined) updateData.name = req.body.name;
    if (req.body.sku !== undefined) updateData.sku = req.body.sku;
    if (req.body.unit !== undefined) updateData.category = req.body.unit;
    else if (req.body.category !== undefined) updateData.category = req.body.category;
    if (req.body.unitPrice !== undefined) updateData.unitPrice = Number(req.body.unitPrice);
    let adjustedStock: number | undefined;
    if (req.body.currentStock !== undefined) {
      adjustedStock = Number(req.body.currentStock);
      if (!Number.isFinite(adjustedStock) || adjustedStock < 0) {
        return res.status(400).json({ success: false, message: 'Current stock must be a non-negative number' });
      }
      updateData.currentStock = adjustedStock;
    }
    const p = await prisma.product.update({ where: { id }, data: updateData });
    if (adjustedStock !== undefined && adjustedStock !== existing.currentStock) {
      const change = adjustedStock - existing.currentStock;
      await prisma.stockMovement.create({ data: { productId: id, quantity: Math.abs(change), type: change > 0 ? 'IN' : 'OUT', reason: req.body.stockReason ?? 'Stock adjustment', createdById: req.user!.id } });
    }
    res.json({ success: true, data: p });
  } catch (e: any) {
    if (e.code === 'P2002') {
      return res.status(400).json({ success: false, message: 'SKU must be unique' });
    }
    if (e.code === 'P2025') {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }
    next(e);
  }
});

router.delete('/:id', allow(Role.ADMIN), async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ success: false, message: 'Invalid product ID' });
    }
    const p = await prisma.product.delete({ where: { id } });
    res.json({ success: true, data: p });
  } catch (e: any) {
    if (e.code === 'P2025') {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }
    next(e);
  }
});

export default router;
