import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useProjectStore } from '../../hooks/useProjectStore';
import { productsApi } from '../../services/api';
import type { Product } from '../../types';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/Table';
import { formatCurrency, formatNumber } from '../../utils/format';
import { Plus, Pencil, Trash2, Package, Calendar } from 'lucide-react';

interface ProductionModuleProps {
  projectId: string;
}

const productSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  unit: z.string().min(1, 'Unit is required'),
  unitPrice: z.coerce.number().min(0, 'Price must be positive'),
  priceEscalation: z.coerce.number().min(0).max(100),
  installedCapacity: z.coerce.number().min(0, 'Capacity must be positive'),
  capacityUnit: z.string().min(1, 'Capacity unit is required'),
});

type ProductForm = z.infer<typeof productSchema>;

interface ProductWithSchedule extends Product {
  productionSchedule: Array<{
    id: string;
    year: number;
    capacityUtilization: number;
    quantity: number;
  }>;
}

export default function ProductionModule({ projectId }: ProductionModuleProps) {
  const { products, setProducts, currentProject } = useProjectStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductWithSchedule | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<ProductWithSchedule | null>(null);
  const [scheduleData, setScheduleData] = useState<Array<{ year: number; capacityUtilization: number; quantity: number }>>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ProductForm>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      priceEscalation: 0,
    },
  });

  const operationYears = currentProject?.operationYears || 10;
  const currency = currentProject?.currency || 'USD';

  useEffect(() => {
    if (editingProduct) {
      reset({
        name: editingProduct.name,
        unit: editingProduct.unit,
        unitPrice: editingProduct.unitPrice,
        priceEscalation: editingProduct.priceEscalation,
        installedCapacity: editingProduct.installedCapacity,
        capacityUnit: editingProduct.capacityUnit,
      });
    } else {
      reset({
        name: '',
        unit: '',
        unitPrice: 0,
        priceEscalation: 0,
        installedCapacity: 0,
        capacityUnit: '',
      });
    }
  }, [editingProduct, reset]);

  const loadProducts = async () => {
    try {
      const response = await productsApi.list(projectId);
      if (response.success && response.data) {
        setProducts(response.data);
      }
    } catch (error) {
      console.error('Failed to load products:', error);
    }
  };

  const onSubmit = async (data: ProductForm) => {
    setIsLoading(true);
    try {
      if (editingProduct) {
        await productsApi.update(projectId, editingProduct.id, data);
      } else {
        await productsApi.create(projectId, data);
      }
      await loadProducts();
      setIsModalOpen(false);
      setEditingProduct(null);
      reset();
    } catch (error) {
      console.error('Failed to save product:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await productsApi.delete(projectId, id);
      await loadProducts();
      setDeleteConfirm(null);
    } catch (error) {
      console.error('Failed to delete product:', error);
    }
  };

  const handleEdit = (product: ProductWithSchedule) => {
    setEditingProduct(product);
    setIsModalOpen(true);
  };

  const handleAdd = () => {
    setEditingProduct(null);
    setIsModalOpen(true);
  };

  const openScheduleModal = (product: ProductWithSchedule) => {
    setSelectedProduct(product);
    // Initialize schedule data
    const existingSchedule = (product as any).productionSchedule || [];
    const schedule = [];
    for (let year = 1; year <= operationYears; year++) {
      const existing = existingSchedule.find((s: any) => s.year === year);
      schedule.push({
        year,
        capacityUtilization: existing?.capacityUtilization || (year === 1 ? 60 : year === 2 ? 80 : 100),
        quantity: existing?.quantity || product.installedCapacity * (year === 1 ? 0.6 : year === 2 ? 0.8 : 1),
      });
    }
    setScheduleData(schedule);
    setScheduleModalOpen(true);
  };

  const updateScheduleRow = (year: number, field: 'capacityUtilization' | 'quantity', value: number) => {
    setScheduleData(prev => prev.map(row => {
      if (row.year === year) {
        if (field === 'capacityUtilization' && selectedProduct) {
          return {
            ...row,
            capacityUtilization: value,
            quantity: (selectedProduct.installedCapacity * value) / 100,
          };
        }
        return { ...row, [field]: value };
      }
      return row;
    }));
  };

  const saveSchedule = async () => {
    if (!selectedProduct) return;
    setIsLoading(true);
    try {
      await productsApi.update(projectId, selectedProduct.id, {
        ...selectedProduct,
      });
      // Update schedule via separate endpoint
      const response = await fetch(`/api/projects/${projectId}/products/${selectedProduct.id}/schedule`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${JSON.parse(localStorage.getItem('fs-builder-auth') || '{}').state?.token}`,
        },
        body: JSON.stringify({ schedule: scheduleData }),
      });
      if (response.ok) {
        await loadProducts();
        setScheduleModalOpen(false);
        setSelectedProduct(null);
      }
    } catch (error) {
      console.error('Failed to save schedule:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const totalCapacity = (products as ProductWithSchedule[]).reduce((sum, p) => sum + p.installedCapacity, 0);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="text-sm text-gray-500 dark:text-gray-400">Products/Services</div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
              {products.length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="text-sm text-gray-500 dark:text-gray-400">Total Capacity</div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
              {formatNumber(totalCapacity, 0)} units
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="text-sm text-gray-500 dark:text-gray-400">Avg Unit Price</div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
              {products.length > 0
                ? formatCurrency(products.reduce((s, p) => s + p.unitPrice, 0) / products.length, currency)
                : formatCurrency(0, currency)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Products List */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Products & Services</CardTitle>
          <Button onClick={handleAdd} leftIcon={<Plus className="w-4 h-4" />}>
            Add Product
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {products.length === 0 ? (
            <div className="text-center py-12">
              <Package className="w-12 h-12 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-500 dark:text-gray-400">No products added yet</p>
              <Button variant="outline" className="mt-4" onClick={handleAdd}>
                Add your first product
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product Name</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead>Unit Price</TableHead>
                  <TableHead>Capacity</TableHead>
                  <TableHead>Escalation</TableHead>
                  <TableHead className="w-32">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(products as ProductWithSchedule[]).map((product) => (
                  <TableRow key={product.id}>
                    <TableCell className="font-medium">{product.name}</TableCell>
                    <TableCell>{product.unit}</TableCell>
                    <TableCell>{formatCurrency(product.unitPrice, currency)}</TableCell>
                    <TableCell>
                      {formatNumber(product.installedCapacity, 0)} {product.capacityUnit}
                    </TableCell>
                    <TableCell>{product.priceEscalation}%/yr</TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => openScheduleModal(product)}
                          className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                          title="Production Schedule"
                        >
                          <Calendar className="w-4 h-4 text-primary-500" />
                        </button>
                        <button
                          onClick={() => handleEdit(product)}
                          className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                        >
                          <Pencil className="w-4 h-4 text-gray-500" />
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(product.id)}
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

      {/* Add/Edit Product Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingProduct(null);
        }}
        title={editingProduct ? 'Edit Product' : 'Add Product'}
        size="lg"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            label="Product/Service Name"
            placeholder="e.g., Solar Panels"
            error={errors.name?.message}
            {...register('name')}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Unit"
              placeholder="e.g., pieces, kg, kWh"
              error={errors.unit?.message}
              {...register('unit')}
            />
            <Input
              label="Unit Price"
              type="number"
              min={0}
              step="0.01"
              error={errors.unitPrice?.message}
              {...register('unitPrice')}
            />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <Input
              label="Installed Capacity"
              type="number"
              min={0}
              error={errors.installedCapacity?.message}
              {...register('installedCapacity')}
            />
            <Input
              label="Capacity Unit"
              placeholder="e.g., units/year"
              error={errors.capacityUnit?.message}
              {...register('capacityUnit')}
            />
            <Input
              label="Price Escalation (%/yr)"
              type="number"
              min={0}
              max={100}
              step="0.1"
              error={errors.priceEscalation?.message}
              {...register('priceEscalation')}
            />
          </div>
          <div className="flex justify-end space-x-3 mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsModalOpen(false);
                setEditingProduct(null);
              }}
            >
              Cancel
            </Button>
            <Button type="submit" isLoading={isLoading}>
              {editingProduct ? 'Update' : 'Add'} Product
            </Button>
          </div>
        </form>
      </Modal>

      {/* Production Schedule Modal */}
      <Modal
        isOpen={scheduleModalOpen}
        onClose={() => {
          setScheduleModalOpen(false);
          setSelectedProduct(null);
        }}
        title={`Production Schedule - ${selectedProduct?.name}`}
        size="xl"
      >
        <div className="max-h-[60vh] overflow-y-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Year</TableHead>
                <TableHead>Capacity Utilization (%)</TableHead>
                <TableHead>Quantity</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {scheduleData.map((row) => (
                <TableRow key={row.year}>
                  <TableCell>Year {row.year}</TableCell>
                  <TableCell>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={row.capacityUtilization}
                      onChange={(e) => updateScheduleRow(row.year, 'capacityUtilization', parseFloat(e.target.value) || 0)}
                      className="w-24 input"
                    />
                  </TableCell>
                  <TableCell>
                    <input
                      type="number"
                      min={0}
                      value={row.quantity}
                      onChange={(e) => updateScheduleRow(row.year, 'quantity', parseFloat(e.target.value) || 0)}
                      className="w-32 input"
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <div className="flex justify-end space-x-3 mt-6">
          <Button variant="outline" onClick={() => setScheduleModalOpen(false)}>
            Cancel
          </Button>
          <Button onClick={saveSchedule} isLoading={isLoading}>
            Save Schedule
          </Button>
        </div>
      </Modal>

      {/* Delete Confirmation */}
      <Modal
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        title="Delete Product"
        description="Are you sure you want to delete this product? This will also delete its production schedule."
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
