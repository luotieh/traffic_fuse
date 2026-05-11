<script lang="ts" setup>
import { h, onMounted, reactive, computed, watch } from 'vue';
import { useRouter } from 'vue-router';

import {
  NButton,
  NCard,
  NDataTable,
  NPagination,
  NSelect,
  NSpace,
  NTag,
} from 'naive-ui';

import { lyEventPushToAi } from '#/api/ly';
import { message } from '#/adapter/naive';
import { useLyStore } from '#/store/ly';
import { countByKey, paginate } from '#/utils/ly';

defineOptions({ name: 'LyEventList' });

const router = useRouter();
const lyStore = useLyStore();
const state = reactive({ page: 1, pageSize: 10, proc_status: '', is_alive: '' as '' | 'false' | 'true', aiLoadingId: '' });

const filteredRows = computed(() => {
  return (lyStore.events || []).filter((item) => {
    if (state.proc_status && item.proc_status !== state.proc_status) return false;
    if (state.is_alive) {
      const alive = String(item.is_alive) === state.is_alive;
      if (!alive) return false;
    }
    return true;
  });
});
const pagedRows = computed(() => paginate(filteredRows.value, state.page, state.pageSize));
const attackRank = computed(() => countByKey(filteredRows.value, 'attackDevice').slice(0, 8));
const victimRank = computed(() => countByKey(filteredRows.value, 'victimDevice').slice(0, 8));
const typeRank = computed(() => countByKey(filteredRows.value, 'typeText').slice(0, 8));

watch(filteredRows, () => {
  const max = Math.max(1, Math.ceil(filteredRows.value.length / state.pageSize));
  if (state.page > max) state.page = max;
});

function rankFilter(key: string, value: string) {
  if (key === 'typeText') {
    const row = (lyStore.events || []).find((item) => item.typeText === value);
    if (row) router.push({ path: '/ly/result', query: { keyword: row.type } });
    return;
  }
  router.push({ path: '/ly/result', query: { keyword: value } });
}

async function openAiDetail(row: Record<string, any>) {
  state.aiLoadingId = String(row.id);
  const payload = {
    detail_type: String(row.type || '').toUpperCase(),
    duration: row.durationText || '',
    event_level: row.levelText || '',
    event_type: row.type === 'mo' ? '追踪事件' : row.typeText || '',
    id: `#${row.id}`,
    is_active: row.aliveText || '',
    method: row.show_model || '',
    occurrence_time: row.startTimeText || '',
    processing_status: row.procStatusText || '',
    rule_desc: row.desc || '',
    threat_source: row.attackDevice || '',
    victim_target: row.victimDevice || '',
  };
  const eventId = String(row.id);
  let token = '';
  let deepflowEventId = '';
  try {
    const res = await lyEventPushToAi(payload);
    const data = res?.data && typeof res.data === 'object' ? res.data : res;
    deepflowEventId = String(data?.deepsoc_event_id || data?.event_id || '');
    token = String(data?.deepsoc_token || data?.access_token || data?.token || '');
  } catch {
    message.warning('AI分析中间层不可用，已回退到本地详情');
  } finally {
    state.aiLoadingId = '';
  }

  router.push({
    path: '/ly/event/detail',
    query: {
      ...payload,
      deepsoc_event_id: deepflowEventId || eventId,
      event_id: deepflowEventId || eventId,
      open_chat: '1',
      ...(token ? { deepsoc_token: token } : {}),
    },
  });
}

const columns = [
  { title: 'ID', key: 'id', width: 90 },
  { title: '事件类型', key: 'typeText', minWidth: 120 },
  { title: '威胁来源', key: 'attackDevice', minWidth: 160 },
  { title: '受害目标', key: 'victimDevice', minWidth: 160 },
  {
    title: '严重程度',
    key: 'levelText',
    width: 100,
    render: (row: Record<string, any>) => h(NTag, { size: 'small', type: row.levelText === '极高' ? 'error' : row.levelText === '高' ? 'warning' : 'default' }, { default: () => row.levelText }),
  },
  { title: '处理状态', key: 'procStatusText', width: 110 },
  { title: '开始时间', key: 'startTimeText', minWidth: 160 },
  {
    title: '操作',
    key: 'actions',
    width: 120,
    render: (row: Record<string, any>) => h(NButton, {
      text: true,
      type: 'success',
      loading: state.aiLoadingId === String(row.id),
      onClick: () => openAiDetail(row),
    }, { default: () => 'AI分析' }),
  },
];

onMounted(async () => {
  if (!lyStore.events.length) {
    await lyStore.loadEvents();
  }
});
</script>

<template>
  <div class="ly-page">
    <NSpace vertical :size="12">
      <NCard title="事件排行筛选" size="small">
        <div class="rank-grid">
          <div>
            <div class="rank-title">威胁来源</div>
            <NSpace>
              <NTag v-for="item in attackRank" :key="item.name" size="small" @click="rankFilter('attackDevice', item.name)">
                {{ item.name }} ({{ item.value }})
              </NTag>
            </NSpace>
          </div>
          <div>
            <div class="rank-title">受害目标</div>
            <NSpace>
              <NTag v-for="item in victimRank" :key="item.name" size="small" type="success" @click="rankFilter('victimDevice', item.name)">
                {{ item.name }} ({{ item.value }})
              </NTag>
            </NSpace>
          </div>
          <div>
            <div class="rank-title">事件类型</div>
            <NSpace>
              <NTag v-for="item in typeRank" :key="item.name" size="small" type="warning" @click="rankFilter('typeText', item.name)">
                {{ item.name }} ({{ item.value }})
              </NTag>
            </NSpace>
          </div>
        </div>
      </NCard>

      <NCard size="small">
        <NSpace>
          <NSelect v-model:value="state.proc_status" clearable placeholder="处理状态" :options="[{ label: '未处理', value: 'unprocessed' }, { label: '已处理', value: 'processed' }, { label: '已确认', value: 'assigned' }]" style="width: 160px" />
          <NSelect v-model:value="state.is_alive" clearable placeholder="活跃状态" :options="[{ label: '活跃', value: 'true' }, { label: '不活跃', value: 'false' }]" style="width: 160px" />
          <NButton type="primary" @click="lyStore.loadEvents()">刷新</NButton>
        </NSpace>
      </NCard>

      <NCard size="small">
        <NDataTable :columns="columns" :data="pagedRows" :loading="lyStore.loading" :bordered="false" size="small" />
        <div class="pager-wrap">
          <NPagination v-model:page="state.page" v-model:page-size="state.pageSize" :item-count="filteredRows.length" show-size-picker :page-sizes="[10, 20, 50, 100]" />
        </div>
      </NCard>
    </NSpace>
  </div>
</template>

<style scoped>
.ly-page { padding: 12px; }
.rank-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px; }
.rank-title { margin-bottom: 8px; font-weight: 600; }
.pager-wrap { display: flex; justify-content: flex-end; margin-top: 12px; }
</style>
