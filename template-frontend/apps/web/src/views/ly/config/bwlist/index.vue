<script lang="ts" setup>
import { computed, onMounted, reactive, watch } from 'vue';
import { useRouter } from 'vue-router';

import {
  NButton,
  NCard,
  NDataTable,
  NPagination,
  NSpace,
  NTabPane,
  NTabs,
} from 'naive-ui';

import { useLyStore } from '#/store/ly';
import { paginate } from '#/utils/ly';

defineOptions({ name: 'LyConfigBwlist' });

const router = useRouter();
const lyStore = useLyStore();
const state = reactive({ activeTab: 'white', page: 1, pageSize: 10 });

const rows = computed(() => state.activeTab === 'white' ? lyStore.white : lyStore.black);
const pagedRows = computed(() => paginate(rows.value || [], state.page, state.pageSize));
watch(rows, () => {
  const max = Math.max(1, Math.ceil(rows.value.length / state.pageSize));
  if (state.page > max) state.page = max;
});

const columns = [
  { title: 'ID', key: 'id', width: 90 },
  { title: '描述', key: 'desc', minWidth: 220 },
  { title: 'IP', key: 'ip', minWidth: 150 },
  { title: '端口', key: 'port', width: 100 },
];

onMounted(async () => {
  if (!lyStore.white.length && !lyStore.black.length) {
    await lyStore.loadConfigs();
  }
});
</script>

<template>
  <div class="ly-page">
    <NCard size="small">
      <NTabs v-model:value="state.activeTab">
        <NTabPane name="white" tab="白名单" />
        <NTabPane name="black" tab="黑名单" />
      </NTabs>
      <template #header-extra>
        <NSpace>
          <NButton v-if="state.activeTab === 'black'" text type="primary" @click="router.push('/ly/config/event')">
            前往黑名单规则
          </NButton>
          <NButton @click="lyStore.loadConfigs()">刷新</NButton>
        </NSpace>
      </template>
      <NDataTable :columns="columns" :data="pagedRows" :bordered="false" size="small" />
      <div class="pager-wrap">
        <NPagination v-model:page="state.page" v-model:page-size="state.pageSize" :item-count="rows.length" show-size-picker :page-sizes="[10, 20, 50, 100]" />
      </div>
    </NCard>
  </div>
</template>

<style scoped>
.ly-page { padding: 12px; }
.pager-wrap { display: flex; justify-content: flex-end; margin-top: 12px; }
</style>
