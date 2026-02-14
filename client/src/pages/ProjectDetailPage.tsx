import { useEffect, useState } from 'react';
import { useParams, useNavigate, Routes, Route, Link, useLocation } from 'react-router-dom';
import { projectsApi, investmentsApi, productsApi, costsApi, financingApi, analysisApi } from '../services/api';
import { useProjectStore } from '../hooks/useProjectStore';
import type { Project } from '../types';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/Tabs';
import Button from '../components/ui/Button';
import { ArrowLeft, Settings, FileText } from 'lucide-react';

// Feature components
import InvestmentModule from '../features/investment/InvestmentModule';
import ProductionModule from '../features/production/ProductionModule';
import CostsModule from '../features/costs/CostsModule';
import FinancingModule from '../features/financing/FinancingModule';
import AnalysisModule from '../features/analysis/AnalysisModule';
import ReportsModule from '../features/reports/ReportsModule';

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [isLoading, setIsLoading] = useState(true);
  const { currentProject, setCurrentProject, setInvestments, setProducts, setOperatingCosts, setFinancing, clearProject } = useProjectStore();

  useEffect(() => {
    if (id) {
      loadProject(id);
    }
    return () => {
      clearProject();
    };
  }, [id]);

  const loadProject = async (projectId: string) => {
    setIsLoading(true);
    try {
      const [projectRes, investmentsRes, productsRes, costsRes, financingRes] = await Promise.all([
        projectsApi.get(projectId),
        investmentsApi.list(projectId),
        productsApi.list(projectId),
        costsApi.list(projectId),
        financingApi.list(projectId),
      ]);

      if (projectRes.success && projectRes.data) {
        setCurrentProject(projectRes.data);
      }
      if (investmentsRes.success && investmentsRes.data) {
        setInvestments(investmentsRes.data);
      }
      if (productsRes.success && productsRes.data) {
        setProducts(productsRes.data);
      }
      if (costsRes.success && costsRes.data) {
        setOperatingCosts(costsRes.data);
      }
      if (financingRes.success && financingRes.data) {
        setFinancing(financingRes.data);
      }
    } catch (error) {
      console.error('Failed to load project:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getActiveTab = () => {
    const path = location.pathname.split('/').pop();
    if (['investment', 'production', 'costs', 'financing', 'analysis', 'reports'].includes(path || '')) {
      return path;
    }
    return 'investment';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!currentProject) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 dark:text-gray-400">Project not found</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate('/projects')}>
          Back to Projects
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" onClick={() => navigate('/projects')}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{currentProject.name}</h1>
            <p className="text-gray-500 dark:text-gray-400">
              {currentProject.sector} | {currentProject.location}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Link to={`/projects/${id}/reports`}>
            <Button variant="outline" leftIcon={<FileText className="w-4 h-4" />}>
              Reports
            </Button>
          </Link>
          <Button variant="outline" leftIcon={<Settings className="w-4 h-4" />}>
            Settings
          </Button>
        </div>
      </div>

      {/* Tabs Navigation */}
      <Tabs
        defaultValue={getActiveTab()}
        onChange={(tab) => navigate(`/projects/${id}/${tab}`)}
      >
        <TabsList>
          <TabsTrigger value="investment">Investment</TabsTrigger>
          <TabsTrigger value="production">Production & Revenue</TabsTrigger>
          <TabsTrigger value="costs">Operating Costs</TabsTrigger>
          <TabsTrigger value="financing">Financing</TabsTrigger>
          <TabsTrigger value="analysis">Analysis</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="investment">
          <InvestmentModule projectId={id!} />
        </TabsContent>
        <TabsContent value="production">
          <ProductionModule projectId={id!} />
        </TabsContent>
        <TabsContent value="costs">
          <CostsModule projectId={id!} />
        </TabsContent>
        <TabsContent value="financing">
          <FinancingModule projectId={id!} />
        </TabsContent>
        <TabsContent value="analysis">
          <AnalysisModule projectId={id!} />
        </TabsContent>
        <TabsContent value="reports">
          <ReportsModule projectId={id!} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
