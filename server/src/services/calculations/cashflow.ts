import { CashFlowYear, IncomeStatementYear, BalanceSheetYear } from '../../types';
import { calculateDepreciation, calculateAccumulatedDepreciation } from './depreciation';
import { calculateDebtService } from './financing';

interface ProjectData {
  constructionYears: number;
  operationYears: number;
  discountRate: number;
  inflationRate: number;
  taxRate: number;
  startDate: Date;
}

interface InvestmentData {
  category: string;
  amount: number;
  year: number;
  usefulLife: number;
  salvageValue: number;
  depreciationMethod: 'straight_line' | 'declining_balance' | 'none';
  depreciationRate: number;
}

interface ProductData {
  name: string;
  unitPrice: number;
  priceEscalation: number;
  productionSchedule: Array<{
    year: number;
    quantity: number;
  }>;
}

interface CostData {
  category: string;
  costType: 'fixed' | 'variable';
  amount: number;
  unitCost: number;
  escalationRate: number;
  startYear: number;
}

interface FinancingData {
  type: string;
  amount: number;
  interestRate: number;
  termYears: number;
  gracePeriod: number;
  disbursementYear: number;
  repaymentStartYear: number;
}

/**
 * Generate cash flow projections
 */
export function generateCashFlows(
  project: ProjectData,
  investments: InvestmentData[],
  products: ProductData[],
  costs: CostData[],
  financing: FinancingData[]
): CashFlowYear[] {
  const totalYears = project.constructionYears + project.operationYears;
  const cashFlows: CashFlowYear[] = [];
  let cumulativeCashFlow = 0;

  for (let year = 0; year <= totalYears; year++) {
    // Calculate revenue
    let revenue = 0;
    if (year > project.constructionYears) {
      const operatingYear = year - project.constructionYears;
      for (const product of products) {
        const schedule = product.productionSchedule.find(s => s.year === operatingYear);
        if (schedule) {
          const escalatedPrice = product.unitPrice * Math.pow(1 + product.priceEscalation / 100, operatingYear - 1);
          revenue += schedule.quantity * escalatedPrice;
        }
      }
    }

    // Calculate operating costs
    let operatingCosts = 0;
    if (year > project.constructionYears) {
      const operatingYear = year - project.constructionYears;
      for (const cost of costs) {
        if (operatingYear >= cost.startYear) {
          const yearsSinceStart = operatingYear - cost.startYear;
          const escalatedAmount = cost.amount * Math.pow(1 + cost.escalationRate / 100, yearsSinceStart);
          operatingCosts += escalatedAmount;
        }
      }
    }

    // Calculate investments (outflows)
    const yearInvestments = investments
      .filter(inv => inv.year === year)
      .reduce((sum, inv) => sum + inv.amount, 0);

    // Calculate financing inflows
    const financingInflows = financing
      .filter(f => f.disbursementYear === year)
      .reduce((sum, f) => sum + f.amount, 0);

    // Calculate debt service
    const debtService = calculateDebtService(
      financing.map(f => ({
        type: f.type,
        amount: f.amount,
        interestRate: f.interestRate,
        termYears: f.termYears,
        gracePeriod: f.gracePeriod,
        repaymentStartYear: f.repaymentStartYear,
      })),
      year
    );

    // Calculate depreciation
    let depreciation = 0;
    for (const inv of investments) {
      if (inv.category !== 'land' && inv.category !== 'working_capital') {
        depreciation += calculateDepreciation(
          inv.amount,
          inv.salvageValue,
          inv.usefulLife,
          inv.depreciationRate,
          inv.depreciationMethod,
          year,
          inv.year
        );
      }
    }

    // Calculate tax (simplified)
    const taxableIncome = revenue - operatingCosts - depreciation - debtService.interest;
    const taxes = taxableIncome > 0 ? taxableIncome * (project.taxRate / 100) : 0;

    // Calculate net cash flow
    const operatingInflow = revenue;
    const operatingOutflow = operatingCosts + taxes;
    const investingOutflow = yearInvestments;
    const financingInflow = financingInflows;
    const financingOutflow = debtService.principal + debtService.interest;

    const netCashFlow = operatingInflow - operatingOutflow - investingOutflow + financingInflow - financingOutflow;
    cumulativeCashFlow += netCashFlow;

    // Discount cash flow
    const discountFactor = Math.pow(1 + project.discountRate / 100, year);
    const discountedCashFlow = netCashFlow / discountFactor;

    cashFlows.push({
      year,
      operatingInflow,
      operatingOutflow,
      investingOutflow,
      financingInflow,
      financingOutflow,
      netCashFlow,
      cumulativeCashFlow,
      discountedCashFlow,
    });
  }

  return cashFlows;
}

/**
 * Generate income statements
 */
export function generateIncomeStatements(
  project: ProjectData,
  investments: InvestmentData[],
  products: ProductData[],
  costs: CostData[],
  financing: FinancingData[]
): IncomeStatementYear[] {
  const totalYears = project.constructionYears + project.operationYears;
  const statements: IncomeStatementYear[] = [];

  for (let year = 1; year <= totalYears; year++) {
    if (year <= project.constructionYears) {
      // No income during construction
      statements.push({
        year,
        revenue: 0,
        costOfGoodsSold: 0,
        grossProfit: 0,
        operatingExpenses: 0,
        depreciation: 0,
        operatingIncome: 0,
        interestExpense: 0,
        taxableIncome: 0,
        taxes: 0,
        netIncome: 0,
      });
      continue;
    }

    const operatingYear = year - project.constructionYears;

    // Calculate revenue
    let revenue = 0;
    for (const product of products) {
      const schedule = product.productionSchedule.find(s => s.year === operatingYear);
      if (schedule) {
        const escalatedPrice = product.unitPrice * Math.pow(1 + product.priceEscalation / 100, operatingYear - 1);
        revenue += schedule.quantity * escalatedPrice;
      }
    }

    // Calculate COGS (variable costs)
    let cogs = 0;
    let operatingExpenses = 0;
    for (const cost of costs) {
      if (operatingYear >= cost.startYear) {
        const yearsSinceStart = operatingYear - cost.startYear;
        const escalatedAmount = cost.amount * Math.pow(1 + cost.escalationRate / 100, yearsSinceStart);
        if (cost.costType === 'variable') {
          cogs += escalatedAmount;
        } else {
          operatingExpenses += escalatedAmount;
        }
      }
    }

    // Calculate depreciation
    let depreciation = 0;
    for (const inv of investments) {
      if (inv.category !== 'land' && inv.category !== 'working_capital') {
        depreciation += calculateDepreciation(
          inv.amount,
          inv.salvageValue,
          inv.usefulLife,
          inv.depreciationRate,
          inv.depreciationMethod,
          year,
          inv.year
        );
      }
    }

    const grossProfit = revenue - cogs;
    const operatingIncome = grossProfit - operatingExpenses - depreciation;

    // Interest expense
    const debtService = calculateDebtService(
      financing.map(f => ({
        type: f.type,
        amount: f.amount,
        interestRate: f.interestRate,
        termYears: f.termYears,
        gracePeriod: f.gracePeriod,
        repaymentStartYear: f.repaymentStartYear,
      })),
      year
    );
    const interestExpense = debtService.interest;

    const taxableIncome = operatingIncome - interestExpense;
    const taxes = taxableIncome > 0 ? taxableIncome * (project.taxRate / 100) : 0;
    const netIncome = taxableIncome - taxes;

    statements.push({
      year,
      revenue,
      costOfGoodsSold: cogs,
      grossProfit,
      operatingExpenses,
      depreciation,
      operatingIncome,
      interestExpense,
      taxableIncome,
      taxes,
      netIncome,
    });
  }

  return statements;
}

/**
 * Generate balance sheets
 */
export function generateBalanceSheets(
  project: ProjectData,
  investments: InvestmentData[],
  products: ProductData[],
  costs: CostData[],
  financing: FinancingData[],
  incomeStatements: IncomeStatementYear[]
): BalanceSheetYear[] {
  const totalYears = project.constructionYears + project.operationYears;
  const balanceSheets: BalanceSheetYear[] = [];
  let retainedEarnings = 0;
  let cash = 0;

  for (let year = 0; year <= totalYears; year++) {
    // Fixed assets (cost)
    const fixedAssets = investments
      .filter(inv => inv.year <= year && inv.category !== 'working_capital')
      .reduce((sum, inv) => sum + inv.amount, 0);

    // Accumulated depreciation
    let accumulatedDepreciation = 0;
    for (const inv of investments) {
      if (inv.year <= year && inv.category !== 'land' && inv.category !== 'working_capital') {
        accumulatedDepreciation += calculateAccumulatedDepreciation(
          inv.amount,
          inv.salvageValue,
          inv.usefulLife,
          inv.depreciationRate,
          inv.depreciationMethod,
          year,
          inv.year
        );
      }
    }

    const netFixedAssets = fixedAssets - accumulatedDepreciation;

    // Working capital
    const workingCapital = investments
      .filter(inv => inv.year <= year && inv.category === 'working_capital')
      .reduce((sum, inv) => sum + inv.amount, 0);

    // Simplified current assets
    const receivables = 0; // Could be calculated as % of revenue
    const inventory = workingCapital * 0.6; // Simplified
    const currentAssets = cash + receivables + inventory;

    // Total assets
    const totalAssets = currentAssets + netFixedAssets;

    // Liabilities
    const payables = 0; // Could be calculated
    const currentLiabilities = payables;

    // Long-term debt (remaining principal)
    let longTermDebt = 0;
    for (const f of financing) {
      if (f.type === 'loan') {
        const yearsSinceStart = year - f.repaymentStartYear;
        if (yearsSinceStart < 0) {
          longTermDebt += f.amount;
        } else if (yearsSinceStart < f.termYears) {
          const principalPayment = f.amount / (f.termYears - f.gracePeriod);
          const principalPaid = Math.max(0, yearsSinceStart - f.gracePeriod) * principalPayment;
          longTermDebt += Math.max(0, f.amount - principalPaid);
        }
      }
    }

    const totalLiabilities = currentLiabilities + longTermDebt;

    // Equity
    const shareCapital = financing
      .filter(f => f.type === 'equity' && f.disbursementYear <= year)
      .reduce((sum, f) => sum + f.amount, 0);

    // Update retained earnings
    const yearIncome = incomeStatements.find(is => is.year === year);
    if (yearIncome) {
      retainedEarnings += yearIncome.netIncome;
    }

    const totalEquity = shareCapital + retainedEarnings;

    // Update cash (simplified: assets = liabilities + equity)
    cash = totalAssets - netFixedAssets - receivables - inventory;
    if (cash < 0) cash = 0;

    balanceSheets.push({
      year,
      cash,
      receivables,
      inventory,
      currentAssets: cash + receivables + inventory,
      fixedAssets,
      accumulatedDepreciation,
      netFixedAssets,
      totalAssets: (cash + receivables + inventory) + netFixedAssets,
      payables,
      currentLiabilities,
      longTermDebt,
      totalLiabilities,
      shareCapital,
      retainedEarnings,
      totalEquity,
    });
  }

  return balanceSheets;
}
