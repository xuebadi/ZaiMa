import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  Switch,
  Linking,
  Platform,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { loadAppState, saveAppState, AppState, AppSettings, EmergencyContact } from '../utils/storage';
import { requestNotificationPermissions } from '../utils/notifications';

const ACCENT_RED = '#FF453A';
const DARK_BG = '#0A0A0C';
const CARD_BG = '#1C1C1E';
const INPUT_BG = '#2C2C2E';
const TEXT_WHITE = '#FFFFFF';
const TEXT_GRAY = '#8E8E93';
const TEXT_DIM = '#48484A';

const INTERVAL_OPTIONS = [6, 12, 24, 48, 72, 168]; // hours

export default function SettingsScreen() {
  const [appState, setAppState] = useState<AppState | null>(null);
  const [showAddContact, setShowAddContact] = useState(false);
  const [newContact, setNewContact] = useState({ name: '', phone: '', relation: '' });

  useFocusEffect(
    useCallback(() => {
      loadAppState().then(setAppState);
    }, [])
  );

  if (!appState) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>加载中...</Text>
      </View>
    );
  }

  const updateSettings = async (patch: Partial<AppSettings>) => {
    const newState: AppState = {
      ...appState,
      settings: { ...appState.settings, ...patch },
    };
    setAppState(newState);
    await saveAppState(newState);
  };

  const addContact = async () => {
    if (!newContact.name.trim()) {
      Alert.alert('请输入姓名');
      return;
    }
    if (!newContact.phone.trim()) {
      Alert.alert('请输入电话号码');
      return;
    }
    const contact: EmergencyContact = {
      id: `contact_${Date.now()}`,
      name: newContact.name.trim(),
      phone: newContact.phone.trim(),
      relation: newContact.relation.trim() || '紧急联系人',
    };
    const newState: AppState = {
      ...appState,
      emergencyContacts: [...appState.emergencyContacts, contact],
    };
    setAppState(newState);
    await saveAppState(newState);
    setNewContact({ name: '', phone: '', relation: '' });
    setShowAddContact(false);
  };

  const removeContact = async (id: string) => {
    Alert.alert('确认删除', '确定要删除此紧急联系人吗？', [
      { text: '取消', style: 'cancel' },
      {
        text: '删除',
        style: 'destructive',
        onPress: async () => {
          const newState: AppState = {
            ...appState,
            emergencyContacts: appState.emergencyContacts.filter(c => c.id !== id),
          };
          setAppState(newState);
          await saveAppState(newState);
        },
      },
    ]);
  };

  const callContact = (phone: string) => {
    Linking.openURL(`tel:${phone}`);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>设置</Text>
      </View>

      {/* Section: Check-in Interval */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📅 签到周期</Text>
        <Text style={styles.sectionDesc}>设置每次签到后，必须在多少小时内再次签到</Text>
        <View style={styles.intervalGrid}>
          {INTERVAL_OPTIONS.map(hours => (
            <TouchableOpacity
              key={hours}
              style={[
                styles.intervalOption,
                appState.settings.checkInIntervalHours === hours && styles.intervalOptionActive,
              ]}
              onPress={() => updateSettings({ checkInIntervalHours: hours })}
            >
              <Text
                style={[
                  styles.intervalOptionText,
                  appState.settings.checkInIntervalHours === hours && styles.intervalOptionTextActive,
                ]}
              >
                {hours < 24 ? `${hours}小时` : `${hours / 24}天`}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Section: Reminder */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🔔 提前提醒</Text>
        <Text style={styles.sectionDesc}>距截止前多少分钟提醒你签到</Text>
        <View style={styles.reminderRow}>
          {[15, 30, 60, 120].map(mins => (
            <TouchableOpacity
              key={mins}
              style={[
                styles.reminderOption,
                appState.settings.reminderMinutesBefore === mins && styles.reminderOptionActive,
              ]}
              onPress={() => updateSettings({ reminderMinutesBefore: mins })}
            >
              <Text
                style={[
                  styles.reminderOptionText,
                  appState.settings.reminderMinutesBefore === mins && styles.reminderOptionTextActive,
                ]}
              >
                {mins < 60 ? `${mins}分钟` : `${mins / 60}小时`}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Section: Notifications */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🔔 通知设置</Text>
        <View style={styles.toggleRow}>
          <View style={styles.toggleInfo}>
            <Text style={styles.toggleLabel}>开启通知</Text>
            <Text style={styles.toggleDesc}>接收签到提醒和超时警报</Text>
          </View>
          <Switch
            value={appState.settings.notificationsEnabled}
            onValueChange={async (val) => {
              if (val) {
                const ok = await requestNotificationPermissions();
                if (!ok) {
                  Alert.alert('权限不足', '请在系统设置中开启通知权限');
                  return;
                }
              }
              updateSettings({ notificationsEnabled: val });
            }}
            trackColor={{ false: '#3A3A3C', true: '#30D158' }}
            thumbColor="#FFFFFF"
          />
        </View>
      </View>

      {/* Section: Emergency Contacts */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>📱 紧急联系人</Text>
          <TouchableOpacity
            style={styles.addContactBtn}
            onPress={() => setShowAddContact(!showAddContact)}
          >
            <Text style={styles.addContactBtnText}>{showAddContact ? '取消' : '+ 添加'}</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.sectionDesc}>
          超时未签到时，将通过短信通知以下联系人
        </Text>

        {showAddContact && (
          <View style={styles.addContactForm}>
            <TextInput
              style={styles.input}
              placeholder="姓名"
              placeholderTextColor={TEXT_DIM}
              value={newContact.name}
              onChangeText={t => setNewContact({ ...newContact, name: t })}
            />
            <TextInput
              style={styles.input}
              placeholder="手机号"
              placeholderTextColor={TEXT_DIM}
              keyboardType="phone-pad"
              value={newContact.phone}
              onChangeText={t => setNewContact({ ...newContact, phone: t })}
            />
            <TextInput
              style={styles.input}
              placeholder="关系（如：父母/伴侣/朋友）"
              placeholderTextColor={TEXT_DIM}
              value={newContact.relation}
              onChangeText={t => setNewContact({ ...newContact, relation: t })}
            />
            <TouchableOpacity style={styles.submitBtn} onPress={addContact}>
              <Text style={styles.submitBtnText}>保存联系人</Text>
            </TouchableOpacity>
          </View>
        )}

        {appState.emergencyContacts.length === 0 && !showAddContact && (
          <View style={styles.emptyContacts}>
            <Text style={styles.emptyContactsText}>暂无紧急联系人</Text>
            <Text style={styles.emptyContactsHint}>请添加至少一位紧急联系人</Text>
          </View>
        )}

        {appState.emergencyContacts.map(contact => (
          <View key={contact.id} style={styles.contactCard}>
            <View style={styles.contactInfo}>
              <Text style={styles.contactName}>{contact.name}</Text>
              <Text style={styles.contactPhone}>{contact.phone}</Text>
              <Text style={styles.contactRelation}>{contact.relation}</Text>
            </View>
            <View style={styles.contactActions}>
              <TouchableOpacity
                style={styles.contactCallBtn}
                onPress={() => callContact(contact.phone)}
              >
                <Text style={styles.contactCallBtnText}>📞</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.contactDeleteBtn}
                onPress={() => removeContact(contact.id)}
              >
                <Text style={styles.contactDeleteBtnText}>🗑</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </View>

      {/* Section: About */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>ℹ️ 关于</Text>
        <View style={styles.aboutCard}>
          <Text style={styles.aboutText}>在吗 App v1.0.0</Text>
          <Text style={styles.aboutDesc}>
            每隔一段时间确认你还活着，如果超时未确认，会自动通知你的紧急联系人。
          </Text>
          <Text style={styles.aboutDesc} style={{ marginTop: 8, color: TEXT_DIM }}>
            记得保持 App 在后台运行，并开启通知权限。
          </Text>
        </View>
      </View>
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
  },
  loadingText: {
    color: TEXT_GRAY,
    fontSize: 16,
    textAlign: 'center',
    marginTop: 100,
  },
  header: {
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: TEXT_WHITE,
  },
  section: {
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: TEXT_WHITE,
    marginBottom: 6,
  },
  sectionDesc: {
    fontSize: 13,
    color: TEXT_GRAY,
    marginBottom: 14,
    lineHeight: 18,
  },
  intervalGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  intervalOption: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: CARD_BG,
    borderWidth: 1,
    borderColor: '#3A3A3C',
  },
  intervalOptionActive: {
    backgroundColor: ACCENT_RED,
    borderColor: ACCENT_RED,
  },
  intervalOptionText: {
    fontSize: 14,
    color: TEXT_GRAY,
  },
  intervalOptionTextActive: {
    color: TEXT_WHITE,
    fontWeight: '600',
  },
  reminderRow: {
    flexDirection: 'row',
    gap: 8,
  },
  reminderOption: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: CARD_BG,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#3A3A3C',
  },
  reminderOptionActive: {
    backgroundColor: ACCENT_RED,
    borderColor: ACCENT_RED,
  },
  reminderOptionText: {
    fontSize: 13,
    color: TEXT_GRAY,
  },
  reminderOptionTextActive: {
    color: TEXT_WHITE,
    fontWeight: '600',
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: CARD_BG,
    borderRadius: 12,
    padding: 14,
  },
  toggleInfo: {
    flex: 1,
    marginRight: 10,
  },
  toggleLabel: {
    fontSize: 15,
    color: TEXT_WHITE,
    fontWeight: '500',
  },
  toggleDesc: {
    fontSize: 12,
    color: TEXT_GRAY,
    marginTop: 2,
  },
  addContactBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(255,69,58,0.15)',
  },
  addContactBtnText: {
    fontSize: 13,
    color: ACCENT_RED,
    fontWeight: '600',
  },
  addContactForm: {
    backgroundColor: CARD_BG,
    borderRadius: 12,
    padding: 14,
    marginTop: 8,
    gap: 10,
  },
  input: {
    backgroundColor: INPUT_BG,
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    color: TEXT_WHITE,
    borderWidth: 1,
    borderColor: '#3A3A3C',
  },
  submitBtn: {
    backgroundColor: ACCENT_RED,
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  submitBtnText: {
    color: TEXT_WHITE,
    fontSize: 15,
    fontWeight: '600',
  },
  emptyContacts: {
    backgroundColor: CARD_BG,
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: '#3A3A3C',
  },
  emptyContactsText: {
    fontSize: 14,
    color: TEXT_GRAY,
    marginBottom: 4,
  },
  emptyContactsHint: {
    fontSize: 12,
    color: TEXT_DIM,
  },
  contactCard: {
    backgroundColor: CARD_BG,
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    fontSize: 15,
    fontWeight: '600',
    color: TEXT_WHITE,
    marginBottom: 2,
  },
  contactPhone: {
    fontSize: 13,
    color: TEXT_GRAY,
    marginBottom: 2,
  },
  contactRelation: {
    fontSize: 12,
    color: TEXT_DIM,
  },
  contactActions: {
    flexDirection: 'row',
    gap: 8,
  },
  contactCallBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#2C2C2E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  contactCallBtnText: {
    fontSize: 16,
  },
  contactDeleteBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,69,58,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  contactDeleteBtnText: {
    fontSize: 16,
  },
  aboutCard: {
    backgroundColor: CARD_BG,
    borderRadius: 12,
    padding: 16,
  },
  aboutText: {
    fontSize: 15,
    color: TEXT_WHITE,
    fontWeight: '600',
    marginBottom: 8,
  },
  aboutDesc: {
    fontSize: 13,
    color: TEXT_GRAY,
    lineHeight: 18,
  },
});
