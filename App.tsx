import React, { useEffect } from 'react';
import { View, Text, StyleSheet, StatusBar } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import HomeScreen from './src/screens/HomeScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import HistoryScreen from './src/screens/HistoryScreen';
import { requestNotificationPermissions } from './src/utils/notifications';

const Tab = createBottomTabNavigator();

function TabIcon({ label }: { label: string; focused: boolean }) {
  const icons: Record<string, string> = {
    '首页': '🏠',
    '记录': '📋',
    '设置': '⚙️',
  };
  return (
    <View style={styles.tabIcon}>
      <Text style={styles.tabIconText}>{icons[label] || '•'}</Text>
    </View>
  );
}

export default function App() {
  useEffect(() => {
    requestNotificationPermissions();
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar barStyle="light-content" backgroundColor="#0A0A0C" />
      <NavigationContainer>
        <Tab.Navigator
          screenOptions={({ route }) => ({
            headerShown: false,
            tabBarStyle: {
              backgroundColor: '#0A0A0C',
              borderTopColor: '#2C2C2E',
              borderTopWidth: 1,
              height: 84,
              paddingTop: 8,
              paddingBottom: 28,
            },
            tabBarActiveTintColor: '#FF453A',
            tabBarInactiveTintColor: '#8E8E93',
            tabBarLabelStyle: {
              fontSize: 11,
              marginTop: 4,
            },
            tabBarIcon: ({ focused }) => (
              <TabIcon label={route.name} focused={focused} />
            ),
          })}
        >
          <Tab.Screen
            name="首页"
            component={HomeScreen}
            options={{ tabBarLabel: '首页' }}
          />
          <Tab.Screen
            name="记录"
            component={HistoryScreen}
            options={{ tabBarLabel: '记录' }}
          />
          <Tab.Screen
            name="设置"
            component={SettingsScreen}
            options={{ tabBarLabel: '设置' }}
          />
        </Tab.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  tabIcon: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 32,
    height: 32,
  },
  tabIconText: {
    fontSize: 22,
  },
});
