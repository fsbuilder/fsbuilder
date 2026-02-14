import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useProjectStore } from '../../hooks/useProjectStore';
import { investmentsApi } from '../../services/api';
import type { Investment, InvestmentCategory, DepreciationMethod } from '../../types';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Modal from '../../components/ui/Modal';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/Table';
import { formatCurrency } from '../../utils/format';
import { Plus, Pencil, Trash2, Building2, Factory, Truck, Monitor, Briefcase } from 'lucide-react';

interface InvestmentModuleProps {
  projectId: string;
}

const investmentSchema = z.object({
  category: z.string().min(1, 'Category is required'),
  description: z.string().min(1, 'Description is required'),
  amount: z.coerce.number().min(0, 'Amount must be positive'),
  year: z.coerce.number().min(0, 'Year must be non-negative'),
  usefulLife: z.coerce.number().min(1, 'Useful life must be at least 1'),
  salvageValue: z.coerce.number().min(0, 'Salvage value must be non-negative'),
  depreciationMethod: z.string(),
  depreciationRate: z.coerce.number().min(0).max(100),
});

type InvestmentForm = z.infer<typeof investmentSchema>;

const categoryOptions = [
  { value: 'land', label: 'Land' },
  { value: 'buildings', label: 'Buildings' },
  { value: 'machinery', label: 'Machinery' },
  { value: 'equipment', label: 'Equipment' },
  { value: 'vehicles', label: 'Vehicles' },
  { value: 'furniture', label: 'Furniture' },
  { value: 'preproduction', label: 'Pre-production Costs' },
  { value: 'working_capital', label: 'Working Capital' },
  { value: 'other', label: 'Other' },
];

const depreciationOptions = [
  { value: 'straight_line', label: 'Straight Line' },
  { value: 'declining_balance', label: 'Declining Balance' },
  { value: 'none', label: 'None' },
];

const getCategoryIcon = (category: string) => {
  switch (category) {
    case 'buildings': return Building2;
    case 'machinery': return Factory;
    case 'vehicles': return Truck;
    case 'equipment': return Monitor;
    default: return Briefcase;
  }
};

export default function InvestmentModule({ projectId }: InvestmentModuleProps) {
  const { investments, setInvestments, currentProject } = useProjectStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingInvestment, setEditingInvestment] = useState<Investment | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<InvestmentForm>({
    resolver: zodResolver(investmentSchema),
    defaultValues: {
      usefulLife: 10,
      salvageValue: 0,
      depreciationMethod: 'straight_line',
      depreciationRate: 10,
      year: 0,
    },
  });

  useEffect(() => {
    if (editingInvestment) {
      reset({
        category: editingInvestment.category,
        description: editingInvestment.description,
        amount: editingInvestment.amount,
        year: editingInvestment.year,
        usefulLife: editingInvestment.usefulLife,
        salvageValue: editingInvestment.salvageValue,
        depreciationMethod: editingInvestment.depreciationMethod,
        depreciationRate: editingInvestment.depreciationRate,
      });
    } else {
      reset({
        category: '',
        description: '',
        amount: 0,
        year: 0,
        usefulLife: 10,
        salvageValue: 0,
        depreciationMethod: 'straight_line',
        depreciationRate: 10,
      });
    }
  }, [editingInvestment, reset]);

  const loadInvestments = async () => {
    try {
      const response = await investmentsApi.list(projectId);
      if (response.success && response.data) {
        setInvestments(response.data);
      }
    } catch (error) {
      console.error('Failed to load investments:', error);
    }
  };

  const onSubmit = async (data: InvestmentForm) => {
    setIsLoading(true);
    try {
      if (editingInvestment) {
        await investmentsApi.update(projectId, editingInvestment.id, data);
      } else {
        await investmentsApi.create(projectId, data);
      }
      await loadInvestments();
      setIsModalOpen(false);
      setEditingInvestment(null);
      reset();
    } catch (error) {
      console.error('Failed to save investment:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await investmentsApi.delete(projectId, id);
      await loadInvestments();
      setDeleteConfirm(null);
    } catch (error) {
      console.error('Failed to delete investment:', error);
    }
  };

  const handleEdit = (investment: Investment) => {
    setEditingInvestment(investment);
    setIsModalOpen(true);
  };

  const handleAdd = () => {
    setEditingInvestment(null);
    setIsModalOpen(true);
  };

  // Group investments by category
  const groupedInvestments = investments.reduce((acc, inv) => {
    const category = inv.category;
    if (!acc[category]) acc[category] = [];
    acc[category].push(inv);
    return acc;
  }, {} as Record<string, Investment[]>);

  const totalInvestment = investments.reduce((sum, inv) => sum + inv.amount, 0);
  const currency = currentProject?.currency || 'USD';

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="text-sm text-gray-500 dark:text-gray-400">Total Investment</div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
              {formatCurrency(totalInvestment, currency)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="text-sm text-gray-500 dark:text-gray-400">Fixed Assets</div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
              {formatCurrency(
                investments.filter(i => !['working_capital', 'preproduction'].includes(i.category)).reduce((s, i) => s + i.amount, 0),
                currency
              )}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="text-sm text-gray-500 dark:text-gray-400">Working Capital</div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
              {formatCurrency(
                investments.filter(i => i.category === 'working_capital').reduce((s, i) => s + i.amount, 0),
                currency
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Investment List */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Investment Items</CardTitle>
          <Button onClick={handleAdd} leftIcon={<Plus className="w-4 h-4" />}>
            Add Investment
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {investments.length === 0 ? (
            <div className="text-center py-12">
              <Briefcase className="w-12 h-12 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-500 dark:text-gray-400">No investments added yet</p>
              <Button variant="outline" className="mt-4" onClick={handleAdd}>
                Add your first investment
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Category</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Year</TableHead>
                  <TableHead>Depreciation</TableHead>
                  <TableHead className="w-24">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {investments.map((investment) => {
                  const Icon = getCategoryIcon(investment.category);
                  return (
                    <TableRow key={investment.id}>
                      <TableCell>
                        <div className="flex items-center">
                          <Icon className="w-4 h-4 mr-2 text-gray-400" />
                          {categoryOptions.find(c => c.value === investment.category)?.label}
                        </div>
                      </TableCell>
                      <TableCell>{investment.description}</TableCell>
                      <TableCell className="font-medium">
                        {formatCurrency(investment.amount, currency)}
                      </TableCell>
                      <TableCell>Year {investment.year}</TableCell>
                      <TableCell>
                        {investment.depreciationMethod === 'none'
                          ? 'None'
                          : `${investment.depreciationMethod === 'straight_line' ? 'SL' : 'DB'} / ${investment.usefulLife}yr`}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleEdit(investment)}
                            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                          >
                            <Pencil className="w-4 h-4 text-gray-500" />
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(investment.id)}
                            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingInvestment(null);
        }}
        title={editingInvestment ? 'Edit Investment' : 'Add Investment'}
        size="lg"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Category"
              options={categoryOptions}
              placeholder="Select category"
              error={errors.category?.message}
              {...register('category')}
            />
            <Input
              label="Year"
              type="number"
              min={0}
              error={errors.year?.message}
              {...register('year')}
            />
          </div>
          <Input
            label="Description"
            placeholder="e.g., Manufacturing Equipment"
            error={errors.description?.message}
            {...register('description')}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Amount"
              type="number"
              min={0}
              step="0.01"
              error={errors.amount?.message}
              {...register('amount')}
            />
            <Input
              label="Salvage Value"
              type="number"
              min={0}
              step="0.01"
              error={errors.salvageValue?.message}
              {...register('salvageValue')}
            />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <Select
              label="Depreciation Method"
              options={depreciationOptions}
              error={errors.depreciationMethod?.message}
              {...register('depreciationMethod')}
            />
            <Input
              label="Useful Life (years)"
              type="number"
              min={1}
              error={errors.usefulLife?.message}
              {...register('usefulLife')}
            />
            <Input
              label="Depreciation Rate (%)"
              type="number"
              min={0}
              max={100}
              step="0.1"
              error={errors.depreciationRate?.message}
              {...register('depreciationRate')}
            />
          </div>
          <div className="flex justify-end space-x-3 mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsModalOpen(false);
                setEditingInvestment(null);
              }}
            >
              Cancel
            </Button>
            <Button type="submit" isLoading={isLoading}>
              {editingInvestment ? 'Update' : 'Add'} Investment
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <Modal
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        title="Delete Investment"
        description="Are you sure you want to delete this investment? This action cannot be undone."
      >
        <div className="flex justify-end space-x-3 mt-4">
          <Button variant="outline" onClick={() => setDeleteConfirm(null)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={() => deleteConfirm && handleDelete(deleteConfirm)}>
            Delete
          </Button>
        </div>
      </Modal>
    </div>
  );
}
