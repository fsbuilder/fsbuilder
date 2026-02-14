import { Router, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
import { AuthRequest, ApiResponse, FinancialIndicators, CashFlowYear, IncomeStatementYear, BalanceSheetYear, SensitivityResult } from '../types';
import { authenticate } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import {
  generateCashFlows,
  generateIncomeStatements,
  generateBalanceSheets,
  calculateAllIndicators,
  calculateNPV,
  calculateIRR,
  calculateBreakEven,
  calculateSensitivity,
  generateTornadoData,
} from '../services/calculations';

const router = Router({ mergeParams: true });

// Check project ownership middleware
const checkProjectAccess = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const project = await req.prisma.project.findFirst({
      where: {
        id: req.params.projectId,
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

    if (!project) {
      throw new AppError('Project not found', 404);
    }

    (req as any).project = project;
    next();
  } catch (error) {
    next(error);
  }
};

router.use(authenticate, checkProjectAccess);

// Get financial indicators
router.get(
  '/indicators',
  async (req: AuthRequest, res: Response<ApiResponse<FinancialIndicators>>, next: NextFunction) => {
    try {
      const project = (req as any).project;

      // Generate cash flows
      const cashFlows = generateCashFlows(
        {
          constructionYears: project.constructionYears,
          operationYears: project.operationYears,
          discountRate: project.discountRate,
          inflationRate: project.inflationRate,
          taxRate: project.taxRate,
          startDate: project.startDate,
        },
        project.investments.map((inv: any) => ({
          category: inv.category,
          amount: inv.amount,
          year: inv.year,
          usefulLife: inv.usefulLife,
          salvageValue: inv.salvageValue,
          depreciationMethod: inv.depreciationMethod,
          depreciationRate: inv.depreciationRate,
        })),
        project.products.map((prod: any) => ({
          name: prod.name,
          unitPrice: prod.unitPrice,
          priceEscalation: prod.priceEscalation,
          productionSchedule: prod.productionSchedule.map((s: any) => ({
            year: s.year,
            quantity: s.quantity,
          })),
        })),
        project.operatingCosts.map((cost: any) => ({
          category: cost.category,
          costType: cost.costType,
          amount: cost.amount,
          unitCost: cost.unitCost,
          escalationRate: cost.escalationRate,
          startYear: cost.startYear,
        })),
        project.financing.map((fin: any) => ({
          type: fin.type,
          amount: fin.amount,
          interestRate: fin.interestRate,
          termYears: fin.termYears,
          gracePeriod: fin.gracePeriod,
          disbursementYear: fin.disbursementYear,
          repaymentStartYear: fin.repaymentStartYear,
        }))
      );

      // Extract net cash flows for calculations
      const netCashFlows = cashFlows.map(cf => cf.netCashFlow);

      // Calculate totals
      const totalInvestment = project.investments.reduce((sum: number, inv: any) => sum + inv.amount, 0);
      const incomeStatements = generateIncomeStatements(
        {
          constructionYears: project.constructionYears,
          operationYears: project.operationYears,
          discountRate: project.discountRate,
          inflationRate: project.inflationRate,
          taxRate: project.taxRate,
          startDate: project.startDate,
        },
        project.investments,
        project.products.map((prod: any) => ({
          name: prod.name,
          unitPrice: prod.unitPrice,
          priceEscalation: prod.priceEscalation,
          productionSchedule: prod.productionSchedule,
        })),
        project.operatingCosts,
        project.financing
      );

      const totalNetIncome = incomeStatements.reduce((sum, is) => sum + is.netIncome, 0);

      // Calculate fixed costs and average prices for break-even
      const fixedCosts = project.operatingCosts
        .filter((c: any) => c.costType === 'fixed')
        .reduce((sum: number, c: any) => sum + c.amount, 0);

      let avgUnitPrice = 0;
      let avgVariableCost = 0;
      if (project.products.length > 0) {
        avgUnitPrice = project.products.reduce((sum: number, p: any) => sum + p.unitPrice, 0) / project.products.length;
      }
      const variableCosts = project.operatingCosts.filter((c: any) => c.costType === 'variable');
      if (variableCosts.length > 0) {
        avgVariableCost = variableCosts.reduce((sum: number, c: any) => sum + c.unitCost, 0);
      }

      const indicators = calculateAllIndicators(
        netCashFlows,
        project.discountRate,
        totalInvestment,
        totalNetIncome,
        fixedCosts,
        avgUnitPrice,
        avgVariableCost
      );

      res.json({
        success: true,
        data: indicators,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Get cash flow projections
router.get(
  '/cashflow',
  async (req: AuthRequest, res: Response<ApiResponse<CashFlowYear[]>>, next: NextFunction) => {
    try {
      const project = (req as any).project;

      const cashFlows = generateCashFlows(
        {
          constructionYears: project.constructionYears,
          operationYears: project.operationYears,
          discountRate: project.discountRate,
          inflationRate: project.inflationRate,
          taxRate: project.taxRate,
          startDate: project.startDate,
        },
        project.investments,
        project.products.map((prod: any) => ({
          name: prod.name,
          unitPrice: prod.unitPrice,
          priceEscalation: prod.priceEscalation,
          productionSchedule: prod.productionSchedule,
        })),
        project.operatingCosts,
        project.financing
      );

      res.json({
        success: true,
        data: cashFlows,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Get income statements
router.get(
  '/income-statement',
  async (req: AuthRequest, res: Response<ApiResponse<IncomeStatementYear[]>>, next: NextFunction) => {
    try {
      const project = (req as any).project;

      const statements = generateIncomeStatements(
        {
          constructionYears: project.constructionYears,
          operationYears: project.operationYears,
          discountRate: project.discountRate,
          inflationRate: project.inflationRate,
          taxRate: project.taxRate,
          startDate: project.startDate,
        },
        project.investments,
        project.products.map((prod: any) => ({
          name: prod.name,
          unitPrice: prod.unitPrice,
          priceEscalation: prod.priceEscalation,
          productionSchedule: prod.productionSchedule,
        })),
        project.operatingCosts,
        project.financing
      );

      res.json({
        success: true,
        data: statements,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Get balance sheets
router.get(
  '/balance-sheet',
  async (req: AuthRequest, res: Response<ApiResponse<BalanceSheetYear[]>>, next: NextFunction) => {
    try {
      const project = (req as any).project;

      const incomeStatements = generateIncomeStatements(
        {
          constructionYears: project.constructionYears,
          operationYears: project.operationYears,
          discountRate: project.discountRate,
          inflationRate: project.inflationRate,
          taxRate: project.taxRate,
          startDate: project.startDate,
        },
        project.investments,
        project.products.map((prod: any) => ({
          name: prod.name,
          unitPrice: prod.unitPrice,
          priceEscalation: prod.priceEscalation,
          productionSchedule: prod.productionSchedule,
        })),
        project.operatingCosts,
        project.financing
      );

      const balanceSheets = generateBalanceSheets(
        {
          constructionYears: project.constructionYears,
          operationYears: project.operationYears,
          discountRate: project.discountRate,
          inflationRate: project.inflationRate,
          taxRate: project.taxRate,
          startDate: project.startDate,
        },
        project.investments,
        project.products.map((prod: any) => ({
          name: prod.name,
          unitPrice: prod.unitPrice,
          priceEscalation: prod.priceEscalation,
          productionSchedule: prod.productionSchedule,
        })),
        project.operatingCosts,
        project.financing,
        incomeStatements
      );

      res.json({
        success: true,
        data: balanceSheets,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Run sensitivity analysis
router.post(
  '/sensitivity',
  [
    body('variables').isArray().withMessage('Variables must be an array'),
    body('variables.*').isString().isIn(['revenue', 'price', 'costs', 'investment', 'discountRate']),
  ],
  async (req: AuthRequest, res: Response<ApiResponse<{ results: SensitivityResult[]; tornado: any[] }>>, next: NextFunction) => {
    try {
      const project = (req as any).project;
      const { variables } = req.body;

      // Generate base data
      const cashFlows = generateCashFlows(
        {
          constructionYears: project.constructionYears,
          operationYears: project.operationYears,
          discountRate: project.discountRate,
          inflationRate: project.inflationRate,
          taxRate: project.taxRate,
          startDate: project.startDate,
        },
        project.investments,
        project.products.map((prod: any) => ({
          name: prod.name,
          unitPrice: prod.unitPrice,
          priceEscalation: prod.priceEscalation,
          productionSchedule: prod.productionSchedule,
        })),
        project.operatingCosts,
        project.financing
      );

      // Extract data for sensitivity
      const revenue = cashFlows.slice(1).map(cf => cf.operatingInflow);
      const operatingCosts = cashFlows.slice(1).map(cf => cf.operatingOutflow);
      const investmentCost = project.investments.reduce((sum: number, inv: any) => sum + inv.amount, 0);

      const sensitivityResults = calculateSensitivity(
        {
          revenue,
          operatingCosts,
          investmentCost,
          discountRate: project.discountRate,
          cashFlows: cashFlows.map(cf => cf.netCashFlow),
        },
        {
          variables,
          variations: [-20, -15, -10, -5, 0, 5, 10, 15, 20],
        }
      );

      const tornadoData = generateTornadoData(sensitivityResults);

      res.json({
        success: true,
        data: {
          results: sensitivityResults,
          tornado: tornadoData,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// Get break-even analysis
router.get(
  '/break-even',
  async (req: AuthRequest, res: Response<ApiResponse<{
    units: number;
    revenue: number;
    chartData: Array<{ quantity: number; revenue: number; totalCost: number }>;
  }>>, next: NextFunction) => {
    try {
      const project = (req as any).project;

      // Calculate fixed costs
      const fixedCosts = project.operatingCosts
        .filter((c: any) => c.costType === 'fixed')
        .reduce((sum: number, c: any) => sum + c.amount, 0);

      // Calculate average unit price
      let avgUnitPrice = 0;
      if (project.products.length > 0) {
        avgUnitPrice = project.products.reduce((sum: number, p: any) => sum + p.unitPrice, 0) / project.products.length;
      }

      // Calculate variable cost per unit
      let avgVariableCost = 0;
      const variableCosts = project.operatingCosts.filter((c: any) => c.costType === 'variable');
      if (variableCosts.length > 0) {
        avgVariableCost = variableCosts.reduce((sum: number, c: any) => sum + c.unitCost, 0);
      }

      const breakEven = calculateBreakEven(fixedCosts, avgUnitPrice, avgVariableCost);

      // Generate chart data
      const chartData: Array<{ quantity: number; revenue: number; totalCost: number }> = [];
      const maxQuantity = breakEven.units > 0 ? breakEven.units * 2 : 1000;
      const step = maxQuantity / 20;

      for (let q = 0; q <= maxQuantity; q += step) {
        chartData.push({
          quantity: q,
          revenue: q * avgUnitPrice,
          totalCost: fixedCosts + (q * avgVariableCost),
        });
      }

      res.json({
        success: true,
        data: {
          units: breakEven.units,
          revenue: breakEven.revenue,
          chartData,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
