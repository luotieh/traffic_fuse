<script lang="ts" setup>
import { computed, nextTick, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import {
  NButton,
  NCard,
  NDescriptions,
  NDescriptionsItem,
  NFlex,
  NGrid,
  NGridItem,
  NSpace,
  NStatistic,
  NTag,
} from 'naive-ui';

import {
  deepflowGetEventDetail,
  deepflowGetEventStats,
  deepflowGetEventSummary,
  deepflowGetEvents,
  deepflowSwitchDrivingMode,
} from '#/api/ly/deepflow';
import { message } from '#/adapter/naive';
import { useDeepflowStore } from '#/store';
import {
  formatDeepflowDate,
  mapSeverityToDisplay,
  mapSeverityToTagType,
} from '#/utils/deepflow';

import ChatBox from './components/ChatBox.vue';
import CountProgress from './components/CountProgress.vue';
import DetailsDialog from './components/DetailsDialog.vue';
import ListDrawer from './components/ListDrawer.vue';

defineOptions({ name: 'LyEventDetail' });

const route = useRoute();
const router = useRouter();
const deepflowStore = useDeepflowStore();

const eventId = ref('');
const isAiFlag = ref(true);
const dialogVisible = ref(false);
const drawerVisible = ref(false);
const activeTab = ref<'context' | 'original' | 'summary'>('original');
const wsConnectionStatus = ref('轮询中');
const detail = ref<Record<string, any>>({});
const eventCount = ref({ action_count: 0, command_count: 0, task_count: 0 });
const dialogData = ref({ contentInfo: '', rawInfo: '', sumInfo: '' });
const tableData = ref<Record<string, any>[]>([]);

const tabs = [
  { id: 'original', label: '原始信息' },
  { id: 'context', label: '上下文信息' },
  { id: 'summary', label: '事件总结' },
] as const;

const severityText = computed(() => mapSeverityToDisplay(detail.value?.severity));
const createdAtText = computed(() =>
  formatDeepflowDate(detail.value?.created_at) || String(route.query.occurrence_time || '-'),
);

async function getDetails() {
  if (!eventId.value) return;
  const [detailRes, statsRes] = await Promise.all([
    deepflowGetEventDetail(eventId.value),
    deepflowGetEventStats(eventId.value),
  ]);
  detail.value = detailRes || {};
  eventCount.value = {
    action_count: Number(statsRes?.action_count || 0),
    command_count: Number(statsRes?.command_count || 0),
    task_count: Number(statsRes?.task_count || 0),
  };
}

async function getTable() {
  const res = await deepflowGetEvents();
  tableData.value = Array.isArray(res) ? res : [];
}

async function loadSummary() {
  if (!eventId.value) return;
  const res = await deepflowGetEventSummary(eventId.value);
  dialogData.value = {
    rawInfo: String(detail.value?.message || route.query.rule_desc || ''),
    contentInfo:
      String(detail.value?.context || '') ||
      `威胁来源：${String(route.query.threat_source || '-')}` +
        `\n受害目标：${String(route.query.victim_target || '-')}`,
    sumInfo: Array.isArray(res) ? res.join('\n') : String(res || ''),
  };
}

async function openDetailModal() {
  try {
    await loadSummary();
    dialogVisible.value = true;
  } catch (error) {
    message.error(error instanceof Error ? error.message : '获取事件总结失败');
  }
}

async function applyRouteState() {
  const nextEventId = String(
    route.query.deepsoc_event_id || route.query.event_id || route.query.id || '',
  ).replace(/^#/, '');
  eventId.value = nextEventId;
  drawerVisible.value = !nextEventId;
  await getTable();
  if (nextEventId) {
    await getDetails();
  }
}

async function toggleMode() {
  const next = !isAiFlag.value;
  isAiFlag.value = next;
  try {
    await deepflowSwitchDrivingMode({ mode: next ? 'auto' : 'manual' });
  } catch (error) {
    isAiFlag.value = !next;
    message.error(error instanceof Error ? error.message : '切换驾驶模式失败');
  }
}

function openDrawer() {
  drawerVisible.value = true;
}

function handleDrawerEventClick(event: Record<string, any>) {
  const next = String(event?.event_id || event?.id || '');
  if (!next) return;
  router.push({
    path: '/ly/event/detail',
    query: {
      ...route.query,
      deepsoc_event_id: next,
      event_id: next,
    },
  });
  drawerVisible.value = false;
}

onMounted(async () => {
  try {
    const queryToken = route.query.deepsoc_token;
    if (queryToken) {
      deepflowStore.useToken(String(queryToken));
    } else {
      await deepflowStore.ensureToken();
    }
    await applyRouteState();
    if (route.query.open_chat === '1') {
      await nextTick();
      document.querySelector('.chat-box')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  } catch (error) {
    message.error(error instanceof Error ? error.message : 'DeepFlow 初始化失败');
  }
});

watch(
  () => route.query,
  async () => {
    await applyRouteState();
  },
);
</script>

<template>
  <div class="ly-detail-page">
    <NCard size="small">
      <template #header>
        <div class="title-row">
          <span>AI安全事件研判</span>
          <NSpace>
            <NTag size="small" type="info">{{ wsConnectionStatus }}</NTag>
            <NTag size="small" type="warning">处理中</NTag>
          </NSpace>
        </div>
      </template>
      <template #header-extra>
        <NSpace>
          <NButton @click="openDrawer">事件列表</NButton>
          <NButton @click="openDetailModal">详情</NButton>
          <NButton @click="router.push('/ly/event/list')">退出</NButton>
        </NSpace>
      </template>

      <div class="layout-grid">
        <div class="left-panel">
          <NCard size="small" title="事件概览">
            <NDescriptions bordered label-placement="left" :column="1">
              <NDescriptionsItem label="事件名称">{{ detail.event_name || 'AI助手' }}</NDescriptionsItem>
              <NDescriptionsItem label="ID">{{ detail.id || eventId || '-' }}</NDescriptionsItem>
              <NDescriptionsItem label="轮次">{{ detail.current_round || 1 }}</NDescriptionsItem>
              <NDescriptionsItem label="来源">{{ detail.source || '-' }}</NDescriptionsItem>
              <NDescriptionsItem label="严重程度">
                <NTag :type="mapSeverityToTagType(detail.severity)">{{ severityText }}</NTag>
              </NDescriptionsItem>
              <NDescriptionsItem label="创建时间">{{ createdAtText }}</NDescriptionsItem>
            </NDescriptions>
          </NCard>
          <div class="chat-box"><ChatBox :event-id="eventId" /></div>
        </div>

        <div class="right-panel">
          <NCard size="small" title="事件状态">
            <NGrid :cols="1" :y-gap="12">
              <NGridItem>
                <div class="status-card status-green">
                  <div>
                    <div class="status-label">当前轮次</div>
                    <div class="status-value">{{ detail.current_round || 1 }}</div>
                  </div>
                  <CountProgress :dot-count="Number(detail.current_round || 1)" />
                </div>
              </NGridItem>
              <NGridItem>
                <div class="status-card status-orange">
                  <NStatistic label="任务数" :value="eventCount.task_count" />
                  <CountProgress :dot-count="eventCount.task_count" start-color="#f2e2c0" end-color="#ff9900" />
                </div>
              </NGridItem>
              <NGridItem>
                <div class="status-card status-pink">
                  <NStatistic label="动作数" :value="eventCount.action_count" />
                  <CountProgress :dot-count="eventCount.action_count" start-color="#edd0e3" end-color="#f86886" />
                </div>
              </NGridItem>
              <NGridItem>
                <div class="status-card status-blue">
                  <NStatistic label="指令数" :value="eventCount.command_count" />
                  <CountProgress :dot-count="eventCount.command_count" start-color="#c5d7f7" end-color="#467cf9" />
                </div>
              </NGridItem>
            </NGrid>
          </NCard>

          <NCard size="small" title="驾驶模式">
            <NFlex justify="space-between" align="center">
              <span>{{ isAiFlag ? 'AI智能' : '人工操控' }}</span>
              <NButton type="primary" secondary @click="toggleMode">
                切换为{{ isAiFlag ? '人工操控' : 'AI智能' }}
              </NButton>
            </NFlex>
          </NCard>
        </div>
      </div>
    </NCard>

    <DetailsDialog v-model:visible="dialogVisible" title="事件详情" :show-footer="false">
      <div class="dialog-content">
        <div class="tab-header">
          <div
            v-for="tab in tabs"
            :key="tab.id"
            :class="['tab-item', { active: activeTab === tab.id }]"
            @click="activeTab = tab.id"
          >
            {{ tab.label }}
          </div>
        </div>
        <div class="tab-panel">
          <pre v-if="activeTab === 'original'">{{ dialogData.rawInfo || '暂无数据' }}</pre>
          <pre v-else-if="activeTab === 'context'">{{ dialogData.contentInfo || '暂无数据' }}</pre>
          <pre v-else>{{ dialogData.sumInfo || '暂无数据' }}</pre>
        </div>
      </div>
    </DetailsDialog>

    <ListDrawer
      v-model:visible="drawerVisible"
      :table-data="tableData"
      title="事件列表"
      @event-click="handleDrawerEventClick"
    />
  </div>
</template>

<style scoped>
.ly-detail-page {
  padding: 12px;
}
.title-row {
  align-items: center;
  display: flex;
  gap: 12px;
}
.layout-grid {
  display: grid;
  gap: 16px;
  grid-template-columns: minmax(0, 2fr) minmax(320px, 1fr);
}
.left-panel,
.right-panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.chat-box {
  min-height: 560px;
}
.status-card {
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 14px;
}
.status-green { background: rgba(30, 154, 126, 0.08); }
.status-orange { background: rgba(255, 153, 0, 0.08); }
.status-pink { background: rgba(248, 104, 134, 0.08); }
.status-blue { background: rgba(70, 124, 249, 0.08); }
.status-label {
  color: #666;
  font-size: 13px;
}
.status-value {
  font-size: 24px;
  font-weight: 700;
}
.dialog-content {
  min-height: 320px;
}
.tab-header {
  border-bottom: 1px solid rgba(128, 128, 128, 0.18);
  display: flex;
  gap: 12px;
  margin-bottom: 12px;
}
.tab-item {
  cursor: pointer;
  padding: 8px 4px;
}
.tab-item.active {
  border-bottom: 2px solid var(--n-color-primary);
  color: var(--n-color-primary);
}
.tab-panel pre {
  margin: 0;
  white-space: pre-wrap;
}
</style>
