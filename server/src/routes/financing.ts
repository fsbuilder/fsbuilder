import { Router, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
import { AuthRequest, ApiResponse, AmortizationSchedule } from '../types';
import { authenticate } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { Financing } from '@prisma/client';
import { calculateAmortizationSchedule } from '../services/calculations/financing';

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

// List financing
router.get(
  '/',
  async (req: AuthRequest, res: Response<ApiResponse<Financing[]>>, next: NextFunction) => {
    try {
      const financing = await req.prisma.financing.findMany({
        where: { projectId: req.params.projectId },
        orderBy: [{ type: 'asc' }, { createdAt: 'asc' }],
      });

      res.json({
        success: true,
        data: financing,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Create financing
router.post(
  '/',
  [
    body('type').isIn(['equity', 'loan', 'grant']).withMessage('Invalid financing type'),
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('amount').isFloat({ min: 0 }).withMessage('Amount must be a positive number'),
    body('interestRate').optional().isFloat({ min: 0, max: 100 }).toFloat(),
    body('termYears').optional().isInt({ min: 0 }).toInt(),
    body('gracePeriod').optional().isInt({ min: 0 }).toInt(),
    body('disbursementYear').optional().isInt({ min: 0 }).toInt(),
    body('repaymentStartYear').optional().isInt({ min: 1 }).toInt(),
  ],
  validate,
  async (req: AuthRequest, res: Response<ApiResponse<Financing>>, next: NextFunction) => {
    try {
      const financing = await req.prisma.financing.create({
        data: {
          projectId: req.params.projectId,
          type: req.body.type,
          name: req.body.name,
          amount: req.body.amount,
          interestRate: req.body.interestRate ?? 0,
          termYears: req.body.termYears ?? 0,
          gracePeriod: req.body.gracePeriod ?? 0,
          disbursementYear: req.body.disbursementYear ?? 0,
          repaymentStartYear: req.body.repaymentStartYear ?? 1,
        },
      });

      res.status(201).json({
        success: true,
        data: financing,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Update financing
router.put(
  '/:id',
  [
    body('type').optional().isIn(['equity', 'loan', 'grant']),
    body('name').optional().trim(),
    body('amount').optional().isFloat({ min: 0 }),
    body('interestRate').optional().isFloat({ min: 0, max: 100 }).toFloat(),
    body('termYears').optional().isInt({ min: 0 }).toInt(),
    body('gracePeriod').optional().isInt({ min: 0 }).toInt(),
    body('disbursementYear').optional().isInt({ min: 0 }).toInt(),
    body('repaymentStartYear').optional().isInt({ min: 1 }).toInt(),
  ],
  validate,
  async (req: AuthRequest, res: Response<ApiResponse<Financing>>, next: NextFunction) => {
    try {
      const existing = await req.prisma.financing.findFirst({
        where: {
          id: req.params.id,
          projectId: req.params.projectId,
        },
      });

      if (!existing) {
        throw new AppError('Financing not found', 404);
      }

      const updateData: any = {};
      const fields = [
        'type', 'name', 'amount', 'interestRate', 'termYears',
        'gracePeriod', 'disbursementYear', 'repaymentStartYear'
      ];

      fields.forEach(field => {
        if (req.body[field] !== undefined) {
          updateData[field] = req.body[field];
        }
      });

      const financing = await req.prisma.financing.update({
        where: { id: req.params.id },
        data: updateData,
      });

      res.json({
        success: true,
        data: financing,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Delete financing
router.delete(
  '/:id',
  async (req: AuthRequest, res: Response<ApiResponse>, next: NextFunction) => {
    try {
      const existing = await req.prisma.financing.findFirst({
        where: {
          id: req.params.id,
          projectId: req.params.projectId,
        },
      });

      if (!existing) {
        throw new AppError('Financing not found', 404);
      }

      await req.prisma.financing.delete({
        where: { id: req.params.id },
      });

      res.json({
        success: true,
        message: 'Financing deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }
);

// Get amortization schedule for a loan
router.get(
  '/:id/amortization',
  async (req: AuthRequest, res: Response<ApiResponse<AmortizationSchedule[]>>, next: NextFunction) => {
    try {
      const financing = await req.prisma.financing.findFirst({
        where: {
          id: req.params.id,
          projectId: req.params.projectId,
        },
      });

      if (!financing) {
        throw new AppError('Financing not found', 404);
      }

      if (financing.type !== 'loan') {
        throw new AppError('Amortization schedule is only available for loans', 400);
      }

      const schedule = calculateAmortizationSchedule(
        financing.amount,
        financing.interestRate,
        financing.termYears,
        financing.gracePeriod
      );

      res.json({
        success: true,
        data: schedule,
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
