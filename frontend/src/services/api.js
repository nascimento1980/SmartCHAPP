import axios from 'axios'

// Prefer runtime override, then Vite env, then default relative path
const BASE_URL = (typeof window !== 'undefined' && window.__API_BASE_URL__) || import.meta.env.VITE_API_BASE_URL || '/api/v1'

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
})

// Interceptor para requisições
api.interceptors.request.use(
  (config) => {
    // Configuração do token de autenticação
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    // CorrelationId: gerar e anexar se não existir
    let correlationId = sessionStorage.getItem('correlationId')
    if (!correlationId) {
      // UUID v4 simples (fallback) sem dependência externa
      const rnd = () => Math.random().toString(16).slice(2)
      correlationId = `${rnd()}-${rnd()}-${rnd()}-${rnd()}`
      sessionStorage.setItem('correlationId', correlationId)
    }
    config.headers['X-Correlation-Id'] = correlationId

    // Removido log de debug para melhorar performance
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
)

// Interceptor para respostas
let isRefreshing = false;
let pendingRequests = [];

function onRefreshed(newToken) {
  pendingRequests.forEach((cb) => cb(newToken));
  pendingRequests = [];
}

api.interceptors.response.use(
  (response) => {
    // Atualizar correlationId de resposta (eco do servidor) se presente
    const serverCid = response.headers?.['x-correlation-id']
    if (serverCid) {
      sessionStorage.setItem('correlationId', serverCid)
    }
    // Removido log de debug para melhorar performance
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    if (
      !error.response ||
      originalRequest?.url?.includes('/auth/login') ||
      originalRequest?.url?.includes('/auth/refresh') ||
      originalRequest?._retry
    ) {
      if (error.response && error.response.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
      return Promise.reject(error);
    }

    if (error.response.status === 401) {
      const storedToken = localStorage.getItem('token');
      if (!storedToken) {
        localStorage.removeItem('user');
        window.location.href = '/login';
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise((resolve) => {
          pendingRequests.push((newToken) => {
            if (newToken) {
              originalRequest.headers.Authorization = `Bearer ${newToken}`;
              resolve(api(originalRequest));
            } else {
              resolve(Promise.reject(error));
            }
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshResponse = await api.post('/auth/refresh-token', null, {
          headers: { Authorization: `Bearer ${storedToken}` }
        });

        const newToken = refreshResponse.data?.token;
        if (newToken) {
          localStorage.setItem('token', newToken);
          onRefreshed(newToken);
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return api(originalRequest);
        } else {
          throw new Error('No token in refresh response');
        }
      } catch (refreshError) {
        onRefreshed(null);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default api
