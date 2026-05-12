<script lang="ts" setup>
import { computed, onMounted, reactive, watch } from 'vue';

import {
  NButton,
  NCard,
  NDataTable,
  NPagination,
  NSelect,
  NSpace,
  NTabPane,
  NTabs,
} from 'naive-ui';

import { useLyStore } from '#/store/ly';
import { paginate } from '#/utils/ly';

defineOptions({ name: 'LyConfigMo' });

const lyStore = useLyStore();
const state = reactive({ activeSection: 'items', activeGroup: '', page: 1, pageSize: 10, groupPage: 1, groupPageSize: 10 });

const groupRows = computed(() => lyStore.moGroup || []);
const currentGroup = computed(() => groupRows.value.find((item) => String(item.id) === String(state.activeGroup)) || null);
const moRows = computed(() => {
  if (!state.activeGroup) return [];
  return (lyStore.mo || []).filter((item) => String(item.groupid) === String(state.activeGroup) || item.mogroup === currentGroup.value?.name);
});
const pagedMoRows = computed(() => paginate(moRows.value, state.page, state.pageSize));
const pagedGroupRows = computed(() => paginate(groupRows.value, state.groupPage, state.groupPageSize));

watch(groupRows, (rows) => {
  if (!rows.length) {
    state.activeGroup = '';
    return;
  }
  const exists = rows.some((item) => String(item.id) === String(state.activeGroup));
  if (!state.activeGroup || !exists) state.activeGroup = String(rows[0]?.id ?? '');
});

const moColumns = [
  { title: 'ID', key: 'id', width: 80 },
  { title: '追踪目标IP', key: 'moip', minWidth: 150 },
  { title: '追踪目标端口', key: 'moport', width: 100 },
  { title: '对端IP', key: 'pip', minWidth: 150 },
  { title: '协议', key: 'protocol', width: 100 },
  { title: '描述', key: 'desc', minWidth: 200 },
];
const groupColumns = [
  { title: 'ID', key: 'id', width: 80 },
  { title: '分组名称', key: 'name', minWidth: 180 },
  { title: '描述', key: 'desc', minWidth: 220 },
];

onMounted(async () => {
  if (!lyStore.mo.length || !lyStore.moGroup.length || !lyStore.device.length) {
    await lyStore.loadConfigs();
  }
});
</script>

<template>
  <div class="ly-page">
    <NSpace vertical :size="12">
      <NCard size="small">
        <NTabs v-model:value="state.activeSection">
          <NTabPane name="items" tab="追踪条目" />
          <NTabPane name="groups" tab="追踪分组" />
        </NTabs>
      </NCard>

      <template v-if="state.activeSection === 'items'">
        <NCard size="small">
          <NSpace>
            <NSelect v-model:value="state.activeGroup" placeholder="请选择分组" :options="groupRows.map((group) => ({ label: group.name, value: String(group.id) }))" style="width: 280px" />
            <NButton @click="lyStore.loadConfigs()">刷新</NButton>
          </NSpace>
        </NCard>
        <NCard :title="currentGroup?.name || '追踪条目'" size="small">
          <NDataTable :columns="moColumns" :data="pagedMoRows" :bordered="false" size="small" />
          <div class="pager-wrap">
            <NPagination v-model:page="state.page" v-model:page-size="state.pageSize" :item-count="moRows.length" show-size-picker :page-sizes="[10, 20, 50, 100]" />
          </div>
        </NCard>
      </template>

      <NCard v-else title="追踪分组" size="small">
        <NDataTable :columns="groupColumns" :data="pagedGroupRows" :bordered="false" size="small" />
        <div class="pager-wrap">
          <NPagination v-model:page="state.groupPage" v-model:page-size="state.groupPageSize" :item-count="groupRows.length" show-size-picker :page-sizes="[10, 20, 50, 100]" />
        </div>
      </NCard>
    </NSpace>
  </div>
</template>

<style scoped>
.ly-page { padding: 12px; }
.pager-wrap { display: flex; justify-content: flex-end; margin-top: 12px; }
</style>
