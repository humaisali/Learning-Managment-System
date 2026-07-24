import { create } from "zustand";
import api from "../lib/api";
import { connectSocket, disconnectSocket } from "../lib/socket";

const useAuthStore = create((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,

  // Initialize auth state on app load
  initialize: async () => {
    try {
      const response = await api.get("/auth/me");
      const user = response.data.data.user;

      set({ user, isAuthenticated: true, isLoading: false });

      // Connect socket with current token
      const token = localStorage.getItem("accessToken");
      if (token) connectSocket(token);
    } catch {
      set({ user: null, isAuthenticated: false, isLoading: false });
      localStorage.removeItem("accessToken");
    }
  },

  // Register a new account
  register: async (data) => {
    const response = await api.post("/auth/register", data);
    const { user, accessToken } = response.data.data;

    localStorage.setItem("accessToken", accessToken);
    set({ user, isAuthenticated: true });

    connectSocket(accessToken);
    return user;
  },

  // Login with email + password
  loginWithEmail: async (email, password) => {
    const response = await api.post("/auth/login/email", { email, password });
    const { user, accessToken } = response.data.data;

    localStorage.setItem("accessToken", accessToken);
    set({ user, isAuthenticated: true });

    connectSocket(accessToken);
    return user;
  },

  // Login with phone + OTP
  loginWithPhone: async (phone, code) => {
    const response = await api.post("/auth/login/phone", { phone, code });
    const { user, accessToken } = response.data.data;

    localStorage.setItem("accessToken", accessToken);
    set({ user, isAuthenticated: true });

    connectSocket(accessToken);
    return user;
  },

  // Request OTP
  requestOTP: async (phone) => {
    const response = await api.post("/auth/request-otp", { phone });
    return response.data.data;
  },

  // Forgot password
  forgotPassword: async (email) => {
    const response = await api.post("/auth/forgot-password", { email });
    return response.data;
  },

  // Reset password
  resetPassword: async (token, password) => {
    const response = await api.post("/auth/reset-password", { token, password });
    return response.data;
  },

  // Logout
  logout: async () => {
    try {
      await api.post("/auth/logout");
    } catch {
      // Even if the API call fails, clear local state
    }
    localStorage.removeItem("accessToken");
    disconnectSocket();
    set({ user: null, isAuthenticated: false });
  },
}));

export default useAuthStore;
