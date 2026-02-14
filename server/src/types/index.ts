import { Request } from 'express';
import { PrismaClient, User } from '@prisma/client';

export interface AuthRequest extends Request {
  user?: User;
  prisma: PrismaClient;
}

export interface JwtPayload {
  userId: string;
  email: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Financial calculation types
export interface CashFlowYear {
  year: number;
  operatingInflow: number;
  operatingOutflow: number;
  investingOutflow: number;
  financingInflow: number;
  financingOutflow: number;
  netCashFlow: number;
  cumulativeCashFlow: number;
  discountedCashFlow: number;
}

export interface IncomeStatementYear {
  year: number;
  revenue: number;
  costOfGoodsSold: number;
  grossProfit: number;
  operatingExpenses: number;
  depreciation: number;
  operatingIncome: number;
  interestExpense: number;
  taxableIncome: number;
  taxes: number;
  netIncome: number;
}

export interface BalanceSheetYear {
  year: number;
  cash: number;
  receivables: number;
  inventory: number;
  currentAssets: number;
  fixedAssets: number;
  accumulatedDepreciation: number;
  netFixedAssets: number;
  totalAssets: number;
  payables: number;
  currentLiabilities: number;
  longTermDebt: number;
  totalLiabilities: number;
  shareCapital: number;
  retainedEarnings: number;
  totalEquity: number;
}

export interface FinancialIndicators {
  npv: number;
  irr: number;
  mirr: number;
  paybackPeriod: number;
  discountedPaybackPeriod: number;
  roi: number;
  benefitCostRatio: number;
  breakEvenUnits: number;
  breakEvenRevenue: number;
}

export interface SensitivityResult {
  variable: string;
  variation: number;
  npv: number;
  irr: number;
}

export interface AmortizationSchedule {
  year: number;
  beginningBalance: number;
  payment: number;
  principal: number;
  interest: number;
  endingBalance: number;
}
