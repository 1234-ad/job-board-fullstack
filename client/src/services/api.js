import axios from 'axios';

// Create axios instance with base configuration
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => {
    return response.data;
  },
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    
    return Promise.reject(error.response?.data || error.message);
  }
);

// Auth API calls
export const authAPI = {
  register: (userData) => api.post('/auth/register', userData),
  login: (credentials) => api.post('/auth/login', credentials),
  getProfile: () => api.get('/auth/me'),
  updateProfile: (profileData) => api.put('/auth/profile', profileData),
  changePassword: (passwordData) => api.post('/auth/change-password', passwordData),
};

// Resume API calls
export const resumeAPI = {
  getResumes: () => api.get('/resumes'),
  getResume: (id) => api.get(`/resumes/${id}`),
  createResume: (resumeData) => {
    const formData = new FormData();
    Object.keys(resumeData).forEach(key => {
      if (resumeData[key] instanceof File) {
        formData.append(key, resumeData[key]);
      } else if (typeof resumeData[key] === 'object') {
        formData.append(key, JSON.stringify(resumeData[key]));
      } else {
        formData.append(key, resumeData[key]);
      }
    });
    return api.post('/resumes', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  updateResume: (id, resumeData) => {
    const formData = new FormData();
    Object.keys(resumeData).forEach(key => {
      if (resumeData[key] instanceof File) {
        formData.append(key, resumeData[key]);
      } else if (typeof resumeData[key] === 'object') {
        formData.append(key, JSON.stringify(resumeData[key]));
      } else {
        formData.append(key, resumeData[key]);
      }
    });
    return api.put(`/resumes/${id}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  deleteResume: (id) => api.delete(`/resumes/${id}`),
};

// Job API calls
export const jobAPI = {
  getJobs: (params = {}) => api.get('/jobs', { params }),
  getJob: (id) => api.get(`/jobs/${id}`),
  createJob: (jobData) => api.post('/jobs', jobData),
  updateJob: (id, jobData) => api.put(`/jobs/${id}`, jobData),
  deleteJob: (id) => api.delete(`/jobs/${id}`),
  searchJobs: (searchParams) => api.get('/jobs/search', { params: searchParams }),
};

// Application API calls
export const applicationAPI = {
  getApplications: () => api.get('/applications'),
  getApplication: (id) => api.get(`/applications/${id}`),
  createApplication: (applicationData) => api.post('/applications', applicationData),
  updateApplication: (id, applicationData) => api.put(`/applications/${id}`, applicationData),
  deleteApplication: (id) => api.delete(`/applications/${id}`),
  getJobApplications: (jobId) => api.get(`/applications/job/${jobId}`),
};

// AI API calls
export const aiAPI = {
  analyzeResume: (resumeId) => api.post('/ai/analyze-resume', { resume_id: resumeId }),
  matchJobs: (resumeId, limit = 10) => api.post('/ai/match-jobs', { resume_id: resumeId, limit }),
  skillGapAnalysis: (resumeId, targetRole, targetIndustry) => 
    api.post('/ai/skill-gap-analysis', { 
      resume_id: resumeId, 
      target_role: targetRole, 
      target_industry: targetIndustry 
    }),
  getAnalysisHistory: (params = {}) => api.get('/ai/analysis-history', { params }),
  improveResume: (resumeId, targetRole) => 
    api.post('/ai/improve-resume', { resume_id: resumeId, target_role: targetRole }),
};

// Skills API calls
export const skillsAPI = {
  getSkills: () => api.get('/skills'),
  createSkill: (skillData) => api.post('/skills', skillData),
  updateSkill: (id, skillData) => api.put(`/skills/${id}`, skillData),
  deleteSkill: (id) => api.delete(`/skills/${id}`),
  searchSkills: (query) => api.get(`/skills/search?q=${query}`),
};

// Analytics API calls
export const analyticsAPI = {
  getDashboardStats: () => api.get('/analytics/dashboard'),
  getResumeStats: (resumeId) => api.get(`/analytics/resume/${resumeId}`),
  getJobStats: (jobId) => api.get(`/analytics/job/${jobId}`),
  getApplicationStats: () => api.get('/analytics/applications'),
};

// File upload utility
export const uploadFile = async (file, type = 'resume') => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('type', type);
  
  return api.post('/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
};

// Export individual functions for backward compatibility
export const register = authAPI.register;
export const login = authAPI.login;
export const getProfile = authAPI.getProfile;
export const updateProfile = authAPI.updateProfile;
export const changePassword = authAPI.changePassword;

export const getResumes = resumeAPI.getResumes;
export const getResume = resumeAPI.getResume;
export const createResume = resumeAPI.createResume;
export const updateResume = resumeAPI.updateResume;
export const deleteResume = resumeAPI.deleteResume;

export const getJobs = jobAPI.getJobs;
export const getJob = jobAPI.getJob;
export const createJob = jobAPI.createJob;
export const updateJob = jobAPI.updateJob;
export const deleteJob = jobAPI.deleteJob;
export const searchJobs = jobAPI.searchJobs;

export const getApplications = applicationAPI.getApplications;
export const getApplication = applicationAPI.getApplication;
export const createApplication = applicationAPI.createApplication;
export const updateApplication = applicationAPI.updateApplication;
export const deleteApplication = applicationAPI.deleteApplication;

export const analyzeResume = aiAPI.analyzeResume;
export const matchJobs = aiAPI.matchJobs;
export const skillGapAnalysis = aiAPI.skillGapAnalysis;
export const getAnalysisHistory = aiAPI.getAnalysisHistory;
export const improveResume = aiAPI.improveResume;

export default api;