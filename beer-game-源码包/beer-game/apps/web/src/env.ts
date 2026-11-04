// 后端地址：生产用同源或 VITE_API_BASE，开发用 vite proxy
export const API_BASE = (import.meta.env.VITE_API_BASE as string) || '';
export const SOCKET_URL = (import.meta.env.VITE_SOCKET_URL as string) || undefined;

export const api = {
  base: API_BASE,
  socket: SOCKET_URL,
};