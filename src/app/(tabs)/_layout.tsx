import { Tabs } from 'expo-router';
import { Text, type ColorValue } from 'react-native';

function tabIcon(emoji: string) {
  return ({ color }: { color: ColorValue }) => (
    <Text style={{ fontSize: 20, color }}>{emoji}</Text>
  );
}

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ headerShown: true }}>
      <Tabs.Screen name="index" options={{ title: '책장', tabBarIcon: tabIcon('📚') }} />
      <Tabs.Screen
        name="notifications"
        options={{ title: '알림', tabBarIcon: tabIcon('🔔') }}
      />
      <Tabs.Screen name="friends" options={{ title: '친구', tabBarIcon: tabIcon('👥') }} />
      <Tabs.Screen name="settings" options={{ title: '설정', tabBarIcon: tabIcon('⚙️') }} />
    </Tabs>
  );
}
