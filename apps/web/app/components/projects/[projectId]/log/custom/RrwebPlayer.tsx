import React, { useEffect, useRef, useState } from 'react';
import { Button } from '@workspace/ui/components/button';
import { Card, CardContent, CardHeader, CardTitle } from '@workspace/ui/components/card';
import { Slider } from '@workspace/ui/components/slider';

interface RrwebPlayerProps {
  events: any[];
  errorPoint?: any;
  onErrorPointReached?: () => void;
}

export default function RrwebPlayer({ events, errorPoint, onErrorPointReached }: RrwebPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const replayerRef = useRef<any>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [currentEventIndex, setCurrentEventIndex] = useState(0);
  const [replayerReady, setReplayerReady] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
  const [playerMode, setPlayerMode] = useState<'normal' | 'fallback' | 'content-view'>('normal');
  const [currentEvent, setCurrentEvent] = useState<any>(null);

  // 智能内容渲染函数 - 当 rrweb 播放器失败时显示事件内容
  const renderEventContent = (event: any) => {
    if (!event) return null;

    const eventType = event.type;
    const timestamp = new Date(event.timestamp || Date.now()).toLocaleString('zh-CN');

    switch (eventType) {
      case 0: // 全量快照
        return (
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="font-semibold text-blue-800 mb-2">📸 页面快照</h3>
            <p className="text-blue-700 text-sm">时间: {timestamp}</p>
            <p className="text-blue-700 text-sm">页面: {event.data?.href || '未知页面'}</p>
            {event.data?.title && (
              <p className="text-blue-700 text-sm">标题: {event.data.title}</p>
            )}
          </div>
        );
      
      case 2: // 鼠标移动
        return (
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <h3 className="font-semibold text-green-800 mb-2">🖱️ 鼠标移动</h3>
            <p className="text-green-700 text-sm">时间: {timestamp}</p>
            <p className="text-green-700 text-sm">位置: X: {event.data?.x}, Y: {event.data?.y}</p>
          </div>
        );
      
      case 3: // 鼠标交互
        return (
          <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
            <h3 className="font-semibold text-purple-800 mb-2">👆 鼠标交互</h3>
            <p className="text-purple-700 text-sm">时间: {timestamp}</p>
            <p className="text-purple-700 text-sm">类型: {event.data?.type || '未知'}</p>
            {event.data?.target && (
              <p className="text-purple-700 text-sm">目标: {event.data.target.tagName || '未知元素'}</p>
            )}
          </div>
        );
      
      case 4: // 滚动
        return (
          <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
            <h3 className="font-semibold text-orange-800 mb-2">📜 页面滚动</h3>
            <p className="text-orange-700 text-sm">时间: {timestamp}</p>
            <p className="text-orange-700 text-sm">位置: X: {event.data?.x}, Y: {event.data?.y}</p>
          </div>
        );
      
      case 5: // 视口变化
        return (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <h3 className="font-semibold text-red-800 mb-2">🖥️ 视口变化</h3>
            <p className="text-red-700 text-sm">时间: {timestamp}</p>
            <p className="text-red-700 text-sm">尺寸: {event.data?.width} x {event.data?.height}</p>
          </div>
        );
      
      case 6: // 输入
        return (
          <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-lg">
            <h3 className="font-semibold text-indigo-800 mb-2">⌨️ 输入操作</h3>
            <p className="text-indigo-700 text-sm">时间: {timestamp}</p>
            <p className="text-indigo-700 text-sm">类型: {event.data?.type || '未知'}</p>
            {event.data?.target && (
              <p className="text-indigo-700 text-sm">目标: {event.data.target.tagName || '未知元素'}</p>
            )}
          </div>
        );
      
      default:
        return (
          <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <h3 className="font-semibold text-gray-800 mb-2">❓ 未知事件</h3>
            <p className="text-gray-700 text-sm">时间: {timestamp}</p>
            <p className="text-gray-700 text-sm">类型: {eventType}</p>
          </div>
        );
    }
  };

  // 创建智能回退播放器
  const createSmartFallbackPlayer = () => {
    const fallbackPlayer = {
      play: () => {
        setIsPlaying(true);
        console.log('🎮 智能回退播放器: 播放');
        // 模拟播放进度，显示事件内容
        const interval = setInterval(() => {
          if (isPlaying && currentEventIndex < events.length - 1) {
            setCurrentEventIndex(prev => {
              const next = prev + 1;
              if (events[next]) {
                setCurrentEvent(events[next]);
                setCurrentTime(next);
              }
              return next;
            });
          } else {
            clearInterval(interval);
          }
        }, 1000 / speed);
      },
      pause: () => {
        setIsPlaying(false);
        console.log('🎮 智能回退播放器: 暂停');
      },
      stop: () => {
        setIsPlaying(false);
        setCurrentTime(0);
        setCurrentEventIndex(0);
        setCurrentEvent(events[0]);
        console.log('🎮 智能回退播放器: 停止');
      },
      goto: (index: number) => {
        const clampedIndex = Math.max(0, Math.min(index, events.length - 1));
        setCurrentTime(clampedIndex);
        setCurrentEventIndex(clampedIndex);
        if (events[clampedIndex]) {
          setCurrentEvent(events[clampedIndex]);
        }
        console.log(`🎮 智能回退播放器: 跳转到 ${clampedIndex}`);
      },
      setSpeed: (s: number) => {
        setSpeed(s);
        console.log(`🎮 智能回退播放器: 设置速度 ${s}`);
      },
      on: () => {}, // 空函数
      wrapper: containerRef.current,
    };
    
    return fallbackPlayer;
  };

  useEffect(() => {
    // 重置状态
    setReplayerReady(false);
    setInitError(null);
    setPlayerMode('normal');
    setCurrentEvent(events[0]);
    
    // 添加全局错误处理器来捕获 CSS 错误
    const handleGlobalError = (event: ErrorEvent) => {
      if (event.error && event.error.message && 
          (event.error.message.includes('insertRule') || 
           event.error.message.includes('CSS') ||
           event.error.message.includes('style'))) {
        console.warn('⚠️ 全局捕获到 CSS 错误，自动切换到智能回退模式');
        setInitError('全局捕获到 CSS 错误，自动切换到智能回退模式');
        setPlayerMode('content-view');
        
        // 创建智能回退播放器
        replayerRef.current = createSmartFallbackPlayer();
        setReplayerReady(true);
      }
    };
    
    // 添加全局错误监听器
    window.addEventListener('error', handleGlobalError);
    
    if (!containerRef.current || events.length === 0) {
      console.log('⚠️ 容器或事件数据不可用，跳过初始化');
      return;
    }

    // 动态导入rrweb的Replayer
    const initReplayer = async () => {
      try {
        // 尝试导入 rrweb
        let rrwebModule;
        try {
          rrwebModule = await import('rrweb');
        } catch (importError) {
          console.error('❌ 导入 rrweb 模块失败:', importError);
          throw new Error(`导入 rrweb 模块失败: ${importError}`);
        }
        
        // 检查是否有 Replayer 类
        if (!rrwebModule.Replayer) {
          console.error('❌ rrweb Replayer 类不可用');
          throw new Error('rrweb Replayer 类不可用');
        }
        
        const { Replayer } = rrwebModule;
        
        // 创建 Replayer 实例 - 使用最兼容的配置
        const configOptions = [
          // 配置1: 最简配置，完全避免样式问题
          {
            root: containerRef.current,
            speed: speed,
            showWarning: false,
            blockClass: undefined,
            liveMode: false,
            pauseAnimationFrame: false,
            iframe: false,
            recordCanvas: false,
            collectFonts: false,
            skipInactive: true,
            maskAllInputs: false,
            maskInputOptions: { password: false },
            inlineStylesheet: false,
            insertStyleRules: false,
            useVirtualDom: false,
            styleSheet: undefined,
            applyStyleSheet: undefined,
            mouseTail: false,
          },
          // 配置2: 更保守的配置
          {
            root: containerRef.current,
            speed: speed,
            showWarning: false,
            liveMode: false,
            iframe: false,
            recordCanvas: false,
            collectFonts: false,
            skipInactive: true,
            maskAllInputs: false,
            mouseTail: false,
            pauseAnimationFrame: false,
            blockClass: undefined,
            styleSheet: undefined,
            applyStyleSheet: undefined,
            insertStyleRules: false,
            inlineStylesheet: false,
            useVirtualDom: false,
          }
        ];
        
        let currentReplayerInstance = null;
        let configIndex = 0;
        
        // 尝试不同的配置直到成功
        while (!currentReplayerInstance && configIndex < configOptions.length) {
          try {
            const cleanConfig = { ...configOptions[configIndex] };
            currentReplayerInstance = new Replayer(events, cleanConfig);
            break;
          } catch (configError: any) {
            // 检查是否是 CSS 相关错误
            if (configError.message && 
                (configError.message.includes('insertRule') || 
                 configError.message.includes('CSS') ||
                 configError.message.includes('style'))) {
              // 直接创建智能回退播放器
              console.warn('⚠️ CSS 错误，切换到智能内容视图模式');
              setInitError('CSS 错误，使用智能内容视图模式');
              setPlayerMode('content-view');
              
              replayerRef.current = createSmartFallbackPlayer();
              setReplayerReady(true);
              return;
            }
            
            configIndex++;
            if (configIndex >= configOptions.length) {
              throw new Error(`所有配置都失败: ${configError}`);
            }
          }
        }
        
        // 将实例保存到 ref
        replayerRef.current = currentReplayerInstance;
        setPlayerMode('normal');

        // 设置总时长
        setDuration(events.length);
        
        // 监听播放进度
        try {
          if (currentReplayerInstance?.on) {
            currentReplayerInstance.on('statechange', (state: any) => {
              if (state === 'playing') {
                setIsPlaying(true);
              } else if (state === 'paused') {
                setIsPlaying(false);
              }
            });

            currentReplayerInstance.on('event', (event: any) => {
              setCurrentEventIndex(event.index);
              setCurrentTime(event.index);
            });
          }
        } catch (error) {
          console.error('❌ 设置事件监听器失败:', error);
        }
        
        setReplayerReady(true);
        console.log('✅ rrweb 播放器初始化成功');
        
      } catch (error) {
        console.error('❌ 初始化 rrweb 播放器失败:', error);
        setInitError(`初始化失败: ${error instanceof Error ? error.message : '未知错误'}`);
        setPlayerMode('content-view');
        
        // 创建智能回退播放器
        replayerRef.current = createSmartFallbackPlayer();
        setReplayerReady(true);
      }
    };

    initReplayer();

    return () => {
      window.removeEventListener('error', handleGlobalError);
      
      // 清理播放器实例
      if (replayerRef.current) {
        try {
          if (typeof replayerRef.current.destroy === 'function') {
            replayerRef.current.destroy();
          } else if (typeof replayerRef.current.stop === 'function') {
            replayerRef.current.stop();
          }
        } catch (error) {
          console.warn('清理播放器实例时出错:', error);
        }
      }
    };
  }, [events]);

  // 播放控制函数
  const togglePlay = () => {
    if (!replayerRef.current) return;
    
    try {
      if (isPlaying) {
        if (typeof replayerRef.current.pause === 'function') {
          replayerRef.current.pause();
        }
      } else {
        if (typeof replayerRef.current.play === 'function') {
          replayerRef.current.play();
        }
      }
    } catch (error) {
      console.error('播放控制失败:', error);
    }
  };

  const stop = () => {
    if (!replayerRef.current) return;
    
    try {
      if (typeof replayerRef.current.stop === 'function') {
        replayerRef.current.stop();
      }
    } catch (error) {
      console.error('停止播放失败:', error);
    }
  };

  const jumpToError = () => {
    if (errorPoint && replayerRef.current) {
      try {
        if (typeof replayerRef.current.goto === 'function') {
          replayerRef.current.goto(errorPoint.eventIndex);
          setCurrentEventIndex(errorPoint.eventIndex);
          setCurrentTime(errorPoint.eventIndex);
          onErrorPointReached?.();
        }
      } catch (error) {
        console.error('跳转错误点失败:', error);
      }
    }
  };

  const handleSpeedChange = (newSpeed: number) => {
    setSpeed(newSpeed);
    if (replayerRef.current && typeof replayerRef.current.setSpeed === 'function') {
      try {
        replayerRef.current.setSpeed(newSpeed);
      } catch (error) {
        console.error('设置播放速度失败:', error);
      }
    }
  };

  const handleSliderChange = (value: number[]) => {
    const newTime = value[0];
    if (newTime !== undefined) {
      setCurrentTime(newTime);
      setCurrentEventIndex(Math.floor(newTime));
      
      if (replayerRef.current && typeof replayerRef.current.goto === 'function') {
        try {
          replayerRef.current.goto(Math.floor(newTime));
        } catch (error) {
          console.error('跳转播放位置失败:', error);
        }
      }
    }
  };

  // 获取播放器状态信息
  const getPlayerStatus = () => {
    if (playerMode === 'content-view') {
      return '🔄 智能内容视图模式';
    } else if (playerMode === 'fallback') {
      return '🔄 回退模式';
    } else {
      return '✅ 正常模式';
    }
  };

  // 获取可用方法状态
  const getAvailableMethods = () => {
    if (!replayerRef.current) return '❌ 无播放器';
    
    const methods = [];
    if (typeof replayerRef.current.play === 'function') methods.push('play:✅');
    if (typeof replayerRef.current.pause === 'function') methods.push('pause:✅');
    if (typeof replayerRef.current.goto === 'function') methods.push('goto:✅');
    if (typeof replayerRef.current.on === 'function') methods.push('on:✅');
    
    return methods.join(', ') || '❌ 无可用方法';
  };

  return (
    <div className="space-y-4">
      {/* 播放器容器 */}
      <div 
        ref={containerRef} 
        className={`w-full h-96 border-2 border-dashed rounded-lg ${
          playerMode === 'content-view' 
            ? 'border-blue-300 bg-blue-50' 
            : 'border-gray-300 bg-gray-50'
        }`}
      >
        {playerMode === 'content-view' ? (
          // 智能内容视图模式
          <div className="h-full flex flex-col items-center justify-center p-4">
            <div className="text-center mb-4">
              <h3 className="text-lg font-semibold text-blue-800 mb-2">
                🎬 智能内容视图模式
              </h3>
              <p className="text-blue-600 text-sm">
                由于 CSS 样式问题，播放器已切换到内容视图模式
              </p>
            </div>
            
            {/* 当前事件内容显示 */}
            {currentEvent && (
              <div className="w-full max-w-md">
                {renderEventContent(currentEvent)}
              </div>
            )}
            
            {/* 事件导航 */}
            <div className="mt-4 text-center">
              <p className="text-sm text-gray-600 mb-2">
                事件 {currentEventIndex + 1} / {events.length}
              </p>
              <div className="flex gap-2 justify-center">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    if (currentEventIndex > 0) {
                      replayerRef.current?.goto(currentEventIndex - 1);
                    }
                  }}
                  disabled={currentEventIndex === 0}
                >
                  ⬅️ 上一个
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    if (currentEventIndex < events.length - 1) {
                      replayerRef.current?.goto(currentEventIndex + 1);
                    }
                  }}
                  disabled={currentEventIndex === events.length - 1}
                >
                  下一个 ➡️
                </Button>
              </div>
            </div>
          </div>
        ) : (
          // 正常播放器模式 - 这里会显示真正的 rrweb 播放内容
          <div className="h-full flex items-center justify-center">
            <p className="text-gray-500">rrweb 播放器加载中...</p>
          </div>
        )}
      </div>

      {/* 控制面板 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            🎮 播放控制
            <span className="text-sm font-normal text-gray-500">
              {getPlayerStatus()}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 播放控制按钮 */}
          <div className="flex gap-2">
            <Button onClick={togglePlay} disabled={!replayerReady}>
              {isPlaying ? '⏸️ 暂停' : '▶️ 播放'}
            </Button>
            <Button onClick={stop} disabled={!replayerReady}>
              ⏹️ 停止
            </Button>
            {errorPoint && (
              <Button 
                onClick={jumpToError} 
                disabled={!replayerReady}
                variant="destructive"
              >
                🚨 跳转错误点
              </Button>
            )}
            <Button 
              onClick={() => console.log('调试信息:', { replayerRef: replayerRef.current, events, container: containerRef.current })} 
              variant="outline"
            >
              🐛 调试信息
            </Button>
          </div>

          {/* 进度条 */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-gray-600">
              <span>进度: {currentEventIndex} / {events.length}</span>
              <span>速度: {speed}x</span>
            </div>
            <Slider
              value={[currentEventIndex]}
              onValueChange={handleSliderChange}
              max={Math.max(0, events.length - 1)}
              step={1}
              className="w-full"
            />
          </div>

          {/* 播放速度控制 */}
          <div className="space-y-2">
            <p className="text-sm text-gray-600">播放速度:</p>
            <div className="flex gap-2">
              {[0.5, 1, 2, 4].map((s) => (
                <Button
                  key={s}
                  size="sm"
                  variant={speed === s ? "default" : "outline"}
                  onClick={() => handleSpeedChange(s)}
                  disabled={!replayerReady}
                >
                  {s}x
                </Button>
              ))}
            </div>
          </div>

          {/* 状态信息 */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium">状态:</span>
              <span className={`ml-2 ${replayerReady ? 'text-green-600' : 'text-red-600'}`}>
                {replayerReady ? '✅ 播放器就绪' : '❌ 播放器未就绪'}
              </span>
            </div>
            <div>
              <span className="font-medium">当前事件:</span>
              <span className="ml-2 text-blue-600">
                {currentEventIndex + 1} / {events.length}
              </span>
            </div>
            {currentEvent && (
              <div>
                <span className="font-medium">事件类型:</span>
                <span className="ml-2 text-purple-600">{currentEvent.type}</span>
              </div>
            )}
            {initError && (
              <div className="col-span-2">
                <span className="font-medium text-red-600">❌ 初始化错误:</span>
                <span className="ml-2 text-red-600">{initError}</span>
              </div>
            )}
            <div className="col-span-2">
              <span className="font-medium">调试信息:</span>
              <span className="ml-2 text-gray-600">
                replayerRef={replayerRef.current ? '✅' : '❌'}, 
                events={events.length}, 
                container={containerRef.current ? '✅' : '❌'}
              </span>
            </div>
            <div>
              <span className="font-medium">播放状态:</span>
              <span className={`ml-2 ${isPlaying ? 'text-green-600' : 'text-gray-600'}`}>
                {isPlaying ? '▶️ 播放中' : '⏸️ 已暂停'}
              </span>
            </div>
            <div>
              <span className="font-medium">可用方法:</span>
              <span className="ml-2 text-gray-600">{getAvailableMethods()}</span>
            </div>
            <div>
              <span className="font-medium">沙盒状态:</span>
              <span className="ml-2 text-green-600">✅ 容器已创建</span>
            </div>
            <div>
              <span className="font-medium">播放器模式:</span>
              <span className="ml-2 text-blue-600">{getPlayerStatus()}</span>
            </div>
          </div>

          {/* 错误状态显示 */}
          {initError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800 text-sm">
                ⚠️ 状态: {initError}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
