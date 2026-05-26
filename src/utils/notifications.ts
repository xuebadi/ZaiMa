import { Platform, Alert, Linking, PermissionsAndroid } from 'react-native';
import { NativeModules } from 'react-native';
import { AppSettings, EmergencyContact } from './storage';

const { SmsModule } = NativeModules;

export async function requestNotificationPermissions(): Promise<boolean> {
  // Request SEND_SMS permission for auto-sending
  if (Platform.OS === 'android') {
    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.SEND_SMS,
        {
          title: '短信发送权限',
          message: '在吗需要短信权限，在您超时未签到时自动向紧急联系人发送求助短信。',
          buttonPositive: '允许',
        }
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } catch (e) {
      console.error('Failed to request SMS permission:', e);
      return false;
    }
  }
  return true;
}

export async function scheduleReminderNotification(
  deadline: number,
  reminderMinutesBefore: number
): Promise<string | null> {
  const reminderTime = deadline - reminderMinutesBefore * 60 * 1000;
  const now = Date.now();
  if (reminderTime <= now) return null;

  try {
    const timerId = setTimeout(() => {
      Alert.alert(
        '⏰ 在吗？还活着吗？',
        `距离签到截止还有 ${reminderMinutesBefore} 分钟，快去点「我在」确认平安！`
      );
    }, reminderTime - now) as unknown as string;

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

    const timerId = setTimeout(() => {
      Alert.alert(
        '🚨 签到超时！',
        '你还没有签到！紧急联系人即将收到通知。快去点「我在」！'
      );
    }, deadline - now) as unknown as string;

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
  if (!contacts || contacts.length === 0) {
    Alert.alert('⚠️ 没有紧急联系人', '请先在设置页添加紧急联系人。');
    return;
  }

  const message = '【在吗 App】紧急！此人长时间未签到，请尽快确认平安。';
  const phones = contacts.map(c => c.phone);

  if (Platform.OS === 'android' && SmsModule) {
    try {
      const hasPermission = await SmsModule.hasPermission();
      if (hasPermission) {
        await SmsModule.sendSmsToMany(phones, message);
        Alert.alert(
          '📱 紧急短信已发送',
          `已向 ${contacts.length} 位紧急联系人自动发送求助信息。`
        );
        return;
      }
    } catch (e) {
      console.error('SMS send error:', e);
    }
  }

  // Fallback
  Alert.alert('⚠️ 短信权限不足', '请在设置中授权短信发送权限。');
}

export function getEmergencyMessageLink(contacts: EmergencyContact[]): string {
  const message = '【在吗 App】紧急！此人长时间未签到，请尽快确认平安。';
  const phones = contacts.map(c => c.phone).join(',');
  return `sms:${phones}?body=${encodeURIComponent(message)}`;
}
