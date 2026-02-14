import axios from 'axios';
import type { 
  User, Project, Investment, Product, OperatingCost, 
  Financing, ApiResponse, PaginatedResponse, CashFlowYear,
  IncomeStatementYear, BalanceSheetYear, FinancialIndicators,
  SensitivityResult, Scenario, ReportConfig
} from '../types';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const authData = localStorage.getItem('fs-builder-auth');
  if (authData) {
    const { state } = JSON.parse(authData);
    if (state?.token) {
      config.headers.Authorization = `Bearer ${state.token}`;
    }
  }
  return config;
});

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('fs-builder-auth');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authApi = {
  login: async (email: string, password: string) => {
    const res = await api.post<ApiResponse<{ user: User; token: string }>>('/auth/login', { email, password });
    return res.data;
  },
  register: async (name: string, email: string, password: string) => {
    const res = await api.post<ApiResponse<{ user: User; token: string }>>('/auth/register', { name, email, password });
    return res.data;
  },
  me: async () => {
    const res = await api.get<ApiResponse<User>>('/auth/me');
    return res.data;
  },
};

// Projects API
export const projectsApi = {
  list: async (page = 1, limit = 10) => {
    const res = await api.get<ApiResponse<PaginatedResponse<Project>>>(`/projects?page=${page}&limit=${limit}`);
    return res.data;
  },
  get: async (id: string) => {
    const res = await api.get<ApiResponse<Project>>(`/projects/${id}`);
    return res.data;
  },
  create: async (data: Partial<Project>) => {
    const res = await api.post<ApiResponse<Project>>('/projects', data);
    return res.data;
  },
  update: async (id: string, data: Partial<Project>) => {
    const res = await api.put<ApiResponse<Project>>(`/projects/${id}`, data);
    return res.data;
  },
  delete: async (id: string) => {
    const res = await api.delete<ApiResponse<void>>(`/projects/${id}`);
    return res.data;
  },
  duplicate: async (id: string) => {
    const res = await api.post<ApiResponse<Project>>(`/projects/${id}/duplicate`);
    return res.data;
  },
};

// Investments API
export const investmentsApi = {
  list: async (projectId: string) => {
    const res = await api.get<ApiResponse<Investment[]>>(`/projects/${projectId}/investments`);
    return res.data;
  },
  create: async (projectId: string, data: Partial<Investment>) => {
    const res = await api.post<ApiResponse<Investment>>(`/projects/${projectId}/investments`, data);
    return res.data;
  },
  update: async (projectId: string, id: string, data: Partial<Investment>) => {
    const res = await api.put<ApiResponse<Investment>>(`/projects/${projectId}/investments/${id}`, data);
    return res.data;
  },
  delete: async (projectId: string, id: string) => {
    const res = await api.delete<ApiResponse<void>>(`/projects/${projectId}/investments/${id}`);
    return res.data;
  },
};

// Products API
export const productsApi = {
  list: async (projectId: string) => {
    const res = await api.get<ApiResponse<Product[]>>(`/projects/${projectId}/products`);
    return res.data;
  },
  create: async (projectId: string, data: Partial<Product>) => {
    const res = await api.post<ApiResponse<Product>>(`/projects/${projectId}/products`, data);
    return res.data;
  },
  update: async (projectId: string, id: string, data: Partial<Product>) => {
    const res = await api.put<ApiResponse<Product>>(`/projects/${projectId}/products/${id}`, data);
    return res.data;
  },
  delete: async (projectId: string, id: string) => {
    const res = await api.delete<ApiResponse<void>>(`/projects/${projectId}/products/${id}`);
    return res.data;
  },
};

// Operating Costs API
export const costsApi = {
  list: async (projectId: string) => {
    const res = await api.get<ApiResponse<OperatingCost[]>>(`/projects/${projectId}/costs`);
    return res.data;
  },
  create: async (projectId: string, data: Partial<OperatingCost>) => {
    const res = await api.post<ApiResponse<OperatingCost>>(`/projects/${projectId}/costs`, data);
    return res.data;
  },
  update: async (projectId: string, id: string, data: Partial<OperatingCost>) => {
    const res = await api.put<ApiResponse<OperatingCost>>(`/projects/${projectId}/costs/${id}`, data);
    return res.data;
  },
  delete: async (projectId: string, id: string) => {
    const res = await api.delete<ApiResponse<void>>(`/projects/${projectId}/costs/${id}`);
    return res.data;
  },
};

// Financing API
export const financingApi = {
  list: async (projectId: string) => {
    const res = await api.get<ApiResponse<Financing[]>>(`/projects/${projectId}/financing`);
    return res.data;
  },
  create: async (projectId: string, data: Partial<Financing>) => {
    const res = await api.post<ApiResponse<Financing>>(`/projects/${projectId}/financing`, data);
    return res.data;
  },
  update: async (projectId: string, id: string, data: Partial<Financing>) => {
    const res = await api.put<ApiResponse<Financing>>(`/projects/${projectId}/financing/${id}`, data);
    return res.data;
  },
  delete: async (projectId: string, id: string) => {
    const res = await api.delete<ApiResponse<void>>(`/projects/${projectId}/financing/${id}`);
    return res.data;
  },
  getAmortization: async (projectId: string, id: string) => {
    const res = await api.get<ApiResponse<{ year: number; principal: number; interest: number; balance: number }[]>>(
      `/projects/${projectId}/financing/${id}/amortization`
    );
    return res.data;
  },
};

// Analysis API
export const analysisApi = {
  getIndicators: async (projectId: string) => {
    const res = await api.get<ApiResponse<FinancialIndicators>>(`/projects/${projectId}/analysis/indicators`);
    return res.data;
  },
  getCashFlow: async (projectId: string) => {
    const res = await api.get<ApiResponse<CashFlowYear[]>>(`/projects/${projectId}/analysis/cashflow`);
    return res.data;
  },
  getIncomeStatement: async (projectId: string) => {
    const res = await api.get<ApiResponse<IncomeStatementYear[]>>(`/projects/${projectId}/analysis/income-statement`);
    return res.data;
  },
  getBalanceSheet: async (projectId: string) => {
    const res = await api.get<ApiResponse<BalanceSheetYear[]>>(`/projects/${projectId}/analysis/balance-sheet`);
    return res.data;
  },
  getSensitivity: async (projectId: string, variables: string[]) => {
    const res = await api.post<ApiResponse<SensitivityResult[]>>(`/projects/${projectId}/analysis/sensitivity`, { variables });
    return res.data;
  },
  getBreakEven: async (projectId: string) => {
    const res = await api.get<ApiResponse<{ units: number; revenue: number; chartData: { quantity: number; revenue: number; totalCost: number }[] }>>(
      `/projects/${projectId}/analysis/break-even`
    );
    return res.data;
  },
};

// Scenarios API
export const scenariosApi = {
  list: async (projectId: string) => {
    const res = await api.get<ApiResponse<Scenario[]>>(`/projects/${projectId}/scenarios`);
    return res.data;
  },
  create: async (projectId: string, data: Partial<Scenario>) => {
    const res = await api.post<ApiResponse<Scenario>>(`/projects/${projectId}/scenarios`, data);
    return res.data;
  },
  update: async (projectId: string, id: string, data: Partial<Scenario>) => {
    const res = await api.put<ApiResponse<Scenario>>(`/projects/${projectId}/scenarios/${id}`, data);
    return res.data;
  },
  delete: async (projectId: string, id: string) => {
    const res = await api.delete<ApiResponse<void>>(`/projects/${projectId}/scenarios/${id}`);
    return res.data;
  },
  calculate: async (projectId: string, id: string) => {
    const res = await api.post<ApiResponse<Scenario>>(`/projects/${projectId}/scenarios/${id}/calculate`);
    return res.data;
  },
};

// Reports API
export const reportsApi = {
  generatePdf: async (projectId: string, config: ReportConfig) => {
    const res = await api.post(`/projects/${projectId}/reports/pdf`, config, {
      responseType: 'blob',
    });
    return res.data;
  },
  generateExcel: async (projectId: string, config: ReportConfig) => {
    const res = await api.post(`/projects/${projectId}/reports/excel`, config, {
      responseType: 'blob',
    });
    return res.data;
  },
};

export default api;
