<script lang="ts" setup>
import { computed, onMounted, reactive, watch } from 'vue';

import {
  NCard,
  NDataTable,
  NFlex,
  NPagination,
  NStatistic,
} from 'naive-ui';

import { useLyStore } from '#/store/ly';
import { paginate } from '#/utils/ly';

defineOptions({ name: 'LyOverviewMA' });

const lyStore = useLyStore();
const devicePager = reactive({ page: 1, pageSize: 10 });
const eventPager = reactive({ page: 1, pageSize: 10 });

const eventSummary = computed(() => {
  const map = new Map<string, number>();
  (lyStore.eventRules || []).forEach((item) => {
    const key = String(item.event_type || 'unknown');
    map.set(key, (map.get(key) || 0) + 1);
  });
  return Array.from(map.entries())
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count);
});

const deviceData = computed(() => paginate(lyStore.device || [], devicePager.page, devicePager.pageSize));
const eventData = computed(() => paginate(eventSummary.value, eventPager.page, eventPager.pageSize));

watch([() => lyStore.device.length, eventSummary], () => {
  const fit = (pager: { page: number; pageSize: number }, total: number) => {
    const max = Math.max(1, Math.ceil(total / pager.pageSize));
    if (pager.page > max) pager.page = max;
  };
  fit(devicePager, lyStore.device.length);
  fit(eventPager, eventSummary.value.length);
});

const deviceColumns = [
  { title: 'ID', key: 'id', width: 80 },
  { title: '名称', key: 'name', minWidth: 160 },
  { title: 'IP', key: 'ip', minWidth: 160 },
];

const eventColumns = [
  { title: '事件类型', key: 'type', minWidth: 180 },
  { title: '规则数量', key: 'count', width: 120 },
];

onMounted(async () => {
  if (!lyStore.device.length || !lyStore.eventRules.length) {
    await lyStore.loadConfigs();
  }
});
</script>

<template>
  <div class="ly-page">
    <NFlex vertical :size="12">
      <NFlex :size="12">
        <NCard size="small"><NStatistic label="节点" :value="lyStore.device.length" /></NCard>
        <NCard size="small"><NStatistic label="用户" :value="lyStore.userList.length" /></NCard>
        <NCard size="small"><NStatistic label="告警规则" :value="lyStore.eventRules.length" /></NCard>
        <NCard size="small"><NStatistic label="追踪目标" :value="lyStore.mo.length" /></NCard>
      </NFlex>
      <NCard title="节点信息" size="small">
        <NDataTable :columns="deviceColumns" :data="deviceData" :bordered="false" size="small" />
        <div class="pager-wrap">
          <NPagination v-model:page="devicePager.page" v-model:page-size="devicePager.pageSize" :item-count="lyStore.device.length" show-size-picker :page-sizes="[10, 20, 50]" />
        </div>
      </NCard>
      <NCard title="告警规则统计" size="small">
        <NDataTable :columns="eventColumns" :data="eventData" :bordered="false" size="small" />
        <div class="pager-wrap">
          <NPagination v-model:page="eventPager.page" v-model:page-size="eventPager.pageSize" :item-count="eventSummary.length" show-size-picker :page-sizes="[10, 20, 50]" />
        </div>
      </NCard>
    </NFlex>
  </div>
</template>

<style scoped>
.ly-page {
  padding: 12px;
}
.pager-wrap {
  display: flex;
  justify-content: flex-end;
  margin-top: 12px;
}
</style>
