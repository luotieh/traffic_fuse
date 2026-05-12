<script lang="ts" setup>
import { computed, onMounted, reactive, watch } from 'vue';

import {
  NAlert,
  NButton,
  NCard,
  NDataTable,
  NFlex,
  NInput,
  NPagination,
  NStatistic,
} from 'naive-ui';

import { useLyStore } from '#/store/ly';
import { paginate } from '#/utils/ly';

defineOptions({ name: 'LyTrack' });

const lyStore = useLyStore();
const state = reactive({ page: 1, pageSize: 10, ip: '', port: '' });

const statisticalData = computed(() => {
  const mo = lyStore.mo || [];
  const feature = lyStore.moFeature || [];
  return [
    { name: '追踪分组', value: lyStore.moGroup.length },
    { name: '追踪条目', value: mo.length },
    { name: '存在流量*', value: feature.length },
    { name: '无流量*', value: Math.max(0, mo.length - feature.length) },
    { name: '已配置告警', value: lyStore.eventRules.filter((item) => item.event_type === 'mo').length },
  ];
});

const rows = computed(() => {
  return (lyStore.mo || []).filter((item) => {
    const ipKey = `${item.moip || ''} ${item.pip || ''}`;
    const portKey = `${item.moport || ''} ${item.pport || ''}`;
    if (state.ip && !ipKey.includes(state.ip)) return false;
    if (state.port && !portKey.includes(state.port)) return false;
    return true;
  });
});
const pagedRows = computed(() => paginate(rows.value, state.page, state.pageSize));

watch(rows, () => {
  const max = Math.max(1, Math.ceil(rows.value.length / state.pageSize));
  if (state.page > max) state.page = max;
});

const columns = [
  { title: 'ID', key: 'id', width: 70 },
  { title: '追踪目标IP', key: 'moip', width: 140 },
  { title: '追踪目标端口', key: 'moport', width: 110 },
  { title: '对端IP', key: 'pip', width: 140 },
  { title: '对端端口', key: 'pport', width: 100 },
  { title: '协议', key: 'protocol', width: 80 },
  { title: '方向', key: 'direction', width: 80 },
  { title: '描述', key: 'desc', minWidth: 180 },
];

onMounted(async () => {
  if (!lyStore.mo.length || !lyStore.moGroup.length || !lyStore.eventRules.length) {
    await lyStore.loadConfigs();
  }
  await lyStore.loadTrackFeatures();
});
</script>

<template>
  <div class="ly-page">
    <NFlex vertical :size="12">
      <NAlert type="info" :show-icon="false">注释：带*号的是在选择时间范围内的统计数据。</NAlert>
      <NFlex :size="12">
        <NCard v-for="item in statisticalData" :key="item.name" size="small">
          <NStatistic :label="item.name" :value="item.value" />
        </NCard>
      </NFlex>
      <NCard size="small">
        <NFlex>
          <NInput v-model:value="state.ip" placeholder="追踪IP" clearable style="width: 220px" />
          <NInput v-model:value="state.port" placeholder="追踪端口" clearable style="width: 180px" />
          <NButton @click="lyStore.loadTrackFeatures()">刷新流量</NButton>
        </NFlex>
      </NCard>
      <NCard size="small">
        <NDataTable :columns="columns" :data="pagedRows" :bordered="false" size="small" />
        <div class="pager-wrap">
          <NPagination v-model:page="state.page" v-model:page-size="state.pageSize" :item-count="rows.length" show-size-picker :page-sizes="[10, 20, 50, 100]" />
        </div>
      </NCard>
    </NFlex>
  </div>
</template>

<style scoped>
.ly-page { padding: 12px; }
.pager-wrap { display: flex; justify-content: flex-end; margin-top: 12px; }
</style>
