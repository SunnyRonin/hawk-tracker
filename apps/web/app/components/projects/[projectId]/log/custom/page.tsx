import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@workspace/ui/components/table";
import { Badge } from "@workspace/ui/components/badge";
import { Input } from "@workspace/ui/components/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@workspace/ui/components/select";
import { useCustomEvents, customEventUtils, customEventAPI } from './utils';
import RrwebTest from './RrwebTest';

export default function CustomPage() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { events: customEvents, loading, error, refetch: fetchCustomEvents } = useCustomEvents(projectId || '');
  
  // 搜索和筛选状态
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('lastTriggerTime');
  const [filterType, setFilterType] = useState('all');
  
  // 检测是否需要刷新数据
  useEffect(() => {
    const refresh = searchParams.get('refresh');
    if (refresh === 'true') {
      // 刷新数据
      fetchCustomEvents();
      // 清除刷新参数
      setSearchParams({});
    }
  }, [searchParams, fetchCustomEvents, setSearchParams]);

  // 查看事件详情（SPA 跳转，避免整页刷新）
  const handleViewDetails = (eventId: string) => {
    navigate(`/projects/${projectId}/custom/${eventId}`);
  };

  // 创建新事件（SPA 跳转，避免整页刷新）
  const handleCreateEvent = () => {
    navigate(`/projects/${projectId}/custom/create`);
  };

  // 删除事件
  const handleDeleteEvent = async (eventId: string, eventName: string) => {
    if (window.confirm(`确定要删除事件 "${eventName}" 吗？此操作不可恢复。`)) {
      try {
        const success = await customEventAPI.deleteEvent(projectId || '', eventId);
        if (success) {
          alert('删除成功！');
          // 删除成功后刷新列表
          await fetchCustomEvents();
        } else {
          alert('删除失败，请重试');
        }
      } catch (error) {
        alert('删除失败：' + (error instanceof Error ? error.message : '未知错误'));
      }
    }
  };

  // 筛选和排序事件
  const filteredAndSortedEvents = customEvents
    .filter(event => {
      const matchesSearch = event.eventName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           event.eventIdentifier.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = filterType === 'all' || 
                         customEventUtils.getEventTypeLabel(event.eventIdentifier) === filterType;
      return matchesSearch && matchesType;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'triggerCount':
          return b.triggerCount - a.triggerCount;
        case 'affectedUsers':
          return b.affectedUsers - a.affectedUsers;
        case 'lastTriggerTime':
          return new Date(b.lastTriggerTime).getTime() - new Date(a.lastTriggerTime).getTime();
        case 'eventName':
          return a.eventName.localeCompare(b.eventName);
        default:
          return 0;
      }
    });

  return (
    <div className="p-6">
      {/* 页面标题和面包屑 */}
      <div className="mb-6">
        <nav className="text-sm text-gray-500 mb-2">
          应用首页 / 项目管理 / 自定义埋点
        </nav>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">自定义埋点</h1>
            <p className="text-gray-600 mt-2">
              监控和管理项目中的自定义事件追踪
            </p>
          </div>
          <Button onClick={handleCreateEvent} className="bg-blue-600 hover:bg-blue-700">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            创建事件
          </Button>
        </div>
      </div>

      {/* 搜索和筛选工具栏 */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <Input
                placeholder="搜索事件名称或标识符..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-md"
              />
            </div>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="事件类型" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部类型</SelectItem>
                <SelectItem value="用户行为">用户行为</SelectItem>
                <SelectItem value="转化事件">转化事件</SelectItem>
                <SelectItem value="社交分享">社交分享</SelectItem>
                <SelectItem value="搜索行为">搜索行为</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="排序方式" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="lastTriggerTime">最后触发时间</SelectItem>
                <SelectItem value="triggerCount">触发次数</SelectItem>
                <SelectItem value="affectedUsers">影响用户</SelectItem>
                <SelectItem value="eventName">事件名称</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={fetchCustomEvents}>
              刷新数据
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 统计卡片 */}
      {!loading && !error && customEvents.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">总事件数</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {customEventUtils.formatNumber(customEvents.reduce((sum: number, event: any) => sum + event.triggerCount, 0))}
              </div>
              <p className="text-xs text-gray-500 mt-1">累计触发次数</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">总用户数</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {customEventUtils.formatNumber(customEvents.reduce((sum: number, event: any) => sum + event.affectedUsers, 0))}
              </div>
              <p className="text-xs text-gray-500 mt-1">影响用户总数</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">活跃事件</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">
                {customEvents.length}
              </div>
              <p className="text-xs text-gray-500 mt-1">已配置事件数</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">平均触发次数</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                {customEventUtils.formatNumber(Math.round(customEvents.reduce((sum: number, event: any) => sum + event.triggerCount, 0) / customEvents.length))}
              </div>
              <p className="text-xs text-gray-500 mt-1">每个事件平均</p>
            </CardContent>
          </Card>
        </div>
      )}

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
            <Button variant="outline" onClick={fetchCustomEvents}>
              重试
            </Button>
          </div>
        </div>
      )}

      {/* rrweb测试组件 */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">🎥 rrweb 录制状态</CardTitle>
          <CardDescription>测试和监控 rrweb 录制功能</CardDescription>
        </CardHeader>
        <CardContent>
          <RrwebTest />
        </CardContent>
      </Card>

      {/* 数据表格 */}
      {!loading && !error && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">事件列表</CardTitle>
                <CardDescription>
                  共 {filteredAndSortedEvents.length} 个自定义事件
                  {searchTerm && ` (搜索: "${searchTerm}")`}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {filteredAndSortedEvents.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[200px]">事件名称</TableHead>
                    <TableHead className="w-[150px]">事件标识符</TableHead>
                    <TableHead className="w-[100px]">类型</TableHead>
                    <TableHead className="w-[120px] text-right">触发次数</TableHead>
                    <TableHead className="w-[120px] text-right">影响用户</TableHead>
                    <TableHead className="w-[180px]">最后触发时间</TableHead>
                    <TableHead className="w-[100px] text-center">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAndSortedEvents.map((event: any) => (
                    <TableRow key={event.id} className="hover:bg-gray-50">
                      <TableCell className="font-medium">
                        <div>
                          <div>{event.eventName}</div>
                          <div className="text-xs text-gray-500">
                            {customEventUtils.formatRelativeTime(event.lastTriggerTime)}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-sm text-gray-600">
                        {event.eventIdentifier}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {customEventUtils.getEventTypeLabel(event.eventIdentifier)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="font-semibold text-blue-600">
                          {customEventUtils.formatNumber(event.triggerCount)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="font-semibold text-green-600">
                          {customEventUtils.formatNumber(event.affectedUsers)}
                        </span>
                      </TableCell>
                      <TableCell className="text-gray-600">
                        {customEventUtils.formatTime(event.lastTriggerTime)}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewDetails(event.id)}
                            className="text-blue-600 hover:text-blue-700"
                          >
                            详情
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteEvent(event.id, event.eventName)}
                            className="text-red-600 hover:text-red-700 border-red-200 hover:border-red-300"
                          >
                            删除
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {searchTerm ? '未找到匹配的事件' : '暂无自定义事件'}
                </h3>
                <p className="text-gray-500 text-center mb-4">
                  {searchTerm ? '请尝试其他搜索关键词' : '开始创建您的第一个自定义埋点事件'}
                </p>
                {!searchTerm && (
                  <Button onClick={handleCreateEvent} variant="outline">
                    创建自定义事件
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* 空状态 */}
      {!loading && !error && customEvents.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">暂无自定义事件</h3>
            <p className="text-gray-500 text-center mb-4">
              当前项目还没有自定义埋点事件数据
            </p>
            <Button onClick={handleCreateEvent}>
              创建自定义事件
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
