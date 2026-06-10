import * as Notifications from 'expo-notifications';
import { getLocale } from '../hooks/useLocale';
import { getNotificationHour } from './SettingsService';
import { getStreak, getTotalCompletions } from './MissionService';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

const LIFECYCLE_MESSAGES = {
  en: {
    new:       'Your first mission awaits. One small act of kindness.',
    early:     'Keep going. Small habits start small.',
    building:  'A habit is forming. Today\'s mission is ready.',
    milestone: 'You\'re on a streak. Another day, another kindness.',
    lapsed:    'It\'s been a while. No judgement — just today\'s mission.',
    default:   'Your daily mission is ready.',
  },
  nl: {
    new:       'Je eerste missie wacht. Eén kleine daad van vriendelijkheid.',
    early:     'Blijf het doen. Kleine gewoontes beginnen klein.',
    building:  'Er ontstaat een gewoonte. Je dagelijkse missie staat klaar.',
    milestone: 'Je hebt een streak. Weer een nieuwe dag, weer een vriendelijkheid.',
    lapsed:    'Even weg geweest? Geen oordeel — gewoon de missie van vandaag.',
    default:   'Je dagelijkse missie staat klaar.',
  },
};

async function buildNotificationBody(): Promise<string> {
  const locale = getLocale();
  const msgs = LIFECYCLE_MESSAGES[locale];
  try {
    const [streak, total] = await Promise.all([getStreak(), getTotalCompletions()]);
    if (streak === 0) return msgs.lapsed;
    if (total <= 1)   return msgs.new;
    if (total <= 5)   return msgs.early;
    if (streak >= 7)  return msgs.milestone;
    if (total >= 6)   return msgs.building;
    return msgs.default;
  } catch {
    return msgs.default;
  }
}

export async function requestAndSchedule(): Promise<boolean> {
  const { status: existing } = await Notifications.getPermissionsAsync();
  const status =
    existing === 'granted'
      ? 'granted'
      : (await Notifications.requestPermissionsAsync()).status;

  if (status !== 'granted') return false;

  await scheduleDailyReminder();
  return true;
}

export async function scheduleDailyReminder(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();

  const [hour, body] = await Promise.all([getNotificationHour(), buildNotificationBody()]);
  await Notifications.scheduleNotificationAsync({
    content: { title: 'Appiness', body },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute: 0,
    },
  });
}

// Call after each mission completion — refreshes the next notification message
// with up-to-date lifecycle context, but only if already granted.
export async function rescheduleIfGranted(): Promise<void> {
  const { status } = await Notifications.getPermissionsAsync();
  if (status === 'granted') await scheduleDailyReminder();
}
