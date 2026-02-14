import {
  calculateAmortizationSchedule,
  calculateDebtService,
} from '../financing';

describe('Financing Calculations', () => {
  describe('calculateAmortizationSchedule', () => {
    it('should generate correct number of periods', () => {
      const schedule = calculateAmortizationSchedule(100000, 10, 5, 0);
      expect(schedule.length).toBe(5);
    });

    it('should calculate correct principal payments', () => {
      const schedule = calculateAmortizationSchedule(100000, 10, 5, 0);
      const totalPrincipal = schedule.reduce((sum, row) => sum + row.principal, 0);
      expect(totalPrincipal).toBeCloseTo(100000, 0);
    });

    it('should have zero ending balance at the end', () => {
      const schedule = calculateAmortizationSchedule(100000, 10, 5, 0);
      expect(schedule[schedule.length - 1].endingBalance).toBeCloseTo(0, 0);
    });

    it('should handle grace period correctly', () => {
      const schedule = calculateAmortizationSchedule(100000, 10, 5, 2);
      expect(schedule[0].principal).toBe(0);
      expect(schedule[1].principal).toBe(0);
      expect(schedule[2].principal).toBeGreaterThan(0);
    });

    it('should calculate interest correctly', () => {
      const schedule = calculateAmortizationSchedule(100000, 10, 5, 0);
      expect(schedule[0].interest).toBe(10000);
    });
  });

  describe('calculateDebtService', () => {
    it('should calculate total debt service for multiple loans', () => {
      const loans = [
        {
          type: 'loan',
          amount: 100000,
          interestRate: 10,
          termYears: 5,
          gracePeriod: 0,
          repaymentStartYear: 1,
        },
        {
          type: 'loan',
          amount: 50000,
          interestRate: 8,
          termYears: 5,
          gracePeriod: 0,
          repaymentStartYear: 1,
        },
      ];
      const debtService = calculateDebtService(loans, 1);
      expect(debtService.principal).toBeGreaterThan(0);
      expect(debtService.interest).toBeGreaterThan(0);
      expect(debtService.total).toBe(debtService.principal + debtService.interest);
    });

    it('should ignore non-loan financing types', () => {
      const financing = [
        {
          type: 'equity',
          amount: 100000,
          interestRate: 0,
          termYears: 0,
          gracePeriod: 0,
          repaymentStartYear: 1,
        },
      ];
      const debtService = calculateDebtService(financing, 1);
      expect(debtService.principal).toBe(0);
      expect(debtService.interest).toBe(0);
    });

    it('should return zero before repayment start year', () => {
      const loans = [
        {
          type: 'loan',
          amount: 100000,
          interestRate: 10,
          termYears: 5,
          gracePeriod: 0,
          repaymentStartYear: 3,
        },
      ];
      const debtService = calculateDebtService(loans, 1);
      expect(debtService.principal).toBe(0);
    });
  });
});
