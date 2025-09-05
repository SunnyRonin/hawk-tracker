import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@workspace/ui/components/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@workspace/ui/components/card';
import { Input } from '@workspace/ui/components/input';
import { Label } from '@workspace/ui/components/label';
import { Textarea } from '@workspace/ui/components/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@workspace/ui/components/select';
import { customEventAPI } from '../utils';

interface CreateEventForm {
  name: string;
  description: string;
  type: 'click' | 'pageview' | 'custom' | 'form_submit' | 'button_click' | 'link_click' | 'scroll' | 'hover' | 'focus' | 'blur' | 'input_change' | 'file_upload' | 'video_play' | 'video_pause' | 'search' | 'filter' | 'sort' | 'pagination' | 'download' | 'share' | 'like' | 'comment' | 'purchase' | 'add_to_cart' | 'remove_from_cart' | 'checkout' | 'registration' | 'login' | 'logout' | 'profile_update' | 'notification' | 'error' | 'performance' | 'api_call';
  identifier: string;
  properties: string;
}

export default function CreateCustomEventPage() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  
  // 获取URL参数中的刷新回调标识
  const urlParams = new URLSearchParams(window.location.search);
  const shouldRefresh = urlParams.get('refresh') === 'true';
  const [formData, setFormData] = useState<CreateEventForm>({
    name: '',
    description: '',
    type: 'button_click',
    identifier: '',
    properties: ''
  });

  const [errors, setErrors] = useState<Partial<CreateEventForm>>({});

  const validateForm = (): boolean => {
    const newErrors: Partial<CreateEventForm> = {};

    if (!formData.name.trim()) {
      newErrors.name = '事件名称不能为空';
    }

    if (!formData.identifier.trim()) {
      newErrors.identifier = '事件标识符不能为空';
    } else if (!/^[a-z_][a-z0-9_]*$/.test(formData.identifier)) {
      newErrors.identifier = '标识符只能包含小写字母、数字和下划线，且不能以数字开头';
    }

    if (!formData.description.trim()) {
      newErrors.description = '事件描述不能为空';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      // 解析属性JSON
      let parsedProperties = {};
      if (formData.properties.trim()) {
        try {
          parsedProperties = JSON.parse(formData.properties);
        } catch (error) {
          setErrors({ properties: '属性必须是有效的JSON格式' });
          setLoading(false);
          return;
        }
      }

      const eventData = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        type: formData.type,
        identifier: formData.identifier.trim(),
        properties: parsedProperties
      };

      // 检查 projectId 是否存在
      if (!projectId) {
        throw new Error('项目ID不存在');
      }

      // 调用API创建事件
      await customEventAPI.createCustomEvent(projectId, eventData);
      
      // 创建成功后跳转回列表页，并添加刷新参数
      navigate(`/projects/${projectId}/custom?refresh=true`);
    } catch (error) {
      console.error('创建事件失败:', error);
      alert(`创建事件失败: ${error instanceof Error ? error.message : '未知错误'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof CreateEventForm, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // 清除对应字段的错误
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  return (
    <div className="p-6">
      {/* 页面标题和面包屑 */}
      <div className="mb-6">
        <nav className="text-sm text-gray-500 mb-2">
          应用首页 / 项目管理 / 自定义埋点 / 创建事件
        </nav>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">创建自定义事件</h1>
            <p className="text-gray-600 mt-2">
              创建新的自定义埋点事件，用于追踪用户行为
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => navigate(`/projects/${projectId}/custom`)}
          >
            返回列表
          </Button>
        </div>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>事件信息</CardTitle>
          <CardDescription>
            填写事件的基本信息，创建后将用于数据收集和分析
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 事件名称 */}
            <div className="space-y-2">
              <Label htmlFor="name">事件名称 *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="例如：用户注册、商品购买"
                className={errors.name ? 'border-red-500' : ''}
              />
              {errors.name && (
                <p className="text-sm text-red-500">{errors.name}</p>
              )}
            </div>

            {/* 事件标识符 */}
            <div className="space-y-2">
              <Label htmlFor="identifier">事件标识符 *</Label>
              <Input
                id="identifier"
                value={formData.identifier}
                onChange={(e) => handleInputChange('identifier', e.target.value)}
                placeholder="例如：user_register、product_purchase"
                className={errors.identifier ? 'border-red-500' : ''}
              />
              {errors.identifier && (
                <p className="text-sm text-red-500">{errors.identifier}</p>
              )}
              <p className="text-xs text-gray-500">
                只能包含小写字母、数字和下划线，且不能以数字开头
              </p>
            </div>

            {/* 事件类型 */}
            <div className="space-y-2">
              <Label htmlFor="type">事件类型</Label>
              <Select
                value={formData.type}
                onValueChange={(value: 'click' | 'pageview' | 'custom') => 
                  handleInputChange('type', value)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择事件类型" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="button_click">按钮点击</SelectItem>
                  <SelectItem value="link_click">链接点击</SelectItem>
                  <SelectItem value="form_submit">表单提交</SelectItem>
                  <SelectItem value="input_change">输入变化</SelectItem>
                  <SelectItem value="scroll">页面滚动</SelectItem>
                  <SelectItem value="hover">鼠标悬停</SelectItem>
                  <SelectItem value="focus">获得焦点</SelectItem>
                  <SelectItem value="blur">失去焦点</SelectItem>
                  <SelectItem value="file_upload">文件上传</SelectItem>
                  <SelectItem value="video_play">视频播放</SelectItem>
                  <SelectItem value="video_pause">视频暂停</SelectItem>
                  <SelectItem value="search">搜索操作</SelectItem>
                  <SelectItem value="filter">筛选操作</SelectItem>
                  <SelectItem value="sort">排序操作</SelectItem>
                  <SelectItem value="pagination">分页操作</SelectItem>
                  <SelectItem value="download">文件下载</SelectItem>
                  <SelectItem value="share">内容分享</SelectItem>
                  <SelectItem value="like">点赞操作</SelectItem>
                  <SelectItem value="comment">评论操作</SelectItem>
                  <SelectItem value="purchase">购买操作</SelectItem>
                  <SelectItem value="add_to_cart">加入购物车</SelectItem>
                  <SelectItem value="remove_from_cart">移出购物车</SelectItem>
                  <SelectItem value="checkout">结账操作</SelectItem>
                  <SelectItem value="registration">用户注册</SelectItem>
                  <SelectItem value="login">用户登录</SelectItem>
                  <SelectItem value="logout">用户登出</SelectItem>
                  <SelectItem value="profile_update">资料更新</SelectItem>
                  <SelectItem value="notification">通知操作</SelectItem>
                  <SelectItem value="error">错误事件</SelectItem>
                  <SelectItem value="performance">性能事件</SelectItem>
                  <SelectItem value="api_call">API调用</SelectItem>
                  <SelectItem value="pageview">页面浏览</SelectItem>
                  <SelectItem value="click">通用点击</SelectItem>
                  <SelectItem value="custom">自定义事件</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 事件描述 */}
            <div className="space-y-2">
              <Label htmlFor="description">事件描述 *</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="详细描述这个事件的用途和触发条件"
                rows={3}
                className={errors.description ? 'border-red-500' : ''}
              />
              {errors.description && (
                <p className="text-sm text-red-500">{errors.description}</p>
              )}
            </div>

            {/* 自定义属性 */}
            <div className="space-y-2">
              <Label htmlFor="properties">自定义属性 (JSON格式)</Label>
              <Textarea
                id="properties"
                value={formData.properties}
                onChange={(e) => handleInputChange('properties', e.target.value)}
                placeholder='{"category": "user", "priority": "high"}'
                rows={4}
                className={errors.properties ? 'border-red-500' : ''}
              />
              {errors.properties && (
                <p className="text-sm text-red-500">{errors.properties}</p>
              )}
              <p className="text-xs text-gray-500">
                可选，用于存储事件的额外信息，必须是有效的JSON格式
              </p>
            </div>

            {/* 提交按钮 */}
            <div className="flex gap-4 pt-4">
              <Button
                type="submit"
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {loading ? '创建中...' : '创建事件'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate(`/projects/${projectId}/custom`)}
                disabled={loading}
              >
                取消
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
