import { FinancialIndicators } from '../../types';

/**
 * Calculate Net Present Value (NPV)
 */
export function calculateNPV(cashFlows: number[], discountRate: number): number {
  const rate = discountRate / 100;
  return cashFlows.reduce((npv, cf, t) => {
    return npv + cf / Math.pow(1 + rate, t);
  }, 0);
}

/**
 * Calculate Internal Rate of Return (IRR) using Newton-Raphson method
 */
export function calculateIRR(cashFlows: number[], guess: number = 0.1): number {
  const maxIterations = 100;
  const tolerance = 0.0001;
  let rate = guess;

  for (let i = 0; i < maxIterations; i++) {
    let npv = 0;
    let npvDerivative = 0;

    for (let t = 0; t < cashFlows.length; t++) {
      const denominator = Math.pow(1 + rate, t);
      npv += cashFlows[t] / denominator;
      if (t > 0) {
        npvDerivative -= (t * cashFlows[t]) / Math.pow(1 + rate, t + 1);
      }
    }

    if (Math.abs(npvDerivative) < 1e-10) {
      break;
    }

    const newRate = rate - npv / npvDerivative;
    
    if (Math.abs(newRate - rate) < tolerance) {
      return newRate * 100; // Return as percentage
    }

    rate = newRate;
  }

  return rate * 100;
}

/**
 * Calculate Modified Internal Rate of Return (MIRR)
 */
export function calculateMIRR(
  cashFlows: number[],
  financeRate: number,
  reinvestRate: number
): number {
  const fRate = financeRate / 100;
  const rRate = reinvestRate / 100;
  const n = cashFlows.length - 1;

  // Present value of negative cash flows
  let pvNegative = 0;
  for (let t = 0; t < cashFlows.length; t++) {
    if (cashFlows[t] < 0) {
      pvNegative += cashFlows[t] / Math.pow(1 + fRate, t);
    }
  }

  // Future value of positive cash flows
  let fvPositive = 0;
  for (let t = 0; t < cashFlows.length; t++) {
    if (cashFlows[t] > 0) {
      fvPositive += cashFlows[t] * Math.pow(1 + rRate, n - t);
    }
  }

  if (pvNegative === 0) return 0;

  const mirr = Math.pow(-fvPositive / pvNegative, 1 / n) - 1;
  return mirr * 100;
}

/**
 * Calculate Simple Payback Period
 */
export function calculatePaybackPeriod(cashFlows: number[]): number {
  let cumulative = 0;
  
  for (let t = 0; t < cashFlows.length; t++) {
    cumulative += cashFlows[t];
    if (cumulative >= 0) {
      // Interpolate for more accurate result
      const prevCumulative = cumulative - cashFlows[t];
      if (cashFlows[t] !== 0) {
        return t + (-prevCumulative / cashFlows[t]);
      }
      return t;
    }
  }
  
  return -1; // Never pays back
}

/**
 * Calculate Discounted Payback Period
 */
export function calculateDiscountedPaybackPeriod(
  cashFlows: number[],
  discountRate: number
): number {
  const rate = discountRate / 100;
  let cumulative = 0;
  
  for (let t = 0; t < cashFlows.length; t++) {
    const discountedCF = cashFlows[t] / Math.pow(1 + rate, t);
    cumulative += discountedCF;
    
    if (cumulative >= 0) {
      const prevCumulative = cumulative - discountedCF;
      if (discountedCF !== 0) {
        return t + (-prevCumulative / discountedCF);
      }
      return t;
    }
  }
  
  return -1;
}

/**
 * Calculate Return on Investment (ROI)
 */
export function calculateROI(
  totalNetIncome: number,
  totalInvestment: number
): number {
  if (totalInvestment === 0) return 0;
  return (totalNetIncome / totalInvestment) * 100;
}

/**
 * Calculate Benefit-Cost Ratio
 */
export function calculateBenefitCostRatio(
  presentValueBenefits: number,
  presentValueCosts: number
): number {
  if (presentValueCosts === 0) return 0;
  return presentValueBenefits / Math.abs(presentValueCosts);
}

/**
 * Calculate Break-Even Point
 */
export function calculateBreakEven(
  fixedCosts: number,
  unitPrice: number,
  variableCostPerUnit: number
): { units: number; revenue: number } {
  const contributionMargin = unitPrice - variableCostPerUnit;
  
  if (contributionMargin <= 0) {
    return { units: -1, revenue: -1 }; // Cannot break even
  }
  
  const breakEvenUnits = fixedCosts / contributionMargin;
  const breakEvenRevenue = breakEvenUnits * unitPrice;
  
  return { units: breakEvenUnits, revenue: breakEvenRevenue };
}

/**
 * Calculate all financial indicators
 */
export function calculateAllIndicators(
  cashFlows: number[],
  discountRate: number,
  totalInvestment: number,
  totalNetIncome: number,
  fixedCosts: number,
  avgUnitPrice: number,
  avgVariableCost: number
): FinancialIndicators {
  const npv = calculateNPV(cashFlows, discountRate);
  const irr = calculateIRR(cashFlows);
  const mirr = calculateMIRR(cashFlows, discountRate, discountRate);
  const paybackPeriod = calculatePaybackPeriod(cashFlows);
  const discountedPaybackPeriod = calculateDiscountedPaybackPeriod(cashFlows, discountRate);
  const roi = calculateROI(totalNetIncome, totalInvestment);
  
  // Calculate present values for BCR
  const pvBenefits = cashFlows.slice(1).filter(cf => cf > 0).reduce((sum, cf, t) => {
    return sum + cf / Math.pow(1 + discountRate / 100, t + 1);
  }, 0);
  const pvCosts = Math.abs(cashFlows[0]) + cashFlows.slice(1).filter(cf => cf < 0).reduce((sum, cf, t) => {
    return sum + Math.abs(cf) / Math.pow(1 + discountRate / 100, t + 1);
  }, 0);
  
  const benefitCostRatio = calculateBenefitCostRatio(pvBenefits, pvCosts);
  const breakEven = calculateBreakEven(fixedCosts, avgUnitPrice, avgVariableCost);

  return {
    npv,
    irr,
    mirr,
    paybackPeriod,
    discountedPaybackPeriod,
    roi,
    benefitCostRatio,
    breakEvenUnits: breakEven.units,
    breakEvenRevenue: breakEven.revenue,
  };
}
