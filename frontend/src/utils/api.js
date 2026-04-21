import axios from 'axios';

const API = axios.create({ baseURL: '/api' });

export const getStats = () => API.get('/stats');
export const getInventory = () => API.get('/inventory');
export const getDonors = () => API.get('/donors');
export const registerDonor = (data) => API.post('/donors/register', data);
export const donateBlood = (data) => API.post('/blood-units/donate', data);
export const getBloodUnits = (params) => API.get('/blood-units', { params });
export const getHospitals = () => API.get('/hospitals');
export const registerHospital = (data) => API.post('/hospitals/register', data);
export const verifyHospital = (wallet) => API.put(`/hospitals/${wallet}/verify`);
export const getRequests = (params) => API.get('/requests', { params });
export const createRequest = (data) => API.post('/requests', data);
export const approveRequest = (id) => API.put(`/requests/${id}/approve`);
export const rejectRequest = (id) => API.put(`/requests/${id}/reject`);
export const getTransactions = () => API.get('/transactions');

export default API;
