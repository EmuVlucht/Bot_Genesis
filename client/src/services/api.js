import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
  withCredentials: true
});

// Request interceptor untuk menambahkan token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor untuk handle errors dan token refresh
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (refreshToken) {
          const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
            refreshToken
          });

          const { accessToken } = response.data.data;
          localStorage.setItem('accessToken', accessToken);

          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          return apiClient(originalRequest);
        }
      } catch (refreshError) {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

// Authentication Services
export const authService = {
  register: async (userData) => {
    const response = await apiClient.post('/auth/register', userData);
    return response.data;
  },

  login: async (credentials) => {
    const response = await apiClient.post('/auth/login', credentials);
    return response.data;
  },

  logout: async () => {
    const response = await apiClient.post('/auth/logout');
    return response.data;
  },

  logoutAll: async () => {
    const response = await apiClient.post('/auth/logout-all');
    return response.data;
  },

  getProfile: async () => {
    const response = await apiClient.get('/auth/profile');
    return response.data;
  },

  refreshToken: async (refreshToken) => {
    const response = await apiClient.post('/auth/refresh', { refreshToken });
    return response.data;
  }
};

// Vault Accounts Services
export const accountsService = {
  getAll: async (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.search) params.append('search', filters.search);
    if (filters.category) params.append('category', filters.category);
    if (filters.favorite) params.append('favorite', 'true');

    const response = await apiClient.get(`/accounts?${params.toString()}`);
    return response.data;
  },

  getById: async (id) => {
    const response = await apiClient.get(`/accounts/${id}`);
    return response.data;
  },

  create: async (accountData) => {
    const response = await apiClient.post('/accounts', accountData);
    return response.data;
  },

  update: async (id, accountData) => {
    const response = await apiClient.put(`/accounts/${id}`, accountData);
    return response.data;
  },

  delete: async (id) => {
    const response = await apiClient.delete(`/accounts/${id}`);
    return response.data;
  },

  getCategories: async () => {
    const response = await apiClient.get('/categories');
    return response.data;
  }
};

// Export/Import Services
export const exportService = {
  exportVault: async (exportPassword) => {
    const response = await apiClient.post('/export', { exportPassword });
    return response.data;
  },

  importVault: async (importData, importPassword, mergeMode = 'merge') => {
    const response = await apiClient.post('/import', {
      importData,
      importPassword,
      mergeMode
    });
    return response.data;
  },

  validateImport: async (importData, importPassword) => {
    const response = await apiClient.post('/import/validate', {
      importData,
      importPassword
    });
    return response.data;
  },

  getExportHistory: async () => {
    const response = await apiClient.get('/export/history');
    return response.data;
  }
};

// Health Check
export const healthCheck = async () => {
  try {
    const response = await apiClient.get('/health');
    return response.data;
  } catch (error) {
    return { success: false, error: 'Backend tidak dapat dijangkau' };
  }
};

export default apiClient;