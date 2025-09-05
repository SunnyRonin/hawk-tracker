"use client";
import { Link } from "react-router-dom";
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { useDashboardMetrics } from "./util";

export default function DashboardPage() {
  // 通过 Hook 获取数据及状态
  const { metrics, loading, error, refreshData, lastUpdate } = useDashboardMetrics();

  // 格式化最后更新时间
  const formatLastUpdate = (date: Date) => {
    return date.toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* 主内容区 */}
      <div className="flex-1 p-8 overflow-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-3xl font-bold">Hawk-tracker</h2>
            <p className="text-sm text-gray-500 mt-1">
              最后更新: {formatLastUpdate(lastUpdate)} | 数据每30秒自动刷新
            </p>
          </div>
          <div className="flex items-center space-x-4">
            {/* 刷新按钮，用于手动更新数据 */}
            <Button
              variant="outline"
              size="sm"
              onClick={refreshData}
              disabled={loading}
              className="flex items-center space-x-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin"></div>
                  <span>加载中...</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span>刷新数据</span>
                </>
              )}
            </Button>
            
            {/* 登录/注册链接 */}
            {/* <Link to="/login">
              <button className="flex items-center space-x-2 whitespace-nowrap">
                <span>登录/注册</span>
                <img
                  src="https://unpkg.com/@mynaui/icons/icons/user.svg"
                  alt="用户头像"
                  className="w-6 h-6 rounded-full"
                />
              </button>
            </Link> */}
          </div>
        </div>

        {/* 加载状态：数据请求过程中显示 */}
        {loading && (
          <div className="flex justify-center items-center h-64">
            <div className="text-center">
              <div className="w-8 h-8 border-4 border-gray-300 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-500">数据加载中，请稍候...</p>
            </div>
          </div>
        )}

        {/* 错误状态：请求失败时显示 */}
        {error && (
          <div className="flex justify-center items-center h-64">
            <div className="text-center">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-red-500 mb-4">{error}</p>
              <Button variant="outline" onClick={refreshData}>
                重试
              </Button>
            </div>
          </div>
        )}

        {/* 数据渲染：加载完成且无错误时显示卡片 */}
        {!loading && !error && (
          <div className="space-y-6">
            {/* 数据概览卡片 */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {metrics.map((card) => (
                <Card key={card.id} className="flex flex-col justify-between hover:shadow-lg transition-shadow">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">{card.title}</CardTitle>
                    <CardDescription className="text-sm">{card.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-2xl font-bold text-gray-900">{card.value}</p>
                        <p className="text-sm text-gray-500">{card.metric}</p>
                      </div>
                      <div className="bg-blue-500 text-white p-3 rounded-full shadow-lg">
                        <span className="text-lg font-bold">{card.badge}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* 实时数据状态提示 */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm text-blue-700">
                  实时数据监控已启用 - 页面访问量(PV)和独立访客数(UV)数据来自 Hawk Tracker 监控系统
                </span>
              </div>
            </div>

            {/* 数据说明 */}
            <div className="bg-gray-50 rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4">数据说明</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                <div>
                  <h4 className="font-medium text-gray-800 mb-2">PV (页面访问量)</h4>
                  <p>统计用户访问页面的总次数，包括页面加载和路由变化事件</p>
                </div>
                <div>
                  <h4 className="font-medium text-gray-800 mb-2">UV (独立访客数)</h4>
                  <p>统计访问网站的不同用户数量，基于用户唯一标识计算</p>
                </div>
                <div>
                  <h4 className="font-medium text-gray-800 mb-2">总事件数</h4>
                  <p>所有监控事件的总数，包括错误、性能、行为等各类事件</p>
                </div>
                <div>
                  <h4 className="font-medium text-gray-800 mb-2">错误率</h4>
                  <p>错误事件占总事件的百分比，反映系统稳定性</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}