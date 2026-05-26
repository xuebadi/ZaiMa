import { Platform, Alert, Linking } from 'react-native';
import { AppSettings, EmergencyContact } from './storage';

// Simple in-app notification using Alert
// For full push notification support, integrate @notifee/react-native or expo-notifications later

export async function requestNotificationPermissions(): Promise<boolean> {
  // No native notification permissions needed for Alert-based approach
  return true;
}

export async function scheduleReminderNotification(
  deadline: number,
  reminderMinutesBefore: number
): Promise<string | null> {
  // Store reminder info for in-app display
  try {
    const reminderTime = deadline - reminderMinutesBefore * 60 * 1000;
    const now = Date.now();
    if (reminderTime <= now) return null;

    // Schedule a timeout-based in-app alert
    const delay = reminderTime - now;
    const timerId = setTimeout(() => {
      Alert.alert(
        '⏰ 在吗？还活着吗？',
        `距离签到截止还有 ${reminderMinutesBefore} 分钟，快去点「我在」确认平安！`
      );
    }, delay) as unknown as string;

    return timerId;
  } catch (e) {
    console.error('Failed to schedule reminder:', e);
    return null;
  }
}

export async function scheduleDeadlineNotification(deadline: number): Promise<string | null> {
  try {
    const now = Date.now();
    if (deadline <= now) return null;

    const delay = deadline - now;
    const timerId = setTimeout(() => {
      Alert.alert(
        '🚨 签到超时！',
        '你还没有签到！紧急联系人即将收到通知。快去点「我在」！'
      );
    }, delay) as unknown as string;

    return timerId;
  } catch (e) {
    console.error('Failed to schedule deadline notification:', e);
    return null;
  }
}

export async function cancelAllScheduledNotifications(): Promise<void> {
  // In this simplified version, timeouts will auto-clean on app restart
}

export async function sendEmergencyAlert(contacts: EmergencyContact[]): Promise<void> {
  Alert.alert(
    '📱 紧急求助',
    `已准备向 ${contacts.length} 位紧急联系人发送求助信息。`,
    [
      { text: '取消', style: 'cancel' },
      { 
        text: '发送短信', 
        onPress: () => {
          const link = getEmergencyMessageLink(contacts);
          Linking.openURL(link);
        }
      },
    ]
  );
}

export function getEmergencyMessageLink(contacts: EmergencyContact[]): string {
  const message = '【在吗 App】紧急！此人长时间未签到，请尽快确认平安。';
  const phones = contacts.map(c => c.phone).join(',');
  return `sms:${phones}?body=${encodeURIComponent(message)}`;
}
