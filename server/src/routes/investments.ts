import { Router, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
import { AuthRequest, ApiResponse } from '../types';
import { authenticate } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { Investment } from '@prisma/client';

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

// List investments
router.get(
  '/',
  async (req: AuthRequest, res: Response<ApiResponse<Investment[]>>, next: NextFunction) => {
    try {
      const investments = await req.prisma.investment.findMany({
        where: { projectId: req.params.projectId },
        orderBy: [{ year: 'asc' }, { category: 'asc' }],
      });

      res.json({
        success: true,
        data: investments,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Create investment
router.post(
  '/',
  [
    body('category').isIn([
      'land', 'buildings', 'machinery', 'equipment', 'vehicles',
      'furniture', 'preproduction', 'working_capital', 'other'
    ]).withMessage('Invalid category'),
    body('description').trim().notEmpty().withMessage('Description is required'),
    body('amount').isFloat({ min: 0 }).withMessage('Amount must be a positive number'),
    body('year').isInt({ min: 0 }).withMessage('Year must be a non-negative integer'),
    body('usefulLife').optional().isInt({ min: 1 }).toInt(),
    body('salvageValue').optional().isFloat({ min: 0 }).toFloat(),
    body('depreciationMethod').optional().isIn(['straight_line', 'declining_balance', 'none']),
    body('depreciationRate').optional().isFloat({ min: 0, max: 100 }).toFloat(),
  ],
  validate,
  async (req: AuthRequest, res: Response<ApiResponse<Investment>>, next: NextFunction) => {
    try {
      const investment = await req.prisma.investment.create({
        data: {
          projectId: req.params.projectId,
          category: req.body.category,
          description: req.body.description,
          amount: req.body.amount,
          year: req.body.year,
          usefulLife: req.body.usefulLife ?? 10,
          salvageValue: req.body.salvageValue ?? 0,
          depreciationMethod: req.body.depreciationMethod ?? 'straight_line',
          depreciationRate: req.body.depreciationRate ?? 10,
        },
      });

      res.status(201).json({
        success: true,
        data: investment,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Update investment
router.put(
  '/:id',
  [
    body('category').optional().isIn([
      'land', 'buildings', 'machinery', 'equipment', 'vehicles',
      'furniture', 'preproduction', 'working_capital', 'other'
    ]),
    body('description').optional().trim(),
    body('amount').optional().isFloat({ min: 0 }),
    body('year').optional().isInt({ min: 0 }),
    body('usefulLife').optional().isInt({ min: 1 }).toInt(),
    body('salvageValue').optional().isFloat({ min: 0 }).toFloat(),
    body('depreciationMethod').optional().isIn(['straight_line', 'declining_balance', 'none']),
    body('depreciationRate').optional().isFloat({ min: 0, max: 100 }).toFloat(),
  ],
  validate,
  async (req: AuthRequest, res: Response<ApiResponse<Investment>>, next: NextFunction) => {
    try {
      const existing = await req.prisma.investment.findFirst({
        where: {
          id: req.params.id,
          projectId: req.params.projectId,
        },
      });

      if (!existing) {
        throw new AppError('Investment not found', 404);
      }

      const updateData: any = {};
      const fields = [
        'category', 'description', 'amount', 'year', 'usefulLife',
        'salvageValue', 'depreciationMethod', 'depreciationRate'
      ];

      fields.forEach(field => {
        if (req.body[field] !== undefined) {
          updateData[field] = req.body[field];
        }
      });

      const investment = await req.prisma.investment.update({
        where: { id: req.params.id },
        data: updateData,
      });

      res.json({
        success: true,
        data: investment,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Delete investment
router.delete(
  '/:id',
  async (req: AuthRequest, res: Response<ApiResponse>, next: NextFunction) => {
    try {
      const existing = await req.prisma.investment.findFirst({
        where: {
          id: req.params.id,
          projectId: req.params.projectId,
        },
      });

      if (!existing) {
        throw new AppError('Investment not found', 404);
      }

      await req.prisma.investment.delete({
        where: { id: req.params.id },
      });

      res.json({
        success: true,
        message: 'Investment deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
