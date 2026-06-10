import { getLocales } from 'expo-localization';

export type Locale = 'nl' | 'en';

// Plain function — safe to call outside React components (e.g. services)
export function getLocale(): Locale {
  const code = getLocales()[0]?.languageCode ?? 'en';
  return code === 'nl' ? 'nl' : 'en';
}

// Hook alias — use inside React components
export const useLocale = getLocale;
