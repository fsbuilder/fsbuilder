import { Router, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
import { AuthRequest, ApiResponse } from '../types';
import { authenticate } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { Scenario, ScenarioAssumption } from '@prisma/client';
import { generateCashFlows, calculateAllIndicators, generateIncomeStatements } from '../services/calculations';

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

    (req as any).projectData = project;
    next();
  } catch (error) {
    next(error);
  }
};

router.use(authenticate, checkProjectAccess);

// List scenarios
router.get(
  '/',
  async (req: AuthRequest, res: Response<ApiResponse<(Scenario & { assumptions: ScenarioAssumption[] })[]>>, next: NextFunction) => {
    try {
      const scenarios = await req.prisma.scenario.findMany({
        where: { projectId: req.params.projectId },
        include: {
          assumptions: true,
          results: true,
        },
        orderBy: { createdAt: 'asc' },
      });

      res.json({
        success: true,
        data: scenarios,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Create scenario
router.post(
  '/',
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('description').optional().trim(),
    body('type').isIn(['best', 'base', 'worst', 'custom']).withMessage('Invalid scenario type'),
    body('assumptions').optional().isArray(),
    body('assumptions.*.variable').optional().isString(),
    body('assumptions.*.adjustment').optional().isFloat(),
  ],
  validate,
  async (req: AuthRequest, res: Response<ApiResponse<Scenario>>, next: NextFunction) => {
    try {
      const scenario = await req.prisma.scenario.create({
        data: {
          projectId: req.params.projectId,
          name: req.body.name,
          description: req.body.description,
          type: req.body.type,
          assumptions: req.body.assumptions ? {
            create: req.body.assumptions.map((a: any) => ({
              variable: a.variable,
              adjustment: a.adjustment,
            })),
          } : undefined,
        },
        include: {
          assumptions: true,
        },
      });

      res.status(201).json({
        success: true,
        data: scenario,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Update scenario
router.put(
  '/:id',
  [
    body('name').optional().trim(),
    body('description').optional().trim(),
    body('type').optional().isIn(['best', 'base', 'worst', 'custom']),
    body('assumptions').optional().isArray(),
  ],
  validate,
  async (req: AuthRequest, res: Response<ApiResponse<Scenario>>, next: NextFunction) => {
    try {
      const existing = await req.prisma.scenario.findFirst({
        where: {
          id: req.params.id,
          projectId: req.params.projectId,
        },
      });

      if (!existing) {
        throw new AppError('Scenario not found', 404);
      }

      // Update assumptions if provided
      if (req.body.assumptions) {
        await req.prisma.scenarioAssumption.deleteMany({
          where: { scenarioId: req.params.id },
        });

        await req.prisma.scenarioAssumption.createMany({
          data: req.body.assumptions.map((a: any) => ({
            scenarioId: req.params.id,
            variable: a.variable,
            adjustment: a.adjustment,
          })),
        });
      }

      const updateData: any = {};
      if (req.body.name !== undefined) updateData.name = req.body.name;
      if (req.body.description !== undefined) updateData.description = req.body.description;
      if (req.body.type !== undefined) updateData.type = req.body.type;

      const scenario = await req.prisma.scenario.update({
        where: { id: req.params.id },
        data: updateData,
        include: {
          assumptions: true,
        },
      });

      res.json({
        success: true,
        data: scenario,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Delete scenario
router.delete(
  '/:id',
  async (req: AuthRequest, res: Response<ApiResponse>, next: NextFunction) => {
    try {
      const existing = await req.prisma.scenario.findFirst({
        where: {
          id: req.params.id,
          projectId: req.params.projectId,
        },
      });

      if (!existing) {
        throw new AppError('Scenario not found', 404);
      }

      await req.prisma.scenario.delete({
        where: { id: req.params.id },
      });

      res.json({
        success: true,
        message: 'Scenario deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }
);

// Calculate scenario results
router.post(
  '/:id/calculate',
  async (req: AuthRequest, res: Response<ApiResponse<Scenario>>, next: NextFunction) => {
    try {
      const scenario = await req.prisma.scenario.findFirst({
        where: {
          id: req.params.id,
          projectId: req.params.projectId,
        },
        include: {
          assumptions: true,
        },
      });

      if (!scenario) {
        throw new AppError('Scenario not found', 404);
      }

      // Get full project data
      const project = await req.prisma.project.findFirst({
        where: { id: req.params.projectId },
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

      if (!project) {
        throw new AppError('Project not found', 404);
      }

      // Apply scenario assumptions
      const adjustments = new Map(scenario.assumptions.map(a => [a.variable, a.adjustment]));
      
      // Adjust products based on assumptions
      const adjustedProducts = project.products.map((prod: any) => {
        let adjustedPrice = prod.unitPrice;
        const priceAdj = adjustments.get('price') || adjustments.get('revenue');
        if (priceAdj) {
          adjustedPrice = prod.unitPrice * (1 + priceAdj / 100);
        }
        return {
          ...prod,
          unitPrice: adjustedPrice,
          productionSchedule: prod.productionSchedule.map((s: any) => {
            let adjustedQty = s.quantity;
            const qtyAdj = adjustments.get('quantity') || adjustments.get('sales');
            if (qtyAdj) {
              adjustedQty = s.quantity * (1 + qtyAdj / 100);
            }
            return { ...s, quantity: adjustedQty };
          }),
        };
      });

      // Adjust costs based on assumptions
      const adjustedCosts = project.operatingCosts.map((cost: any) => {
        let adjustedAmount = cost.amount;
        const costAdj = adjustments.get('costs') || adjustments.get('operatingCosts');
        if (costAdj) {
          adjustedAmount = cost.amount * (1 + costAdj / 100);
        }
        return { ...cost, amount: adjustedAmount };
      });

      // Adjust investments
      const adjustedInvestments = project.investments.map((inv: any) => {
        let adjustedAmount = inv.amount;
        const invAdj = adjustments.get('investment');
        if (invAdj) {
          adjustedAmount = inv.amount * (1 + invAdj / 100);
        }
        return { ...inv, amount: adjustedAmount };
      });

      // Generate cash flows with adjustments
      const cashFlows = generateCashFlows(
        {
          constructionYears: project.constructionYears,
          operationYears: project.operationYears,
          discountRate: project.discountRate,
          inflationRate: project.inflationRate,
          taxRate: project.taxRate,
          startDate: project.startDate,
        },
        adjustedInvestments,
        adjustedProducts.map((prod: any) => ({
          name: prod.name,
          unitPrice: prod.unitPrice,
          priceEscalation: prod.priceEscalation,
          productionSchedule: prod.productionSchedule,
        })),
        adjustedCosts,
        project.financing
      );

      // Calculate indicators
      const netCashFlows = cashFlows.map(cf => cf.netCashFlow);
      const totalInvestment = adjustedInvestments.reduce((sum: number, inv: any) => sum + inv.amount, 0);
      
      const incomeStatements = generateIncomeStatements(
        {
          constructionYears: project.constructionYears,
          operationYears: project.operationYears,
          discountRate: project.discountRate,
          inflationRate: project.inflationRate,
          taxRate: project.taxRate,
          startDate: project.startDate,
        },
        adjustedInvestments,
        adjustedProducts,
        adjustedCosts,
        project.financing
      );

      const totalNetIncome = incomeStatements.reduce((sum, is) => sum + is.netIncome, 0);
      const fixedCosts = adjustedCosts.filter((c: any) => c.costType === 'fixed').reduce((sum: number, c: any) => sum + c.amount, 0);
      const avgUnitPrice = adjustedProducts.length > 0 ? adjustedProducts.reduce((sum: number, p: any) => sum + p.unitPrice, 0) / adjustedProducts.length : 0;
      const variableCosts = adjustedCosts.filter((c: any) => c.costType === 'variable');
      const avgVariableCost = variableCosts.length > 0 ? variableCosts.reduce((sum: number, c: any) => sum + c.unitCost, 0) : 0;

      const indicators = calculateAllIndicators(
        netCashFlows,
        project.discountRate,
        totalInvestment,
        totalNetIncome,
        fixedCosts,
        avgUnitPrice,
        avgVariableCost
      );

      // Save results
      await req.prisma.scenarioResult.upsert({
        where: { scenarioId: scenario.id },
        create: {
          scenarioId: scenario.id,
          npv: indicators.npv,
          irr: indicators.irr,
          mirr: indicators.mirr,
          paybackPeriod: indicators.paybackPeriod,
          discountedPaybackPeriod: indicators.discountedPaybackPeriod,
          roi: indicators.roi,
          benefitCostRatio: indicators.benefitCostRatio,
        },
        update: {
          npv: indicators.npv,
          irr: indicators.irr,
          mirr: indicators.mirr,
          paybackPeriod: indicators.paybackPeriod,
          discountedPaybackPeriod: indicators.discountedPaybackPeriod,
          roi: indicators.roi,
          benefitCostRatio: indicators.benefitCostRatio,
        },
      });

      const updatedScenario = await req.prisma.scenario.findFirst({
        where: { id: scenario.id },
        include: {
          assumptions: true,
          results: true,
        },
      });

      res.json({
        success: true,
        data: updatedScenario,
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
