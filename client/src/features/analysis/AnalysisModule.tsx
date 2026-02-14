import { useState, useEffect } from 'react';
import { useProjectStore } from '../../hooks/useProjectStore';
import { analysisApi, scenariosApi } from '../../services/api';
import type { FinancialIndicators, CashFlowYear, IncomeStatementYear, SensitivityResult, Scenario } from '../../types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../components/ui/Tabs';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/Table';
import { formatCurrency, formatNumber, formatPercent } from '../../utils/format';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine
} from 'recharts';
import { RefreshCw, TrendingUp, Calculator, BarChart3, Target } from 'lucide-react';

interface AnalysisModuleProps {
  projectId: string;
}

export default function AnalysisModule({ projectId }: AnalysisModuleProps) {
  const { currentProject, setIndicators, indicators } = useProjectStore();
  const [cashFlows, setCashFlows] = useState<CashFlowYear[]>([]);
  const [incomeStatements, setIncomeStatements] = useState<IncomeStatementYear[]>([]);
  const [sensitivityResults, setSensitivityResults] = useState<SensitivityResult[]>([]);
  const [tornadoData, setTornadoData] = useState<any[]>([]);
  const [breakEvenData, setBreakEvenData] = useState<{ units: number; revenue: number; chartData: any[] } | null>(null);
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('indicators');

  const currency = currentProject?.currency || 'USD';

  useEffect(() => {
    loadAnalysis();
  }, [projectId]);

  const loadAnalysis = async () => {
    setIsLoading(true);
    try {
      const [indicatorsRes, cashFlowRes, incomeRes, breakEvenRes, scenariosRes] = await Promise.all([
        analysisApi.getIndicators(projectId),
        analysisApi.getCashFlow(projectId),
        analysisApi.getIncomeStatement(projectId),
        analysisApi.getBreakEven(projectId),
        scenariosApi.list(projectId),
      ]);

      if (indicatorsRes.success && indicatorsRes.data) {
        setIndicators(indicatorsRes.data);
      }
      if (cashFlowRes.success && cashFlowRes.data) {
        setCashFlows(cashFlowRes.data);
      }
      if (incomeRes.success && incomeRes.data) {
        setIncomeStatements(incomeRes.data);
      }
      if (breakEvenRes.success && breakEvenRes.data) {
        setBreakEvenData(breakEvenRes.data);
      }
      if (scenariosRes.success && scenariosRes.data) {
        setScenarios(scenariosRes.data);
      }
    } catch (error) {
      console.error('Failed to load analysis:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const runSensitivity = async () => {
    setIsLoading(true);
    try {
      const response = await analysisApi.getSensitivity(projectId, ['revenue', 'costs', 'investment']);
      if (response.success && response.data) {
        setSensitivityResults(response.data.results);
        setTornadoData(response.data.tornado);
      }
    } catch (error) {
      console.error('Failed to run sensitivity analysis:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getIndicatorColor = (value: number, threshold: number, inverse = false) => {
    if (inverse) {
      return value <= threshold ? 'text-green-600' : 'text-red-600';
    }
    return value >= threshold ? 'text-green-600' : 'text-red-600';
  };

  if (!indicators) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Calculator className="w-12 h-12 mx-auto text-gray-400 mb-4" />
          <p className="text-gray-500 dark:text-gray-400">Loading analysis...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Key Indicators Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="text-sm text-gray-500 dark:text-gray-400">NPV</div>
            <div className={`text-2xl font-bold mt-1 ${getIndicatorColor(indicators.npv, 0)}`}>
              {formatCurrency(indicators.npv, currency)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="text-sm text-gray-500 dark:text-gray-400">IRR</div>
            <div className={`text-2xl font-bold mt-1 ${getIndicatorColor(indicators.irr, currentProject?.discountRate || 10)}`}>
              {formatNumber(indicators.irr, 2)}%
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="text-sm text-gray-500 dark:text-gray-400">Payback Period</div>
            <div className={`text-2xl font-bold mt-1 ${getIndicatorColor(indicators.paybackPeriod, 5, true)}`}>
              {indicators.paybackPeriod > 0 ? `${formatNumber(indicators.paybackPeriod, 1)} yrs` : 'N/A'}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="text-sm text-gray-500 dark:text-gray-400">ROI</div>
            <div className={`text-2xl font-bold mt-1 ${getIndicatorColor(indicators.roi, 15)}`}>
              {formatNumber(indicators.roi, 2)}%
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Analysis Tabs */}
      <Tabs defaultValue="indicators" onChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="indicators">Indicators</TabsTrigger>
          <TabsTrigger value="cashflow">Cash Flow</TabsTrigger>
          <TabsTrigger value="income">Income Statement</TabsTrigger>
          <TabsTrigger value="sensitivity">Sensitivity</TabsTrigger>
          <TabsTrigger value="breakeven">Break-Even</TabsTrigger>
        </TabsList>

        {/* Indicators Tab */}
        <TabsContent value="indicators">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Profitability Indicators</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-gray-600 dark:text-gray-400">Net Present Value (NPV)</span>
                    <span className={`font-semibold ${getIndicatorColor(indicators.npv, 0)}`}>
                      {formatCurrency(indicators.npv, currency)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-gray-600 dark:text-gray-400">Internal Rate of Return (IRR)</span>
                    <span className={`font-semibold ${getIndicatorColor(indicators.irr, currentProject?.discountRate || 10)}`}>
                      {formatNumber(indicators.irr, 2)}%
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-gray-600 dark:text-gray-400">Modified IRR (MIRR)</span>
                    <span className="font-semibold">
                      {formatNumber(indicators.mirr, 2)}%
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-gray-600 dark:text-gray-400">Return on Investment (ROI)</span>
                    <span className={`font-semibold ${getIndicatorColor(indicators.roi, 15)}`}>
                      {formatNumber(indicators.roi, 2)}%
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-gray-600 dark:text-gray-400">Benefit-Cost Ratio</span>
                    <span className={`font-semibold ${getIndicatorColor(indicators.benefitCostRatio, 1)}`}>
                      {formatNumber(indicators.benefitCostRatio, 2)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Payback Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-gray-600 dark:text-gray-400">Simple Payback Period</span>
                    <span className="font-semibold">
                      {indicators.paybackPeriod > 0 ? `${formatNumber(indicators.paybackPeriod, 1)} years` : 'Never'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-gray-600 dark:text-gray-400">Discounted Payback Period</span>
                    <span className="font-semibold">
                      {indicators.discountedPaybackPeriod > 0 ? `${formatNumber(indicators.discountedPaybackPeriod, 1)} years` : 'Never'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-gray-600 dark:text-gray-400">Break-Even Units</span>
                    <span className="font-semibold">
                      {indicators.breakEvenUnits > 0 ? formatNumber(indicators.breakEvenUnits, 0) : 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-gray-600 dark:text-gray-400">Break-Even Revenue</span>
                    <span className="font-semibold">
                      {indicators.breakEvenRevenue > 0 ? formatCurrency(indicators.breakEvenRevenue, currency) : 'N/A'}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Cash Flow Tab */}
        <TabsContent value="cashflow">
          <Card>
            <CardHeader>
              <CardTitle>Cash Flow Projection</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80 mb-6">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={cashFlows}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="year" />
                    <YAxis tickFormatter={(value) => `${(value / 1000000).toFixed(1)}M`} />
                    <Tooltip formatter={(value: number) => formatCurrency(value, currency)} />
                    <Legend />
                    <Bar dataKey="netCashFlow" name="Net Cash Flow" fill="#3b82f6" />
                    <ReferenceLine y={0} stroke="#000" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={cashFlows}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="year" />
                    <YAxis tickFormatter={(value) => `${(value / 1000000).toFixed(1)}M`} />
                    <Tooltip formatter={(value: number) => formatCurrency(value, currency)} />
                    <Legend />
                    <Line type="monotone" dataKey="cumulativeCashFlow" name="Cumulative" stroke="#10b981" strokeWidth={2} />
                    <Line type="monotone" dataKey="discountedCashFlow" name="Discounted" stroke="#f59e0b" strokeWidth={2} />
                    <ReferenceLine y={0} stroke="#000" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Income Statement Tab */}
        <TabsContent value="income">
          <Card>
            <CardHeader>
              <CardTitle>Income Statement Projection</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80 mb-6">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={incomeStatements}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="year" />
                    <YAxis tickFormatter={(value) => `${(value / 1000000).toFixed(1)}M`} />
                    <Tooltip formatter={(value: number) => formatCurrency(value, currency)} />
                    <Legend />
                    <Line type="monotone" dataKey="revenue" name="Revenue" stroke="#3b82f6" strokeWidth={2} />
                    <Line type="monotone" dataKey="netIncome" name="Net Income" stroke="#10b981" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Year</TableHead>
                      <TableHead>Revenue</TableHead>
                      <TableHead>Gross Profit</TableHead>
                      <TableHead>Operating Income</TableHead>
                      <TableHead>Net Income</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {incomeStatements.slice(0, 10).map((is) => (
                      <TableRow key={is.year}>
                        <TableCell>{is.year}</TableCell>
                        <TableCell>{formatCurrency(is.revenue, currency)}</TableCell>
                        <TableCell>{formatCurrency(is.grossProfit, currency)}</TableCell>
                        <TableCell>{formatCurrency(is.operatingIncome, currency)}</TableCell>
                        <TableCell className={is.netIncome >= 0 ? 'text-green-600' : 'text-red-600'}>
                          {formatCurrency(is.netIncome, currency)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Sensitivity Tab */}
        <TabsContent value="sensitivity">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Sensitivity Analysis</CardTitle>
                <CardDescription>Analyze how changes in key variables affect project viability</CardDescription>
              </div>
              <Button onClick={runSensitivity} isLoading={isLoading} leftIcon={<RefreshCw className="w-4 h-4" />}>
                Run Analysis
              </Button>
            </CardHeader>
            <CardContent>
              {tornadoData.length > 0 ? (
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={tornadoData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" tickFormatter={(value) => formatCurrency(value, currency)} />
                      <YAxis type="category" dataKey="variable" width={100} />
                      <Tooltip formatter={(value: number) => formatCurrency(value, currency)} />
                      <Legend />
                      <Bar dataKey="lowNPV" name="Low Scenario" fill="#ef4444" />
                      <Bar dataKey="highNPV" name="High Scenario" fill="#22c55e" />
                      <ReferenceLine x={indicators.npv} stroke="#3b82f6" strokeWidth={2} label="Base NPV" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="text-center py-12">
                  <BarChart3 className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-500 dark:text-gray-400">Click "Run Analysis" to generate sensitivity data</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Break-Even Tab */}
        <TabsContent value="breakeven">
          <Card>
            <CardHeader>
              <CardTitle>Break-Even Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              {breakEvenData && breakEvenData.chartData.length > 0 ? (
                <>
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <div className="text-sm text-gray-500 dark:text-gray-400">Break-Even Quantity</div>
                      <div className="text-xl font-bold text-gray-900 dark:text-white">
                        {breakEvenData.units > 0 ? formatNumber(breakEvenData.units, 0) + ' units' : 'N/A'}
                      </div>
                    </div>
                    <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <div className="text-sm text-gray-500 dark:text-gray-400">Break-Even Revenue</div>
                      <div className="text-xl font-bold text-gray-900 dark:text-white">
                        {breakEvenData.revenue > 0 ? formatCurrency(breakEvenData.revenue, currency) : 'N/A'}
                      </div>
                    </div>
                  </div>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={breakEvenData.chartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="quantity" tickFormatter={(value) => formatNumber(value, 0)} />
                        <YAxis tickFormatter={(value) => `${(value / 1000000).toFixed(1)}M`} />
                        <Tooltip formatter={(value: number) => formatCurrency(value, currency)} />
                        <Legend />
                        <Line type="monotone" dataKey="revenue" name="Revenue" stroke="#3b82f6" strokeWidth={2} />
                        <Line type="monotone" dataKey="totalCost" name="Total Cost" stroke="#ef4444" strokeWidth={2} />
                        {breakEvenData.units > 0 && (
                          <ReferenceLine x={breakEvenData.units} stroke="#10b981" strokeDasharray="3 3" label="Break-Even" />
                        )}
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </>
              ) : (
                <div className="text-center py-12">
                  <Target className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-500 dark:text-gray-400">Add products and costs to see break-even analysis</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
