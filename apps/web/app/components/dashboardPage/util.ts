// apps/web/app/dashboardPage/utils.ts
import { useState, useEffect, useCallback, useRef } from 'react';

// 数据类型定义
export type MetricCard = {
  id: string;
  title: string;
  description: string;
  value: string | number;
  metric: string;
  badge: string;
  trend?: 'up' | 'down' | 'stable';
  change?: string;
};

// 服务器统计数据接口
interface ServerStats {
  events: number;
  errors: number;
  performance: number;
  behaviors: number;
  total: number;
}

// 服务器数据项接口
interface ServerDataItem {
  type?: string;
  subType:
    | string
    | {
        type: string;
        timestamp: number;
        name?: string;
        duration?: number;
        transferSize?: number;
        initiatorType?: string;
        startTime?: number;
        responseEnd?: number;
        domainLookupStart?: number;
        domainLookupEnd?: number;
        connectStart?: number;
        connectEnd?: number;
        requestStart?: number;
        responseStart?: number;
      };
  data?: any;
  receivedAt: string;
  id: string;
  baseInfo?: any;
  timestamp?: number;
  retryCount?: number;
  eventId?: string;
  priority?: string;
  projectId?: string;
}

// 自定义 Hook 核心逻辑
export function useDashboardMetrics() {
  const [metrics, setMetrics] = useState<MetricCard[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState<number>(0);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [refreshInterval, setRefreshIntervalState] = useState<number>(30000); // 30秒默认
  const previousMetrics = useRef<MetricCard[]>([]);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const dataCache = useRef<{ data: any; timestamp: number } | null>(null); // 数据缓存
  const CACHE_DURATION = 10000; // 缓存10秒

  // 网络状态监听
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // 获取统计数据
  const fetchStats = async (): Promise<ServerStats> => {
    const response = await fetch('http://localhost:3001/api/stats', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      // 添加超时设置
      signal: AbortSignal.timeout(10000), // 10秒超时
    });

    if (!response.ok) {
      throw new Error(
        `获取统计数据失败: ${response.status} ${response.statusText}`,
      );
    }

    const result = await response.json();
    return result.data;
  };

  // 获取最近的行为数据（用于计算 PV/UV）
  const fetchRecentBehaviors = async (): Promise<ServerDataItem[]> => {
    // 增加数据限制，确保获取足够的数据
    const response = await fetch(
      'http://localhost:3001/api/data?type=behaviors&limit=5000',
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(10000), // 10秒超时
      },
    );

    if (!response.ok) {
      throw new Error(
        `获取行为数据失败: ${response.status} ${response.statusText}`,
      );
    }

    const result = await response.json();
    return result.data.list || [];
  };

  // 获取性能数据（作为 PV/UV 的备选数据源）
  const fetchPerformanceData = async (): Promise<ServerDataItem[]> => {
    // 增加数据限制，确保获取足够的数据
    const response = await fetch(
      'http://localhost:3001/api/data?type=performance&limit=5000',
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(10000), // 10秒超时
      },
    );

    if (!response.ok) {
      throw new Error(
        `获取性能数据失败: ${response.status} ${response.statusText}`,
      );
    }

    const result = await response.json();
    return result.data.list || [];
  };

  // 计算 PV（页面访问量）
  const calculatePV = (
    behaviors: ServerDataItem[],
    performanceData: ServerDataItem[],
  ): number => {
    // 首先从行为数据中统计
    const behaviorPV = behaviors.filter(
      (item) =>
        item.subType === 'load' ||
        item.subType === 'route_change' ||
        item.subType === 'pageView',
    ).length;

    // 如果行为数据中没有 PV 事件，尝试从性能数据中统计
    if (behaviorPV === 0 && performanceData.length > 0) {
      // 根据实际数据格式，性能数据中的 subType 是一个对象，包含 type 字段
      const performancePV = performanceData.filter((item) => {
        const subType = item.subType;
        if (typeof subType === 'object' && subType !== null) {
          return (
            subType.type === 'navigation' ||
            subType.type === 'load' ||
            subType.type === 'pageView' ||
            subType.type === 'resource'
          ); // 资源加载也可以算作页面访问
        }
        return (
          subType === 'navigation' ||
          subType === 'load' ||
          subType === 'pageView'
        );
      }).length;
      return performancePV;
    }

    return behaviorPV;
  };

  // 计算 UV（独立访客数）- 每次页面打开算一个访客
  const calculateUV = (
    behaviors: ServerDataItem[],
    performanceData: ServerDataItem[],
  ): number => {
    const pageVisits = new Set<string>();

    // 处理行为数据 - 页面加载事件
    behaviors.forEach((item) => {
      // 只统计页面加载相关的事件
      if (item.subType === 'load' || item.subType === 'pageView') {
        const userInfo =
          item.data?.baseInfo || item.data?.userInfo || item.data;
        if (userInfo) {
          const userId =
            userInfo.userUuid ||
            userInfo.sdkUserUuid ||
            userInfo.userId ||
            userInfo.sessionId;
          if (userId) {
            // 使用用户ID + 时间戳（按分钟）作为唯一标识
            const timeKey = Math.floor(Date.now() / 60000); // 每分钟一个标识
            pageVisits.add(`${userId}-${timeKey}`);
          }
        }
      }
    });

    // 如果行为数据中没有页面访问，尝试从性能数据中提取
    if (pageVisits.size === 0 && performanceData.length > 0) {
      // 统计页面加载、导航和资源加载事件（作为页面访问的标识）
      performanceData.forEach((item) => {
        const subType = item.subType;
        if (typeof subType === 'object' && subType !== null) {
          // 统计页面加载相关的事件，包括资源加载（因为资源加载表示页面被访问）
          if (
            subType.type === 'navigation' ||
            subType.type === 'load' ||
            subType.type === 'resource'
          ) {
            const userInfo =
              item.data?.baseInfo ||
              item.data?.userInfo ||
              item.data ||
              item.baseInfo;

            if (userInfo) {
              const userId =
                userInfo.userUuid ||
                userInfo.sdkUserUuid ||
                userInfo.userId ||
                userInfo.sessionId;
              if (userId && item.timestamp) {
                // 使用用户ID + 时间戳（按分钟）作为唯一标识
                const timeKey = Math.floor(item.timestamp / 60000); // 每分钟一个标识
                pageVisits.add(`${userId}-${timeKey}`);
              }
            } else if (item.timestamp) {
              // 如果没有用户信息，使用 eventId + 时间戳
              const timeKey = Math.floor(item.timestamp / 60000);
              const visitKey = item.eventId
                ? `${item.eventId.substring(0, 8)}-${timeKey}`
                : `visit-${timeKey}`;
              pageVisits.add(visitKey);
            }
          }
        }
      });

      // 如果仍然没有页面访问记录，使用时间窗口来估算页面访问次数
      if (pageVisits.size === 0 && performanceData.length > 0) {
        const timeWindows = new Set<string>();
        performanceData.forEach((item) => {
          if (item.timestamp) {
            // 使用5分钟时间窗口来分组，模拟页面访问
            const timeWindow = Math.floor(item.timestamp / 300000); // 5分钟一个窗口
            timeWindows.add(`window-${timeWindow}`);
          }
        });
        return timeWindows.size;
      }
    }

    return pageVisits.size;
  };

  // 计算趋势和变化
  const calculateTrend = (
    current: number,
    previous: number,
  ): { trend: 'up' | 'down' | 'stable'; change: string } => {
    if (previous === 0) {
      return { trend: 'stable', change: '0%' };
    }

    const change = ((current - previous) / previous) * 100;
    const changeStr = `${change > 0 ? '+' : ''}${change.toFixed(1)}%`;

    if (Math.abs(change) < 1) {
      return { trend: 'stable', change: changeStr };
    } else if (change > 0) {
      return { trend: 'up', change: changeStr };
    } else {
      return { trend: 'down', change: changeStr };
    }
  };

  // 实际 API 请求函数
  const fetchRealData = async (): Promise<MetricCard[]> => {
    try {
      // 检查缓存
      const now = Date.now();
      if (
        dataCache.current &&
        now - dataCache.current.timestamp < CACHE_DURATION
      ) {
        console.log('📦 使用缓存数据');
        return dataCache.current.data;
      }

      // 并行获取统计数据、行为数据和性能数据
      const [stats, behaviors, performanceData] = await Promise.all([
        fetchStats(),
        fetchRecentBehaviors(),
        fetchPerformanceData(),
      ]);

      // 计算 PV/UV
      const pv = calculatePV(behaviors, performanceData);
      const uv = calculateUV(behaviors, performanceData);

      // 计算错误率
      const errorRate =
        stats.total > 0
          ? ((stats.errors / stats.total) * 100).toFixed(1)
          : '0.0';

      // 获取之前的数据用于计算趋势
      const prevMetrics = previousMetrics.current;
      const prevPV = prevMetrics.find((m) => m.id === 'page-views')?.value || 0;
      const prevUV =
        prevMetrics.find((m) => m.id === 'active-users')?.value || 0;
      const prevTotal =
        prevMetrics.find((m) => m.id === 'total-events')?.value || 0;
      const prevErrorRate =
        prevMetrics.find((m) => m.id === 'error-rate')?.value || '0.0%';

      // 计算趋势 - 修复 NaN 问题
      const pvTrend = calculateTrend(pv, Number(prevPV) || 0);
      const uvTrend = calculateTrend(uv, Number(prevUV) || 0);
      const totalTrend = calculateTrend(stats.total, Number(prevTotal) || 0);
      const errorTrend = calculateTrend(
        Number(errorRate),
        Number(String(prevErrorRate).replace('%', '')) || 0,
      );

      // 构建指标卡片数据
      const realMetrics: MetricCard[] = [
        {
          id: 'active-users',
          title: '活跃用户数',
          description: '独立访客数量 (UV)',
          value: uv.toLocaleString(),
          metric: 'UV',
          badge: 'UV',
          trend: uvTrend.trend,
          change: uvTrend.change,
        },
        {
          id: 'page-views',
          title: '页面浏览量',
          description: '总页面访问量 (PV)',
          value: pv.toLocaleString(),
          metric: 'PV',
          badge: 'PV',
          trend: pvTrend.trend,
          change: pvTrend.change,
        },
        {
          id: 'total-events',
          title: '总事件数',
          description: '所有监控事件总数',
          value: stats.total.toLocaleString(),
          metric: '个',
          badge: 'EV',
          trend: totalTrend.trend,
          change: totalTrend.change,
        },
        {
          id: 'error-rate',
          title: '错误率',
          description: '错误事件占比',
          value: `${errorRate}%`,
          metric: '错误率',
          badge: 'ER',
          trend: errorTrend.trend,
          change: errorTrend.change,
        },
      ];

      // 保存当前数据用于下次趋势计算
      previousMetrics.current = realMetrics;

      // 保存到缓存
      dataCache.current = {
        data: realMetrics,
        timestamp: Date.now(),
      };

      return realMetrics;
    } catch (err: any) {
      throw new Error(`获取数据失败: ${err.message}`);
    }
  };

  // 数据获取统一入口
  const fetchData = useCallback(async () => {
    // 如果离线，不进行请求
    if (!isOnline) {
      setError('网络连接不可用，请检查网络连接');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const realMetrics = await fetchRealData();
      setMetrics(realMetrics);
      setLastUpdate(new Date());
      setRetryCount(0); // 成功后重置重试计数
    } catch (err: any) {
      setError(err.message);
      // 自动重试（最多3次）
      if (retryCount < 3) {
        setRetryCount((prev) => prev + 1);
        setTimeout(
          () => {
            fetchData();
          },
          2000 * (retryCount + 1),
        ); // 递增重试间隔
      }
    } finally {
      setLoading(false);
    }
  }, [retryCount, isOnline]);

  // 初始加载
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // 智能自动刷新
  useEffect(() => {
    // 清除之前的定时器
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    // 如果离线，不设置定时器
    if (!isOnline) {
      return;
    }

    // 设置新的定时器
    intervalRef.current = setInterval(() => {
      fetchData();
    }, refreshInterval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [fetchData, refreshInterval, isOnline]);

  // 页面可见性变化时刷新
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && isOnline) {
        fetchData(); // 页面重新可见时立即刷新
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [fetchData, isOnline]);

  // 手动刷新
  const refreshData = useCallback(async () => {
    setRetryCount(0); // 重置重试计数
    await fetchData();
  }, [fetchData]);

  // 设置刷新间隔
  const setRefreshInterval = useCallback((interval: number) => {
    setRefreshIntervalState(interval);
  }, []);

  return {
    metrics,
    loading,
    error,
    refreshData,
    lastUpdate,
    isOnline,
    retryCount,
    setRefreshInterval,
  };
}
