import { SensitivityResult } from '../../types';
import { calculateNPV, calculateIRR } from './indicators';

interface SensitivityConfig {
  variables: string[];
  variations: number[]; // e.g., [-20, -10, 0, 10, 20] for percentage variations
}

interface ProjectInputs {
  revenue: number[];
  operatingCosts: number[];
  investmentCost: number;
  discountRate: number;
  cashFlows: number[];
}

/**
 * Calculate sensitivity analysis for multiple variables
 */
export function calculateSensitivity(
  baseInputs: ProjectInputs,
  config: SensitivityConfig
): SensitivityResult[] {
  const results: SensitivityResult[] = [];
  const variations = config.variations || [-20, -10, -5, 0, 5, 10, 20];

  for (const variable of config.variables) {
    for (const variation of variations) {
      const modifiedInputs = applyVariation(baseInputs, variable, variation);
      const modifiedCashFlows = recalculateCashFlows(modifiedInputs);
      
      const npv = calculateNPV(modifiedCashFlows, modifiedInputs.discountRate);
      const irr = calculateIRR(modifiedCashFlows);

      results.push({
        variable,
        variation,
        npv,
        irr,
      });
    }
  }

  return results;
}

/**
 * Apply a percentage variation to a specific variable
 */
function applyVariation(
  inputs: ProjectInputs,
  variable: string,
  variation: number
): ProjectInputs {
  const factor = 1 + variation / 100;
  const modified = { ...inputs };

  switch (variable) {
    case 'revenue':
    case 'price':
    case 'sales':
      modified.revenue = inputs.revenue.map(r => r * factor);
      break;
    case 'operatingCosts':
    case 'costs':
      modified.operatingCosts = inputs.operatingCosts.map(c => c * factor);
      break;
    case 'investment':
    case 'investmentCost':
      modified.investmentCost = inputs.investmentCost * factor;
      break;
    case 'discountRate':
      modified.discountRate = inputs.discountRate * factor;
      break;
    default:
      break;
  }

  return modified;
}

/**
 * Recalculate cash flows based on modified inputs
 */
function recalculateCashFlows(inputs: ProjectInputs): number[] {
  const cashFlows: number[] = [-inputs.investmentCost];
  
  for (let i = 0; i < inputs.revenue.length; i++) {
    const netCashFlow = inputs.revenue[i] - inputs.operatingCosts[i];
    cashFlows.push(netCashFlow);
  }

  return cashFlows;
}

/**
 * Generate tornado chart data (sorted by impact on NPV)
 */
export function generateTornadoData(
  sensitivityResults: SensitivityResult[]
): Array<{
  variable: string;
  lowNPV: number;
  baseNPV: number;
  highNPV: number;
  impact: number;
}> {
  // Group results by variable
  const grouped = new Map<string, SensitivityResult[]>();
  
  for (const result of sensitivityResults) {
    const existing = grouped.get(result.variable) || [];
    existing.push(result);
    grouped.set(result.variable, existing);
  }

  const tornadoData: Array<{
    variable: string;
    lowNPV: number;
    baseNPV: number;
    highNPV: number;
    impact: number;
  }> = [];

  grouped.forEach((results, variable) => {
    const sorted = results.sort((a, b) => a.variation - b.variation);
    const baseResult = sorted.find(r => r.variation === 0);
    const lowResult = sorted[0];
    const highResult = sorted[sorted.length - 1];

    if (baseResult && lowResult && highResult) {
      const impact = Math.abs(highResult.npv - lowResult.npv);
      tornadoData.push({
        variable,
        lowNPV: lowResult.npv,
        baseNPV: baseResult.npv,
        highNPV: highResult.npv,
        impact,
      });
    }
  });

  // Sort by impact (descending)
  return tornadoData.sort((a, b) => b.impact - a.impact);
}

/**
 * Calculate break-even variation for each variable
 * (at what % change does NPV become zero)
 */
export function calculateBreakEvenVariations(
  baseInputs: ProjectInputs,
  variables: string[]
): Map<string, number | null> {
  const breakEvenVariations = new Map<string, number | null>();

  for (const variable of variables) {
    const breakEven = findBreakEvenVariation(baseInputs, variable);
    breakEvenVariations.set(variable, breakEven);
  }

  return breakEvenVariations;
}

/**
 * Find the variation percentage where NPV = 0 using bisection
 */
function findBreakEvenVariation(
  inputs: ProjectInputs,
  variable: string
): number | null {
  let low = -100;
  let high = 100;
  const tolerance = 0.1;
  const maxIterations = 50;

  for (let i = 0; i < maxIterations; i++) {
    const mid = (low + high) / 2;
    const modifiedInputs = applyVariation(inputs, variable, mid);
    const cashFlows = recalculateCashFlows(modifiedInputs);
    const npv = calculateNPV(cashFlows, modifiedInputs.discountRate);

    if (Math.abs(npv) < tolerance) {
      return mid;
    }

    // Determine direction based on variable type
    const baseModified = applyVariation(inputs, variable, 0);
    const baseCashFlows = recalculateCashFlows(baseModified);
    const baseNPV = calculateNPV(baseCashFlows, baseModified.discountRate);

    if ((variable === 'revenue' || variable === 'price') && npv < 0) {
      low = mid;
    } else if ((variable === 'costs' || variable === 'investment') && npv < 0) {
      high = mid;
    } else {
      if (baseNPV > 0) {
        if (npv > 0) low = mid;
        else high = mid;
      } else {
        if (npv < 0) low = mid;
        else high = mid;
      }
    }
  }

  return null; // Could not find break-even within range
}
