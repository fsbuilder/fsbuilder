import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { projectsApi } from '../services/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import { ArrowLeft } from 'lucide-react';

const projectSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  description: z.string().optional(),
  sector: z.string().min(1, 'Please select a sector'),
  location: z.string().min(2, 'Location is required'),
  currency: z.string().min(1, 'Please select a currency'),
  startDate: z.string().min(1, 'Start date is required'),
  constructionYears: z.coerce.number().min(0).max(10),
  operationYears: z.coerce.number().min(1).max(50),
  discountRate: z.coerce.number().min(0).max(100),
  inflationRate: z.coerce.number().min(0).max(100),
  taxRate: z.coerce.number().min(0).max(100),
});

type ProjectForm = z.infer<typeof projectSchema>;

const sectors = [
  { value: 'manufacturing', label: 'Manufacturing' },
  { value: 'agriculture', label: 'Agriculture' },
  { value: 'services', label: 'Services' },
  { value: 'mining', label: 'Mining & Extraction' },
  { value: 'energy', label: 'Energy & Utilities' },
  { value: 'construction', label: 'Construction' },
  { value: 'technology', label: 'Technology' },
  { value: 'healthcare', label: 'Healthcare' },
  { value: 'education', label: 'Education' },
  { value: 'tourism', label: 'Tourism & Hospitality' },
  { value: 'transportation', label: 'Transportation & Logistics' },
  { value: 'real_estate', label: 'Real Estate' },
  { value: 'other', label: 'Other' },
];

const currencies = [
  { value: 'USD', label: 'USD - US Dollar' },
  { value: 'EUR', label: 'EUR - Euro' },
  { value: 'GBP', label: 'GBP - British Pound' },
  { value: 'JPY', label: 'JPY - Japanese Yen' },
  { value: 'CNY', label: 'CNY - Chinese Yuan' },
  { value: 'INR', label: 'INR - Indian Rupee' },
  { value: 'BRL', label: 'BRL - Brazilian Real' },
  { value: 'CAD', label: 'CAD - Canadian Dollar' },
  { value: 'AUD', label: 'AUD - Australian Dollar' },
  { value: 'CHF', label: 'CHF - Swiss Franc' },
];

export default function NewProjectPage() {
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ProjectForm>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      constructionYears: 1,
      operationYears: 10,
      discountRate: 10,
      inflationRate: 3,
      taxRate: 25,
      currency: 'USD',
    },
  });

  const onSubmit = async (data: ProjectForm) => {
    setIsLoading(true);
    setError('');
    try {
      const response = await projectsApi.create({
        ...data,
        status: 'draft',
      });
      if (response.success && response.data) {
        navigate(`/projects/${response.data.id}`);
      } else {
        setError(response.error || 'Failed to create project');
      }
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      setError(error.response?.data?.error || 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <Button variant="ghost" onClick={() => navigate('/projects')}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Create New Project</h1>
          <p className="text-gray-500 dark:text-gray-400">Set up a new feasibility analysis project</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {error && (
          <div className="p-3 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 rounded-lg">
            {error}
          </div>
        )}

        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
            <CardDescription>Enter the basic details of your project</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              label="Project Name"
              placeholder="e.g., Solar Panel Manufacturing Plant"
              error={errors.name?.message}
              {...register('name')}
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select
                label="Sector"
                options={sectors}
                placeholder="Select sector"
                error={errors.sector?.message}
                {...register('sector')}
              />
              <Input
                label="Location"
                placeholder="e.g., Texas, USA"
                error={errors.location?.message}
                {...register('location')}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Description
              </label>
              <textarea
                className="flex w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 min-h-[100px]"
                placeholder="Brief description of the project..."
                {...register('description')}
              />
            </div>
          </CardContent>
        </Card>

        {/* Timeline */}
        <Card>
          <CardHeader>
            <CardTitle>Project Timeline</CardTitle>
            <CardDescription>Define the construction and operation periods</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input
                label="Start Date"
                type="date"
                error={errors.startDate?.message}
                {...register('startDate')}
              />
              <Input
                label="Construction Years"
                type="number"
                min={0}
                max={10}
                error={errors.constructionYears?.message}
                {...register('constructionYears')}
              />
              <Input
                label="Operation Years"
                type="number"
                min={1}
                max={50}
                error={errors.operationYears?.message}
                {...register('operationYears')}
              />
            </div>
          </CardContent>
        </Card>

        {/* Financial Parameters */}
        <Card>
          <CardHeader>
            <CardTitle>Financial Parameters</CardTitle>
            <CardDescription>Set the key financial assumptions</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select
                label="Currency"
                options={currencies}
                error={errors.currency?.message}
                {...register('currency')}
              />
              <Input
                label="Discount Rate (%)"
                type="number"
                step="0.1"
                min={0}
                max={100}
                error={errors.discountRate?.message}
                {...register('discountRate')}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Inflation Rate (%)"
                type="number"
                step="0.1"
                min={0}
                max={100}
                error={errors.inflationRate?.message}
                {...register('inflationRate')}
              />
              <Input
                label="Tax Rate (%)"
                type="number"
                step="0.1"
                min={0}
                max={100}
                error={errors.taxRate?.message}
                {...register('taxRate')}
              />
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex justify-end space-x-4">
          <Button type="button" variant="outline" onClick={() => navigate('/projects')}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isLoading}>
            Create Project
          </Button>
        </div>
      </form>
    </div>
  );
}
