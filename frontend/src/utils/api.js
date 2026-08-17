import axios from 'axios';

const API = axios.create({
  baseURL: process.env.REACT_APP_API_URL || '/api',
});

// Interceptor to attach JWT token if available
API.interceptors.request.use((config) => {
  const token = localStorage.getItem('bloodchain_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => Promise.reject(error));

// General
export const getStats = () => API.get('/stats');
export const getInventory = (params) => API.get('/inventory', { params });
export const getDonors = () => API.get('/donors');
export const getHospitals = () => API.get('/hospitals');
export const getRequests = (params) => API.get('/requests', { params });
export const getBloodUnits = (params) => API.get('/blood-units', { params });
export const getTransactions = (params) => API.get('/transactions', { params });

// On-Chain Action Handlers & Fallbacks
export const registerDonor = (data) => API.post('/donors/register', data);
export const syncDonor = (data) => API.post('/donors/sync', data);

export const donateBlood = (data) => API.post('/blood-units/donate', data);
export const syncUnit = (data) => API.post('/blood-units/sync', data);

export const registerHospital = (data) => API.post('/hospitals/register', data);
export const syncHospital = (data) => API.post('/hospitals/sync', data);

export const createRequest = (data) => API.post('/requests', data);
export const syncRequest = (data) => API.post('/requests/sync', data);

// Auth & Admin Actions
export const loginAdmin = (credentials) => API.post('/auth/login', credentials);
export const verifyHospital = (wallet) => API.put(`/hospitals/${wallet}/verify`);
export const approveRequest = (id) => API.put(`/requests/${id}/approve`);
export const rejectRequest = (id, reason) => API.put(`/requests/${id}/reject`, { reason });

// New Features (Phase 2)
export const getProvenance = (unitId) => API.get(`/blood-units/${unitId}/provenance`);
export const getForecast = (params) => API.get('/forecast', { params });
export const sendBloodNeededAlert = (data) => API.post('/notify/blood-needed', data);
export const sendCooldownReminder = (data) => API.post('/notify/cooldown-over', data);
export const uploadDocumentIpfs = (formData) => API.post('/ipfs/upload', formData, {
  headers: { 'Content-Type': 'multipart/form-data' },
});
export const getDonorCertificateUrl = (wallet) => `${API.defaults.baseURL}/donors/${wallet}/certificate`;
export const getExportCsvUrl = (from, to) => `${API.defaults.baseURL}/export/csv?from=${from || ''}&to=${to || ''}`;

export default API;
