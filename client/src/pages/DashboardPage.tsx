import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { projectsApi } from '../services/api';
import type { Project } from '../types';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import Button from '../components/ui/Button';
import { formatCurrency, formatDate } from '../utils/format';
import {
  FolderKanban,
  TrendingUp,
  DollarSign,
  Clock,
  Plus,
  ArrowRight,
} from 'lucide-react';

interface DashboardStats {
  totalProjects: number;
  activeProjects: number;
  totalInvestment: number;
  avgNpv: number;
}

export default function DashboardPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    totalProjects: 0,
    activeProjects: 0,
    totalInvestment: 0,
    avgNpv: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const response = await projectsApi.list(1, 5);
      if (response.success && response.data) {
        setProjects(response.data.data);
        setStats({
          totalProjects: response.data.total,
          activeProjects: response.data.data.filter((p) => p.status === 'active').length,
          totalInvestment: 0, // Would need to aggregate from investments
          avgNpv: 0, // Would need to calculate
        });
      }
    } catch (error) {
      console.error('Failed to load dashboard:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const statCards = [
    {
      title: 'Total Projects',
      value: stats.totalProjects.toString(),
      icon: FolderKanban,
      color: 'bg-blue-500',
    },
    {
      title: 'Active Projects',
      value: stats.activeProjects.toString(),
      icon: TrendingUp,
      color: 'bg-green-500',
    },
    {
      title: 'Total Investment',
      value: formatCurrency(stats.totalInvestment),
      icon: DollarSign,
      color: 'bg-purple-500',
    },
    {
      title: 'Average NPV',
      value: formatCurrency(stats.avgNpv),
      icon: Clock,
      color: 'bg-orange-500',
    },
  ];

  const getStatusBadge = (status: Project['status']) => {
    const styles = {
      draft: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
      active: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
      completed: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
      archived: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
    };
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${styles[status]}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
          <p className="text-gray-500 dark:text-gray-400">Welcome to FS Builder</p>
        </div>
        <Link to="/projects/new">
          <Button leftIcon={<Plus className="w-4 h-4" />}>New Project</Button>
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => (
          <Card key={stat.title}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    {stat.title}
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                    {stat.value}
                  </p>
                </div>
                <div className={`p-3 rounded-lg ${stat.color}`}>
                  <stat.icon className="w-6 h-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Projects */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Recent Projects</CardTitle>
          <Link to="/projects">
            <Button variant="ghost" size="sm" rightIcon={<ArrowRight className="w-4 h-4" />}>
              View All
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {projects.length === 0 ? (
            <div className="text-center py-8">
              <FolderKanban className="w-12 h-12 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-500 dark:text-gray-400">No projects yet</p>
              <Link to="/projects/new">
                <Button variant="outline" className="mt-4">
                  Create your first project
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {projects.map((project) => (
                <Link
                  key={project.id}
                  to={`/projects/${project.id}`}
                  className="flex items-center justify-between p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-white">{project.name}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {project.sector} | {project.location}
                    </p>
                  </div>
                  <div className="flex items-center space-x-4">
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {formatDate(project.updatedAt)}
                    </span>
                    {getStatusBadge(project.status)}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
