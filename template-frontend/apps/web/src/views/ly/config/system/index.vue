<script lang="ts" setup>
import { computed, onMounted, reactive, watch } from 'vue';

import { NButton, NCard, NDataTable, NPagination, NSpace } from 'naive-ui';

import { useLyStore } from '#/store/ly';
import { paginate } from '#/utils/ly';

defineOptions({ name: 'LyConfigSystem' });

const lyStore = useLyStore();
const state = reactive({ page: 1, pageSize: 10 });
const rows = computed(() => lyStore.userList || []);
const pagedRows = computed(() => paginate(rows.value, state.page, state.pageSize));

watch(rows, () => {
  const max = Math.max(1, Math.ceil(rows.value.length / state.pageSize));
  if (state.page > max) state.page = max;
});

const columns = [
  { title: 'ID', key: 'id', width: 80 },
  { title: '用户名', key: 'name', minWidth: 160 },
  { title: '注释', key: 'comm', minWidth: 180 },
  { title: '角色', key: 'level', width: 120 },
  {
    title: '是否禁用',
    key: 'disabled',
    width: 120,
    render: (row: Record<string, any>) => row.disabled === 'Y' ? 'Yes' : 'No',
  },
];

onMounted(async () => {
  if (!lyStore.userList.length) {
    await lyStore.loadConfigs();
  }
});
</script>

<template>
  <div class="ly-page">
    <NCard title="系统用户" size="small">
      <template #header-extra>
        <NSpace>
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
