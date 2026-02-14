import { useState } from 'react';
import { useProjectStore } from '../../hooks/useProjectStore';
import { reportsApi } from '../../services/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { FileText, FileSpreadsheet, Download, CheckSquare, Square } from 'lucide-react';

interface ReportsModuleProps {
  projectId: string;
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

export default function ReportsModule({ projectId }: ReportsModuleProps) {
  const { currentProject } = useProjectStore();
  const [isGenerating, setIsGenerating] = useState(false);
  const [config, setConfig] = useState<ReportConfig>({
    includeExecutiveSummary: true,
    includeInvestment: true,
    includeProduction: true,
    includeCosts: true,
    includeFinancing: true,
    includeFinancialStatements: true,
    includeIndicators: true,
    includeSensitivity: false,
    includeScenarios: false,
  });

  const toggleSection = (key: keyof ReportConfig) => {
    setConfig(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const sections = [
    { key: 'includeExecutiveSummary' as const, label: 'Executive Summary', description: 'Project overview and key recommendations' },
    { key: 'includeInvestment' as const, label: 'Investment Plan', description: 'Capital expenditures and depreciation schedules' },
    { key: 'includeProduction' as const, label: 'Production & Revenue', description: 'Sales forecasts and revenue projections' },
    { key: 'includeCosts' as const, label: 'Operating Costs', description: 'Fixed and variable cost breakdown' },
    { key: 'includeFinancing' as const, label: 'Financing Structure', description: 'Equity, loans, and debt service' },
    { key: 'includeFinancialStatements' as const, label: 'Financial Statements', description: 'Cash flow, income statement projections' },
    { key: 'includeIndicators' as const, label: 'Financial Indicators', description: 'NPV, IRR, payback, and other metrics' },
    { key: 'includeSensitivity' as const, label: 'Sensitivity Analysis', description: 'Variable impact on project viability' },
    { key: 'includeScenarios' as const, label: 'Scenario Analysis', description: 'Best, base, and worst case comparisons' },
  ];

  const generatePdf = async () => {
    setIsGenerating(true);
    try {
      const blob = await reportsApi.generatePdf(projectId, { ...config, projectId, format: 'pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${currentProject?.name || 'Project'}_Report.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Failed to generate PDF:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const generateExcel = async () => {
    setIsGenerating(true);
    try {
      const blob = await reportsApi.generateExcel(projectId, { ...config, projectId, format: 'excel' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${currentProject?.name || 'Project'}_Report.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Failed to generate Excel:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const selectAll = () => {
    const allSelected = Object.values(config).every(v => v);
    const newValue = !allSelected;
    setConfig({
      includeExecutiveSummary: newValue,
      includeInvestment: newValue,
      includeProduction: newValue,
      includeCosts: newValue,
      includeFinancing: newValue,
      includeFinancialStatements: newValue,
      includeIndicators: newValue,
      includeSensitivity: newValue,
      includeScenarios: newValue,
    });
  };

  return (
    <div className="space-y-6">
      {/* Report Configuration */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Report Configuration</CardTitle>
              <CardDescription>Select the sections to include in your report</CardDescription>
            </div>
            <button
              onClick={selectAll}
              className="text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400"
            >
              {Object.values(config).every(v => v) ? 'Deselect All' : 'Select All'}
            </button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sections.map((section) => (
              <div
                key={section.key}
                onClick={() => toggleSection(section.key)}
                className={`p-4 rounded-lg border-2 cursor-pointer transition-colors ${
                  config[section.key]
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <div className="flex items-start space-x-3">
                  {config[section.key] ? (
                    <CheckSquare className="w-5 h-5 text-primary-500 flex-shrink-0 mt-0.5" />
                  ) : (
                    <Square className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
                  )}
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">{section.label}</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">{section.description}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Export Options */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* PDF Export */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-start space-x-4">
              <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-lg">
                <FileText className="w-8 h-8 text-red-600 dark:text-red-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">PDF Report</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Generate a professional PDF report with charts and tables. Ideal for presentations and formal submissions.
                </p>
                <Button
                  onClick={generatePdf}
                  isLoading={isGenerating}
                  className="mt-4"
                  leftIcon={<Download className="w-4 h-4" />}
                >
                  Download PDF
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Excel Export */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-start space-x-4">
              <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <FileSpreadsheet className="w-8 h-8 text-green-600 dark:text-green-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Excel Report</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Export to Excel with formulas and multiple worksheets. Perfect for detailed analysis and data manipulation.
                </p>
                <Button
                  onClick={generateExcel}
                  isLoading={isGenerating}
                  className="mt-4"
                  variant="secondary"
                  leftIcon={<Download className="w-4 h-4" />}
                >
                  Download Excel
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Report Preview Info */}
      <Card>
        <CardHeader>
          <CardTitle>Report Contents</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="prose dark:prose-invert max-w-none">
            <p className="text-gray-600 dark:text-gray-400">
              The generated report will include:
            </p>
            <ul className="text-gray-600 dark:text-gray-400 space-y-2">
              {config.includeExecutiveSummary && (
                <li>Executive Summary with project overview and key financial metrics</li>
              )}
              {config.includeInvestment && (
                <li>Investment plan with fixed assets, pre-production costs, and depreciation schedules</li>
              )}
              {config.includeProduction && (
                <li>Production capacity, products, and revenue projections by year</li>
              )}
              {config.includeCosts && (
                <li>Operating cost breakdown by category (fixed and variable)</li>
              )}
              {config.includeFinancing && (
                <li>Financing structure including equity, loans, and amortization schedules</li>
              )}
              {config.includeFinancialStatements && (
                <li>Projected cash flow statements and income statements</li>
              )}
              {config.includeIndicators && (
                <li>Financial indicators: NPV, IRR, MIRR, payback period, ROI, BCR</li>
              )}
              {config.includeSensitivity && (
                <li>Sensitivity analysis showing impact of variable changes on NPV/IRR</li>
              )}
              {config.includeScenarios && (
                <li>Scenario analysis comparing best, base, and worst case outcomes</li>
              )}
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
