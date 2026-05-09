import type { RouteRecordRaw } from 'vue-router';

import { BasicLayout } from '#/layouts';

const routes: RouteRecordRaw[] = [
  {
    component: BasicLayout,
    meta: { icon: 'lucide:settings', order: 99, title: '系统管理' },
    name: 'System',
    path: '/system',
    redirect: '/system/init',
    children: [
      {
        name: 'SystemInit',
        path: 'init',
        component: () => import('#/views/system/init.vue'),
        meta: {
          title: '系统初始化',
          icon: 'lucide:database',
        },
      },
    ],
  },
];

export default routes;
