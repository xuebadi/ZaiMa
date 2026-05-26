import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { loadAppState, AppState, CheckInRecord } from '../utils/storage';

const DARK_BG = '#0A0A0C';
const CARD_BG = '#1C1C1E';
const TEXT_WHITE = '#FFFFFF';
const TEXT_GRAY = '#8E8E93';
const TEXT_DIM = '#48484A';
const GREEN_OK = '#30D158';

function formatTime(timestamp: number): string {
  const d = new Date(timestamp);
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const yesterdayStart = todayStart - 24 * 60 * 60 * 1000;

  let dateStr: string;
  if (timestamp >= todayStart) {
    dateStr = '今天';
  } else if (timestamp >= yesterdayStart) {
    dateStr = '昨天';
  } else {
    dateStr = `${d.getMonth() + 1}月${d.getDate()}日`;
  }

  const timeStr = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
  return `${dateStr} ${timeStr}`;
}

function getRelativeLabel(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes} 分钟前`;
  if (hours < 24) return `${hours} 小时前`;
  return `${days} 天前`;
}

function CheckInItem({ record }: { record: CheckInRecord }) {
  return (
    <View style={styles.itemCard}>
      <View style={styles.itemLeft}>
        <Text style={styles.itemEmoji}>✅</Text>
      </View>
      <View style={styles.itemContent}>
        <Text style={styles.itemTime}>{formatTime(record.timestamp)}</Text>
        <Text style={styles.itemRelative}>{getRelativeLabel(record.timestamp)}</Text>
        {record.note && (
          <Text style={styles.itemNote}>{record.note}</Text>
        )}
      </View>
      <View style={styles.itemBadge}>
        <Text style={styles.itemBadgeText}>签到</Text>
      </View>
    </View>
  );
}

export default function HistoryScreen() {
  const [appState, setAppState] = useState<AppState | null>(null);

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

  const history = appState.checkInHistory;

  // Group by date
  interface GroupedHistory {
    date: string;
    label: string;
    records: CheckInRecord[];
  }

  const grouped: GroupedHistory[] = [];
  let currentGroup: GroupedHistory | null = null;

  for (const record of history) {
    const d = new Date(record.timestamp);
    const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    const todayStart = new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate()).getTime();
    const yesterdayStart = todayStart - 24 * 60 * 60 * 1000;

    let label: string;
    if (dayStart === todayStart) {
      label = '今天';
    } else if (dayStart === yesterdayStart) {
      label = '昨天';
    } else {
      label = `${d.getMonth() + 1}月${d.getDate()}日`;
    }

    if (!currentGroup || currentGroup.label !== label) {
      currentGroup = { date: String(dayStart), label, records: [] };
      grouped.push(currentGroup);
    }
    currentGroup.records.push(record);
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>签到记录</Text>
        <Text style={styles.headerSubtitle}>
          共 {history.length} 次签到
        </Text>
      </View>

      {history.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyEmoji}>📝</Text>
          <Text style={styles.emptyTitle}>暂无签到记录</Text>
          <Text style={styles.emptyHint}>去首页点击「我在」开始签到吧</Text>
        </View>
      ) : (
        <FlatList
          data={grouped}
          keyExtractor={item => item.date}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          renderItem={({ item: group }) => (
            <View style={styles.group}>
              <View style={styles.groupHeader}>
                <Text style={styles.groupLabel}>{group.label}</Text>
                <Text style={styles.groupCount}>{group.records.length} 次签到</Text>
              </View>
              {group.records.map(record => (
                <CheckInItem key={record.id} record={record} />
              ))}
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: DARK_BG,
  },
  loadingText: {
    color: TEXT_GRAY,
    fontSize: 16,
    textAlign: 'center',
    marginTop: 100,
  },
  header: {
    padding: 20,
    paddingBottom: 10,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: TEXT_WHITE,
  },
  headerSubtitle: {
    fontSize: 13,
    color: TEXT_GRAY,
    marginTop: 4,
  },
  listContent: {
    padding: 20,
    paddingTop: 10,
    paddingBottom: 40,
  },
  group: {
    marginBottom: 24,
  },
  groupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  groupLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: TEXT_WHITE,
  },
  groupCount: {
    fontSize: 12,
    color: TEXT_GRAY,
  },
  itemCard: {
    backgroundColor: CARD_BG,
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  itemLeft: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(48,209,88,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  itemEmoji: {
    fontSize: 20,
  },
  itemContent: {
    flex: 1,
  },
  itemTime: {
    fontSize: 14,
    color: TEXT_WHITE,
    fontWeight: '500',
    marginBottom: 2,
  },
  itemRelative: {
    fontSize: 12,
    color: TEXT_GRAY,
  },
  itemNote: {
    fontSize: 12,
    color: TEXT_GRAY,
    marginTop: 4,
    fontStyle: 'italic',
  },
  itemBadge: {
    backgroundColor: 'rgba(48,209,88,0.15)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  itemBadgeText: {
    fontSize: 11,
    color: GREEN_OK,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 100,
  },
  emptyEmoji: {
    fontSize: 60,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: TEXT_WHITE,
    marginBottom: 8,
  },
  emptyHint: {
    fontSize: 14,
    color: TEXT_GRAY,
  },
});
