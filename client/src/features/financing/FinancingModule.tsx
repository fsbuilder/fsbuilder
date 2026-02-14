import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useProjectStore } from '../../hooks/useProjectStore';
import { financingApi } from '../../services/api';
import type { Financing } from '../../types';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Modal from '../../components/ui/Modal';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/Table';
import { formatCurrency, formatPercent } from '../../utils/format';
import { Plus, Pencil, Trash2, Wallet, Building, Gift, Calendar } from 'lucide-react';

interface FinancingModuleProps {
  projectId: string;
}

const financingSchema = z.object({
  type: z.string().min(1, 'Type is required'),
  name: z.string().min(1, 'Name is required'),
  amount: z.coerce.number().min(0, 'Amount must be positive'),
  interestRate: z.coerce.number().min(0).max(100),
  termYears: z.coerce.number().min(0),
  gracePeriod: z.coerce.number().min(0),
  disbursementYear: z.coerce.number().min(0),
  repaymentStartYear: z.coerce.number().min(1),
});

type FinancingForm = z.infer<typeof financingSchema>;

const typeOptions = [
  { value: 'equity', label: 'Equity' },
  { value: 'loan', label: 'Loan' },
  { value: 'grant', label: 'Grant/Subsidy' },
];

const getTypeIcon = (type: string) => {
  switch (type) {
    case 'equity': return Wallet;
    case 'loan': return Building;
    case 'grant': return Gift;
    default: return Wallet;
  }
};

export default function FinancingModule({ projectId }: FinancingModuleProps) {
  const { financing, setFinancing, currentProject } = useProjectStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [amortizationModalOpen, setAmortizationModalOpen] = useState(false);
  const [editingFinancing, setEditingFinancing] = useState<Financing | null>(null);
  const [selectedLoan, setSelectedLoan] = useState<Financing | null>(null);
  const [amortizationSchedule, setAmortizationSchedule] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<FinancingForm>({
    resolver: zodResolver(financingSchema),
    defaultValues: {
      interestRate: 0,
      termYears: 0,
      gracePeriod: 0,
      disbursementYear: 0,
      repaymentStartYear: 1,
    },
  });

  const financingType = watch('type');
  const currency = currentProject?.currency || 'USD';

  useEffect(() => {
    if (editingFinancing) {
      reset({
        type: editingFinancing.type,
        name: editingFinancing.name,
        amount: editingFinancing.amount,
        interestRate: editingFinancing.interestRate,
        termYears: editingFinancing.termYears,
        gracePeriod: editingFinancing.gracePeriod,
        disbursementYear: editingFinancing.disbursementYear,
        repaymentStartYear: editingFinancing.repaymentStartYear,
      });
    } else {
      reset({
        type: '',
        name: '',
        amount: 0,
        interestRate: 0,
        termYears: 0,
        gracePeriod: 0,
        disbursementYear: 0,
        repaymentStartYear: 1,
      });
    }
  }, [editingFinancing, reset]);

  const loadFinancing = async () => {
    try {
      const response = await financingApi.list(projectId);
      if (response.success && response.data) {
        setFinancing(response.data);
      }
    } catch (error) {
      console.error('Failed to load financing:', error);
    }
  };

  const onSubmit = async (data: FinancingForm) => {
    setIsLoading(true);
    try {
      if (editingFinancing) {
        await financingApi.update(projectId, editingFinancing.id, data);
      } else {
        await financingApi.create(projectId, data);
      }
      await loadFinancing();
      setIsModalOpen(false);
      setEditingFinancing(null);
      reset();
    } catch (error) {
      console.error('Failed to save financing:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await financingApi.delete(projectId, id);
      await loadFinancing();
      setDeleteConfirm(null);
    } catch (error) {
      console.error('Failed to delete financing:', error);
    }
  };

  const handleEdit = (fin: Financing) => {
    setEditingFinancing(fin);
    setIsModalOpen(true);
  };

  const handleAdd = () => {
    setEditingFinancing(null);
    setIsModalOpen(true);
  };

  const viewAmortization = async (loan: Financing) => {
    setSelectedLoan(loan);
    try {
      const response = await financingApi.getAmortization(projectId, loan.id);
      if (response.success && response.data) {
        setAmortizationSchedule(response.data);
        setAmortizationModalOpen(true);
      }
    } catch (error) {
      console.error('Failed to load amortization:', error);
    }
  };

  const equity = financing.filter(f => f.type === 'equity');
  const loans = financing.filter(f => f.type === 'loan');
  const grants = financing.filter(f => f.type === 'grant');

  const totalEquity = equity.reduce((sum, f) => sum + f.amount, 0);
  const totalLoans = loans.reduce((sum, f) => sum + f.amount, 0);
  const totalGrants = grants.reduce((sum, f) => sum + f.amount, 0);
  const totalFinancing = totalEquity + totalLoans + totalGrants;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="text-sm text-gray-500 dark:text-gray-400">Total Financing</div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
              {formatCurrency(totalFinancing, currency)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Equity</div>
                <div className="text-xl font-bold text-gray-900 dark:text-white mt-1">
                  {formatCurrency(totalEquity, currency)}
                </div>
              </div>
              <div className="text-sm text-gray-400">
                {totalFinancing > 0 ? ((totalEquity / totalFinancing) * 100).toFixed(0) : 0}%
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Loans</div>
                <div className="text-xl font-bold text-gray-900 dark:text-white mt-1">
                  {formatCurrency(totalLoans, currency)}
                </div>
              </div>
              <div className="text-sm text-gray-400">
                {totalFinancing > 0 ? ((totalLoans / totalFinancing) * 100).toFixed(0) : 0}%
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Grants</div>
                <div className="text-xl font-bold text-gray-900 dark:text-white mt-1">
                  {formatCurrency(totalGrants, currency)}
                </div>
              </div>
              <div className="text-sm text-gray-400">
                {totalFinancing > 0 ? ((totalGrants / totalFinancing) * 100).toFixed(0) : 0}%
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Financing List */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Financing Structure</CardTitle>
          <Button onClick={handleAdd} leftIcon={<Plus className="w-4 h-4" />}>
            Add Financing
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {financing.length === 0 ? (
            <div className="text-center py-12">
              <Wallet className="w-12 h-12 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-500 dark:text-gray-400">No financing added yet</p>
              <Button variant="outline" className="mt-4" onClick={handleAdd}>
                Add financing source
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Interest</TableHead>
                  <TableHead>Term</TableHead>
                  <TableHead className="w-32">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {financing.map((fin) => {
                  const Icon = getTypeIcon(fin.type);
                  return (
                    <TableRow key={fin.id}>
                      <TableCell>
                        <div className="flex items-center">
                          <Icon className="w-4 h-4 mr-2 text-gray-400" />
                          {typeOptions.find(t => t.value === fin.type)?.label}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">{fin.name}</TableCell>
                      <TableCell>{formatCurrency(fin.amount, currency)}</TableCell>
                      <TableCell>
                        {fin.type === 'loan' ? `${fin.interestRate}%` : '-'}
                      </TableCell>
                      <TableCell>
                        {fin.type === 'loan' ? `${fin.termYears} yrs` : '-'}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          {fin.type === 'loan' && (
                            <button
                              onClick={() => viewAmortization(fin)}
                              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                              title="View Amortization"
                            >
                              <Calendar className="w-4 h-4 text-primary-500" />
                            </button>
                          )}
                          <button
                            onClick={() => handleEdit(fin)}
                            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                          >
                            <Pencil className="w-4 h-4 text-gray-500" />
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(fin.id)}
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
          setEditingFinancing(null);
        }}
        title={editingFinancing ? 'Edit Financing' : 'Add Financing'}
        size="lg"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Type"
              options={typeOptions}
              placeholder="Select type"
              error={errors.type?.message}
              {...register('type')}
            />
            <Input
              label="Name"
              placeholder="e.g., Bank Loan A"
              error={errors.name?.message}
              {...register('name')}
            />
          </div>
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
              label="Disbursement Year"
              type="number"
              min={0}
              error={errors.disbursementYear?.message}
              {...register('disbursementYear')}
            />
          </div>
          {financingType === 'loan' && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Interest Rate (%)"
                  type="number"
                  min={0}
                  max={100}
                  step="0.1"
                  error={errors.interestRate?.message}
                  {...register('interestRate')}
                />
                <Input
                  label="Term (Years)"
                  type="number"
                  min={1}
                  error={errors.termYears?.message}
                  {...register('termYears')}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Grace Period (Years)"
                  type="number"
                  min={0}
                  error={errors.gracePeriod?.message}
                  {...register('gracePeriod')}
                />
                <Input
                  label="Repayment Start Year"
                  type="number"
                  min={1}
                  error={errors.repaymentStartYear?.message}
                  {...register('repaymentStartYear')}
                />
              </div>
            </>
          )}
          <div className="flex justify-end space-x-3 mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsModalOpen(false);
                setEditingFinancing(null);
              }}
            >
              Cancel
            </Button>
            <Button type="submit" isLoading={isLoading}>
              {editingFinancing ? 'Update' : 'Add'} Financing
            </Button>
          </div>
        </form>
      </Modal>

      {/* Amortization Schedule Modal */}
      <Modal
        isOpen={amortizationModalOpen}
        onClose={() => {
          setAmortizationModalOpen(false);
          setSelectedLoan(null);
        }}
        title={`Loan Amortization - ${selectedLoan?.name}`}
        size="xl"
      >
        <div className="max-h-[60vh] overflow-y-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Year</TableHead>
                <TableHead>Beginning Balance</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead>Principal</TableHead>
                <TableHead>Interest</TableHead>
                <TableHead>Ending Balance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {amortizationSchedule.map((row) => (
                <TableRow key={row.year}>
                  <TableCell>{row.year}</TableCell>
                  <TableCell>{formatCurrency(row.beginningBalance, currency)}</TableCell>
                  <TableCell>{formatCurrency(row.payment, currency)}</TableCell>
                  <TableCell>{formatCurrency(row.principal, currency)}</TableCell>
                  <TableCell>{formatCurrency(row.interest, currency)}</TableCell>
                  <TableCell>{formatCurrency(row.endingBalance, currency)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <div className="flex justify-end mt-4">
          <Button variant="outline" onClick={() => setAmortizationModalOpen(false)}>
            Close
          </Button>
        </div>
      </Modal>

      {/* Delete Confirmation */}
      <Modal
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        title="Delete Financing"
        description="Are you sure you want to delete this financing source?"
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
