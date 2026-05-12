<script lang="ts" setup>
import { useRouter } from 'vue-router';

import { NCard, NGrid, NGridItem, NThing } from 'naive-ui';

defineOptions({ name: 'LyConfigCatalogue' });

const router = useRouter();
const menuItems = [
  { name: '告警规则', path: '/ly/config/event', desc: '配置各类告警规则及阈值' },
  { name: '黑白名单', path: '/ly/config/bwlist', desc: '配置IP黑名单和白名单' },
  { name: '追踪配置', path: '/ly/config/mo', desc: '配置追踪目标及分组' },
  { name: '资产管理', path: '/ly/config/asset', desc: '配置内网资产信息' },
  { name: '系统设置', path: '/ly/config/system', desc: '管理用户及系统配置' },
];
</script>

<template>
  <div class="ly-page">
    <NGrid cols="1 s:2 m:3" responsive="screen" :x-gap="12" :y-gap="12">
      <NGridItem v-for="item in menuItems" :key="item.path">
        <NCard hoverable @click="router.push(item.path)">
          <NThing :title="item.name" :description="item.desc" />
        </NCard>
      </NGridItem>
    </NGrid>
  </div>
</template>

<style scoped>
.ly-page { padding: 16px; }
:deep(.n-card) { cursor: pointer; }
</style>
