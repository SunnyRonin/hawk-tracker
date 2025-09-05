import { InternalConfig } from './types/options';
import { EventCenter, eventCenter } from './lib/eventCenter';
import { DataSender } from './lib/dataSender';
import { BehaviorStackManager } from './lib/behaviorStackManager';
import {
  initReplace,
  enableClickTracking,
  disableClickTracking,
} from './lib/AOPFactory';
import { nativeTryCatch } from './utils/exceptions';
import { setConfig, getConfig } from './common/config';
import { initBaseInfo } from './common/base';
import { setGlobalHawkTracker, getGlobalHawkTracker } from './utils/global';
import { SnapshotOptions } from './types/behavior';

console.log(
  '🔥 Core package hot reload test - ' + new Date().toLocaleTimeString(),
);

export class HawkTracker {
  config: InternalConfig; // 配置项
  dataSender: DataSender;
  eventCenter: EventCenter;
  behaviorStackManager: BehaviorStackManager;
  baseInfo: any;

  constructor(configs: InternalConfig) {
    setConfig(configs);
    this.config = getConfig();
    this.dataSender = new DataSender({
      dsn: configs.dsn,
      sampleRate: configs.sampleRate,
      debug: configs.debug,
      batchSize: configs.batchSize ?? 50,
      sendInterval: configs.sendInterval ?? 5000,
      maxRetry: configs.maxRetry ?? 5,
      backoffBaseMs: configs.backoffBaseMs ?? 1000,
      backoffMaxMs: configs.backoffMaxMs ?? 30000,
      maxConcurrentRequests: configs.maxConcurrentRequests ?? 3,
      offlineStorageKey: configs.offlineStorageKey ?? 'sdk_report_queue',
    });
    this.eventCenter = eventCenter;

    // 初始化行为栈管理器
    this.behaviorStackManager = new BehaviorStackManager({
      maxSize: configs.behavior?.maxSize ?? 100,
      maxAge: configs.behavior?.maxAge ?? 5 * 60 * 1000,
      debug: configs.behavior?.debug ?? configs.debug ?? false,
    });

    this.baseInfo = initBaseInfo(configs);
  }

  public use(plugin: any, option: any) {
    const instance = new plugin(option);
    nativeTryCatch(() => {
      instance.install(this);
    });
    return this;
  }

  public track(type: string, data: any, isImmediate: boolean = true) {
    // 从data中提取subType，如果没有则使用默认值
    const subType = (data && data.type) || 'custom';
    this.dataSender.sendData(type, subType, data, isImmediate);
  }

  /**
   * 获取行为栈
   * @param name 栈名称，不传则返回默认栈
   * @returns 行为栈实例
   */
  public getBehaviorStack(name: string = 'default') {
    return this.behaviorStackManager.getBehaviorStack(name);
  }

  /**
   * 创建行为栈
   * @param name 栈名称
   * @param config 栈配置
   * @returns 行为栈实例
   */
  public createBehaviorStack(name: string, config?: any) {
    return this.behaviorStackManager.createBehaviorStack(name, config);
  }

  /**
   * 获取或创建行为栈
   * @param name 栈名称
   * @param config 栈配置
   * @returns 行为栈实例
   */
  public getOrCreateBehaviorStack(name: string, config?: any) {
    return this.behaviorStackManager.getOrCreateBehaviorStack(name, config);
  }

  // 便捷方法：对外暴露“像数组一样”的默认行为栈操作
  public pushBehavior(
    event: { type: string; context?: Record<string, any>; pageUrl?: string },
    stackName: string = 'user_behavior',
  ): boolean {
    const stack = this.getOrCreateBehaviorStack(stackName);
    return stack.addEvent({
      type: event.type,
      pageUrl:
        event.pageUrl ||
        (typeof window !== 'undefined' ? window.location.href : ''),
      context: event.context || {},
    });
  }

  public getBehaviors(
    options: SnapshotOptions = {},
    stackName: string = 'user_behavior',
  ) {
    const stack = this.getOrCreateBehaviorStack(stackName);
    return stack.getSnapshot(options);
  }

  public clearBehaviors(stackName: string = 'user_behavior') {
    const stack = this.getOrCreateBehaviorStack(stackName);
    stack.clear();
  }

  // 运行时控制：启用/禁用点击事件监控
  public enableClickTracking() {
    enableClickTracking();
  }

  public disableClickTracking() {
    disableClickTracking();
  }
}

export function init(configs: InternalConfig) {
  const instance = new HawkTracker(configs);
  setGlobalHawkTracker(instance);
  // 在设置全局实例后初始化 AOP，因为要用到全局实例
  initReplace();
  console.log('Core package updated!');
  return getGlobalHawkTracker();
}

// 统一导出
export * from './types';
export * from './utils';
export * from './common';
export * from './lib/behaviorStack';
export * from './lib/behaviorStackManager';
