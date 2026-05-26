import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Vibration,
  Alert,
  Platform,
  Linking,
  ScrollView,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import {
  doCheckIn,
  loadAppState,
  getNextCheckInDeadline,
  getTimeRemaining,
  getConsecutiveDays,
  getStreakDescription,
  AppState,
  EmergencyContact,
} from '../utils/storage';
import {
  requestNotificationPermissions,
  scheduleReminderNotification,
  scheduleDeadlineNotification,
  cancelAllScheduledNotifications,
  sendEmergencyAlert,
} from '../utils/notifications';

const ACCENT_RED = '#FF453A';
const DARK_BG = '#0A0A0C';
const CARD_BG = '#1C1C1E';
const TEXT_WHITE = '#FFFFFF';
const TEXT_GRAY = '#8E8E93';
const TEXT_DIM = '#48484A';
const GREEN_OK = '#30D158';
const ORANGE_WARN = '#FF9F0A';

export default function HomeScreen() {
  const [appState, setAppState] = useState<AppState | null>(null);
  const [timeLeft, setTimeLeft] = useState({ total: 0, hours: 0, minutes: 0, seconds: 0, isOverdue: false, isUrgent: false });
  const [isChecking, setIsChecking] = useState(false);
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [showEmergencyModal, setShowEmergencyModal] = useState(false);

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const urgencyAnim = useRef(new Animated.Value(0)).current;
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load state on focus
  useFocusEffect(
    useCallback(() => {
      loadAppState().then(setAppState);
    }, [])
  );

  // Timer effect
  useEffect(() => {
    if (!appState) return;

    const deadline = getNextCheckInDeadline(
      appState.lastCheckIn,
      appState.settings.checkInIntervalHours
    );

    const tick = () => {
      const tl = getTimeRemaining(deadline);
      setTimeLeft(tl);

      // Animate urgency when urgent or overdue
      if (tl.isUrgent || tl.isOverdue) {
        Animated.loop(
          Animated.sequence([
            Animated.timing(urgencyAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
            Animated.timing(urgencyAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
          ])
        ).start();
      } else {
        urgencyAnim.setValue(0);
      }
    };

    tick();
    timerRef.current = setInterval(tick, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [appState]);

  // Pulse animation for the button
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.05, duration: 1500, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1500, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  // Update notifications when state changes
  useEffect(() => {
    if (!appState) return;
    const deadline = getNextCheckInDeadline(appState.lastCheckIn, appState.settings.checkInIntervalHours);
    if (!deadline || !appState.settings.notificationsEnabled) {
      cancelAllScheduledNotifications();
      return;
    }

    requestNotificationPermissions().then(ok => {
      if (!ok) return;
      cancelAllScheduledNotifications();
      scheduleReminderNotification(deadline, appState.settings.reminderMinutesBefore);
      scheduleDeadlineNotification(deadline);
    });
  }, [appState?.lastCheckIn, appState?.settings]);

  const handleCheckIn = async (withNote: boolean = false) => {
    if (isChecking) return;
    setIsChecking(true);

    try {
      const currentState = appState || (await loadAppState());
      const newState = await doCheckIn(currentState, withNote ? noteText : undefined);
      setAppState(newState);
      setNoteText('');
      setShowNoteInput(false);
      Vibration.vibrate(100);
    } catch (e) {
      console.error('Check-in failed:', e);
    } finally {
      setIsChecking(false);
    }
  };

  const handleEmergency = () => {
    if (!appState) return;
    if (appState.emergencyContacts.length === 0) {
      Alert.alert('无紧急联系人', '请先在「设置」中添加紧急联系人', [{ text: '好的' }]);
      return;
    }
    setShowEmergencyModal(true);
  };

  const confirmEmergency = async () => {
    if (!appState) return;
    setShowEmergencyModal(false);
    await sendEmergencyAlert(appState.emergencyContacts);
    Alert.alert('已通知紧急联系人', '紧急联系人已收到平安确认请求');
  };

  if (!appState) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>加载中...</Text>
      </View>
    );
  }

  const deadline = getNextCheckInDeadline(appState.lastCheckIn, appState.settings.checkInIntervalHours);
  const consecutiveDays = getConsecutiveDays(appState.checkInHistory);
  const streakText = getStreakDescription(consecutiveDays);
  const lastCheckInDate = appState.lastCheckIn
    ? new Date(appState.lastCheckIn).toLocaleString('zh-CN')
    : '尚未签到';

  // Determine status color and text
  const getStatusDisplay = () => {
    if (appState.lastCheckIn === null) {
      return { color: TEXT_GRAY, text: '等待首次签到', subtext: '点击下方按钮，确认你平安' };
    }
    if (timeLeft.isOverdue) {
      return { color: ACCENT_RED, text: '⚠️ 已超时！', subtext: '紧急联系人将被通知' };
    }
    if (timeLeft.isUrgent) {
      return { color: ORANGE_WARN, text: '⚡ 即将超时', subtext: `剩余 ${timeLeft.hours}h ${timeLeft.minutes}m` };
    }
    return { color: GREEN_OK, text: '✓ 安全', subtext: `剩余 ${timeLeft.hours}h ${timeLeft.minutes}m ${timeLeft.seconds}s` };
  };

  const status = getStatusDisplay();

  const formatCountdown = () => {
    if (appState.lastCheckIn === null) {
      return '--:--:--';
    }
    if (timeLeft.isOverdue) {
      const overdueMs = Date.now() - (deadline || Date.now());
      const overdueHours = Math.floor(overdueMs / (1000 * 60 * 60));
      const overdueMins = Math.floor((overdueMs % (1000 * 60 * 60)) / (1000 * 60));
      return `+${overdueHours}:${String(overdueMins).padStart(2, '0')}:${String(Math.floor((overdueMs % (1000 * 60)) / 1000)).padStart(2, '0')}`;
    }
    return `${String(timeLeft.hours).padStart(2, '0')}:${String(timeLeft.minutes).padStart(2, '0')}:${String(timeLeft.seconds).padStart(2, '0')}`;
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.appTitle}>在 吗</Text>
        <Text style={styles.appSubtitle}>平安确认</Text>
      </View>

      {/* Status Card */}
      <View style={[styles.statusCard, { borderColor: status.color }]}>
        <Text style={[styles.statusText, { color: status.color }]}>{status.text}</Text>
        <Text style={styles.statusSubtext}>{status.subtext}</Text>
      </View>

      {/* Countdown */}
      <View style={styles.countdownContainer}>
        <Text style={styles.countdownLabel}>
          {timeLeft.isOverdue ? '超时已过' : '距下次签到'}
        </Text>
        <Text style={[styles.countdownTimer, timeLeft.isOverdue && styles.countdownOverdue]}>
          {formatCountdown()}
        </Text>
      </View>

      {/* Main Check-In Button */}
      <Animated.View style={[styles.buttonWrapper, { transform: [{ scale: pulseAnim }] }]}>
        <TouchableOpacity
          style={[
            styles.mainButton,
            { backgroundColor: ACCENT_RED },
            timeLeft.isOverdue && styles.mainButtonOverdue,
          ]}
          onPress={() => handleCheckIn(false)}
          onLongPress={() => setShowNoteInput(true)}
          activeOpacity={0.8}
          disabled={isChecking}
        >
          <Text style={styles.mainButtonEmoji}>🫡</Text>
          <Text style={styles.mainButtonText}>我 在</Text>
          <Text style={styles.mainButtonSub}>长按添加备注</Text>
        </TouchableOpacity>
      </Animated.View>

      {/* Note Input Modal */}
      {showNoteInput && (
        <View style={styles.noteInputContainer}>
          <Text style={styles.noteInputLabel}>签到备注（可选）</Text>
          <View style={styles.noteInputRow}>
            <TouchableOpacity
              style={styles.noteTextInput}
              onPress={() => {
                Alert.prompt(
                  '签到备注',
                  '输入你想记录的备注（可选）',
                  [
                    { text: '取消', style: 'cancel', onPress: () => setShowNoteInput(false) },
                    {
                      text: '确认签到',
                      onPress: (text) => {
                        setNoteText(text || '');
                        handleCheckIn(true);
                      },
                    },
                  ],
                  'plain-text',
                  noteText
                );
              }}
            >
              <Text style={styles.noteTextPlaceholder}>
                {noteText || '点击输入备注...'}
              </Text>
            </TouchableOpacity>
          </View>
          <View style={styles.noteButtons}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => { setShowNoteInput(false); setNoteText(''); }}
            >
              <Text style={styles.cancelButtonText}>取消</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.confirmNoteButton}
              onPress={() => {
                Alert.prompt(
                  '签到备注',
                  '输入你想记录的备注（可选）',
                  [
                    { text: '取消', style: 'cancel', onPress: () => setShowNoteInput(false) },
                    {
                      text: '确认签到',
                      onPress: (text) => {
                        setNoteText(text || '');
                        handleCheckIn(true);
                      },
                    },
                  ],
                  'plain-text',
                  noteText
                );
              }}
            >
              <Text style={styles.confirmNoteText}>带备注签到</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{consecutiveDays}</Text>
          <Text style={styles.statLabel}>连续天数</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{appState.checkInHistory.length}</Text>
          <Text style={styles.statLabel}>总签到次数</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{appState.settings.checkInIntervalHours}h</Text>
          <Text style={styles.statLabel}>签到周期</Text>
        </View>
      </View>

      {/* Last Check-in */}
      <View style={styles.lastCheckInCard}>
        <Text style={styles.lastCheckInLabel}>最后签到</Text>
        <Text style={styles.lastCheckInValue}>{lastCheckInDate}</Text>
      </View>

      {/* Emergency Button */}
      <TouchableOpacity style={styles.emergencyButton} onPress={handleEmergency}>
        <Text style={styles.emergencyButtonText}>🚨 手动触发紧急通知</Text>
      </TouchableOpacity>

      <Text style={styles.footerHint}>
        每 {appState.settings.checkInIntervalHours} 小时需要签到一次
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: DARK_BG,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 40,
    alignItems: 'center',
  },
  loadingText: {
    color: TEXT_GRAY,
    fontSize: 16,
    textAlign: 'center',
    marginTop: 100,
  },
  header: {
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 20,
  },
  appTitle: {
    fontSize: 36,
    fontWeight: 'bold',
    color: TEXT_WHITE,
    letterSpacing: 4,
  },
  appSubtitle: {
    fontSize: 14,
    color: TEXT_GRAY,
    marginTop: 4,
  },
  statusCard: {
    width: '100%',
    backgroundColor: CARD_BG,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statusSubtext: {
    fontSize: 13,
    color: TEXT_GRAY,
  },
  countdownContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  countdownLabel: {
    fontSize: 13,
    color: TEXT_GRAY,
    marginBottom: 8,
  },
  countdownTimer: {
    fontSize: 52,
    fontWeight: '200',
    color: TEXT_WHITE,
    fontVariant: ['tabular-nums'],
    letterSpacing: 2,
  },
  countdownOverdue: {
    color: ACCENT_RED,
  },
  buttonWrapper: {
    marginBottom: 20,
  },
  mainButton: {
    width: 180,
    height: 180,
    borderRadius: 90,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: ACCENT_RED,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  mainButtonOverdue: {
    backgroundColor: '#CC0000',
    shadowColor: '#CC0000',
  },
  mainButtonEmoji: {
    fontSize: 40,
    marginBottom: 4,
  },
  mainButtonText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: TEXT_WHITE,
    letterSpacing: 4,
  },
  mainButtonSub: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 4,
  },
  noteInputContainer: {
    width: '100%',
    backgroundColor: CARD_BG,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  noteInputLabel: {
    fontSize: 13,
    color: TEXT_GRAY,
    marginBottom: 8,
  },
  noteInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  noteTextInput: {
    flex: 1,
    backgroundColor: '#2C2C2E',
    borderRadius: 8,
    padding: 12,
  },
  noteTextPlaceholder: {
    fontSize: 14,
    color: TEXT_DIM,
  },
  noteButtons: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 10,
  },
  cancelButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#2C2C2E',
    alignItems: 'center',
  },
  cancelButtonText: {
    color: TEXT_GRAY,
    fontSize: 14,
  },
  confirmNoteButton: {
    flex: 2,
    padding: 12,
    borderRadius: 8,
    backgroundColor: ACCENT_RED,
    alignItems: 'center',
  },
  confirmNoteText: {
    color: TEXT_WHITE,
    fontSize: 14,
    fontWeight: '600',
  },
  statsRow: {
    flexDirection: 'row',
    width: '100%',
    gap: 10,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: CARD_BG,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: TEXT_WHITE,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 11,
    color: TEXT_GRAY,
  },
  lastCheckInCard: {
    width: '100%',
    backgroundColor: CARD_BG,
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  lastCheckInLabel: {
    fontSize: 13,
    color: TEXT_GRAY,
  },
  lastCheckInValue: {
    fontSize: 13,
    color: TEXT_WHITE,
  },
  emergencyButton: {
    width: '100%',
    backgroundColor: 'rgba(255,69,58,0.15)',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,69,58,0.3)',
  },
  emergencyButtonText: {
    fontSize: 14,
    color: ACCENT_RED,
  },
  footerHint: {
    fontSize: 12,
    color: TEXT_DIM,
    textAlign: 'center',
  },
});
