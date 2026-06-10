import { useEffect } from 'react';
import { router } from 'expo-router';
import { isFirstLaunch } from '../src/services/MissionService';
import { View, ActivityIndicator } from 'react-native';

export default function Entry() {
  useEffect(() => {
    isFirstLaunch().then((first) => {
      router.replace(first ? '/onboarding' : '/mission');
    });
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: '#C17A74', justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator color="#fff" size="large" />
    </View>
  );
}
