import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import { getAuthHeader, refreshAccessToken, logout } from "./auth-jwt";

// Use relative URLs for API calls (Next.js API routes are on the same server)
// Only use absolute URL if explicitly set in environment
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "";

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true, // Include httpOnly cookies (for refresh token)
});

// Request interceptor: Add JWT token to requests
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const authHeader = getAuthHeader();
    if (authHeader && config.headers) {
      config.headers.Authorization = authHeader;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor: Handle token refresh on 401
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: any) => void;
  reject: (reason?: any) => void;
}> = [];

const processQueue = (error: AxiosError | null, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // If error is 401 and we haven't tried refreshing yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // If already refreshing, queue this request
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
            }
            return api(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const newToken = await refreshAccessToken();
        if (newToken) {
          processQueue(null, newToken);
          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
          }
          return api(originalRequest);
        } else {
          // Refresh failed - logout user
          logout();
          processQueue(error, null);
          window.location.href = "/login";
          return Promise.reject(error);
        }
      } catch (refreshError) {
        processQueue(error, null);
        logout();
        window.location.href = "/login";
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

// API functions
export const pricingApi = {
  getCategories: async () => {
    const response = await api.get("/api/pricing");
    return response.data;
  },
  getPricingByCategory: async (category: string) => {
    const response = await api.get(`/api/pricing?category=${category}`);
    return response.data;
  },
};

export const serviceRequestApi = {
  create: async (data: any) => {
    const response = await api.post("/api/service-requests", data);
    return response.data;
  },
  getAll: async (params?: {
    status?: string;
    category?: string;
    search?: string;
    customerEmail?: string;
  }) => {
    const response = await api.get("/api/service-requests", { params });
    return response.data;
  },
  getById: async (id: number) => {
    const response = await api.get(`/api/service-requests/${id}`);
    return response.data;
  },
  update: async (id: number, data: any) => {
    const response = await api.patch(`/api/service-requests/${id}`, data);
    return response.data;
  },
  confirmCompletion: async (id: number) => {
    const response = await api.post(`/api/service-requests/${id}/confirm-completion`);
    return response.data;
  },
};

export const providerApi = {
  getAll: async () => {
    const response = await api.get("/api/providers");
    return response.data;
  },
  getById: async (id: number) => {
    const response = await api.get(`/api/providers/${id}`);
    return response.data;
  },
  create: async (data: any) => {
    const response = await api.post("/api/providers", data);
    return response.data;
  },
  update: async (id: number, data: any) => {
    const response = await api.patch(`/api/providers/${id}`, data);
    return response.data;
  },
  delete: async (id: number) => {
    const response = await api.delete(`/api/providers/${id}`);
    return response.data;
  },
};

export const authApi = {
  signup: async (data: {
    name: string;
    businessName?: string;
    email: string;
    password: string;
    phone?: string;
    userType?: "customer" | "provider";
    serviceType?: string;
    address?: string;
    experienceYears?: string;
  }) => {
    const response = await api.post("/api/auth/signup", data);
    return response.data;
  },
  login: async (data: { email: string; password: string }) => {
    const response = await api.post("/api/auth/login", data);
    return response.data;
  },
  logout: async () => {
    const response = await api.post("/api/auth/logout");
    return response.data;
  },
  refresh: async () => {
    const response = await api.post("/api/auth/refresh");
    return response.data;
  },
};

export const complaintApi = {
  getAll: async (params?: { email?: string; status?: string }) => {
    const response = await api.get("/api/complaints", { params });
    return response.data;
  },
  getById: async (id: number) => {
    const response = await api.get(`/api/complaints/${id}`);
    return response.data;
  },
  create: async (data: any) => {
    const response = await api.post("/api/complaints", data);
    return response.data;
  },
  update: async (id: number, data: any) => {
    const response = await api.patch(`/api/complaints/${id}`, data);
    return response.data;
  },
  delete: async (id: number) => {
    const response = await api.delete(`/api/complaints/${id}`);
    return response.data;
  },
};

export const userApi = {
  getAll: async () => {
    const response = await api.get("/api/users");
    return response.data;
  },
  getById: async (id: number) => {
    const response = await api.get(`/api/users/${id}`);
    return response.data;
  },
  update: async (id: number, data: any) => {
    const response = await api.patch(`/api/users/${id}`, data);
    return response.data;
  },
  delete: async (id: number) => {
    const response = await api.delete(`/api/users/${id}`);
    return response.data;
  },
  resetPassword: async (userId: number, newPassword: string) => {
    const response = await api.post("/api/admin/reset-password", {
      userId,
      newPassword,
    });
    return response.data;
  },
};

export const auditLogApi = {
  getAll: async (params?: {
    userId?: number;
    resourceType?: string;
    resourceId?: number;
    action?: string;
    limit?: number;
    offset?: number;
  }) => {
    const response = await api.get("/api/audit-logs", { params });
    return response.data;
  },
};

export const fraudMonitoringApi = {
  getAlerts: async () => {
    const response = await api.get("/api/fraud-monitoring/alerts");
    return response.data;
  },
};

export const trustScoreApi = {
  getByProviderId: async (providerId: number) => {
    const response = await api.get(`/api/trust-scores/${providerId}`);
    return response.data;
  },
  recalculate: async (providerId: number) => {
    const response = await api.post(`/api/trust-scores/${providerId}/recalculate`);
    return response.data;
  },
};

export const reviewApi = {
  create: async (data: {
    jobId: number;
    reviewedBy: "customer" | "provider";
    rating: number;
    comment?: string;
    reliabilityScore?: number;
    qualityScore?: number;
    communicationScore?: number;
  }) => {
    const response = await api.post("/api/reviews", data);
    return response.data;
  },
  getAll: async (params?: {
    providerId?: number;
    jobId?: number;
    customerId?: number;
    reviewedBy?: "customer" | "provider";
  }) => {
    const response = await api.get("/api/reviews", { params });
    return response.data;
  },
  getById: async (id: number) => {
    const response = await api.get(`/api/reviews/${id}`);
    return response.data;
  },
  delete: async (id: number) => {
    const response = await api.delete(`/api/reviews/${id}`);
    return response.data;
  },
};

export const disputeApi = {
  create: async (data: {
    serviceRequestId: number;
    initiatedBy: 'customer' | 'provider';
    reason: string;
    description: string;
  }) => {
    const response = await api.post("/api/disputes", data);
    return response.data;
  },
  getAll: async (params?: {
    serviceRequestId?: number;
    status?: string;
    initiatedBy?: string;
  }) => {
    const response = await api.get("/api/disputes", { params });
    return response.data;
  },
  getById: async (id: number) => {
    const response = await api.get(`/api/disputes/${id}`);
    return response.data;
  },
  update: async (id: number, data: {
    status?: string;
    resolution?: string;
  }) => {
    const response = await api.patch(`/api/disputes/${id}`, data);
    return response.data;
  },
};

export const paymentApi = {
  getAll: async (params?: {
    jobId?: number;
    status?: string;
    customerId?: number;
    providerId?: number;
  }) => {
    const response = await api.get("/api/payments", { params });
    return response.data;
  },
  verify: async (paymentId: number) => {
    const response = await api.post(`/api/payments/${paymentId}/verify`);
    return response.data;
  },
  release: async (paymentId: number) => {
    const response = await api.post(`/api/payments/${paymentId}/release`);
    return response.data;
  },
  refund: async (paymentId: number, reason?: string) => {
    const response = await api.post(`/api/payments/${paymentId}/refund`, { reason });
    return response.data;
  },
};

export const profileApi = {
  customer: {
    get: async () => {
      const response = await api.get("/api/profiles/customer");
      return response.data;
    },
    update: async (data: {
      address?: string;
      city?: string;
      postalCode?: string;
      preferredContactMethod?: string;
    }) => {
      const response = await api.put("/api/profiles/customer", data);
      return response.data;
    },
  },
  provider: {
    get: async () => {
      const response = await api.get("/api/profiles/provider");
      return response.data;
    },
    update: async (data: {
      bankName?: string;
      bankAccountNumber?: string;
      bankAccountType?: string;
      idNumber?: string;
      taxNumber?: string;
      businessRegistration?: string;
    }) => {
      const response = await api.put("/api/profiles/provider", data);
      return response.data;
    },
    verify: async (providerId: number, status: 'verified' | 'rejected', notes?: string) => {
      const response = await api.post(`/api/profiles/provider/${providerId}/verify`, { status, notes });
      return response.data;
    },
  },
  admin: {
    get: async () => {
      const response = await api.get("/api/profiles/admin");
      return response.data;
    },
    update: async (data: {
      department?: string;
      permissions?: string[] | string;
    }) => {
      const response = await api.put("/api/profiles/admin", data);
      return response.data;
    },
  },
};
