import * as Notifications from 'expo-notifications';
import { getLocale } from '../hooks/useLocale';
import { getNotificationHour } from './SettingsService';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

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

  const [locale, hour] = await Promise.all([Promise.resolve(getLocale()), getNotificationHour()]);
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Appiness',
      body: locale === 'nl'
        ? 'Je dagelijkse missie staat klaar.'
        : 'Your daily mission is ready.',
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute: 0,
    },
  });
}
