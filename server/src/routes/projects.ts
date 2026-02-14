import { Router, Response, NextFunction } from 'express';
import { body, query, validationResult } from 'express-validator';
import { AuthRequest, ApiResponse, PaginatedResponse } from '../types';
import { authenticate } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { Project } from '@prisma/client';

const router = Router();

// Validation middleware
const validate = (req: AuthRequest, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: errors.array()[0].msg,
    });
  }
  next();
};

// Apply auth to all routes
router.use(authenticate);

// List projects
router.get(
  '/',
  [
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  ],
  async (req: AuthRequest, res: Response<ApiResponse<PaginatedResponse<Project>>>, next: NextFunction) => {
    try {
      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 10;
      const skip = (page - 1) * limit;

      const [projects, total] = await Promise.all([
        req.prisma.project.findMany({
          where: { userId: req.user!.id },
          orderBy: { updatedAt: 'desc' },
          skip,
          take: limit,
        }),
        req.prisma.project.count({
          where: { userId: req.user!.id },
        }),
      ]);

      res.json({
        success: true,
        data: {
          data: projects,
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// Get single project
router.get(
  '/:id',
  async (req: AuthRequest, res: Response<ApiResponse<Project>>, next: NextFunction) => {
    try {
      const project = await req.prisma.project.findFirst({
        where: {
          id: req.params.id,
          userId: req.user!.id,
        },
      });

      if (!project) {
        throw new AppError('Project not found', 404);
      }

      res.json({
        success: true,
        data: project,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Create project
router.post(
  '/',
  [
    body('name').trim().isLength({ min: 2 }).withMessage('Name must be at least 2 characters'),
    body('sector').trim().notEmpty().withMessage('Sector is required'),
    body('location').trim().notEmpty().withMessage('Location is required'),
    body('currency').optional().trim(),
    body('startDate').isISO8601().withMessage('Valid start date is required'),
    body('constructionYears').optional().isInt({ min: 0, max: 10 }).toInt(),
    body('operationYears').optional().isInt({ min: 1, max: 50 }).toInt(),
    body('discountRate').optional().isFloat({ min: 0, max: 100 }).toFloat(),
    body('inflationRate').optional().isFloat({ min: 0, max: 100 }).toFloat(),
    body('taxRate').optional().isFloat({ min: 0, max: 100 }).toFloat(),
  ],
  validate,
  async (req: AuthRequest, res: Response<ApiResponse<Project>>, next: NextFunction) => {
    try {
      const project = await req.prisma.project.create({
        data: {
          name: req.body.name,
          description: req.body.description,
          sector: req.body.sector,
          location: req.body.location,
          currency: req.body.currency || 'USD',
          startDate: new Date(req.body.startDate),
          constructionYears: req.body.constructionYears ?? 1,
          operationYears: req.body.operationYears ?? 10,
          discountRate: req.body.discountRate ?? 10,
          inflationRate: req.body.inflationRate ?? 3,
          taxRate: req.body.taxRate ?? 25,
          status: req.body.status || 'draft',
          userId: req.user!.id,
        },
      });

      res.status(201).json({
        success: true,
        data: project,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Update project
router.put(
  '/:id',
  [
    body('name').optional().trim().isLength({ min: 2 }),
    body('sector').optional().trim(),
    body('location').optional().trim(),
    body('startDate').optional().isISO8601(),
    body('constructionYears').optional().isInt({ min: 0, max: 10 }).toInt(),
    body('operationYears').optional().isInt({ min: 1, max: 50 }).toInt(),
    body('discountRate').optional().isFloat({ min: 0, max: 100 }).toFloat(),
    body('inflationRate').optional().isFloat({ min: 0, max: 100 }).toFloat(),
    body('taxRate').optional().isFloat({ min: 0, max: 100 }).toFloat(),
  ],
  validate,
  async (req: AuthRequest, res: Response<ApiResponse<Project>>, next: NextFunction) => {
    try {
      // Check ownership
      const existing = await req.prisma.project.findFirst({
        where: {
          id: req.params.id,
          userId: req.user!.id,
        },
      });

      if (!existing) {
        throw new AppError('Project not found', 404);
      }

      const updateData: any = {};
      const fields = [
        'name', 'description', 'sector', 'location', 'currency',
        'constructionYears', 'operationYears', 'discountRate',
        'inflationRate', 'taxRate', 'status'
      ];

      fields.forEach(field => {
        if (req.body[field] !== undefined) {
          updateData[field] = req.body[field];
        }
      });

      if (req.body.startDate) {
        updateData.startDate = new Date(req.body.startDate);
      }

      const project = await req.prisma.project.update({
        where: { id: req.params.id },
        data: updateData,
      });

      res.json({
        success: true,
        data: project,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Delete project
router.delete(
  '/:id',
  async (req: AuthRequest, res: Response<ApiResponse>, next: NextFunction) => {
    try {
      // Check ownership
      const existing = await req.prisma.project.findFirst({
        where: {
          id: req.params.id,
          userId: req.user!.id,
        },
      });

      if (!existing) {
        throw new AppError('Project not found', 404);
      }

      await req.prisma.project.delete({
        where: { id: req.params.id },
      });

      res.json({
        success: true,
        message: 'Project deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }
);

// Duplicate project
router.post(
  '/:id/duplicate',
  async (req: AuthRequest, res: Response<ApiResponse<Project>>, next: NextFunction) => {
    try {
      // Get original project with all relations
      const original = await req.prisma.project.findFirst({
        where: {
          id: req.params.id,
          userId: req.user!.id,
        },
        include: {
          investments: true,
          products: {
            include: {
              productionSchedule: true,
            },
          },
          operatingCosts: true,
          financing: true,
        },
      });

      if (!original) {
        throw new AppError('Project not found', 404);
      }

      // Create duplicate
      const duplicate = await req.prisma.project.create({
        data: {
          name: `${original.name} (Copy)`,
          description: original.description,
          sector: original.sector,
          location: original.location,
          currency: original.currency,
          startDate: original.startDate,
          constructionYears: original.constructionYears,
          operationYears: original.operationYears,
          discountRate: original.discountRate,
          inflationRate: original.inflationRate,
          taxRate: original.taxRate,
          status: 'draft',
          userId: req.user!.id,
          investments: {
            create: original.investments.map(inv => ({
              category: inv.category,
              description: inv.description,
              amount: inv.amount,
              year: inv.year,
              usefulLife: inv.usefulLife,
              salvageValue: inv.salvageValue,
              depreciationMethod: inv.depreciationMethod,
              depreciationRate: inv.depreciationRate,
            })),
          },
          operatingCosts: {
            create: original.operatingCosts.map(cost => ({
              category: cost.category,
              description: cost.description,
              costType: cost.costType,
              amount: cost.amount,
              unitCost: cost.unitCost,
              escalationRate: cost.escalationRate,
              startYear: cost.startYear,
            })),
          },
          financing: {
            create: original.financing.map(fin => ({
              type: fin.type,
              name: fin.name,
              amount: fin.amount,
              interestRate: fin.interestRate,
              termYears: fin.termYears,
              gracePeriod: fin.gracePeriod,
              disbursementYear: fin.disbursementYear,
              repaymentStartYear: fin.repaymentStartYear,
            })),
          },
        },
      });

      // Duplicate products with schedules separately
      for (const product of original.products) {
        await req.prisma.product.create({
          data: {
            projectId: duplicate.id,
            name: product.name,
            unit: product.unit,
            unitPrice: product.unitPrice,
            priceEscalation: product.priceEscalation,
            installedCapacity: product.installedCapacity,
            capacityUnit: product.capacityUnit,
            productionSchedule: {
              create: product.productionSchedule.map(schedule => ({
                year: schedule.year,
                capacityUtilization: schedule.capacityUtilization,
                quantity: schedule.quantity,
              })),
            },
          },
        });
      }

      res.status(201).json({
        success: true,
        data: duplicate,
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
