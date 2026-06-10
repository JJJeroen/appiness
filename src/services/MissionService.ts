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
  queue: '@appiness/queue',
  completed: '@appiness/completed',
  skips: '@appiness/skips',
  firstLaunch: '@appiness/firstLaunch',
};

const MAX_SKIPS = 2;
const SKIPS_PER_COMPLETION = 1;

const missions: Mission[] = missionsData as Mission[];

function shuffled(arr: Mission[]): Mission[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

async function getQueue(): Promise<number[]> {
  const raw = await AsyncStorage.getItem(KEYS.queue);
  if (raw) return JSON.parse(raw);
  const fresh = shuffled(missions).map((m) => m.id);
  await AsyncStorage.setItem(KEYS.queue, JSON.stringify(fresh));
  return fresh;
}

async function saveQueue(queue: number[]): Promise<void> {
  await AsyncStorage.setItem(KEYS.queue, JSON.stringify(queue));
}

export async function getNextMission(): Promise<Mission> {
  let queue = await getQueue();
  if (queue.length === 0) {
    queue = shuffled(missions).map((m) => m.id);
  }
  const nextId = queue[0];
  return missions.find((m) => m.id === nextId) ?? missions[0];
}

export async function completeMission(missionId: number): Promise<void> {
  // Advance queue
  const queue = await getQueue();
  const next = queue.filter((id) => id !== missionId);
  await saveQueue(next);

  // Record completion
  const raw = await AsyncStorage.getItem(KEYS.completed);
  const history: CompletedEntry[] = raw ? JSON.parse(raw) : [];
  history.unshift({ missionId, completionDate: new Date().toISOString() });
  await AsyncStorage.setItem(KEYS.completed, JSON.stringify(history));

  // Award skip (capped at MAX_SKIPS)
  const current = await getSkips();
  await AsyncStorage.setItem(
    KEYS.skips,
    JSON.stringify(Math.min(current + SKIPS_PER_COMPLETION, MAX_SKIPS))
  );
}

export async function skipMission(missionId: number): Promise<void> {
  const skips = await getSkips();
  if (skips <= 0) return;

  // Move current mission to end of queue
  const queue = await getQueue();
  const next = [...queue.filter((id) => id !== missionId), missionId];
  await saveQueue(next);

  await AsyncStorage.setItem(KEYS.skips, JSON.stringify(skips - 1));
}

export async function getSkips(): Promise<number> {
  const raw = await AsyncStorage.getItem(KEYS.skips);
  return raw ? JSON.parse(raw) : 0;
}

export async function getHistory(): Promise<(CompletedEntry & { mission: Mission })[]> {
  const raw = await AsyncStorage.getItem(KEYS.completed);
  const history: CompletedEntry[] = raw ? JSON.parse(raw) : [];
  return history.map((entry) => ({
    ...entry,
    mission: missions.find((m) => m.id === entry.missionId) ?? missions[0],
  }));
}

export async function isFirstLaunch(): Promise<boolean> {
  const raw = await AsyncStorage.getItem(KEYS.firstLaunch);
  if (raw) return false;
  await AsyncStorage.setItem(KEYS.firstLaunch, 'done');
  return true;
}
