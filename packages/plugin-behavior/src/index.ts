import {
  BasePlugin,
  LISTEN_TYPES,
  SEND_TYPES,
  getGlobalHawkTracker,
  BehaviorStack,
} from '@hawk-tracker/core';
/**
 * 用户行为监控插件
 * 使用核心级别的行为栈管理器来记录用户行为
 */
export class BehaviorPlugin extends BasePlugin {
  private behaviorStack: BehaviorStack = null as any;
  private globalTracker: any;
  private clickEnabled: boolean = true;

  constructor(
    options: {
      stackName?: string;
      maxSize?: number;
      maxAge?: number;
      debug?: boolean;
      enableClick?: boolean; // 是否启用点击事件监控
    } = {},
  ) {
    super(SEND_TYPES.BEHAVIOR);

    // 获取全局跟踪器实例
    this.globalTracker = getGlobalHawkTracker();
    // 设置点击事件控制
    this.clickEnabled = options.enableClick !== false; // 默认启用

    if (!this.globalTracker) {
      console.error('[BehaviorPlugin] 全局跟踪器未初始化');
      return;
    }

    // 设置点击事件控制
    this.clickEnabled = options.enableClick !== false; // 默认启用

    // 创建或获取专用的行为栈
    this.behaviorStack = this.globalTracker.createBehaviorStack(
      options.stackName || 'user_behavior',
      {
        maxSize: options.maxSize ?? 200,
        maxAge: options.maxAge ?? 5 * 60 * 1000,
        debug: options.debug ?? false,
      },
    );

    console.log('[BehaviorPlugin] 初始化完成', {
      stackName: this.behaviorStack.getName(),
      clickEnabled: this.clickEnabled,
      config: {
        maxSize: options.maxSize ?? 200,
        maxAge: options.maxAge ?? 5 * 60 * 1000,
        debug: options.debug ?? false,
      },
    });
  }

  install(core: any) {
    console.log('[BehaviorPlugin] 安装插件');

    // 根据配置决定是否订阅点击事件
    if (this.clickEnabled) {
      core.eventCenter.subscribeEvent({
        type: LISTEN_TYPES.CLICK,
        // 消费核心增强后的 ClickEvent（带 eventId、title、params 等字段）
        callback: (evt: any) => this.handleClickEvent(evt),
      });
      console.log('[BehaviorPlugin] 点击事件监控已启用');
    } else {
      console.log('[BehaviorPlugin] 点击事件监控已禁用');
    }

    // 订阅其他事件类型
    core.eventCenter.subscribeEvent({
      type: LISTEN_TYPES.LOAD,
      callback: this.handlePageLoadEvent.bind(this),
    });

    core.eventCenter.subscribeEvent({
      type: LISTEN_TYPES.BEFOREUNLOAD,
      callback: this.handlePageUnloadEvent.bind(this),
    });

    core.eventCenter.subscribeEvent({
      type: LISTEN_TYPES.HASHCHANGE,
      callback: this.handleRouteChangeEvent.bind(this),
    });

    core.eventCenter.subscribeEvent({
      type: LISTEN_TYPES.HISTORYPUSHSTATE,
      callback: this.handleRouteChangeEvent.bind(this),
    });

    core.eventCenter.subscribeEvent({
      type: LISTEN_TYPES.HISTORYREPLACESTATE,
      callback: this.handleRouteChangeEvent.bind(this),
    });

    core.eventCenter.subscribeEvent({
      type: LISTEN_TYPES.POPSTATE,
      callback: this.handleRouteChangeEvent.bind(this),
    });

    core.eventCenter.subscribeEvent({
      type: LISTEN_TYPES.XHROPEN,
      callback: this.handleNetworkEvent.bind(this),
    });

    core.eventCenter.subscribeEvent({
      type: LISTEN_TYPES.XHRSEND,
      callback: this.handleNetworkEvent.bind(this),
    });

    core.eventCenter.subscribeEvent({
      type: LISTEN_TYPES.FETCH,
      callback: this.handleNetworkEvent.bind(this),
    });

    // 移除重复的 CLICK 订阅，避免重复记录

    console.log('[BehaviorPlugin] 事件订阅完成');
  }

  private handlePageLoadEvent() {
    this.behaviorStack.addCustomEvent('pageLoad', {
      url: window.location.href,
      timestamp: Date.now(),
    });
  }

  private handlePageUnloadEvent() {
    this.behaviorStack.addCustomEvent('pageUnload', {
      url: window.location.href,
      timestamp: Date.now(),
    });
  }

  private handleRouteChangeEvent() {
    this.behaviorStack.addCustomEvent('routeChange', {
      url: window.location.href,
      timestamp: Date.now(),
      
    });
  }

  private handleNetworkEvent(data: any) {
    this.behaviorStack.addCustomEvent('networkEvent', data);
  }

  private handleClickEvent(event: any) {
    // 兼容核心增强后的 ClickEvent；若是原生 MouseEvent 则回退到最小字段
    const isEnhanced = event && typeof event === 'object' && 'eventId' in event;
    if (isEnhanced) {
      this.behaviorStack.addCustomEvent('click', {
        eventId: event.eventId,
        title: event.title,
        params: event.params,
        elementPath: event.elementPath,
        x: event.x,
        y: event.y,
        elementId: event.elementId,
        triggerPageUrl: event.triggerPageUrl,
        triggerTime: event.triggerTime,
      });
      return;
    }

    // 回退：尽力从原生事件提取基础信息
    const mouse = event as MouseEvent;
    const target = mouse?.target as HTMLElement;
    if (!mouse || !target) return;
    const rect = target.getBoundingClientRect();
    this.behaviorStack.addCustomEvent('click', {
      elementPath: this.getElementPath(target),
      x: mouse.clientX,
      y: mouse.clientY,
      width: rect.width,
      height: rect.height,
      triggerPageUrl: window.location.href,
      triggerTime: Date.now(),
    });
  }

  private getElementPath(element: HTMLElement): string {
    const path: string[] = [];
    let current: HTMLElement | null = element;

    while (current) {
      let selector = current.tagName.toLowerCase();
      if (current.id) {
        selector += `#${current.id}`;
      } else if (current.className) {
        selector += `.${current.className.split(' ').join('.')}`;
      }

      path.unshift(selector);
      current = current.parentElement;
    }

    return path.join(' > ');
  }
}
