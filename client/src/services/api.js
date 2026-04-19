import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

const api = axios.create({
    baseURL: API_BASE,
    headers: {
        'Content-Type': 'application/json',
    },
});

export const companyAPI = {
    list: () => api.get('/companies'),
    getById: (id) => api.get(`/companies/${id}`),
    create: (data) => api.post('/companies', data),
};

export const jobAPI = {
    create: (data) => api.post('/jobs', data),
    listByCompany: (companyId) => api.get(`/jobs/company/${companyId}`),
    getPipeline: (jobId) => api.get(`/jobs/${jobId}/pipeline`),
    updateStatus: (jobId, status) =>
        api.patch(`/jobs/${jobId}/status`, { status }),
};

export const applicationAPI = {
    apply: (data) => api.post('/applications', data),
    getStatus: (id) => api.get(`/applications/${id}`),
    getHistory: (id) => api.get(`/applications/${id}/history`),
    exit: (id, reason) =>
        api.post(`/applications/${id}/exit`, { reason }),
    acknowledge: (id) =>
        api.post(`/applications/${id}/acknowledge`),
    lookupByEmail: (email) =>
        api.get(`/applications/lookup?email=${encodeURIComponent(email)}`),
};

export default api;