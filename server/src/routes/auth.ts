import { Router, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { body, validationResult } from 'express-validator';
import { AuthRequest, ApiResponse } from '../types';
import { authenticate, generateToken } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

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

// Register
router.post(
  '/register',
  [
    body('name').trim().isLength({ min: 2 }).withMessage('Name must be at least 2 characters'),
    body('email').isEmail().normalizeEmail().withMessage('Invalid email address'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  ],
  validate,
  async (req: AuthRequest, res: Response<ApiResponse>, next: NextFunction) => {
    try {
      const { name, email, password } = req.body;

      // Check if user exists
      const existingUser = await req.prisma.user.findUnique({
        where: { email },
      });

      if (existingUser) {
        throw new AppError('Email already registered', 400);
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 12);

      // Create user
      const user = await req.prisma.user.create({
        data: {
          name,
          email,
          password: hashedPassword,
        },
        select: {
          id: true,
          name: true,
          email: true,
          createdAt: true,
        },
      });

      // Generate token
      const token = generateToken(user.id, user.email);

      res.status(201).json({
        success: true,
        data: {
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            createdAt: user.createdAt.toISOString(),
          },
          token,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// Login
router.post(
  '/login',
  [
    body('email').isEmail().normalizeEmail().withMessage('Invalid email address'),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  validate,
  async (req: AuthRequest, res: Response<ApiResponse>, next: NextFunction) => {
    try {
      const { email, password } = req.body;

      // Find user
      const user = await req.prisma.user.findUnique({
        where: { email },
      });

      if (!user) {
        throw new AppError('Invalid email or password', 401);
      }

      // Check password
      const isValid = await bcrypt.compare(password, user.password);

      if (!isValid) {
        throw new AppError('Invalid email or password', 401);
      }

      // Generate token
      const token = generateToken(user.id, user.email);

      res.json({
        success: true,
        data: {
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            createdAt: user.createdAt.toISOString(),
          },
          token,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// Get current user
router.get(
  '/me',
  authenticate,
  async (req: AuthRequest, res: Response<ApiResponse>) => {
    res.json({
      success: true,
      data: {
        id: req.user!.id,
        name: req.user!.name,
        email: req.user!.email,
        createdAt: req.user!.createdAt.toISOString(),
      },
    });
  }
);

export default router;
