import { useState, useEffect, useCallback } from 'react';
// 自定义事件管理工具函数

// 自定义事件数据类型
export interface CustomEvent {
  id: string;
  eventName: string;
  eventIdentifier: string;
  triggerCount: number;
  affectedUsers: number;
  lastTriggerTime: string;
}

// 事件详情数据类型
export interface EventDetail {
  id: string;
  eventName: string;
  eventIdentifier: string;
  triggerCount: number;
  affectedUsers: number;
  lastTriggerTime: string;
  eventData: {
    eventId: string;
    timestamp: string;
    userId: string;
    properties: Record<string, any>;
    pageInfo: {
      url: string;
      title: string;
      userAgent: string;
    };
    deviceInfo: {
      screenWidth: number;
      screenHeight: number;
      viewportWidth: number;
      viewportHeight: number;
      language: string;
      timezone: string;
    };
  };
}

// 统计数据类型
export interface CustomEventStats {
  totalEvents: number;
  totalUsers: number;
  activeEvents: number;
  averageTriggerCount: number;
}

// 原始后端数据类型（尽量宽松）
interface RawItem {
  id?: string;
  type?: string; // behaviors/custom
  subType?: string; // custom、自定义等
  eventId?: string;
  receivedAt?: string;
  timestamp?: number | string;
  data?: any;
  baseInfo?: any;
}

// 本地存储的自定义事件类型
interface LocalCustomEvent {
  id: string;
  name: string;
  description: string;
  type: string;
  identifier: string;
  properties: Record<string, any>;
  createdAt: string;
  projectId: string;
}

const API_BASE = 'http://localhost:3001/api';

// 本地存储键名
const LOCAL_STORAGE_KEY = 'hawk_tracker_custom_events';

// 本地存储管理
const localStorageManager = {
  // 获取所有自定义事件
  getAllEvents(): Record<string, LocalCustomEvent[]> {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch (error) {
      console.error('读取本地存储失败:', error);
      return {};
    }
  },

  // 获取指定项目的事件
  getProjectEvents(projectId: string): LocalCustomEvent[] {
    const allEvents = this.getAllEvents();
    return allEvents[projectId] || [];
  },

  // 保存项目事件
  saveProjectEvents(projectId: string, events: LocalCustomEvent[]): void {
    try {
      const allEvents = this.getAllEvents();
      allEvents[projectId] = events;
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(allEvents));
    } catch (error) {
      console.error('保存到本地存储失败:', error);
    }
  },

  // 添加新事件
  addEvent(projectId: string, event: LocalCustomEvent): void {
    const events = this.getProjectEvents(projectId);
    events.push(event);
    this.saveProjectEvents(projectId, events);
  },

  // 删除事件
  deleteEvent(projectId: string, eventId: string): boolean {
    const events = this.getProjectEvents(projectId);
    const filteredEvents = events.filter((e) => e.id !== eventId);
    if (filteredEvents.length !== events.length) {
      this.saveProjectEvents(projectId, filteredEvents);
      return true;
    }
    return false;
  },
};

async function fetchJSON<T>(url: string, timeoutMs = 10000): Promise<T> {
  const controller = AbortSignal.timeout
    ? { signal: AbortSignal.timeout(timeoutMs) }
    : {};
  const res = await fetch(url, controller as any);
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  return res.json();
}

function extractUserId(item: RawItem): string | undefined {
  const u =
    item.data?.userInfo || item.data?.baseInfo || item.baseInfo || item.data;
  return u?.userUuid || u?.sdkUserUuid || u?.userId || u?.sessionId;
}

function extractEventName(item: RawItem): {
  name?: string;
  identifier?: string;
} {
  // 兼容 SDK 上报字段
  const d = item.data || {};

  // 优先从 data 中提取
  let name = d.eventName || d.name || d.action;
  let identifier = d.eventIdentifier || d.key || d.id;

  // 如果 subType 是 custom，但没有明确的 eventName，使用 subType 作为标识
  if (item.subType === 'custom' && !name && !identifier) {
    name = 'custom_event';
    identifier = 'custom_event';
  }

  // 如果还是没有，尝试从其他字段推断
  if (!name && !identifier) {
    // 检查是否有其他可能的事件标识
    const possibleKeys = ['event', 'action', 'type', 'name'];
    for (const key of possibleKeys) {
      if (d[key]) {
        name = d[key];
        identifier = d[key];
        break;
      }
    }
  }

  return { name, identifier };
}

function extractTimestamp(item: RawItem): number {
  const t =
    typeof item.timestamp === 'string'
      ? Date.parse(item.timestamp)
      : item.timestamp;
  return t && !Number.isNaN(t) ? Number(t) : Date.now();
}

// 将后端原始数据聚合为自定义事件列表
function aggregateToCustomEvents(items: RawItem[]): CustomEvent[] {
  const map = new Map<
    string,
    {
      id: string;
      eventName: string;
      eventIdentifier: string;
      triggerCount: number;
      userSet: Set<string>;
      lastTs: number;
    }
  >();

  items.forEach((it) => {
    const { name, identifier } = extractEventName(it);
    if (!name && !identifier) return; // 非自定义事件

    const key = (identifier || name)!;
    const userId = extractUserId(it);
    const ts = extractTimestamp(it);

    if (!map.has(key)) {
      map.set(key, {
        id: key,
        eventName: name || key,
        eventIdentifier: key,
        triggerCount: 0,
        userSet: new Set<string>(),
        lastTs: ts,
      });
    }
    const agg = map.get(key)!;
    agg.triggerCount += 1;
    if (userId) agg.userSet.add(String(userId));
    if (ts > agg.lastTs) agg.lastTs = ts;
  });

  return Array.from(map.values()).map((v) => ({
    id: v.id,
    eventName: v.eventName,
    eventIdentifier: v.eventIdentifier,
    triggerCount: v.triggerCount,
    affectedUsers: v.userSet.size,
    lastTriggerTime: new Date(v.lastTs)
      .toISOString()
      .replace('T', ' ')
      .slice(0, 19),
  }));
}

// 抓取可能的自定义事件源：优先 /api/data?type=custom，回退 behaviors
async function fetchCustomSource(limit = 2000): Promise<RawItem[]> {
  // 1) 直接尝试 type=custom
  try {
    const r1 = await fetchJSON<any>(
      `${API_BASE}/data?type=custom&limit=${limit}`,
    );
    const list: RawItem[] = r1?.data?.list || r1?.list || [];
    if (Array.isArray(list) && list.length) return list;
  } catch {}

  // 2) 回退 behaviors 中的自定义事件
  try {
    const r2 = await fetchJSON<any>(
      `${API_BASE}/data?type=behaviors&limit=${limit}`,
    );
    const list: RawItem[] = r2?.data?.list || r2?.list || [];
    // 过滤疑似自定义事件：data.eventName 存在 或 subType 包含 custom
    const filtered = list.filter((it) => {
      const d = it.data || {};
      return !!(
        d.eventName ||
        d.eventIdentifier ||
        (typeof it.subType === 'string' &&
          it.subType.toLowerCase().includes('custom'))
      );
    });
    return filtered;
  } catch {}

  return [];
}

// 事件详情：从同一事件 key 的最新一条构造详情
async function fetchCustomEventDetail(
  eventKey: string,
): Promise<EventDetail | null> {
  const items = await fetchCustomSource(5000);
  if (!items.length) return null;

  const related = items.filter((it) => {
    const { name, identifier } = extractEventName(it);
    const key = identifier || name;
    return key === eventKey;
  });
  if (!related.length) return null;

  const events = aggregateToCustomEvents(related);
  if (events.length === 0) return null;

  const agg = events[0]!;
  const latest = related.reduce((a, b) =>
    extractTimestamp(a) > extractTimestamp(b) ? a : b,
  );
  const d = latest.data || {};
  const u =
    latest.data?.userInfo || latest.data?.baseInfo || latest.baseInfo || {};

  const detail: EventDetail = {
    id: agg.id,
    eventName: agg.eventName,
    eventIdentifier: agg.eventIdentifier,
    triggerCount: agg.triggerCount,
    affectedUsers: agg.affectedUsers,
    lastTriggerTime: agg.lastTriggerTime,
    eventData: {
      eventId: agg.eventIdentifier || 'unknown',
      timestamp: new Date(extractTimestamp(latest))
        .toISOString()
        .replace('T', ' ')
        .slice(0, 19),
      userId:
        u.userUuid || u.sdkUserUuid || u.userId || u.sessionId || 'unknown',
      properties: d.properties || d.props || d.payload || d,
      pageInfo: {
        url: d.pageUrl || d.url || window.location.href,
        title: d.pageTitle || document.title,
        userAgent: navigator.userAgent,
      },
      deviceInfo: {
        screenWidth: window.screen.width,
        screenHeight: window.screen.height,
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
        language: navigator.language,
        timezone:
          Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Shanghai',
      },
    },
  };
  return detail;
}

// API 函数（接入真实后端）
export const customEventAPI = {
  // 获取自定义事件列表（实时聚合 + 本地存储）
  async getCustomEvents(projectId: string): Promise<CustomEvent[]> {
    try {
      // 1. 获取服务器事件
      const raw = await fetchCustomSource(5000);
      const serverEvents = aggregateToCustomEvents(raw);

      // 2. 获取本地存储的自定义事件
      const localEvents = localStorageManager.getProjectEvents(projectId);

      // 3. 将本地事件转换为 CustomEvent 格式
      const localCustomEvents: CustomEvent[] = localEvents.map((local) => ({
        id: local.id,
        eventName: local.name,
        eventIdentifier: local.identifier,
        triggerCount: 0, // 本地事件还没有触发记录
        affectedUsers: 0,
        lastTriggerTime: local.createdAt,
      }));

      // 4. 合并事件列表，去重（本地事件优先）
      const eventMap = new Map<string, CustomEvent>();

      // 先添加本地事件
      localCustomEvents.forEach((event) => {
        eventMap.set(event.eventIdentifier, event);
      });

      // 再添加服务器事件，如果本地没有的话
      serverEvents.forEach((event) => {
        if (!eventMap.has(event.eventIdentifier)) {
          eventMap.set(event.eventIdentifier, event);
        }
      });

      // 5. 转换为数组并按时间排序
      const allEvents = Array.from(eventMap.values());
      return allEvents.sort(
        (a, b) =>
          new Date(b.lastTriggerTime).getTime() -
          new Date(a.lastTriggerTime).getTime(),
      );
    } catch (error) {
      console.error('获取自定义事件失败:', error);
      // 如果服务器获取失败，只返回本地事件
      const localEvents = localStorageManager.getProjectEvents(projectId);
      return localEvents.map((local) => ({
        id: local.id,
        eventName: local.name,
        eventIdentifier: local.identifier,
        triggerCount: 0,
        affectedUsers: 0,
        lastTriggerTime: local.createdAt,
      }));
    }
  },

  // 获取事件详情
  async getEventDetail(
    projectId: string,
    eventId: string,
  ): Promise<EventDetail> {
    try {
      // 1. 先尝试从本地存储获取
      const localEvents = localStorageManager.getProjectEvents(projectId);
      const localEvent = localEvents.find(
        (e) => e.id === eventId || e.identifier === eventId,
      );

      if (localEvent) {
        // 返回本地事件的详情
        const detail: EventDetail = {
          id: localEvent.id,
          eventName: localEvent.name,
          eventIdentifier: localEvent.identifier,
          triggerCount: 0,
          affectedUsers: 0,
          lastTriggerTime: localEvent.createdAt,
          eventData: {
            eventId: localEvent.identifier,
            timestamp: localEvent.createdAt,
            userId: 'local_event',
            properties: localEvent.properties,
            pageInfo: {
              url: window.location.href,
              title: document.title,
              userAgent: navigator.userAgent,
            },
            deviceInfo: {
              screenWidth: window.screen.width,
              screenHeight: window.screen.height,
              viewportWidth: window.innerWidth,
              viewportHeight: window.innerHeight,
              language: navigator.language,
              timezone:
                Intl.DateTimeFormat().resolvedOptions().timeZone ||
                'Asia/Shanghai',
            },
          },
        };
        return detail;
      }

      // 2. 如果本地没有，尝试从服务器获取
      const detail = await fetchCustomEventDetail(eventId);
      if (!detail) throw new Error('未找到事件详情');
      return detail;
    } catch (error) {
      console.error('获取事件详情失败:', error);
      throw new Error('未找到事件详情');
    }
  },

  // 获取事件统计数据（前端聚合）
  async getEventStats(projectId: string): Promise<CustomEventStats> {
    const events = await customEventAPI.getCustomEvents(projectId);
    const totalEvents = events.reduce((sum, e) => sum + e.triggerCount, 0);
    const totalUsers = events.reduce((sum, e) => sum + e.affectedUsers, 0);
    const activeEvents = events.length;
    const averageTriggerCount = activeEvents
      ? Math.round(totalEvents / activeEvents)
      : 0;
    return { totalEvents, totalUsers, activeEvents, averageTriggerCount };
  },

  // 创建自定义事件
  async createCustomEvent(
    projectId: string,
    eventData: {
      name: string;
      description: string;
      type: string;
      identifier: string;
      properties: Record<string, any>;
    },
  ): Promise<CustomEvent> {
    try {
      // 检查标识符是否已存在
      const existingEvents = localStorageManager.getProjectEvents(projectId);
      const isDuplicate = existingEvents.some(
        (event) => event.identifier === eventData.identifier,
      );

      if (isDuplicate) {
        throw new Error('事件标识符已存在，请使用不同的标识符');
      }

      // 创建新事件
      const newLocalEvent: LocalCustomEvent = {
        id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: eventData.name,
        description: eventData.description,
        type: eventData.type,
        identifier: eventData.identifier,
        properties: eventData.properties,
        createdAt: new Date().toISOString(),
        projectId: projectId,
      };

      // 保存到本地存储
      localStorageManager.addEvent(projectId, newLocalEvent);

      console.log(`创建事件成功: ${eventData.name} (项目: ${projectId})`);

      // 返回转换后的事件
      const newEvent: CustomEvent = {
        id: newLocalEvent.id,
        eventName: newLocalEvent.name,
        eventIdentifier: newLocalEvent.identifier,
        triggerCount: 0,
        affectedUsers: 0,
        lastTriggerTime: newLocalEvent.createdAt,
      };

      return newEvent;
    } catch (error) {
      console.error('创建事件失败:', error);
      throw error;
    }
  },

  // 删除事件
  async deleteEvent(projectId: string, eventId: string): Promise<boolean> {
    try {
      // 从本地存储删除事件
      const success = localStorageManager.deleteEvent(projectId, eventId);
      if (success) {
        console.log(`删除事件成功: ${eventId} (项目: ${projectId})`);
      } else {
        console.log(`事件不存在或删除失败: ${eventId} (项目: ${projectId})`);
      }
      return success;
    } catch (error) {
      console.error('删除事件失败:', error);
      return false;
    }
  },
};

// 工具函数
export const customEventUtils = {
  // 格式化数字显示
  formatNumber(num: number): string {
    return num.toLocaleString();
  },

  // 格式化时间显示
  formatTime(timeStr: string): string {
    return new Date(timeStr).toLocaleString('zh-CN');
  },

  // 格式化相对时间
  formatRelativeTime(timeStr: string): string {
    const now = new Date();
    const time = new Date(timeStr);
    const diffInSeconds = Math.floor((now.getTime() - time.getTime()) / 1000);
    if (diffInSeconds < 60) return '刚刚';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}分钟前`;
    if (diffInSeconds < 86400)
      return `${Math.floor(diffInSeconds / 3600)}小时前`;
    return `${Math.floor(diffInSeconds / 86400)}天前`;
  },

  // 获取事件类型标签
  getEventTypeLabel(eventIdentifier: string): string {
    const typeMap: Record<string, string> = {
      user_register: '用户行为',
      product_purchase: '转化事件',
      page_share: '社交分享',
      search_event: '搜索行为',
    };
    return typeMap[eventIdentifier] || '用户行为';
  },

  // 生成事件趋势数据（模拟）
  generateTrendData(
    eventId: string,
    days: number = 7,
  ): Array<{ date: string; count: number }> {
    const data = [] as Array<{ date: string; count: number }>;
    const now = new Date();
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      data.push({
        date: date.toISOString().split('T')[0],
        count: Math.floor(Math.random() * 100) + 50,
      });
    }
    return data;
  },
};

// 自定义 Hook
export const useCustomEvents = (projectId: string) => {
  const [events, setEvents] = useState<CustomEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEvents = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await customEventAPI.getCustomEvents(projectId);
      setEvents(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取数据失败');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  return {
    events,
    loading,
    error,
    refetch: fetchEvents,
  };
};

export const useEventDetail = (projectId: string, eventId: string) => {
  const [eventDetail, setEventDetail] = useState<EventDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEventDetail = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await customEventAPI.getEventDetail(projectId, eventId);
      setEventDetail(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取数据失败');
    } finally {
      setLoading(false);
    }
  }, [projectId, eventId]);

  useEffect(() => {
    fetchEventDetail();
  }, [fetchEventDetail]);

  return {
    eventDetail,
    loading,
    error,
    refetch: fetchEventDetail,
  };
};
