// User types
export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: string;
}

// Project types
export interface Project {
  id: string;
  name: string;
  description: string;
  sector: string;
  location: string;
  currency: string;
  startDate: string;
  constructionYears: number;
  operationYears: number;
  discountRate: number;
  inflationRate: number;
  taxRate: number;
  status: 'draft' | 'active' | 'completed' | 'archived';
  createdAt: string;
  updatedAt: string;
  userId: string;
}

// Investment types
export type InvestmentCategory = 
  | 'land'
  | 'buildings'
  | 'machinery'
  | 'equipment'
  | 'vehicles'
  | 'furniture'
  | 'preproduction'
  | 'working_capital'
  | 'other';

export type DepreciationMethod = 'straight_line' | 'declining_balance' | 'none';

export interface Investment {
  id: string;
  projectId: string;
  category: InvestmentCategory;
  description: string;
  amount: number;
  year: number;
  usefulLife: number;
  salvageValue: number;
  depreciationMethod: DepreciationMethod;
  depreciationRate: number;
}

// Product/Revenue types
export interface Product {
  id: string;
  projectId: string;
  name: string;
  unit: string;
  unitPrice: number;
  priceEscalation: number;
  installedCapacity: number;
  capacityUnit: string;
}

export interface ProductionSchedule {
  id: string;
  productId: string;
  year: number;
  capacityUtilization: number;
  quantity: number;
}

// Operating Cost types
export type CostCategory = 
  | 'raw_materials'
  | 'utilities'
  | 'labor_direct'
  | 'labor_indirect'
  | 'maintenance'
  | 'administrative'
  | 'marketing'
  | 'insurance'
  | 'other';

export type CostType = 'fixed' | 'variable';

export interface OperatingCost {
  id: string;
  projectId: string;
  category: CostCategory;
  description: string;
  costType: CostType;
  amount: number;
  unitCost: number;
  escalationRate: number;
  startYear: number;
}

// Financing types
export type FinancingType = 'equity' | 'loan' | 'grant';

export interface Financing {
  id: string;
  projectId: string;
  type: FinancingType;
  name: string;
  amount: number;
  interestRate: number;
  termYears: number;
  gracePeriod: number;
  disbursementYear: number;
  repaymentStartYear: number;
}

// Financial Analysis types
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
  // Assets
  cash: number;
  receivables: number;
  inventory: number;
  currentAssets: number;
  fixedAssets: number;
  accumulatedDepreciation: number;
  netFixedAssets: number;
  totalAssets: number;
  // Liabilities
  payables: number;
  currentLiabilities: number;
  longTermDebt: number;
  totalLiabilities: number;
  // Equity
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

// Sensitivity Analysis types
export interface SensitivityVariable {
  name: string;
  baseValue: number;
  minVariation: number;
  maxVariation: number;
  step: number;
}

export interface SensitivityResult {
  variable: string;
  variation: number;
  npv: number;
  irr: number;
}

// Scenario Analysis types
export interface Scenario {
  id: string;
  projectId: string;
  name: string;
  description: string;
  type: 'best' | 'base' | 'worst' | 'custom';
  assumptions: ScenarioAssumption[];
  results?: FinancialIndicators;
}

export interface ScenarioAssumption {
  variable: string;
  adjustment: number;
}

// Report types
export interface ReportConfig {
  projectId: string;
  includeExecutiveSummary: boolean;
  includeInvestment: boolean;
  includeProduction: boolean;
  includeCosts: boolean;
  includeFinancing: boolean;
  includeFinancialStatements: boolean;
  includeIndicators: boolean;
  includeSensitivity: boolean;
  includeScenarios: boolean;
  format: 'pdf' | 'excel';
}

// API Response types
export interface ApiResponse<T> {
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
