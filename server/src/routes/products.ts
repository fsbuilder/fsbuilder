import { Router, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
import { AuthRequest, ApiResponse } from '../types';
import { authenticate } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { Product, ProductionSchedule } from '@prisma/client';

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

// List products with production schedules
router.get(
  '/',
  async (req: AuthRequest, res: Response<ApiResponse<(Product & { productionSchedule: ProductionSchedule[] })[]>>, next: NextFunction) => {
    try {
      const products = await req.prisma.product.findMany({
        where: { projectId: req.params.projectId },
        include: {
          productionSchedule: {
            orderBy: { year: 'asc' },
          },
        },
        orderBy: { createdAt: 'asc' },
      });

      res.json({
        success: true,
        data: products,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Create product
router.post(
  '/',
  [
    body('name').trim().notEmpty().withMessage('Product name is required'),
    body('unit').trim().notEmpty().withMessage('Unit is required'),
    body('unitPrice').isFloat({ min: 0 }).withMessage('Unit price must be a positive number'),
    body('priceEscalation').optional().isFloat({ min: 0 }).toFloat(),
    body('installedCapacity').isFloat({ min: 0 }).withMessage('Installed capacity must be a positive number'),
    body('capacityUnit').trim().notEmpty().withMessage('Capacity unit is required'),
  ],
  validate,
  async (req: AuthRequest, res: Response<ApiResponse<Product>>, next: NextFunction) => {
    try {
      const product = await req.prisma.product.create({
        data: {
          projectId: req.params.projectId,
          name: req.body.name,
          unit: req.body.unit,
          unitPrice: req.body.unitPrice,
          priceEscalation: req.body.priceEscalation ?? 0,
          installedCapacity: req.body.installedCapacity,
          capacityUnit: req.body.capacityUnit,
        },
      });

      res.status(201).json({
        success: true,
        data: product,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Update product
router.put(
  '/:id',
  [
    body('name').optional().trim(),
    body('unit').optional().trim(),
    body('unitPrice').optional().isFloat({ min: 0 }),
    body('priceEscalation').optional().isFloat({ min: 0 }).toFloat(),
    body('installedCapacity').optional().isFloat({ min: 0 }),
    body('capacityUnit').optional().trim(),
  ],
  validate,
  async (req: AuthRequest, res: Response<ApiResponse<Product>>, next: NextFunction) => {
    try {
      const existing = await req.prisma.product.findFirst({
        where: {
          id: req.params.id,
          projectId: req.params.projectId,
        },
      });

      if (!existing) {
        throw new AppError('Product not found', 404);
      }

      const updateData: any = {};
      const fields = ['name', 'unit', 'unitPrice', 'priceEscalation', 'installedCapacity', 'capacityUnit'];

      fields.forEach(field => {
        if (req.body[field] !== undefined) {
          updateData[field] = req.body[field];
        }
      });

      const product = await req.prisma.product.update({
        where: { id: req.params.id },
        data: updateData,
      });

      res.json({
        success: true,
        data: product,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Delete product
router.delete(
  '/:id',
  async (req: AuthRequest, res: Response<ApiResponse>, next: NextFunction) => {
    try {
      const existing = await req.prisma.product.findFirst({
        where: {
          id: req.params.id,
          projectId: req.params.projectId,
        },
      });

      if (!existing) {
        throw new AppError('Product not found', 404);
      }

      await req.prisma.product.delete({
        where: { id: req.params.id },
      });

      res.json({
        success: true,
        message: 'Product deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }
);

// Update production schedule for a product
router.put(
  '/:id/schedule',
  [
    body('schedule').isArray().withMessage('Schedule must be an array'),
    body('schedule.*.year').isInt({ min: 1 }).withMessage('Year must be a positive integer'),
    body('schedule.*.capacityUtilization').isFloat({ min: 0, max: 100 }).withMessage('Capacity utilization must be between 0 and 100'),
    body('schedule.*.quantity').isFloat({ min: 0 }).withMessage('Quantity must be a positive number'),
  ],
  validate,
  async (req: AuthRequest, res: Response<ApiResponse<ProductionSchedule[]>>, next: NextFunction) => {
    try {
      const existing = await req.prisma.product.findFirst({
        where: {
          id: req.params.id,
          projectId: req.params.projectId,
        },
      });

      if (!existing) {
        throw new AppError('Product not found', 404);
      }

      // Delete existing schedules
      await req.prisma.productionSchedule.deleteMany({
        where: { productId: req.params.id },
      });

      // Create new schedules
      const schedules = await Promise.all(
        req.body.schedule.map((s: any) =>
          req.prisma.productionSchedule.create({
            data: {
              productId: req.params.id,
              year: s.year,
              capacityUtilization: s.capacityUtilization,
              quantity: s.quantity,
            },
          })
        )
      );

      res.json({
        success: true,
        data: schedules,
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
