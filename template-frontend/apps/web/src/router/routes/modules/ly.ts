import type { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    name: 'Ly',
    path: '/ly',
    redirect: '/ly/overview/om',
    meta: {
      hideInMenu: true,
      title: '流量分析',
    },
  },
  {
    name: 'LyOverview',
    path: '/ly/overview',
    redirect: '/ly/overview/om',
    meta: {
      icon: 'lucide:layout-dashboard',
      order: 10,
      title: '总览',
    },
    children: [
      {
        name: 'LyOverviewOM',
        path: 'om',
        component: () => import('#/views/ly/overview/om/index.vue'),
        meta: {
          order: 10,
          title: '运维总览',
        },
      },
      {
        name: 'LyOverviewAN',
        path: 'an',
        component: () => import('#/views/ly/overview/an/index.vue'),
        meta: {
          order: 20,
          title: '分析总览',
        },
      },
      {
        name: 'LyOverviewMA',
        path: 'ma',
        component: () => import('#/views/ly/overview/ma/index.vue'),
        meta: {
          order: 30,
          title: '管理总览',
        },
      },
    ],
  },
  {
    name: 'LyEventList',
    path: '/ly/event/list',
    component: () => import('#/views/ly/event/list/index.vue'),
    meta: {
      icon: 'lucide:triangle-alert',
      order: 20,
      title: '事件列表',
    },
  },
  {
    name: 'LyEventDetail',
    path: '/ly/event/detail',
    component: () => import('#/views/ly/event/detail/index.vue'),
    meta: {
      hideInMenu: true,
      title: '事件详情',
    },
  },
  {
    name: 'LyEventDeepflowDetail',
    path: '/ly/event/deepflow-detail',
    component: () => import('#/views/ly/event/deepflow-detail/index.vue'),
    meta: {
      hideInMenu: true,
      title: 'AI事件分析',
    },
  },
  {
    name: 'LyTrack',
    path: '/ly/track',
    component: () => import('#/views/ly/track/index.vue'),
    meta: {
      icon: 'lucide:git-branch-plus',
      order: 30,
      title: '追踪',
    },
  },
  {
    name: 'LyConfig',
    path: '/ly/config',
    redirect: '/ly/config/catalogue',
    meta: {
      icon: 'lucide:settings',
      order: 40,
      title: '配置',
    },
    children: [
      {
        name: 'LyConfigCatalogue',
        path: 'catalogue',
        component: () => import('#/views/ly/config/catalogue/index.vue'),
        meta: {
          order: 10,
          title: '目录',
        },
      },
      {
        name: 'LyConfigEvent',
        path: 'event',
        component: () => import('#/views/ly/config/event/index.vue'),
        meta: {
          order: 20,
          title: '规则',
        },
      },
      {
        name: 'LyConfigBwlist',
        path: 'bwlist',
        component: () => import('#/views/ly/config/bwlist/index.vue'),
        meta: {
          order: 30,
          title: '黑白名单',
        },
      },
      {
        name: 'LyConfigAsset',
        path: 'asset',
        component: () => import('#/views/ly/config/asset/index.vue'),
        meta: {
          order: 40,
          title: '资产',
        },
      },
      {
        name: 'LyConfigMo',
        path: 'mo',
        component: () => import('#/views/ly/config/mo/index.vue'),
        meta: {
          order: 50,
          title: '追踪配置',
        },
      },
      {
        name: 'LyConfigSystem',
        path: 'system',
        component: () => import('#/views/ly/config/system/index.vue'),
        meta: {
          order: 60,
          title: '系统',
        },
      },
      {
        name: 'LySearch',
        path: '/ly/search',
        component: () => import('#/views/ly/search/index.vue'),
        meta: {
          order: 70,
          title: '搜索',
        },
      },
      {
        name: 'LyResult',
        path: '/ly/result',
        component: () => import('#/views/ly/result/index.vue'),
        meta: {
          order: 80,
          title: '搜索结果',
        },
      },
    ],
  },
];

export default routes;
