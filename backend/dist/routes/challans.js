"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = require("../config/prisma");
const auth_1 = require("../middleware/auth");
const client_1 = require("@prisma/client");
const router = (0, express_1.Router)();
router.use(auth_1.auth);
router.get('/', async (_req, res, next) => {
    try {
        const data = await prisma_1.prisma.challan.findMany({ include: { customer: true, items: true }, orderBy: { createdAt: 'desc' } });
        res.json({ success: true, data });
    }
    catch (e) {
        next(e);
    }
});
router.get('/:id', async (req, res, next) => {
    try {
        const data = await prisma_1.prisma.challan.findUnique({ where: { id: Number(req.params.id) }, include: { customer: true, items: true, createdBy: { select: { name: true } } } });
        if (!data)
            return res.status(404).json({ success: false, message: 'Challan not found' });
        res.json({ success: true, data });
    }
    catch (e) {
        next(e);
    }
});
router.post('/', (0, auth_1.allow)(client_1.Role.ADMIN, client_1.Role.SALES), async (req, res, next) => {
    try {
        const customerId = Number(req.body.customerId);
        const items = Array.isArray(req.body.items) ? req.body.items : [];
        if (!customerId || items.length === 0) {
            return res.status(400).json({ success: false, message: 'Customer and products are required' });
        }
        const customer = await prisma_1.prisma.customer.findUnique({ where: { id: customerId } });
        if (!customer) {
            return res.status(400).json({ success: false, message: 'Customer not found' });
        }
        const parsedItems = items.map((x) => ({ productId: Number(x.productId), quantity: Number(x.quantity) }));
        if (parsedItems.some(item => !item.productId || item.quantity <= 0)) {
            return res.status(400).json({ success: false, message: 'Each product requires a valid ID and quantity greater than zero' });
        }
        const productIds = Array.from(new Set(parsedItems.map(item => item.productId)));
        const products = await prisma_1.prisma.product.findMany({ where: { id: { in: productIds } } });
        if (products.length !== productIds.length) {
            return res.status(400).json({ success: false, message: 'One or more products not found' });
        }
        const enriched = parsedItems.map(item => {
            const p = products.find(y => y.id === item.productId);
            return {
                productId: p.id,
                productName: p.name,
                sku: p.sku,
                unitPrice: p.unitPrice,
                quantity: item.quantity,
                total: Number(p.unitPrice) * item.quantity
            };
        });
        const totalQty = enriched.reduce((a, x) => a + x.quantity, 0);
        const totalAmount = enriched.reduce((a, x) => a + x.total, 0);
        const number = `CH-${Date.now()}`;
        const challan = await prisma_1.prisma.challan.create({
            data: {
                number,
                customerId,
                createdById: req.user.id,
                totalQty,
                totalAmount,
                items: { create: enriched }
            },
            include: { items: true }
        });
        res.status(201).json({ success: true, data: challan });
    }
    catch (e) {
        next(e);
    }
});
router.post('/:id/confirm', (0, auth_1.allow)(client_1.Role.ADMIN, client_1.Role.SALES), async (req, res, next) => {
    try {
        const id = Number(req.params.id);
        const result = await prisma_1.prisma.$transaction(async (tx) => {
            const challan = await tx.challan.findUnique({ where: { id }, include: { items: true } });
            if (!challan)
                throw Object.assign(new Error('Challan not found'), { status: 404 });
            if (challan.status !== 'DRAFT')
                throw Object.assign(new Error('Only draft challans can be confirmed'), { status: 400 });
            for (const item of challan.items) {
                const p = await tx.product.findUnique({ where: { id: item.productId } });
                if (!p || p.currentStock < item.quantity) {
                    throw Object.assign(new Error(`Insufficient stock for ${item.productName}. Available: ${p?.currentStock ?? 0}, Requested: ${item.quantity}`), { status: 400 });
                }
            }
            for (const item of challan.items) {
                await tx.product.update({ where: { id: item.productId }, data: { currentStock: { decrement: item.quantity } } });
                await tx.stockMovement.create({ data: { productId: item.productId, quantity: item.quantity, type: 'OUT', reason: `Sales challan ${challan.number}`, createdById: req.user.id } });
            }
            return tx.challan.update({ where: { id }, data: { status: 'CONFIRMED' }, include: { items: true, customer: true } });
        });
        res.json({ success: true, data: result });
    }
    catch (e) {
        next(e);
    }
});
router.post('/:id/cancel', (0, auth_1.allow)(client_1.Role.ADMIN, client_1.Role.SALES), async (req, res, next) => {
    try {
        const id = Number(req.params.id);
        const result = await prisma_1.prisma.$transaction(async (tx) => {
            const challan = await tx.challan.findUnique({ where: { id }, include: { items: true } });
            if (!challan)
                throw Object.assign(new Error('Challan not found'), { status: 404 });
            if (challan.status === 'CANCELLED')
                throw Object.assign(new Error('Challan already cancelled'), { status: 400 });
            if (challan.status === 'CONFIRMED') {
                for (const item of challan.items) {
                    await tx.product.update({ where: { id: item.productId }, data: { currentStock: { increment: item.quantity } } });
                    await tx.stockMovement.create({ data: { productId: item.productId, quantity: item.quantity, type: 'IN', reason: `Cancelled challan ${challan.number}`, createdById: req.user.id } });
                }
            }
            return tx.challan.update({ where: { id }, data: { status: 'CANCELLED' }, include: { items: true } });
        });
        res.json({ success: true, data: result });
    }
    catch (e) {
        next(e);
    }
});
router.delete('/:id', (0, auth_1.allow)(client_1.Role.ADMIN), async (req, res, next) => {
    try {
        const id = Number(req.params.id);
        if (!Number.isFinite(id)) {
            return res.status(400).json({ success: false, message: 'Invalid challan ID' });
        }
        const challan = await prisma_1.prisma.challan.findUnique({ where: { id } });
        if (!challan) {
            return res.status(404).json({ success: false, message: 'Challan not found' });
        }
        if (challan.status === 'CONFIRMED') {
            return res.status(400).json({ success: false, message: 'Confirmed challans must be cancelled before deletion' });
        }
        await prisma_1.prisma.challan.delete({ where: { id } });
        res.json({ success: true, data: challan });
    }
    catch (e) {
        next(e);
    }
});
exports.default = router;
