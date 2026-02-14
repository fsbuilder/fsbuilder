import { Router, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
import { AuthRequest } from '../types';
import { authenticate } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { generatePdfReport } from '../services/reports/pdfGenerator';
import { generateExcelReport } from '../services/reports/excelGenerator';
import {
  generateCashFlows,
  generateIncomeStatements,
  generateBalanceSheets,
  calculateAllIndicators,
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

// Generate PDF report
router.post(
  '/pdf',
  [
    body('includeExecutiveSummary').optional().isBoolean(),
    body('includeInvestment').optional().isBoolean(),
    body('includeProduction').optional().isBoolean(),
    body('includeCosts').optional().isBoolean(),
    body('includeFinancing').optional().isBoolean(),
    body('includeFinancialStatements').optional().isBoolean(),
    body('includeIndicators').optional().isBoolean(),
    body('includeSensitivity').optional().isBoolean(),
    body('includeScenarios').optional().isBoolean(),
  ],
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const project = (req as any).project;

      // Generate all financial data
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

      // Calculate indicators
      const netCashFlows = cashFlows.map(cf => cf.netCashFlow);
      const totalInvestment = project.investments.reduce((sum: number, inv: any) => sum + inv.amount, 0);
      const totalNetIncome = incomeStatements.reduce((sum: number, is: any) => sum + is.netIncome, 0);
      const fixedCosts = project.operatingCosts.filter((c: any) => c.costType === 'fixed').reduce((s: number, c: any) => s + c.amount, 0);
      const avgUnitPrice = project.products.length > 0 ? project.products.reduce((s: number, p: any) => s + p.unitPrice, 0) / project.products.length : 0;
      const variableCosts = project.operatingCosts.filter((c: any) => c.costType === 'variable');
      const avgVariableCost = variableCosts.length > 0 ? variableCosts.reduce((s: number, c: any) => s + c.unitCost, 0) : 0;

      const indicators = calculateAllIndicators(
        netCashFlows,
        project.discountRate,
        totalInvestment,
        totalNetIncome,
        fixedCosts,
        avgUnitPrice,
        avgVariableCost
      );

      const config = {
        includeExecutiveSummary: req.body.includeExecutiveSummary !== false,
        includeInvestment: req.body.includeInvestment !== false,
        includeProduction: req.body.includeProduction !== false,
        includeCosts: req.body.includeCosts !== false,
        includeFinancing: req.body.includeFinancing !== false,
        includeFinancialStatements: req.body.includeFinancialStatements !== false,
        includeIndicators: req.body.includeIndicators !== false,
        includeSensitivity: req.body.includeSensitivity || false,
        includeScenarios: req.body.includeScenarios || false,
      };

      const doc = generatePdfReport(
        {
          project,
          investments: project.investments,
          products: project.products,
          operatingCosts: project.operatingCosts,
          financing: project.financing,
          cashFlows,
          incomeStatements,
          indicators,
        },
        config
      );

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${project.name.replace(/[^a-z0-9]/gi, '_')}_Report.pdf"`);

      doc.pipe(res);
      doc.end();
    } catch (error) {
      next(error);
    }
  }
);

// Generate Excel report
router.post(
  '/excel',
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const project = (req as any).project;

      // Generate all financial data
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

      // Calculate indicators
      const netCashFlows = cashFlows.map(cf => cf.netCashFlow);
      const totalInvestment = project.investments.reduce((sum: number, inv: any) => sum + inv.amount, 0);
      const totalNetIncome = incomeStatements.reduce((sum: number, is: any) => sum + is.netIncome, 0);
      const fixedCosts = project.operatingCosts.filter((c: any) => c.costType === 'fixed').reduce((s: number, c: any) => s + c.amount, 0);
      const avgUnitPrice = project.products.length > 0 ? project.products.reduce((s: number, p: any) => s + p.unitPrice, 0) / project.products.length : 0;
      const variableCosts = project.operatingCosts.filter((c: any) => c.costType === 'variable');
      const avgVariableCost = variableCosts.length > 0 ? variableCosts.reduce((s: number, c: any) => s + c.unitCost, 0) : 0;

      const indicators = calculateAllIndicators(
        netCashFlows,
        project.discountRate,
        totalInvestment,
        totalNetIncome,
        fixedCosts,
        avgUnitPrice,
        avgVariableCost
      );

      const workbook = await generateExcelReport({
        project,
        investments: project.investments,
        products: project.products,
        operatingCosts: project.operatingCosts,
        financing: project.financing,
        cashFlows,
        incomeStatements,
        balanceSheets,
        indicators,
      });

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${project.name.replace(/[^a-z0-9]/gi, '_')}_Report.xlsx"`);

      await workbook.xlsx.write(res);
      res.end();
    } catch (error) {
      next(error);
    }
  }
);

export default router;
