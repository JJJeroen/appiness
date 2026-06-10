import AsyncStorage from '@react-native-async-storage/async-storage';
import missionsData from '../data/missions.json';
import { Category, Difficulty } from '../theme';

export type Mission = {
  id: number;
  category: Category;
  difficulty: Difficulty;
  missionEN: string;
  missionNL: string;
  hintEN: string;
  hintNL: string;
};

export type CompletedEntry = {
  missionId: number;
  completionDate: string; // ISO string
};

const KEYS = {
  queue:                 '@appiness/queue',
  completed:             '@appiness/completed',
  skips:                 '@appiness/skips',
  firstLaunch:           '@appiness/firstLaunch',
  todaysMissionId:       '@appiness/todaysMissionId',
  lastAssignedDate:      '@appiness/lastAssignedDate',
  lastCompletedDate:     '@appiness/lastCompletedDate',
  streak:                '@appiness/streak',
  totalCompletions:      '@appiness/totalCompletions',
  notificationPrompted:  '@appiness/notificationPrompted',
};

const MAX_SKIPS = 2;

const missions: Mission[] = missionsData as Mission[];

// ─── Date helpers ────────────────────────────────────────────────────────────

function todayStr(): string {
  return new Date().toISOString().split('T')[0];
}

function yesterdayStr(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().split('T')[0];
}

// ─── Queue helpers ───────────────────────────────────────────────────────────

function shuffled(arr: Mission[]): Mission[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

async function getQueue(): Promise<number[]> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.queue);
    if (raw) return JSON.parse(raw);
  } catch {
    // Corrupted queue — reset silently
  }
  const fresh = shuffled(missions).map((m) => m.id);
  await AsyncStorage.setItem(KEYS.queue, JSON.stringify(fresh));
  return fresh;
}

async function saveQueue(queue: number[]): Promise<void> {
  await AsyncStorage.setItem(KEYS.queue, JSON.stringify(queue));
}

async function assignNewTodaysMission(): Promise<Mission> {
  let queue = await getQueue();
  if (queue.length === 0) {
    queue = shuffled(missions).map((m) => m.id);
    await saveQueue(queue);
  }
  const nextId = queue[0];
  await AsyncStorage.setItem(KEYS.todaysMissionId, JSON.stringify(nextId));
  await AsyncStorage.setItem(KEYS.lastAssignedDate, todayStr());
  return missions.find((m) => m.id === nextId) ?? missions[0];
}

// ─── Public API ──────────────────────────────────────────────────────────────

// Returns null if the user has already completed today's mission.
export async function getTodaysMission(): Promise<Mission | null> {
  try {
    const today = todayStr();

    // Already completed today — no mission until tomorrow
    const lastCompleted = await AsyncStorage.getItem(KEYS.lastCompletedDate);
    if (lastCompleted === today) return null;

    // Mission already assigned today — return it
    const lastAssigned = await AsyncStorage.getItem(KEYS.lastAssignedDate);
    const storedIdRaw = await AsyncStorage.getItem(KEYS.todaysMissionId);
    if (lastAssigned === today && storedIdRaw !== null) {
      const id = JSON.parse(storedIdRaw) as number;
      const found = missions.find((m) => m.id === id);
      if (found) return found;
    }

    // New day or no assignment yet
    return assignNewTodaysMission();
  } catch {
    return assignNewTodaysMission();
  }
}

export async function completeMission(missionId: number): Promise<void> {
  const today = todayStr();

  // Remove from queue
  const queue = await getQueue();
  await saveQueue(queue.filter((id) => id !== missionId));

  // Record in history
  try {
    const raw = await AsyncStorage.getItem(KEYS.completed);
    const history: CompletedEntry[] = raw ? JSON.parse(raw) : [];
    history.unshift({ missionId, completionDate: new Date().toISOString() });
    await AsyncStorage.setItem(KEYS.completed, JSON.stringify(history));
  } catch {
    await AsyncStorage.setItem(
      KEYS.completed,
      JSON.stringify([{ missionId, completionDate: new Date().toISOString() }])
    );
  }

  // Update streak — only on first completion of the day
  try {
    const lastCompleted = await AsyncStorage.getItem(KEYS.lastCompletedDate);
    if (lastCompleted !== today) {
      const current = await getStreak();
      const next = lastCompleted === yesterdayStr() ? current + 1 : 1;
      await AsyncStorage.setItem(KEYS.streak, JSON.stringify(next));
      await AsyncStorage.setItem(KEYS.lastCompletedDate, today);
    }
  } catch {
    await AsyncStorage.setItem(KEYS.streak, JSON.stringify(1));
    await AsyncStorage.setItem(KEYS.lastCompletedDate, today);
  }

  // Award skip (capped at MAX_SKIPS)
  const currentSkips = await getSkips();
  await AsyncStorage.setItem(KEYS.skips, JSON.stringify(Math.min(currentSkips + 1, MAX_SKIPS)));

  // Increment total completions counter
  const total = await getTotalCompletions();
  await AsyncStorage.setItem(KEYS.totalCompletions, JSON.stringify(total + 1));
}

// Skip replaces today's mission with the next one in queue. Does not defer to tomorrow.
export async function skipMission(missionId: number): Promise<void> {
  const skips = await getSkips();
  if (skips <= 0) return;

  // Move skipped mission to end of queue
  const queue = await getQueue();
  const reordered = [...queue.filter((id) => id !== missionId), missionId];
  await saveQueue(reordered);

  // Deduct skip
  await AsyncStorage.setItem(KEYS.skips, JSON.stringify(skips - 1));

  // Assign next mission as today's — same day, different mission
  const nextId = reordered[0];
  await AsyncStorage.setItem(KEYS.todaysMissionId, JSON.stringify(nextId));
  // lastAssignedDate stays as today — already set
}

export async function getSkips(): Promise<number> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.skips);
    return raw ? JSON.parse(raw) : 0;
  } catch {
    return 0;
  }
}

export async function getStreak(): Promise<number> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.streak);
    return raw ? JSON.parse(raw) : 0;
  } catch {
    return 0;
  }
}

export async function getHistory(): Promise<(CompletedEntry & { mission: Mission })[]> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.completed);
    const history: CompletedEntry[] = raw ? JSON.parse(raw) : [];
    return history.map((entry) => ({
      ...entry,
      mission: missions.find((m) => m.id === entry.missionId) ?? missions[0],
    }));
  } catch {
    return [];
  }
}

export async function getTotalCompletions(): Promise<number> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.totalCompletions);
    return raw ? JSON.parse(raw) : 0;
  } catch {
    return 0;
  }
}

// Reverses the most recent completion. Safe to call only within a short window after completeMission.
export async function undoLastCompletion(): Promise<void> {
  const today = todayStr();
  try {
    const raw = await AsyncStorage.getItem(KEYS.completed);
    const history: CompletedEntry[] = raw ? JSON.parse(raw) : [];
    if (history.length === 0) return;

    const last = history[0];
    const remaining = history.slice(1);
    await AsyncStorage.setItem(KEYS.completed, JSON.stringify(remaining));

    // Put the mission back at the front of the queue
    const queue = await getQueue();
    await saveQueue([last.missionId, ...queue.filter((id) => id !== last.missionId)]);
    await AsyncStorage.setItem(KEYS.todaysMissionId, JSON.stringify(last.missionId));

    // If this was the only completion today, reverse the streak increment and lastCompletedDate
    const stillCompletedToday = remaining.some((e) => e.completionDate.startsWith(today));
    if (!stillCompletedToday) {
      const current = await getStreak();
      await AsyncStorage.setItem(KEYS.streak, JSON.stringify(Math.max(0, current - 1)));
      if (remaining.length > 0) {
        await AsyncStorage.setItem(KEYS.lastCompletedDate, remaining[0].completionDate.split('T')[0]);
      } else {
        await AsyncStorage.removeItem(KEYS.lastCompletedDate);
      }
    }

    // Remove the skip that was awarded
    const currentSkips = await getSkips();
    await AsyncStorage.setItem(KEYS.skips, JSON.stringify(Math.max(0, currentSkips - 1)));

    // Decrement total completions
    const total = await getTotalCompletions();
    await AsyncStorage.setItem(KEYS.totalCompletions, JSON.stringify(Math.max(0, total - 1)));
  } catch {
    // Undo failed — state may be inconsistent, but no crash
  }
}

export async function hasPromptedForNotification(): Promise<boolean> {
  const raw = await AsyncStorage.getItem(KEYS.notificationPrompted);
  return raw === 'true';
}

export async function markNotificationPrompted(): Promise<void> {
  await AsyncStorage.setItem(KEYS.notificationPrompted, 'true');
}

export async function isFirstLaunch(): Promise<boolean> {
  const raw = await AsyncStorage.getItem(KEYS.firstLaunch);
  if (raw) return false;
  await AsyncStorage.setItem(KEYS.firstLaunch, 'done');
  return true;
}
