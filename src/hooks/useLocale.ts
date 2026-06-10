import { useState, useEffect, useCallback } from 'react';
import { getLocales } from 'expo-localization';
import { useFocusEffect } from 'expo-router';
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

// Hook — reads stored preference on mount and whenever the screen regains focus
export function useLocale(): Locale {
  const [locale, setLocale] = useState<Locale>(deviceLocale());

  const readPref = useCallback(() => {
    getLanguagePreference().then((pref) => {
      setLocale(pref === 'auto' ? deviceLocale() : pref);
    });
  }, []);

  useEffect(() => { readPref(); }, [readPref]);
  useFocusEffect(readPref);

  return locale;
}
