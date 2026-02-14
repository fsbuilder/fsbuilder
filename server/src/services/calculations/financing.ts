import { AmortizationSchedule } from '../../types';

/**
 * Calculate loan amortization schedule
 * Uses equal principal payment method
 */
export function calculateAmortizationSchedule(
  principal: number,
  annualRate: number,
  termYears: number,
  gracePeriod: number = 0
): AmortizationSchedule[] {
  const schedule: AmortizationSchedule[] = [];
  const rate = annualRate / 100;
  let balance = principal;
  const principalPayment = principal / (termYears - gracePeriod);

  for (let year = 1; year <= termYears; year++) {
    const interestPayment = balance * rate;
    
    let principalPaid = 0;
    if (year > gracePeriod) {
      principalPaid = principalPayment;
    }

    const totalPayment = principalPaid + interestPayment;
    const endingBalance = balance - principalPaid;

    schedule.push({
      year,
      beginningBalance: balance,
      payment: totalPayment,
      principal: principalPaid,
      interest: interestPayment,
      endingBalance: Math.max(0, endingBalance),
    });

    balance = endingBalance;
  }

  return schedule;
}

/**
 * Calculate total debt service for a year
 */
export function calculateDebtService(
  financingItems: Array<{
    type: string;
    amount: number;
    interestRate: number;
    termYears: number;
    gracePeriod: number;
    repaymentStartYear: number;
  }>,
  year: number
): { principal: number; interest: number; total: number } {
  let totalPrincipal = 0;
  let totalInterest = 0;

  for (const item of financingItems) {
    if (item.type !== 'loan') continue;

    const schedule = calculateAmortizationSchedule(
      item.amount,
      item.interestRate,
      item.termYears,
      item.gracePeriod
    );

    const yearIndex = year - item.repaymentStartYear;
    if (yearIndex >= 0 && yearIndex < schedule.length) {
      totalPrincipal += schedule[yearIndex].principal;
      totalInterest += schedule[yearIndex].interest;
    }
  }

  return {
    principal: totalPrincipal,
    interest: totalInterest,
    total: totalPrincipal + totalInterest,
  };
}
