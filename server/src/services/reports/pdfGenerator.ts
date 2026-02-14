import PDFDocument from 'pdfkit';
import { Project, Investment, Product, OperatingCost, Financing } from '@prisma/client';
import { CashFlowYear, IncomeStatementYear, FinancialIndicators } from '../../types';

interface ReportData {
  project: Project;
  investments: Investment[];
  products: (Product & { productionSchedule: any[] })[];
  operatingCosts: OperatingCost[];
  financing: Financing[];
  cashFlows: CashFlowYear[];
  incomeStatements: IncomeStatementYear[];
  indicators: FinancialIndicators;
}

interface ReportConfig {
  includeExecutiveSummary: boolean;
  includeInvestment: boolean;
  includeProduction: boolean;
  includeCosts: boolean;
  includeFinancing: boolean;
  includeFinancialStatements: boolean;
  includeIndicators: boolean;
  includeSensitivity: boolean;
  includeScenarios: boolean;
}

export function generatePdfReport(data: ReportData, config: ReportConfig): PDFKit.PDFDocument {
  const doc = new PDFDocument({ margin: 50 });

  // Title Page
  doc.fontSize(28).text('Project Feasibility Report', { align: 'center' });
  doc.moveDown();
  doc.fontSize(20).text(data.project.name, { align: 'center' });
  doc.moveDown();
  doc.fontSize(12).text(`Sector: ${data.project.sector}`, { align: 'center' });
  doc.text(`Location: ${data.project.location}`, { align: 'center' });
  doc.text(`Date: ${new Date().toLocaleDateString()}`, { align: 'center' });
  
  doc.addPage();

  // Table of Contents
  doc.fontSize(18).text('Table of Contents');
  doc.moveDown();
  doc.fontSize(12);
  let tocItems = ['1. Executive Summary'];
  if (config.includeInvestment) tocItems.push('2. Investment Plan');
  if (config.includeProduction) tocItems.push('3. Production & Revenue');
  if (config.includeCosts) tocItems.push('4. Operating Costs');
  if (config.includeFinancing) tocItems.push('5. Financing Structure');
  if (config.includeFinancialStatements) tocItems.push('6. Financial Projections');
  if (config.includeIndicators) tocItems.push('7. Financial Indicators');
  
  tocItems.forEach(item => {
    doc.text(item);
  });

  doc.addPage();

  // Executive Summary
  if (config.includeExecutiveSummary) {
    addExecutiveSummary(doc, data);
    doc.addPage();
  }

  // Investment Section
  if (config.includeInvestment) {
    addInvestmentSection(doc, data);
    doc.addPage();
  }

  // Production & Revenue
  if (config.includeProduction) {
    addProductionSection(doc, data);
    doc.addPage();
  }

  // Operating Costs
  if (config.includeCosts) {
    addCostsSection(doc, data);
    doc.addPage();
  }

  // Financing
  if (config.includeFinancing) {
    addFinancingSection(doc, data);
    doc.addPage();
  }

  // Financial Projections
  if (config.includeFinancialStatements) {
    addFinancialProjections(doc, data);
    doc.addPage();
  }

  // Financial Indicators
  if (config.includeIndicators) {
    addIndicatorsSection(doc, data);
  }

  return doc;
}

function addExecutiveSummary(doc: PDFKit.PDFDocument, data: ReportData) {
  doc.fontSize(18).text('1. Executive Summary');
  doc.moveDown();

  doc.fontSize(12);
  doc.text(`Project: ${data.project.name}`);
  doc.text(`Description: ${data.project.description || 'N/A'}`);
  doc.moveDown();

  // Key Parameters
  doc.fontSize(14).text('Key Parameters');
  doc.fontSize(12);
  doc.text(`Construction Period: ${data.project.constructionYears} year(s)`);
  doc.text(`Operation Period: ${data.project.operationYears} year(s)`);
  doc.text(`Discount Rate: ${data.project.discountRate}%`);
  doc.text(`Tax Rate: ${data.project.taxRate}%`);
  doc.moveDown();

  // Key Indicators
  doc.fontSize(14).text('Key Financial Indicators');
  doc.fontSize(12);
  doc.text(`Net Present Value (NPV): ${formatCurrency(data.indicators.npv, data.project.currency)}`);
  doc.text(`Internal Rate of Return (IRR): ${data.indicators.irr.toFixed(2)}%`);
  doc.text(`Payback Period: ${data.indicators.paybackPeriod.toFixed(1)} years`);
  doc.text(`Return on Investment (ROI): ${data.indicators.roi.toFixed(2)}%`);
  doc.moveDown();

  // Investment Summary
  const totalInvestment = data.investments.reduce((sum, inv) => sum + inv.amount, 0);
  doc.fontSize(14).text('Investment Summary');
  doc.fontSize(12);
  doc.text(`Total Investment: ${formatCurrency(totalInvestment, data.project.currency)}`);
  doc.moveDown();

  // Recommendation
  doc.fontSize(14).text('Recommendation');
  doc.fontSize(12);
  if (data.indicators.npv > 0 && data.indicators.irr > data.project.discountRate) {
    doc.text('Based on the financial analysis, this project appears to be financially viable.', {
      align: 'justify',
    });
    doc.text(`The NPV is positive and the IRR (${data.indicators.irr.toFixed(2)}%) exceeds the discount rate (${data.project.discountRate}%).`);
  } else {
    doc.text('Based on the financial analysis, this project requires further consideration.', {
      align: 'justify',
    });
    if (data.indicators.npv <= 0) {
      doc.text('The NPV is negative, indicating the project may not generate adequate returns.');
    }
    if (data.indicators.irr <= data.project.discountRate) {
      doc.text(`The IRR (${data.indicators.irr.toFixed(2)}%) is below the required discount rate (${data.project.discountRate}%).`);
    }
  }
}

function addInvestmentSection(doc: PDFKit.PDFDocument, data: ReportData) {
  doc.fontSize(18).text('2. Investment Plan');
  doc.moveDown();

  // Group investments by category
  const byCategory = new Map<string, Investment[]>();
  data.investments.forEach(inv => {
    const existing = byCategory.get(inv.category) || [];
    existing.push(inv);
    byCategory.set(inv.category, existing);
  });

  byCategory.forEach((investments, category) => {
    doc.fontSize(14).text(formatCategory(category));
    doc.fontSize(12);

    investments.forEach(inv => {
      doc.text(`  ${inv.description}: ${formatCurrency(inv.amount, data.project.currency)} (Year ${inv.year})`);
    });

    const categoryTotal = investments.reduce((sum, inv) => sum + inv.amount, 0);
    doc.text(`  Subtotal: ${formatCurrency(categoryTotal, data.project.currency)}`, { underline: true });
    doc.moveDown();
  });

  const totalInvestment = data.investments.reduce((sum, inv) => sum + inv.amount, 0);
  doc.fontSize(14).text(`Total Investment: ${formatCurrency(totalInvestment, data.project.currency)}`);
}

function addProductionSection(doc: PDFKit.PDFDocument, data: ReportData) {
  doc.fontSize(18).text('3. Production & Revenue');
  doc.moveDown();

  data.products.forEach(product => {
    doc.fontSize(14).text(product.name);
    doc.fontSize(12);
    doc.text(`Unit: ${product.unit}`);
    doc.text(`Unit Price: ${formatCurrency(product.unitPrice, data.project.currency)}`);
    doc.text(`Installed Capacity: ${product.installedCapacity} ${product.capacityUnit}`);
    doc.text(`Price Escalation: ${product.priceEscalation}%/year`);
    doc.moveDown();

    if (product.productionSchedule.length > 0) {
      doc.text('Production Schedule:');
      product.productionSchedule.slice(0, 5).forEach(schedule => {
        doc.text(`  Year ${schedule.year}: ${schedule.quantity} units (${schedule.capacityUtilization}% capacity)`);
      });
      if (product.productionSchedule.length > 5) {
        doc.text(`  ... and ${product.productionSchedule.length - 5} more years`);
      }
    }
    doc.moveDown();
  });
}

function addCostsSection(doc: PDFKit.PDFDocument, data: ReportData) {
  doc.fontSize(18).text('4. Operating Costs');
  doc.moveDown();

  const fixedCosts = data.operatingCosts.filter(c => c.costType === 'fixed');
  const variableCosts = data.operatingCosts.filter(c => c.costType === 'variable');

  doc.fontSize(14).text('Fixed Costs');
  doc.fontSize(12);
  fixedCosts.forEach(cost => {
    doc.text(`${cost.description}: ${formatCurrency(cost.amount, data.project.currency)}/year`);
  });
  const totalFixed = fixedCosts.reduce((sum, c) => sum + c.amount, 0);
  doc.text(`Total Fixed Costs: ${formatCurrency(totalFixed, data.project.currency)}/year`, { underline: true });
  doc.moveDown();

  doc.fontSize(14).text('Variable Costs');
  doc.fontSize(12);
  variableCosts.forEach(cost => {
    doc.text(`${cost.description}: ${formatCurrency(cost.amount, data.project.currency)}/year`);
  });
  const totalVariable = variableCosts.reduce((sum, c) => sum + c.amount, 0);
  doc.text(`Total Variable Costs: ${formatCurrency(totalVariable, data.project.currency)}/year`, { underline: true });
}

function addFinancingSection(doc: PDFKit.PDFDocument, data: ReportData) {
  doc.fontSize(18).text('5. Financing Structure');
  doc.moveDown();

  const equity = data.financing.filter(f => f.type === 'equity');
  const loans = data.financing.filter(f => f.type === 'loan');
  const grants = data.financing.filter(f => f.type === 'grant');

  if (equity.length > 0) {
    doc.fontSize(14).text('Equity');
    doc.fontSize(12);
    equity.forEach(f => {
      doc.text(`${f.name}: ${formatCurrency(f.amount, data.project.currency)}`);
    });
    doc.moveDown();
  }

  if (loans.length > 0) {
    doc.fontSize(14).text('Loans');
    doc.fontSize(12);
    loans.forEach(f => {
      doc.text(`${f.name}: ${formatCurrency(f.amount, data.project.currency)}`);
      doc.text(`  Interest Rate: ${f.interestRate}% | Term: ${f.termYears} years | Grace Period: ${f.gracePeriod} years`);
    });
    doc.moveDown();
  }

  if (grants.length > 0) {
    doc.fontSize(14).text('Grants & Subsidies');
    doc.fontSize(12);
    grants.forEach(f => {
      doc.text(`${f.name}: ${formatCurrency(f.amount, data.project.currency)}`);
    });
    doc.moveDown();
  }

  const totalFinancing = data.financing.reduce((sum, f) => sum + f.amount, 0);
  doc.fontSize(14).text(`Total Financing: ${formatCurrency(totalFinancing, data.project.currency)}`);
}

function addFinancialProjections(doc: PDFKit.PDFDocument, data: ReportData) {
  doc.fontSize(18).text('6. Financial Projections');
  doc.moveDown();

  // Cash Flow Summary
  doc.fontSize(14).text('Cash Flow Summary');
  doc.fontSize(10);

  const cashFlowYears = data.cashFlows.slice(0, 6);
  doc.text('Year'.padEnd(10) + cashFlowYears.map(cf => `Year ${cf.year}`.padStart(12)).join(''));
  doc.text('Net CF'.padEnd(10) + cashFlowYears.map(cf => formatCompact(cf.netCashFlow).padStart(12)).join(''));
  doc.text('Cumulative'.padEnd(10) + cashFlowYears.map(cf => formatCompact(cf.cumulativeCashFlow).padStart(12)).join(''));
  doc.moveDown();

  // Income Statement Summary
  doc.fontSize(14).text('Income Statement Summary');
  doc.fontSize(10);

  const incomeYears = data.incomeStatements.slice(0, 6);
  doc.text('Year'.padEnd(10) + incomeYears.map(is => `Year ${is.year}`.padStart(12)).join(''));
  doc.text('Revenue'.padEnd(10) + incomeYears.map(is => formatCompact(is.revenue).padStart(12)).join(''));
  doc.text('Net Income'.padEnd(10) + incomeYears.map(is => formatCompact(is.netIncome).padStart(12)).join(''));
}

function addIndicatorsSection(doc: PDFKit.PDFDocument, data: ReportData) {
  doc.fontSize(18).text('7. Financial Indicators');
  doc.moveDown();

  doc.fontSize(14).text('Profitability Indicators');
  doc.fontSize(12);
  doc.text(`Net Present Value (NPV): ${formatCurrency(data.indicators.npv, data.project.currency)}`);
  doc.text(`Internal Rate of Return (IRR): ${data.indicators.irr.toFixed(2)}%`);
  doc.text(`Modified IRR (MIRR): ${data.indicators.mirr.toFixed(2)}%`);
  doc.text(`Return on Investment (ROI): ${data.indicators.roi.toFixed(2)}%`);
  doc.text(`Benefit-Cost Ratio: ${data.indicators.benefitCostRatio.toFixed(2)}`);
  doc.moveDown();

  doc.fontSize(14).text('Payback Analysis');
  doc.fontSize(12);
  doc.text(`Simple Payback Period: ${data.indicators.paybackPeriod.toFixed(1)} years`);
  doc.text(`Discounted Payback Period: ${data.indicators.discountedPaybackPeriod.toFixed(1)} years`);
  doc.moveDown();

  doc.fontSize(14).text('Break-Even Analysis');
  doc.fontSize(12);
  if (data.indicators.breakEvenUnits > 0) {
    doc.text(`Break-Even Units: ${data.indicators.breakEvenUnits.toFixed(0)} units`);
    doc.text(`Break-Even Revenue: ${formatCurrency(data.indicators.breakEvenRevenue, data.project.currency)}`);
  } else {
    doc.text('Break-even analysis not applicable with current data');
  }
}

function formatCurrency(value: number, currency: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatCompact(value: number): string {
  if (Math.abs(value) >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M`;
  }
  if (Math.abs(value) >= 1_000) {
    return `${(value / 1_000).toFixed(1)}K`;
  }
  return value.toFixed(0);
}

function formatCategory(category: string): string {
  return category
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
