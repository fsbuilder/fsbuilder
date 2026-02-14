import {
  calculateNPV,
  calculateIRR,
  calculateMIRR,
  calculatePaybackPeriod,
  calculateDiscountedPaybackPeriod,
  calculateROI,
  calculateBenefitCostRatio,
  calculateBreakEven,
} from '../indicators';

describe('Financial Indicators', () => {
  describe('calculateNPV', () => {
    it('should calculate NPV correctly for positive cash flows', () => {
      const cashFlows = [-1000, 300, 400, 500, 600];
      const discountRate = 10;
      const npv = calculateNPV(cashFlows, discountRate);
      expect(npv).toBeCloseTo(388.97, 0);
    });

    it('should return negative NPV for insufficient returns', () => {
      const cashFlows = [-1000, 100, 100, 100, 100];
      const discountRate = 10;
      const npv = calculateNPV(cashFlows, discountRate);
      expect(npv).toBeLessThan(0);
    });

    it('should handle zero discount rate', () => {
      const cashFlows = [-1000, 500, 500, 500];
      const npv = calculateNPV(cashFlows, 0);
      expect(npv).toBe(500);
    });
  });

  describe('calculateIRR', () => {
    it('should calculate IRR correctly', () => {
      const cashFlows = [-1000, 300, 400, 500, 600];
      const irr = calculateIRR(cashFlows);
      expect(irr).toBeCloseTo(25, 0);
    });

    it('should return IRR close to zero for break-even cash flows', () => {
      const cashFlows = [-1000, 250, 250, 250, 250];
      const irr = calculateIRR(cashFlows);
      expect(irr).toBeCloseTo(0, 0);
    });
  });

  describe('calculateMIRR', () => {
    it('should calculate MIRR correctly', () => {
      const cashFlows = [-1000, 300, 400, 500, 600];
      const mirr = calculateMIRR(cashFlows, 10, 10);
      expect(mirr).toBeGreaterThan(0);
      expect(mirr).toBeLessThan(calculateIRR(cashFlows));
    });
  });

  describe('calculatePaybackPeriod', () => {
    it('should calculate payback period correctly', () => {
      const cashFlows = [-1000, 300, 400, 500, 600];
      const payback = calculatePaybackPeriod(cashFlows);
      expect(payback).toBeCloseTo(2.6, 1);
    });

    it('should return -1 when project never pays back', () => {
      const cashFlows = [-1000, 100, 100, 100, 100];
      const payback = calculatePaybackPeriod(cashFlows);
      expect(payback).toBe(-1);
    });

    it('should return 0 for non-negative initial investment', () => {
      const cashFlows = [0, 100, 200];
      const payback = calculatePaybackPeriod(cashFlows);
      expect(payback).toBe(0);
    });
  });

  describe('calculateDiscountedPaybackPeriod', () => {
    it('should calculate discounted payback period correctly', () => {
      const cashFlows = [-1000, 400, 500, 600, 700];
      const payback = calculateDiscountedPaybackPeriod(cashFlows, 10);
      expect(payback).toBeGreaterThan(2);
      expect(payback).toBeLessThan(4);
    });

    it('should be longer than simple payback', () => {
      const cashFlows = [-1000, 300, 400, 500, 600];
      const simplePayback = calculatePaybackPeriod(cashFlows);
      const discountedPayback = calculateDiscountedPaybackPeriod(cashFlows, 10);
      expect(discountedPayback).toBeGreaterThan(simplePayback);
    });
  });

  describe('calculateROI', () => {
    it('should calculate ROI correctly', () => {
      const roi = calculateROI(500, 1000);
      expect(roi).toBe(50);
    });

    it('should return 0 for zero investment', () => {
      const roi = calculateROI(500, 0);
      expect(roi).toBe(0);
    });

    it('should handle negative returns', () => {
      const roi = calculateROI(-200, 1000);
      expect(roi).toBe(-20);
    });
  });

  describe('calculateBenefitCostRatio', () => {
    it('should calculate BCR correctly', () => {
      const bcr = calculateBenefitCostRatio(1500, 1000);
      expect(bcr).toBe(1.5);
    });

    it('should return 0 for zero costs', () => {
      const bcr = calculateBenefitCostRatio(1000, 0);
      expect(bcr).toBe(0);
    });
  });

  describe('calculateBreakEven', () => {
    it('should calculate break-even correctly', () => {
      const result = calculateBreakEven(10000, 100, 60);
      expect(result.units).toBe(250);
      expect(result.revenue).toBe(25000);
    });

    it('should return -1 when contribution margin is zero', () => {
      const result = calculateBreakEven(10000, 100, 100);
      expect(result.units).toBe(-1);
      expect(result.revenue).toBe(-1);
    });

    it('should return -1 when variable cost exceeds price', () => {
      const result = calculateBreakEven(10000, 80, 100);
      expect(result.units).toBe(-1);
    });
  });
});
