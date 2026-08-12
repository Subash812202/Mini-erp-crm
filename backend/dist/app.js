"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const auth_1 = __importDefault(require("./routes/auth"));
const customers_1 = __importDefault(require("./routes/customers"));
const products_1 = __importDefault(require("./routes/products"));
const challans_1 = __importDefault(require("./routes/challans"));
const dashboard_1 = __importDefault(require("./routes/dashboard"));
const error_1 = require("./middleware/error");
const app = (0, express_1.default)();
// Parse FRONTEND_URL safely (handles quoted values and comma-separated lists)
const rawFrontend = process.env.FRONTEND_URL;
const allowedOrigins = rawFrontend
    ? rawFrontend.split(',').map(s => s.trim().replace(/^"|"$/g, ''))
    : true;
app.use((0, cors_1.default)({ origin: allowedOrigins }));
app.use(express_1.default.json());
app.get('/api/health', (_req, res) => res.json({ success: true, message: 'API healthy' }));
app.use('/api/auth', auth_1.default);
app.use('/api/customers', customers_1.default);
app.use('/api/products', products_1.default);
app.use('/api/challans', challans_1.default);
app.use('/api/dashboard', dashboard_1.default);
app.use(error_1.errorHandler);
exports.default = app;
