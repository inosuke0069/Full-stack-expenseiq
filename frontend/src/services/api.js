// services/api.js
// All API calls to the FastAPI backend at http://127.0.0.1:8000

import axios from "axios";

const BASE = "http://127.0.0.1:8000/api";

const api = axios.create({ baseURL: BASE });

// Attach JWT token to every request automatically
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Auth
export const register   = (data) => api.post("/auth/register", data);
export const login      = (data) => api.post("/auth/login", data);
export const getMe      = ()     => api.get("/auth/me");
export const verifyOTP  = (data) => api.post("/auth/verify-otp", data);
export const resendOTP  = (data) => api.post("/auth/resend-otp", data);

// Transactions
export const getTransactions   = (params) => api.get("/transactions/", { params });
export const createTransaction = (data)   => api.post("/transactions/", data);
export const updateTransaction = (id, data) => api.put(`/transactions/${id}`, data);
export const deleteTransaction = (id)     => api.delete(`/transactions/${id}`);

// Budgets
export const getBudgets      = (params) => api.get("/budgets/", { params });
export const createBudget    = (data)   => api.post("/budgets/", data);
export const deleteBudget    = (id)     => api.delete(`/budgets/${id}`);
export const getBudgetStatus = (params) => api.get("/budgets/status", { params });

// Analytics
export const getMonthlySummary  = (params) => api.get("/analytics/summary", { params });
export const getOverallSummary  = ()        => api.get("/analytics/overall-summary");
export const getForecast        = ()        => api.get("/analytics/forecast");
export const getAnomalies       = ()        => api.get("/analytics/anomalies");
export const getTrends          = (params)  => api.get("/analytics/trends", { params });
export const getCategoryTrends  = (params)  => api.get("/analytics/category-trends", { params });

// Alerts
export const getAlerts = () => api.get("/alerts/");
export const parseBankStatement = (formData) => api.post("/import/parse", formData, { headers: { "Content-Type": "multipart/form-data" } });
