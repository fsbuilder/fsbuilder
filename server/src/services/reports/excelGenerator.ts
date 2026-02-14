import ExcelJS from 'exceljs';
import { Project, Investment, Product, OperatingCost, Financing } from '@prisma/client';
import { CashFlowYear, IncomeStatementYear, BalanceSheetYear, FinancialIndicators } from '../../types';

interface ReportData {
  project: Project;
  investments: Investment[];
  products: (Product & { productionSchedule: any[] })[];
  operatingCosts: OperatingCost[];
  financing: Financing[];
  cashFlows: CashFlowYear[];
  incomeStatements: IncomeStatementYear[];
  balanceSheets: BalanceSheetYear[];
  indicators: FinancialIndicators;
}

export async function generateExcelReport(data: ReportData): Promise<ExcelJS.Workbook> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'FS Builder';
  workbook.created = new Date();

  // Summary Sheet
  addSummarySheet(workbook, data);

  // Investment Sheet
  addInvestmentSheet(workbook, data);

  // Revenue Sheet
  addRevenueSheet(workbook, data);

  // Operating Costs Sheet
  addCostsSheet(workbook, data);

  // Financing Sheet
  addFinancingSheet(workbook, data);

  // Cash Flow Sheet
  addCashFlowSheet(workbook, data);

  // Income Statement Sheet
  addIncomeStatementSheet(workbook, data);

  // Balance Sheet
  addBalanceSheet(workbook, data);

  // Indicators Sheet
  addIndicatorsSheet(workbook, data);

  return workbook;
}

function addSummarySheet(workbook: ExcelJS.Workbook, data: ReportData) {
  const sheet = workbook.addWorksheet('Summary');

  // Title
  sheet.mergeCells('A1:D1');
  const titleCell = sheet.getCell('A1');
  titleCell.value = 'Project Feasibility Summary';
  titleCell.font = { bold: true, size: 16 };
  titleCell.alignment = { horizontal: 'center' };

  // Project Info
  sheet.getCell('A3').value = 'Project Name:';
  sheet.getCell('B3').value = data.project.name;
  sheet.getCell('A4').value = 'Sector:';
  sheet.getCell('B4').value = data.project.sector;
  sheet.getCell('A5').value = 'Location:';
  sheet.getCell('B5').value = data.project.location;
  sheet.getCell('A6').value = 'Currency:';
  sheet.getCell('B6').value = data.project.currency;

  // Key Parameters
  sheet.getCell('A8').value = 'Key Parameters';
  sheet.getCell('A8').font = { bold: true };
  sheet.getCell('A9').value = 'Construction Years:';
  sheet.getCell('B9').value = data.project.constructionYears;
  sheet.getCell('A10').value = 'Operation Years:';
  sheet.getCell('B10').value = data.project.operationYears;
  sheet.getCell('A11').value = 'Discount Rate:';
  sheet.getCell('B11').value = data.project.discountRate / 100;
  sheet.getCell('B11').numFmt = '0.00%';
  sheet.getCell('A12').value = 'Tax Rate:';
  sheet.getCell('B12').value = data.project.taxRate / 100;
  sheet.getCell('B12').numFmt = '0.00%';

  // Key Indicators
  sheet.getCell('A14').value = 'Key Financial Indicators';
  sheet.getCell('A14').font = { bold: true };
  sheet.getCell('A15').value = 'NPV:';
  sheet.getCell('B15').value = data.indicators.npv;
  sheet.getCell('B15').numFmt = '#,##0';
  sheet.getCell('A16').value = 'IRR:';
  sheet.getCell('B16').value = data.indicators.irr / 100;
  sheet.getCell('B16').numFmt = '0.00%';
  sheet.getCell('A17').value = 'MIRR:';
  sheet.getCell('B17').value = data.indicators.mirr / 100;
  sheet.getCell('B17').numFmt = '0.00%';
  sheet.getCell('A18').value = 'Payback Period:';
  sheet.getCell('B18').value = data.indicators.paybackPeriod;
  sheet.getCell('B18').numFmt = '0.0';
  sheet.getCell('A19').value = 'ROI:';
  sheet.getCell('B19').value = data.indicators.roi / 100;
  sheet.getCell('B19').numFmt = '0.00%';

  // Column widths
  sheet.getColumn('A').width = 25;
  sheet.getColumn('B').width = 20;
}

function addInvestmentSheet(workbook: ExcelJS.Workbook, data: ReportData) {
  const sheet = workbook.addWorksheet('Investment');

  // Headers
  const headers = ['Category', 'Description', 'Amount', 'Year', 'Useful Life', 'Salvage Value', 'Depreciation Method'];
  const headerRow = sheet.addRow(headers);
  headerRow.font = { bold: true };
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };

  // Data
  data.investments.forEach(inv => {
    sheet.addRow([
      formatCategory(inv.category),
      inv.description,
      inv.amount,
      inv.year,
      inv.usefulLife,
      inv.salvageValue,
      formatCategory(inv.depreciationMethod),
    ]);
  });

  // Total
  const totalRow = sheet.addRow(['Total', '', { formula: `SUM(C2:C${data.investments.length + 1})` }]);
  totalRow.font = { bold: true };

  // Formatting
  sheet.getColumn('C').numFmt = '#,##0';
  sheet.getColumn('F').numFmt = '#,##0';
  sheet.columns.forEach(col => { col.width = 15; });
}

function addRevenueSheet(workbook: ExcelJS.Workbook, data: ReportData) {
  const sheet = workbook.addWorksheet('Revenue');

  // Product headers
  const headers = ['Product', 'Unit', 'Unit Price', 'Price Escalation', 'Capacity', 'Capacity Unit'];
  const headerRow = sheet.addRow(headers);
  headerRow.font = { bold: true };
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };

  data.products.forEach(prod => {
    sheet.addRow([
      prod.name,
      prod.unit,
      prod.unitPrice,
      prod.priceEscalation / 100,
      prod.installedCapacity,
      prod.capacityUnit,
    ]);
  });

  // Production Schedule section
  sheet.addRow([]);
  sheet.addRow(['Production Schedule']);
  
  const scheduleHeaders = ['Product', 'Year', 'Capacity Utilization', 'Quantity'];
  const schedHeaderRow = sheet.addRow(scheduleHeaders);
  schedHeaderRow.font = { bold: true };

  data.products.forEach(prod => {
    prod.productionSchedule.forEach(sched => {
      sheet.addRow([prod.name, sched.year, sched.capacityUtilization / 100, sched.quantity]);
    });
  });

  // Formatting
  sheet.getColumn('C').numFmt = '#,##0.00';
  sheet.getColumn('D').numFmt = '0.00%';
  sheet.columns.forEach(col => { col.width = 18; });
}

function addCostsSheet(workbook: ExcelJS.Workbook, data: ReportData) {
  const sheet = workbook.addWorksheet('Operating Costs');

  const headers = ['Category', 'Description', 'Cost Type', 'Amount', 'Unit Cost', 'Escalation Rate', 'Start Year'];
  const headerRow = sheet.addRow(headers);
  headerRow.font = { bold: true };
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };

  data.operatingCosts.forEach(cost => {
    sheet.addRow([
      formatCategory(cost.category),
      cost.description,
      cost.costType,
      cost.amount,
      cost.unitCost,
      cost.escalationRate / 100,
      cost.startYear,
    ]);
  });

  // Totals
  const fixedTotal = data.operatingCosts.filter(c => c.costType === 'fixed').reduce((s, c) => s + c.amount, 0);
  const varTotal = data.operatingCosts.filter(c => c.costType === 'variable').reduce((s, c) => s + c.amount, 0);
  
  sheet.addRow([]);
  sheet.addRow(['Total Fixed Costs', '', '', fixedTotal]);
  sheet.addRow(['Total Variable Costs', '', '', varTotal]);

  sheet.getColumn('D').numFmt = '#,##0';
  sheet.getColumn('E').numFmt = '#,##0.00';
  sheet.getColumn('F').numFmt = '0.00%';
  sheet.columns.forEach(col => { col.width = 16; });
}

function addFinancingSheet(workbook: ExcelJS.Workbook, data: ReportData) {
  const sheet = workbook.addWorksheet('Financing');

  const headers = ['Type', 'Name', 'Amount', 'Interest Rate', 'Term (Years)', 'Grace Period', 'Disbursement Year'];
  const headerRow = sheet.addRow(headers);
  headerRow.font = { bold: true };
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };

  data.financing.forEach(fin => {
    sheet.addRow([
      fin.type.toUpperCase(),
      fin.name,
      fin.amount,
      fin.interestRate / 100,
      fin.termYears,
      fin.gracePeriod,
      fin.disbursementYear,
    ]);
  });

  const total = data.financing.reduce((s, f) => s + f.amount, 0);
  sheet.addRow([]);
  sheet.addRow(['Total Financing', '', total]);

  sheet.getColumn('C').numFmt = '#,##0';
  sheet.getColumn('D').numFmt = '0.00%';
  sheet.columns.forEach(col => { col.width = 18; });
}

function addCashFlowSheet(workbook: ExcelJS.Workbook, data: ReportData) {
  const sheet = workbook.addWorksheet('Cash Flow');

  const headers = ['Year', 'Operating Inflow', 'Operating Outflow', 'Investing Outflow', 'Financing Inflow', 'Financing Outflow', 'Net Cash Flow', 'Cumulative', 'Discounted CF'];
  const headerRow = sheet.addRow(headers);
  headerRow.font = { bold: true };
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };

  data.cashFlows.forEach(cf => {
    sheet.addRow([
      cf.year,
      cf.operatingInflow,
      cf.operatingOutflow,
      cf.investingOutflow,
      cf.financingInflow,
      cf.financingOutflow,
      cf.netCashFlow,
      cf.cumulativeCashFlow,
      cf.discountedCashFlow,
    ]);
  });

  // NPV Formula
  sheet.addRow([]);
  sheet.addRow(['NPV', '', '', '', '', '', '', '', { formula: `SUM(I2:I${data.cashFlows.length + 1})` }]);

  for (let i = 2; i <= 9; i++) {
    sheet.getColumn(i).numFmt = '#,##0';
    sheet.getColumn(i).width = 15;
  }
}

function addIncomeStatementSheet(workbook: ExcelJS.Workbook, data: ReportData) {
  const sheet = workbook.addWorksheet('Income Statement');

  const headers = ['Year', 'Revenue', 'COGS', 'Gross Profit', 'Operating Expenses', 'Depreciation', 'Operating Income', 'Interest Expense', 'Taxable Income', 'Taxes', 'Net Income'];
  const headerRow = sheet.addRow(headers);
  headerRow.font = { bold: true };
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };

  data.incomeStatements.forEach(is => {
    sheet.addRow([
      is.year,
      is.revenue,
      is.costOfGoodsSold,
      is.grossProfit,
      is.operatingExpenses,
      is.depreciation,
      is.operatingIncome,
      is.interestExpense,
      is.taxableIncome,
      is.taxes,
      is.netIncome,
    ]);
  });

  for (let i = 2; i <= 11; i++) {
    sheet.getColumn(i).numFmt = '#,##0';
    sheet.getColumn(i).width = 14;
  }
}

function addBalanceSheet(workbook: ExcelJS.Workbook, data: ReportData) {
  const sheet = workbook.addWorksheet('Balance Sheet');

  const headers = ['Year', 'Cash', 'Receivables', 'Inventory', 'Current Assets', 'Fixed Assets', 'Acc. Depreciation', 'Net Fixed Assets', 'Total Assets', 'Payables', 'Current Liabilities', 'Long-Term Debt', 'Total Liabilities', 'Share Capital', 'Retained Earnings', 'Total Equity'];
  const headerRow = sheet.addRow(headers);
  headerRow.font = { bold: true };
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };

  data.balanceSheets.forEach(bs => {
    sheet.addRow([
      bs.year,
      bs.cash,
      bs.receivables,
      bs.inventory,
      bs.currentAssets,
      bs.fixedAssets,
      bs.accumulatedDepreciation,
      bs.netFixedAssets,
      bs.totalAssets,
      bs.payables,
      bs.currentLiabilities,
      bs.longTermDebt,
      bs.totalLiabilities,
      bs.shareCapital,
      bs.retainedEarnings,
      bs.totalEquity,
    ]);
  });

  for (let i = 2; i <= 16; i++) {
    sheet.getColumn(i).numFmt = '#,##0';
    sheet.getColumn(i).width = 14;
  }
}

function addIndicatorsSheet(workbook: ExcelJS.Workbook, data: ReportData) {
  const sheet = workbook.addWorksheet('Indicators');

  sheet.addRow(['Financial Indicators']);
  sheet.getRow(1).font = { bold: true, size: 14 };
  sheet.addRow([]);

  sheet.addRow(['Profitability Indicators']);
  sheet.getRow(3).font = { bold: true };
  sheet.addRow(['Net Present Value (NPV)', data.indicators.npv]);
  sheet.addRow(['Internal Rate of Return (IRR)', data.indicators.irr / 100]);
  sheet.addRow(['Modified IRR (MIRR)', data.indicators.mirr / 100]);
  sheet.addRow(['Return on Investment (ROI)', data.indicators.roi / 100]);
  sheet.addRow(['Benefit-Cost Ratio', data.indicators.benefitCostRatio]);
  sheet.addRow([]);

  sheet.addRow(['Payback Analysis']);
  sheet.getRow(10).font = { bold: true };
  sheet.addRow(['Simple Payback Period (years)', data.indicators.paybackPeriod]);
  sheet.addRow(['Discounted Payback Period (years)', data.indicators.discountedPaybackPeriod]);
  sheet.addRow([]);

  sheet.addRow(['Break-Even Analysis']);
  sheet.getRow(14).font = { bold: true };
  sheet.addRow(['Break-Even Units', data.indicators.breakEvenUnits]);
  sheet.addRow(['Break-Even Revenue', data.indicators.breakEvenRevenue]);

  // Formatting
  sheet.getCell('B4').numFmt = '#,##0';
  sheet.getCell('B5').numFmt = '0.00%';
  sheet.getCell('B6').numFmt = '0.00%';
  sheet.getCell('B7').numFmt = '0.00%';
  sheet.getCell('B8').numFmt = '0.00';
  sheet.getCell('B11').numFmt = '0.0';
  sheet.getCell('B12').numFmt = '0.0';
  sheet.getCell('B15').numFmt = '#,##0';
  sheet.getCell('B16').numFmt = '#,##0';

  sheet.getColumn('A').width = 35;
  sheet.getColumn('B').width = 20;
}

function formatCategory(category: string): string {
  return category
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
