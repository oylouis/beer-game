import { api } from './env';

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${api.base}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as any).error || `请求失败 ${res.status}`);
  }
  return res.json();
}

export const createRoom = (name = '', teacherName = '', totalWeeks = 36) =>
  req<{ roomId: string; code: string; teacherToken: string }>('/api/rooms', {
    method: 'POST',
    body: JSON.stringify({ name, teacherName, totalWeeks }),
  });

export const joinRoom = (code: string, name: string, role?: string) =>
  req<{ player: { id: string; role: string; name: string; token: string }; room: any }>(
    `/api/rooms/${code}/join`,
    { method: 'POST', body: JSON.stringify({ name, role }) }
  );

export const getRoom = (code: string) => req(`/api/rooms/${code}`);

export const createPractice = (role: string, name: string) =>
  req<{ roomId: string; code: string; player: { id: string; role: string; name: string; token: string } }>(
    '/api/practice',
    { method: 'POST', body: JSON.stringify({ role, name }) }
  );

export const getScenarios = () => req<Array<{ id: string; name: string; description: string }>>('/api/scenarios');