"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = require("../config/prisma");
const auth_1 = require("../middleware/auth");
const client_1 = require("@prisma/client");
const router = (0, express_1.Router)();
router.use(auth_1.auth);
router.get('/', async (req, res, next) => {
    try {
        const page = Math.max(1, Number(req.query.page) || 1);
        const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 10));
        const search = String(req.query.search || '');
        const where = search ? { OR: [
                { name: { contains: search, mode: 'insensitive' } },
                { mobile: { contains: search } },
                { email: { contains: search, mode: 'insensitive' } },
                { businessName: { contains: search, mode: 'insensitive' } },
                { gstNumber: { contains: search, mode: 'insensitive' } },
                { address: { contains: search, mode: 'insensitive' } }
            ] } : {};
        const [data, total] = await Promise.all([
            prisma_1.prisma.customer.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit }),
            prisma_1.prisma.customer.count({ where })
        ]);
        res.json({ success: true, data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
    }
    catch (e) {
        next(e);
    }
});
router.post('/', (0, auth_1.allow)(client_1.Role.ADMIN, client_1.Role.SALES), async (req, res, next) => {
    try {
        const customerData = { ...req.body };
        if (customerData.followUpDate !== undefined) {
            customerData.followUpDate = customerData.followUpDate ? new Date(customerData.followUpDate) : null;
        }
        const customer = await prisma_1.prisma.customer.create({ data: customerData });
        res.status(201).json({ success: true, data: customer });
    }
    catch (e) {
        next(e);
    }
});
router.get('/:id', async (req, res, next) => {
    try {
        const customer = await prisma_1.prisma.customer.findUnique({ where: { id: Number(req.params.id) }, include: { followUps: { orderBy: { createdAt: 'desc' } } } });
        if (!customer)
            return res.status(404).json({ success: false, message: 'Customer not found' });
        res.json({ success: true, data: customer });
    }
    catch (e) {
        next(e);
    }
});
router.put('/:id', (0, auth_1.allow)(client_1.Role.ADMIN, client_1.Role.SALES), async (req, res, next) => {
    try {
        const id = Number(req.params.id);
        if (!Number.isFinite(id)) {
            return res.status(400).json({ success: false, message: 'Invalid customer ID' });
        }
        const customerData = { ...req.body };
        if (customerData.followUpDate !== undefined) {
            customerData.followUpDate = customerData.followUpDate ? new Date(customerData.followUpDate) : null;
        }
        const customer = await prisma_1.prisma.customer.update({ where: { id }, data: customerData });
        res.json({ success: true, data: customer });
    }
    catch (e) {
        next(e);
    }
});
router.delete('/:id', (0, auth_1.allow)(client_1.Role.ADMIN), async (req, res, next) => {
    try {
        const id = Number(req.params.id);
        if (!Number.isFinite(id)) {
            return res.status(400).json({ success: false, message: 'Invalid customer ID' });
        }
        const customer = await prisma_1.prisma.customer.delete({ where: { id } });
        res.json({ success: true, data: customer });
    }
    catch (e) {
        if (e.code === 'P2025') {
            return res.status(404).json({ success: false, message: 'Customer not found' });
        }
        next(e);
    }
});
router.post('/:id/followups', (0, auth_1.allow)(client_1.Role.ADMIN, client_1.Role.SALES), async (req, res, next) => {
    try {
        const followUp = await prisma_1.prisma.followUpNote.create({ data: { customerId: Number(req.params.id), createdById: req.user.id, note: req.body.note } });
        res.status(201).json({ success: true, data: followUp });
    }
    catch (e) {
        next(e);
    }
});
exports.default = router;
