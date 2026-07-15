import { Tabs } from 'expo-router';
import React from 'react';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Typography } from '@/constants/design';
import { useAppTheme } from '@/hooks/use-app-theme';

export default function TabLayout() {
  const { palette } = useAppTheme();
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: palette.primary,
        tabBarInactiveTintColor: palette.inkSoft,
        tabBarStyle: {
          minHeight: 76,
          paddingTop: 7,
          paddingBottom: 7,
          paddingHorizontal: 6,
          backgroundColor: palette.canvasRaised,
          borderTopColor: palette.line,
        },
        tabBarItemStyle: { borderRadius: 18, marginHorizontal: 2 },
        tabBarActiveBackgroundColor: palette.primaryPale,
        tabBarLabelStyle: {
          fontFamily: Typography.family,
          fontSize: 12,
          fontWeight: '700',
        },
        sceneStyle: { backgroundColor: palette.canvas },
        headerShown: false,
        tabBarButton: HapticTab,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: '首頁',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="house.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="insights"
        options={{
          title: 'AI 洞察',
          tabBarIcon: ({ color }) => <IconSymbol size={27} name="sparkles" color={color} />,
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: '趨勢',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="chart.bar.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: '設定',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="gearshape.fill" color={color} />,
        }}
      />
    </Tabs>
  );
}
