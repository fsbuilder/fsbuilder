import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';

import authRoutes from './routes/auth';
import projectRoutes from './routes/projects';
import investmentRoutes from './routes/investments';
import productRoutes from './routes/products';
import costRoutes from './routes/costs';
import financingRoutes from './routes/financing';
import analysisRoutes from './routes/analysis';
import scenarioRoutes from './routes/scenarios';
import reportRoutes from './routes/reports';
import { errorHandler } from './middleware/errorHandler';

dotenv.config({ path: '../.env' });

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(cors());
app.use(express.json());

// Make prisma available in request
app.use((req, res, next) => {
  (req as any).prisma = prisma;
  next();
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/projects/:projectId/investments', investmentRoutes);
app.use('/api/projects/:projectId/products', productRoutes);
app.use('/api/projects/:projectId/costs', costRoutes);
app.use('/api/projects/:projectId/financing', financingRoutes);
app.use('/api/projects/:projectId/analysis', analysisRoutes);
app.use('/api/projects/:projectId/scenarios', scenarioRoutes);
app.use('/api/projects/:projectId/reports', reportRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handler
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

export { prisma };
