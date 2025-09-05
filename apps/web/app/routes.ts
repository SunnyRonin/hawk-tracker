import { type RouteConfig, index, route } from '@react-router/dev/routes';

export default [
  route('/', 'routes/home.tsx'),
  route('profile', 'components/profile/index.tsx'),
  route('projects', 'components/projects/project/index.tsx'),
  route(
    'projects/:projectId',
    'components/projects/[projectId]/log/layout.tsx',
    [
      route(
        'overview',
        'components/projects/[projectId]/log/overview/page.tsx',
      ),
      route(
        'errors-log',
        'components/projects/[projectId]/log/errors-log/page.tsx',
      ),
      route(
        'errors-log/:errorId',
        'components/projects/[projectId]/log/errors-log/detail/page.tsx',
      ),
      route(
        'performance',
        'components/projects/[projectId]/log/performance/page.tsx',
      ),
      route('users', 'components/projects/[projectId]/log/users/page.tsx'),
      route('custom', 'components/projects/[projectId]/log/custom/page.tsx'),
      route(
        'custom/create',
        'components/projects/[projectId]/log/custom/create/page.tsx',
      ),
      route(
        'custom/:eventId',
        'components/projects/[projectId]/log/custom/[eventId]/page.tsx',
      ),
    ],
  ),
  route(
    'projects/:projectId/settings',
    'components/projects/[projectId]/settings/page.tsx',
  ),
  route(
    'projects/:projectId/trackings',
    'components/projects/[projectId]/trackings/index.tsx',
  ),
  route('login', 'routes/login.tsx'),
  route('register', 'routes/register.tsx'),
  // 通配符路由，捕获所有未匹配的路径
  route('*', 'routes/not-found.tsx'),
] satisfies RouteConfig;
