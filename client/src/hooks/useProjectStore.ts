import { create } from 'zustand';
import type { Project, Investment, Product, OperatingCost, Financing, FinancialIndicators } from '../types';

interface ProjectState {
  currentProject: Project | null;
  investments: Investment[];
  products: Product[];
  operatingCosts: OperatingCost[];
  financing: Financing[];
  indicators: FinancialIndicators | null;
  isLoading: boolean;
  error: string | null;
  
  setCurrentProject: (project: Project | null) => void;
  setInvestments: (investments: Investment[]) => void;
  setProducts: (products: Product[]) => void;
  setOperatingCosts: (costs: OperatingCost[]) => void;
  setFinancing: (financing: Financing[]) => void;
  setIndicators: (indicators: FinancialIndicators | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearProject: () => void;
}

export const useProjectStore = create<ProjectState>((set) => ({
  currentProject: null,
  investments: [],
  products: [],
  operatingCosts: [],
  financing: [],
  indicators: null,
  isLoading: false,
  error: null,
  
  setCurrentProject: (project) => set({ currentProject: project }),
  setInvestments: (investments) => set({ investments }),
  setProducts: (products) => set({ products }),
  setOperatingCosts: (costs) => set({ operatingCosts: costs }),
  setFinancing: (financing) => set({ financing }),
  setIndicators: (indicators) => set({ indicators }),
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),
  clearProject: () =>
    set({
      currentProject: null,
      investments: [],
      products: [],
      operatingCosts: [],
      financing: [],
      indicators: null,
      error: null,
    }),
}));
