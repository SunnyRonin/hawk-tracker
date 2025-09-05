import { useParams, Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { Badge } from "@workspace/ui/components/badge";
import { useEventDetail, customEventUtils } from '../utils';
import RrwebPlayer from '../RrwebPlayer';

export default function EventDetailPage() {
  const { projectId, eventId } = useParams();
  const { eventDetail, loading, error, refetch: fetchEventDetail } = useEventDetail(projectId || '', eventId || '');
  const [rrwebEvents, setRrwebEvents] = useState<any[]>([]);
  const [errorPoint, setErrorPoint] = useState<any>(null);
  const [showPlayer, setShowPlayer] = useState(false);

  // 获取rrweb录制数据
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // 获取全局rrweb数据
      const globalRrweb = (window as any).__hawk_rrweb;
      if (globalRrweb) {
        const events = globalRrweb.getEvents();
        const errorPoints = globalRrweb.getErrorPoints();
        
        setRrwebEvents(events);
        if (errorPoints.length > 0) {
          setErrorPoint(errorPoints[errorPoints.length - 1]); // 最新的错误点
        }
      }
    }
  }, []);

  // 显示录屏播放器
  const handleShowPlayer = () => {
    setShowPlayer(true);
  };

  return (
    <div className="p-6">
      {/* 面包屑导航 */}
      <div className="mb-6">
        <nav className="text-sm text-gray-500 mb-2">
          <Link to={`/projects/${projectId}/custom`} className="hover:text-blue-600">
            应用首页 / 项目管理 / 自定义埋点
          </Link>
          <span className="mx-2">/</span>
          <span>事件详情</span>
        </nav>
      </div>

      {/* 加载状态 */}
      {loading && (
        <div className="flex justify-center items-center h-64">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-gray-300 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-500">数据加载中，请稍候...</p>
          </div>
        </div>
      )}

      {/* 错误状态 */}
      {error && (
        <div className="flex justify-center items-center h-64">
          <div className="text-center">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-red-500 mb-4">{error}</p>
            <Button variant="outline" onClick={fetchEventDetail}>
              重试
            </Button>
          </div>
        </div>
      )}

      {/* 事件详情内容 */}
      {!loading && !error && eventDetail && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 左侧内容 */}
          <div className="lg:col-span-2 space-y-6">
            {/* 事件基本信息 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">事件基本信息</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-600">事件ID:</label>
                    <p className="text-sm text-gray-900 mt-1">{eventDetail.id}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">事件名称:</label>
                    <p className="text-sm text-gray-900 mt-1">{eventDetail.eventName}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">事件标识符:</label>
                    <p className="text-sm text-gray-900 mt-1 font-mono">{eventDetail.eventIdentifier}</p>
                  </div>
                                     <div>
                     <label className="text-sm font-medium text-gray-600">触发次数:</label>
                     <p className="text-sm text-gray-900 mt-1 font-semibold text-blue-600">
                       {customEventUtils.formatNumber(eventDetail.triggerCount)}
                     </p>
                   </div>
                   <div>
                     <label className="text-sm font-medium text-gray-600">影响用户:</label>
                     <p className="text-sm text-gray-900 mt-1 font-semibold text-green-600">
                       {customEventUtils.formatNumber(eventDetail.affectedUsers)}
                     </p>
                   </div>
                   <div>
                     <label className="text-sm font-medium text-gray-600">最后触发时间:</label>
                     <p className="text-sm text-gray-900 mt-1">{customEventUtils.formatTime(eventDetail.lastTriggerTime)}</p>
                   </div>
                </div>
              </CardContent>
            </Card>

            {/* 事件数据 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">事件数据</CardTitle>
                <CardDescription>事件的详细数据信息</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="bg-gray-50 rounded-lg p-4">
                  <pre className="text-sm text-gray-800 overflow-x-auto">
                    <code>{JSON.stringify(eventDetail.eventData, null, 2)}</code>
                  </pre>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 右侧内容 */}
          <div className="space-y-6">
            {/* 用户操作录屏 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">用户操作录屏</CardTitle>
                <CardDescription>rrweb 录屏回放功能</CardDescription>
              </CardHeader>
              <CardContent className="text-center">
                {!showPlayer ? (
                  <>
                    <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <p className="text-sm text-gray-600 mb-4">
                      {rrwebEvents.length > 0 
                        ? `已录制 ${rrwebEvents.length} 个操作事件` 
                        : '暂无录制数据'
                      }
                    </p>
                    <Button 
                      onClick={handleShowPlayer}
                      disabled={rrwebEvents.length === 0}
                      className="w-full"
                    >
                      查看录屏回放
                    </Button>
                  </>
                ) : (
                  <div className="space-y-4">
                    <RrwebPlayer 
                      events={rrwebEvents}
                      errorPoint={errorPoint}
                      onErrorPointReached={() => console.log('到达错误点')}
                    />
                    <Button 
                      onClick={() => setShowPlayer(false)}
                      variant="outline"
                      className="w-full"
                    >
                      隐藏播放器
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 快速操作 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">快速操作</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button variant="outline" className="w-full justify-start">
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  查看趋势图
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  导出数据
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  设置告警
                </Button>
              </CardContent>
            </Card>

            {/* 事件标签 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">事件标签</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">用户行为</Badge>
                  <Badge variant="secondary">转化事件</Badge>
                  <Badge variant="secondary">关键指标</Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
