import AsyncStorage from '@react-native-async-storage/async-storage';

export interface CheckInRecord {
  id: string;
  timestamp: number; // Unix timestamp ms
  note?: string;
}

export interface EmergencyContact {
  id: string;
  name: string;
  phone: string;
  relation: string;
}

export interface AppSettings {
  checkInIntervalHours: number; // how often user must check in (in hours)
  reminderMinutesBefore: number; // remind X minutes before deadline
  notificationsEnabled: boolean;
  quietHoursStart: string; // "HH:mm"
  quietHoursEnd: string;   // "HH:mm"
  quietHoursEnabled: boolean;
}

export interface AppState {
  lastCheckIn: number | null; // Unix timestamp ms, null if never checked in
  checkInHistory: CheckInRecord[];
  emergencyContacts: EmergencyContact[];
  settings: AppSettings;
}

const STORAGE_KEY = '@zaijia_app_state';

const DEFAULT_SETTINGS: AppSettings = {
  checkInIntervalHours: 24,
  reminderMinutesBefore: 60,
  notificationsEnabled: true,
  quietHoursStart: '22:00',
  quietHoursEnd: '08:00',
  quietHoursEnabled: false,
};

const DEFAULT_STATE: AppState = {
  lastCheckIn: null,
  checkInHistory: [],
  emergencyContacts: [],
  settings: DEFAULT_SETTINGS,
};

export async function loadAppState(): Promise<AppState> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as AppState;
      return { ...DEFAULT_STATE, ...parsed };
    }
  } catch (e) {
    console.error('Failed to load app state:', e);
  }
  return DEFAULT_STATE;
}

export async function saveAppState(state: AppState): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error('Failed to save app state:', e);
  }
}

export async function doCheckIn(state: AppState, note?: string): Promise<AppState> {
  const now = Date.now();
  const newRecord: CheckInRecord = {
    id: `checkin_${now}`,
    timestamp: now,
    note,
  };
  const newState: AppState = {
    ...state,
    lastCheckIn: now,
    checkInHistory: [newRecord, ...state.checkInHistory].slice(0, 100), // keep last 100
  };
  await saveAppState(newState);
  return newState;
}

export function getNextCheckInDeadline(lastCheckIn: number | null, intervalHours: number): number | null {
  if (lastCheckIn === null) return null;
  return lastCheckIn + intervalHours * 60 * 60 * 1000;
}

export function getTimeRemaining(deadline: number | null): {
  total: number;
  hours: number;
  minutes: number;
  seconds: number;
  isOverdue: boolean;
  isUrgent: boolean;
} {
  if (deadline === null) {
    return { total: 0, hours: 0, minutes: 0, seconds: 0, isOverdue: false, isUrgent: false };
  }
  const diff = deadline - Date.now();
  const total = Math.max(0, diff);
  const hours = Math.floor(total / (1000 * 60 * 60));
  const minutes = Math.floor((total % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((total % (1000 * 60)) / 1000);
  const isOverdue = diff < 0;
  const isUrgent = diff > 0 && diff < 60 * 60 * 1000; // less than 1 hour
  return { total, hours, minutes, seconds, isOverdue, isUrgent };
}

export function getConsecutiveDays(history: CheckInRecord[]): number {
  if (history.length === 0) return 0;
  
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const yesterdayStart = todayStart - 24 * 60 * 60 * 1000;
  
  // Check if there's a check-in today or yesterday to start counting
  const todayEnd = todayStart + 24 * 60 * 60 * 1000;
  
  let consecutiveDays = 0;
  let currentDate = new Date(todayStart);
  
  for (let i = 0; i < 365; i++) {
    const dayStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate()).getTime();
    const dayEnd = dayStart + 24 * 60 * 60 * 1000;
    
    const hasCheckIn = history.some(r => r.timestamp >= dayStart && r.timestamp < dayEnd);
    
    if (hasCheckIn) {
      consecutiveDays++;
    } else if (i > 0) {
      // Allow today to be missing (they might check in later)
      break;
    }
    
    currentDate.setDate(currentDate.getDate() - 1);
  }
  
  return consecutiveDays;
}

export function getStreakDescription(consecutiveDays: number): string {
  if (consecutiveDays === 0) return '尚未开始签到';
  if (consecutiveDays === 1) return '已连续签到 1 天';
  return `已连续签到 ${consecutiveDays} 天`;
}
