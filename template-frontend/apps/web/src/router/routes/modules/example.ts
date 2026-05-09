import type { RouteRecordRaw } from 'vue-router';

import { BasicLayout } from '#/layouts';

/**
 * 示例业务模块路由
 *
 * 在此文件中定义你的业务路由。路由 meta 中的字段说明：
 *   - title: 菜单名称（支持 i18n key）
 *   - icon: 菜单图标（Iconify 名称）
 *   - order: 菜单排序，数值越小越靠前
 *   - hideInMenu: true 则不在菜单中显示
 *   - perms: 按钮级权限声明数组，同步到 IAM 后可做细粒度控制
 */
const routes: RouteRecordRaw[] = [
  {
    component: BasicLayout,
    meta: {
      icon: 'lucide:layout-dashboard',
      order: 1,
      title: '示例模块',
    },
    name: 'Example',
    path: '/example',
    children: [
      {
        name: 'ExampleList',
        path: 'list',
        component: () => import('#/views/example/list.vue'),
        meta: {
          icon: 'lucide:list',
          title: '列表页',
          perms: [
            { action: 'create', label: '新建' },
            { action: 'update', label: '编辑' },
            { action: 'delete', label: '删除' },
          ],
        },
      },
      {
        name: 'ExampleDetail',
        path: 'detail/:id',
        component: () => import('#/views/example/detail.vue'),
        meta: {
          hideInMenu: true,
          title: '详情页',
        },
      },
    ],
  },
];

export default routes;
