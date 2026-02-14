/**
 * Calculate annual depreciation using straight-line method
 */
export function straightLineDepreciation(
  cost: number,
  salvageValue: number,
  usefulLife: number
): number {
  if (usefulLife <= 0) return 0;
  return (cost - salvageValue) / usefulLife;
}

/**
 * Calculate annual depreciation using declining balance method
 */
export function decliningBalanceDepreciation(
  cost: number,
  salvageValue: number,
  rate: number,
  year: number,
  usefulLife: number
): number {
  if (year > usefulLife) return 0;
  
  const depreciationRate = rate / 100;
  let bookValue = cost;
  
  for (let y = 1; y < year; y++) {
    const depreciation = bookValue * depreciationRate;
    bookValue -= depreciation;
    if (bookValue <= salvageValue) {
      bookValue = salvageValue;
      break;
    }
  }
  
  if (bookValue <= salvageValue) return 0;
  
  const depreciation = bookValue * depreciationRate;
  return Math.min(depreciation, bookValue - salvageValue);
}

/**
 * Calculate depreciation for a given year based on method
 */
export function calculateDepreciation(
  cost: number,
  salvageValue: number,
  usefulLife: number,
  depreciationRate: number,
  method: 'straight_line' | 'declining_balance' | 'none',
  year: number,
  purchaseYear: number
): number {
  const yearsSincePurchase = year - purchaseYear;
  
  if (yearsSincePurchase < 0 || yearsSincePurchase >= usefulLife) {
    return 0;
  }

  switch (method) {
    case 'straight_line':
      return straightLineDepreciation(cost, salvageValue, usefulLife);
    case 'declining_balance':
      return decliningBalanceDepreciation(cost, salvageValue, depreciationRate, yearsSincePurchase + 1, usefulLife);
    case 'none':
    default:
      return 0;
  }
}

/**
 * Calculate accumulated depreciation up to a given year
 */
export function calculateAccumulatedDepreciation(
  cost: number,
  salvageValue: number,
  usefulLife: number,
  depreciationRate: number,
  method: 'straight_line' | 'declining_balance' | 'none',
  currentYear: number,
  purchaseYear: number
): number {
  let accumulated = 0;
  
  for (let year = purchaseYear; year <= currentYear; year++) {
    accumulated += calculateDepreciation(
      cost,
      salvageValue,
      usefulLife,
      depreciationRate,
      method,
      year,
      purchaseYear
    );
  }
  
  return Math.min(accumulated, cost - salvageValue);
}
