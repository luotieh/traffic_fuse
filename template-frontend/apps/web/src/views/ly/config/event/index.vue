<script lang="ts" setup>
import { computed, onMounted, reactive, watch } from 'vue';

import {
  NButton,
  NCard,
  NDataTable,
  NPagination,
  NTabPane,
  NTabs,
  NText,
} from 'naive-ui';

import { useLyStore } from '#/store/ly';
import { paginate } from '#/utils/ly';

defineOptions({ name: 'LyConfigEvent' });

const lyStore = useLyStore();
const state = reactive({ activeTab: 'black', page: 1, pageSize: 10 });
const eventRows = computed(() => (lyStore.eventRules || []).filter((item) => String(item.event_type || '') === state.activeTab));
const pagedRows = computed(() => paginate(eventRows.value, state.page, state.pageSize));
watch(eventRows, () => {
  const max = Math.max(1, Math.ceil(eventRows.value.length / state.pageSize));
  if (state.page > max) state.page = max;
});

const types = ['black', 'cap', 'dga', 'dns', 'dns_tun', 'frn_trip', 'icmp_tun', 'ip_scan', 'mo', 'port_scan', 'srv', 'ti', 'mining'];
const columns = [
  { title: 'ID', key: 'id', width: 80 },
  { title: '事件类型', key: 'event_type', width: 120 },
  { title: '规则描述', key: 'desc', minWidth: 220 },
  { title: '等级', key: 'event_level', width: 120 },
  { title: '状态', key: 'status', width: 100 },
];

onMounted(async () => {
  if (!lyStore.eventRules.length) {
    await lyStore.loadConfigs();
  }
});
</script>

<template>
  <div class="ly-page">
    <NCard size="small">
      <template #header>
        <NText>规则配置</NText>
      </template>
      <template #header-extra>
        <NButton @click="lyStore.loadConfigs()">刷新</NButton>
      </template>
      <NTabs v-model:value="state.activeTab" animated>
        <NTabPane v-for="type in types" :key="type" :name="type" :tab="type" />
      </NTabs>
      <NDataTable :columns="columns" :data="pagedRows" :bordered="false" size="small" />
      <div class="pager-wrap">
        <NPagination v-model:page="state.page" v-model:page-size="state.pageSize" :item-count="eventRows.length" show-size-picker :page-sizes="[10, 20, 50, 100]" />
      </div>
    </NCard>
  </div>
</template>

<style scoped>
.ly-page { padding: 12px; }
.pager-wrap { display: flex; justify-content: flex-end; margin-top: 12px; }
</style>
