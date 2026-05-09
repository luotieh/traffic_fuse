<script lang="ts" setup>
import { computed, h, onMounted, reactive, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { NButton, NCard, NDataTable, NPagination, NSpace } from 'naive-ui';

import { lyEventSearch } from '#/api/ly';
import { message } from '#/adapter/naive';
import { normalizeLyEvents, paginate } from '#/utils/ly';

defineOptions({ name: 'LyResult' });

const route = useRoute();
const router = useRouter();
const state = reactive({
  loading: false,
  rows: [] as Record<string, any>[],
  page: 1,
  pageSize: 10,
});

const pagedRows = computed(() => paginate(state.rows, state.page, state.pageSize));

watch(() => state.rows.length, () => {
  const max = Math.max(1, Math.ceil(state.rows.length / state.pageSize));
  if (state.page > max) state.page = max;
});

const columns = [
  { title: 'ID', key: 'id', width: 90 },
  { title: '事件类型', key: 'typeText', width: 120 },
  { title: '描述', key: 'desc', ellipsis: { tooltip: true } },
  { title: '等级', key: 'levelText', width: 100 },
  { title: '处理状态', key: 'procStatusText', width: 120 },
  {
    title: '操作',
    key: 'actions',
    width: 100,
    render: (row: Record<string, any>) =>
      h(
        NButton,
        {
          size: 'small',
          text: true,
          type: 'primary',
          onClick: () => router.push('/ly/event/list'),
        },
        { default: () => `查看 ${row.id}` },
      ),
  },
];

async function loadData() {
  state.loading = true;
  try {
    const query = { ...route.query } as Record<string, any>;
    if (query.starttime) query.starttime = Number(query.starttime);
    if (query.endtime) query.endtime = Number(query.endtime);
    const res = await lyEventSearch(query);
    state.rows = normalizeLyEvents(Array.isArray(res) ? res : []);
    state.page = 1;
  } catch {
    message.error('加载搜索结果失败');
  } finally {
    state.loading = false;
  }
}

onMounted(loadData);
</script>

<template>
  <div class="ly-page">
    <NCard title="搜索结果" size="small">
      <template #header-extra>
        <NSpace>
          <NButton @click="router.push('/ly/search')">返回搜索</NButton>
        </NSpace>
      </template>
      <NDataTable :columns="columns" :data="pagedRows" :loading="state.loading" :bordered="false" size="small" />
      <div class="pager-wrap">
        <NPagination v-model:page="state.page" v-model:page-size="state.pageSize" :item-count="state.rows.length" show-size-picker :page-sizes="[10, 20, 50, 100]" />
      </div>
    </NCard>
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
