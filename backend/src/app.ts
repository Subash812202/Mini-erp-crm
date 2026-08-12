import express from 'express';
import cors from 'cors';
import authRouter from './routes/auth';
import customerRouter from './routes/customers';
import productRouter from './routes/products';
import challanRouter from './routes/challans';
import dashboardRouter from './routes/dashboard';
import { errorHandler } from './middleware/error';

const app = express();
// Parse FRONTEND_URL safely (handles quoted values and comma-separated lists)
const rawFrontend = process.env.FRONTEND_URL;
const allowedOrigins: string[] | true = rawFrontend
	? rawFrontend.split(',').map(s => s.trim().replace(/^"|"$/g, ''))
	: true;
app.use(cors({ origin: allowedOrigins }));
app.use(express.json());

app.get('/api/health', (_req, res) => res.json({ success: true, message: 'API healthy' }));
app.use('/api/auth', authRouter);
app.use('/api/customers', customerRouter);
app.use('/api/products', productRouter);
app.use('/api/challans', challanRouter);
app.use('/api/dashboard', dashboardRouter);

app.use(errorHandler);
export default app;
