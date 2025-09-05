import React, { useState, useEffect } from 'react';
import { Button } from '@workspace/ui/components/button';
import { Card, CardContent, CardHeader, CardTitle } from '@workspace/ui/components/card';

export default function RrwebTest() {
  const [rrwebStatus, setRrwebStatus] = useState<string>('检查中...');
  const [eventsCount, setEventsCount] = useState<number>(0);
  const [errorPoints, setErrorPoints] = useState<any[]>([]);

  useEffect(() => {
    checkRrwebStatus();
  }, []);

  const checkRrwebStatus = () => {
    if (typeof window !== 'undefined') {
      const globalRrweb = (window as any).__hawk_rrweb;
      if (globalRrweb) {
        setRrwebStatus('✅ rrweb插件已启用');
        const events = globalRrweb.getEvents();
        const points = globalRrweb.getErrorPoints();
        setEventsCount(events.length);
        setErrorPoints(points);
      } else {
        setRrwebStatus('❌ rrweb插件未启用');
      }
    }
  };

  const markTestError = () => {
    if (typeof window !== 'undefined') {
      const globalRrweb = (window as any).__hawk_rrweb;
      if (globalRrweb) {
        globalRrweb.markErrorPoint('test_error', new Error('测试错误'));
        checkRrwebStatus();
      }
    }
  };

  const clearEvents = () => {
    if (typeof window !== 'undefined') {
      const globalRrweb = (window as any).__hawk_rrweb;
      if (globalRrweb && globalRrweb.stop) {
        globalRrweb.stop();
        setEventsCount(0);
        setErrorPoints([]);
      }
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>rrweb 录制测试</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <p><strong>状态:</strong> {rrwebStatus}</p>
          <p><strong>录制事件数:</strong> {eventsCount}</p>
          <p><strong>错误点数量:</strong> {errorPoints.length}</p>
        </div>

        <div className="flex gap-2">
          <Button onClick={checkRrwebStatus} variant="outline" size="sm">
            刷新状态
          </Button>
          <Button onClick={markTestError} variant="outline" size="sm">
            标记测试错误
          </Button>
          <Button onClick={clearEvents} variant="outline" size="sm">
            清除录制
          </Button>
        </div>

        {errorPoints.length > 0 && (
          <div className="mt-4">
            <h4 className="font-medium mb-2">错误点列表:</h4>
            <div className="space-y-2">
              {errorPoints.map((point, index) => (
                <div key={index} className="text-sm bg-red-50 p-2 rounded">
                  <p><strong>类型:</strong> {point.type}</p>
                  <p><strong>时间:</strong> {new Date(point.timestamp).toLocaleString()}</p>
                  <p><strong>事件索引:</strong> {point.eventIndex}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-4 p-4 bg-blue-50 rounded-lg">
          <h4 className="font-medium text-blue-900 mb-2">测试说明:</h4>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• 在页面上进行一些操作（点击、滚动、输入等）</li>
            <li>• 点击"标记测试错误"来测试错误点标记</li>
            <li>• 查看录制事件数量是否增加</li>
            <li>• 在事件详情页面查看录屏回放</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}

