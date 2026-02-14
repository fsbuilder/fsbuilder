import { Router, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
import { AuthRequest, ApiResponse } from '../types';
import { authenticate } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { OperatingCost } from '@prisma/client';

const router = Router({ mergeParams: true });

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

// Check project ownership middleware
const checkProjectAccess = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const project = await req.prisma.project.findFirst({
      where: {
        id: req.params.projectId,
        userId: req.user!.id,
      },
    });

    if (!project) {
      throw new AppError('Project not found', 404);
    }

    next();
  } catch (error) {
    next(error);
  }
};

router.use(authenticate, checkProjectAccess);

// List operating costs
router.get(
  '/',
  async (req: AuthRequest, res: Response<ApiResponse<OperatingCost[]>>, next: NextFunction) => {
    try {
      const costs = await req.prisma.operatingCost.findMany({
        where: { projectId: req.params.projectId },
        orderBy: [{ category: 'asc' }, { createdAt: 'asc' }],
      });

      res.json({
        success: true,
        data: costs,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Create operating cost
router.post(
  '/',
  [
    body('category').isIn([
      'raw_materials', 'utilities', 'labor_direct', 'labor_indirect',
      'maintenance', 'administrative', 'marketing', 'insurance', 'other'
    ]).withMessage('Invalid category'),
    body('description').trim().notEmpty().withMessage('Description is required'),
    body('costType').isIn(['fixed', 'variable']).withMessage('Cost type must be fixed or variable'),
    body('amount').isFloat({ min: 0 }).withMessage('Amount must be a positive number'),
    body('unitCost').optional().isFloat({ min: 0 }).toFloat(),
    body('escalationRate').optional().isFloat({ min: 0 }).toFloat(),
    body('startYear').optional().isInt({ min: 1 }).toInt(),
  ],
  validate,
  async (req: AuthRequest, res: Response<ApiResponse<OperatingCost>>, next: NextFunction) => {
    try {
      const cost = await req.prisma.operatingCost.create({
        data: {
          projectId: req.params.projectId,
          category: req.body.category,
          description: req.body.description,
          costType: req.body.costType,
          amount: req.body.amount,
          unitCost: req.body.unitCost ?? 0,
          escalationRate: req.body.escalationRate ?? 0,
          startYear: req.body.startYear ?? 1,
        },
      });

      res.status(201).json({
        success: true,
        data: cost,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Update operating cost
router.put(
  '/:id',
  [
    body('category').optional().isIn([
      'raw_materials', 'utilities', 'labor_direct', 'labor_indirect',
      'maintenance', 'administrative', 'marketing', 'insurance', 'other'
    ]),
    body('description').optional().trim(),
    body('costType').optional().isIn(['fixed', 'variable']),
    body('amount').optional().isFloat({ min: 0 }),
    body('unitCost').optional().isFloat({ min: 0 }).toFloat(),
    body('escalationRate').optional().isFloat({ min: 0 }).toFloat(),
    body('startYear').optional().isInt({ min: 1 }).toInt(),
  ],
  validate,
  async (req: AuthRequest, res: Response<ApiResponse<OperatingCost>>, next: NextFunction) => {
    try {
      const existing = await req.prisma.operatingCost.findFirst({
        where: {
          id: req.params.id,
          projectId: req.params.projectId,
        },
      });

      if (!existing) {
        throw new AppError('Operating cost not found', 404);
      }

      const updateData: any = {};
      const fields = ['category', 'description', 'costType', 'amount', 'unitCost', 'escalationRate', 'startYear'];

      fields.forEach(field => {
        if (req.body[field] !== undefined) {
          updateData[field] = req.body[field];
        }
      });

      const cost = await req.prisma.operatingCost.update({
        where: { id: req.params.id },
        data: updateData,
      });

      res.json({
        success: true,
        data: cost,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Delete operating cost
router.delete(
  '/:id',
  async (req: AuthRequest, res: Response<ApiResponse>, next: NextFunction) => {
    try {
      const existing = await req.prisma.operatingCost.findFirst({
        where: {
          id: req.params.id,
          projectId: req.params.projectId,
        },
      });

      if (!existing) {
        throw new AppError('Operating cost not found', 404);
      }

      await req.prisma.operatingCost.delete({
        where: { id: req.params.id },
      });

      res.json({
        success: true,
        message: 'Operating cost deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
