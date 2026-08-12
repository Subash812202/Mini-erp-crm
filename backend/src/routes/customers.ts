import { Router } from 'express';
import { prisma } from '../config/prisma';
import { auth, allow } from '../middleware/auth';
import { Role } from '@prisma/client';

const router = Router();
router.use(auth);

router.get('/', async (req, res, next) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 10));
    const search = String(req.query.search || '');
    const where = search ? { OR: [
      { name: { contains: search, mode: 'insensitive' as const } },
      { mobile: { contains: search } },
      { email: { contains: search, mode: 'insensitive' as const } },
      { businessName: { contains: search, mode: 'insensitive' as const } },
      { gstNumber: { contains: search, mode: 'insensitive' as const } },
      { address: { contains: search, mode: 'insensitive' as const } }
    ] } : {};
    const [data, total] = await Promise.all([
      prisma.customer.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit }),
      prisma.customer.count({ where })
    ]);
    res.json({ success: true, data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (e) { next(e); }
});

router.post('/', allow(Role.ADMIN, Role.SALES), async (req: any, res, next) => {
  try {
    const customerData = { ...req.body };
    if (customerData.followUpDate !== undefined) {
      customerData.followUpDate = customerData.followUpDate ? new Date(customerData.followUpDate) : null;
    }
    const customer = await prisma.customer.create({ data: customerData });
    res.status(201).json({ success: true, data: customer });
  } catch (e) { next(e); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const customer = await prisma.customer.findUnique({ where: { id: Number(req.params.id) }, include: { followUps: { orderBy: { createdAt: 'desc' } } } });
    if (!customer) return res.status(404).json({ success: false, message: 'Customer not found' });
    res.json({ success: true, data: customer });
  } catch (e) { next(e); }
});

router.put('/:id', allow(Role.ADMIN, Role.SALES), async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ success: false, message: 'Invalid customer ID' });
    }
    const customerData = { ...req.body };
    if (customerData.followUpDate !== undefined) {
      customerData.followUpDate = customerData.followUpDate ? new Date(customerData.followUpDate) : null;
    }
    const customer = await prisma.customer.update({ where: { id }, data: customerData });
    res.json({ success: true, data: customer });
  } catch (e) { next(e); }
});

router.delete('/:id', allow(Role.ADMIN), async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ success: false, message: 'Invalid customer ID' });
    }
    const customer = await prisma.customer.delete({ where: { id } });
    res.json({ success: true, data: customer });
  } catch (e: any) {
    if (e.code === 'P2025') {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }
    next(e);
  }
});

router.post('/:id/followups', allow(Role.ADMIN, Role.SALES), async (req: any, res, next) => {
  try {
    const followUp = await prisma.followUpNote.create({ data: { customerId: Number(req.params.id), createdById: req.user.id, note: req.body.note } });
    res.status(201).json({ success: true, data: followUp });
  } catch (e) { next(e); }
});

export default router;
