import { useState, useEffect } from 'react';
import { getLocales } from 'expo-localization';
import { getLanguagePreference } from '../services/SettingsService';

export type Locale = 'nl' | 'en';

export function deviceLocale(): Locale {
  const code = getLocales()[0]?.languageCode ?? 'en';
  return code === 'nl' ? 'nl' : 'en';
}

// Plain function — safe to call outside React components (e.g. NotificationService)
export function getLocale(): Locale {
  return deviceLocale();
}

// Hook — reads stored preference on mount; falls back to device locale.
// For screens that stay mounted (e.g. mission), use navigation.addListener('focus')
// in the screen directly to re-read on return from settings.
export function useLocale(): Locale {
  const [locale, setLocale] = useState<Locale>(deviceLocale());

  useEffect(() => {
    getLanguagePreference().then((pref) => {
      setLocale(pref === 'auto' ? deviceLocale() : pref);
    });
  }, []);

  return locale;
}
