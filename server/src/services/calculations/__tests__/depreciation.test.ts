import {
  straightLineDepreciation,
  decliningBalanceDepreciation,
  calculateDepreciation,
  calculateAccumulatedDepreciation,
} from '../depreciation';

describe('Depreciation Calculations', () => {
  describe('straightLineDepreciation', () => {
    it('should calculate straight line depreciation correctly', () => {
      const depreciation = straightLineDepreciation(10000, 1000, 10);
      expect(depreciation).toBe(900);
    });

    it('should return 0 for zero useful life', () => {
      const depreciation = straightLineDepreciation(10000, 1000, 0);
      expect(depreciation).toBe(0);
    });

    it('should handle zero salvage value', () => {
      const depreciation = straightLineDepreciation(10000, 0, 10);
      expect(depreciation).toBe(1000);
    });
  });

  describe('decliningBalanceDepreciation', () => {
    it('should calculate declining balance depreciation for year 1', () => {
      const depreciation = decliningBalanceDepreciation(10000, 1000, 20, 1, 10);
      expect(depreciation).toBe(2000);
    });

    it('should decrease over time', () => {
      const year1 = decliningBalanceDepreciation(10000, 1000, 20, 1, 10);
      const year2 = decliningBalanceDepreciation(10000, 1000, 20, 2, 10);
      expect(year2).toBeLessThan(year1);
    });

    it('should return 0 after useful life', () => {
      const depreciation = decliningBalanceDepreciation(10000, 1000, 20, 11, 10);
      expect(depreciation).toBe(0);
    });
  });

  describe('calculateDepreciation', () => {
    it('should calculate straight line depreciation', () => {
      const depreciation = calculateDepreciation(10000, 1000, 10, 10, 'straight_line', 2, 1);
      expect(depreciation).toBe(900);
    });

    it('should calculate declining balance depreciation', () => {
      const depreciation = calculateDepreciation(10000, 1000, 10, 20, 'declining_balance', 2, 1);
      expect(depreciation).toBeGreaterThan(0);
    });

    it('should return 0 for none method', () => {
      const depreciation = calculateDepreciation(10000, 1000, 10, 10, 'none', 2, 1);
      expect(depreciation).toBe(0);
    });

    it('should return 0 before purchase year', () => {
      const depreciation = calculateDepreciation(10000, 1000, 10, 10, 'straight_line', 0, 1);
      expect(depreciation).toBe(0);
    });

    it('should return 0 after useful life', () => {
      const depreciation = calculateDepreciation(10000, 1000, 5, 10, 'straight_line', 10, 1);
      expect(depreciation).toBe(0);
    });
  });

  describe('calculateAccumulatedDepreciation', () => {
    it('should accumulate straight line depreciation', () => {
      const accumulated = calculateAccumulatedDepreciation(10000, 1000, 10, 10, 'straight_line', 5, 1);
      expect(accumulated).toBe(4500);
    });

    it('should not exceed depreciable amount', () => {
      const accumulated = calculateAccumulatedDepreciation(10000, 1000, 5, 10, 'straight_line', 20, 1);
      expect(accumulated).toBe(9000);
    });

    it('should return 0 for none method', () => {
      const accumulated = calculateAccumulatedDepreciation(10000, 1000, 10, 10, 'none', 5, 1);
      expect(accumulated).toBe(0);
    });
  });
});
