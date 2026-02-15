import { Trail, HikeStats } from '../types';

const HISTORY_KEY = 'trailguard_history';
const OFFLINE_TRAILS_KEY = 'trailguard_offline_trails';

export const saveHikeToHistory = (stats: HikeStats) => {
  const current = getHikeHistory();
  const updated = [stats, ...current];
  localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
};

export const getHikeHistory = (): HikeStats[] => {
  const data = localStorage.getItem(HISTORY_KEY);
  return data ? JSON.parse(data) : [];
};

export const saveTrailOffline = (trail: Trail) => {
  const current = getOfflineTrails();
  if (!current.find(t => t.id === trail.id)) {
    const updated = [...current, { ...trail, isOffline: true }];
    localStorage.setItem(OFFLINE_TRAILS_KEY, JSON.stringify(updated));
  }
};

export const removeOfflineTrail = (trailId: string) => {
  const current = getOfflineTrails();
  const updated = current.filter(t => t.id !== trailId);
  localStorage.setItem(OFFLINE_TRAILS_KEY, JSON.stringify(updated));
};

export const getOfflineTrails = (): Trail[] => {
  const data = localStorage.getItem(OFFLINE_TRAILS_KEY);
  return data ? JSON.parse(data) : [];
};

export const isTrailOffline = (trailId: string): boolean => {
  return !!getOfflineTrails().find(t => t.id === trailId);
};