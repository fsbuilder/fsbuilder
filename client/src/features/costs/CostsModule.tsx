import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useProjectStore } from '../../hooks/useProjectStore';
import { costsApi } from '../../services/api';
import type { OperatingCost } from '../../types';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Modal from '../../components/ui/Modal';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/Table';
import { formatCurrency } from '../../utils/format';
import { Plus, Pencil, Trash2, Receipt, TrendingUp, TrendingDown } from 'lucide-react';

interface CostsModuleProps {
  projectId: string;
}

const costSchema = z.object({
  category: z.string().min(1, 'Category is required'),
  description: z.string().min(1, 'Description is required'),
  costType: z.string().min(1, 'Cost type is required'),
  amount: z.coerce.number().min(0, 'Amount must be positive'),
  unitCost: z.coerce.number().min(0),
  escalationRate: z.coerce.number().min(0).max(100),
  startYear: z.coerce.number().min(1),
});

type CostForm = z.infer<typeof costSchema>;

const categoryOptions = [
  { value: 'raw_materials', label: 'Raw Materials' },
  { value: 'utilities', label: 'Utilities' },
  { value: 'labor_direct', label: 'Direct Labor' },
  { value: 'labor_indirect', label: 'Indirect Labor' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'administrative', label: 'Administrative' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'insurance', label: 'Insurance' },
  { value: 'other', label: 'Other' },
];

const costTypeOptions = [
  { value: 'fixed', label: 'Fixed Cost' },
  { value: 'variable', label: 'Variable Cost' },
];

export default function CostsModule({ projectId }: CostsModuleProps) {
  const { operatingCosts, setOperatingCosts, currentProject } = useProjectStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCost, setEditingCost] = useState<OperatingCost | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<CostForm>({
    resolver: zodResolver(costSchema),
    defaultValues: {
      costType: 'fixed',
      escalationRate: 0,
      startYear: 1,
      unitCost: 0,
    },
  });

  const costType = watch('costType');
  const currency = currentProject?.currency || 'USD';

  useEffect(() => {
    if (editingCost) {
      reset({
        category: editingCost.category,
        description: editingCost.description,
        costType: editingCost.costType,
        amount: editingCost.amount,
        unitCost: editingCost.unitCost,
        escalationRate: editingCost.escalationRate,
        startYear: editingCost.startYear,
      });
    } else {
      reset({
        category: '',
        description: '',
        costType: 'fixed',
        amount: 0,
        unitCost: 0,
        escalationRate: 0,
        startYear: 1,
      });
    }
  }, [editingCost, reset]);

  const loadCosts = async () => {
    try {
      const response = await costsApi.list(projectId);
      if (response.success && response.data) {
        setOperatingCosts(response.data);
      }
    } catch (error) {
      console.error('Failed to load costs:', error);
    }
  };

  const onSubmit = async (data: CostForm) => {
    setIsLoading(true);
    try {
      if (editingCost) {
        await costsApi.update(projectId, editingCost.id, data);
      } else {
        await costsApi.create(projectId, data);
      }
      await loadCosts();
      setIsModalOpen(false);
      setEditingCost(null);
      reset();
    } catch (error) {
      console.error('Failed to save cost:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await costsApi.delete(projectId, id);
      await loadCosts();
      setDeleteConfirm(null);
    } catch (error) {
      console.error('Failed to delete cost:', error);
    }
  };

  const handleEdit = (cost: OperatingCost) => {
    setEditingCost(cost);
    setIsModalOpen(true);
  };

  const handleAdd = () => {
    setEditingCost(null);
    setIsModalOpen(true);
  };

  const fixedCosts = operatingCosts.filter(c => c.costType === 'fixed');
  const variableCosts = operatingCosts.filter(c => c.costType === 'variable');
  const totalFixed = fixedCosts.reduce((sum, c) => sum + c.amount, 0);
  const totalVariable = variableCosts.reduce((sum, c) => sum + c.amount, 0);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Total Operating Costs</div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                  {formatCurrency(totalFixed + totalVariable, currency)}/yr
                </div>
              </div>
              <Receipt className="w-8 h-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Fixed Costs</div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                  {formatCurrency(totalFixed, currency)}/yr
                </div>
              </div>
              <TrendingDown className="w-8 h-8 text-blue-400" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Variable Costs</div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                  {formatCurrency(totalVariable, currency)}/yr
                </div>
              </div>
              <TrendingUp className="w-8 h-8 text-orange-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Costs List */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Operating Costs</CardTitle>
          <Button onClick={handleAdd} leftIcon={<Plus className="w-4 h-4" />}>
            Add Cost
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {operatingCosts.length === 0 ? (
            <div className="text-center py-12">
              <Receipt className="w-12 h-12 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-500 dark:text-gray-400">No operating costs added yet</p>
              <Button variant="outline" className="mt-4" onClick={handleAdd}>
                Add your first cost item
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Category</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Escalation</TableHead>
                  <TableHead className="w-24">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {operatingCosts.map((cost) => (
                  <TableRow key={cost.id}>
                    <TableCell>
                      {categoryOptions.find(c => c.value === cost.category)?.label}
                    </TableCell>
                    <TableCell>{cost.description}</TableCell>
                    <TableCell>
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded-full ${
                          cost.costType === 'fixed'
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'
                            : 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300'
                        }`}
                      >
                        {cost.costType === 'fixed' ? 'Fixed' : 'Variable'}
                      </span>
                    </TableCell>
                    <TableCell className="font-medium">
                      {formatCurrency(cost.amount, currency)}/yr
                    </TableCell>
                    <TableCell>{cost.escalationRate}%/yr</TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleEdit(cost)}
                          className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                        >
                          <Pencil className="w-4 h-4 text-gray-500" />
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(cost.id)}
                          className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
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
          setEditingCost(null);
        }}
        title={editingCost ? 'Edit Operating Cost' : 'Add Operating Cost'}
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
            <Select
              label="Cost Type"
              options={costTypeOptions}
              error={errors.costType?.message}
              {...register('costType')}
            />
          </div>
          <Input
            label="Description"
            placeholder="e.g., Electricity"
            error={errors.description?.message}
            {...register('description')}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Annual Amount"
              type="number"
              min={0}
              step="0.01"
              error={errors.amount?.message}
              {...register('amount')}
            />
            {costType === 'variable' && (
              <Input
                label="Unit Cost"
                type="number"
                min={0}
                step="0.01"
                error={errors.unitCost?.message}
                {...register('unitCost')}
              />
            )}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Escalation Rate (%/yr)"
              type="number"
              min={0}
              max={100}
              step="0.1"
              error={errors.escalationRate?.message}
              {...register('escalationRate')}
            />
            <Input
              label="Start Year"
              type="number"
              min={1}
              error={errors.startYear?.message}
              {...register('startYear')}
            />
          </div>
          <div className="flex justify-end space-x-3 mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsModalOpen(false);
                setEditingCost(null);
              }}
            >
              Cancel
            </Button>
            <Button type="submit" isLoading={isLoading}>
              {editingCost ? 'Update' : 'Add'} Cost
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <Modal
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        title="Delete Operating Cost"
        description="Are you sure you want to delete this cost item?"
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
