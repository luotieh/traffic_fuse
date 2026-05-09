<script lang="ts" setup>
import { computed, nextTick, onMounted, ref, watch } from 'vue';

import { NButton, NInput, NScrollbar, NSpin, NTag } from 'naive-ui';

import { deepflowAskAI, deepflowGetChatRecords } from '#/api/ly/deepflow';
import { message } from '#/adapter/naive';
import { usePolling } from '#/composables/use-polling';
import { getMessageDisplay, normalizeDeepflowMessage } from '#/utils/deepflow';

interface ChatMessage extends Record<string, any> {
  created_at?: string;
  id?: number | string | null;
  message_content?: Record<string, any>;
  message_from?: string;
  message_id?: number | string | null;
  pending?: boolean;
  temp_id?: string | null;
}

const props = defineProps<{
  eventId: string;
}>();

const loading = ref(false);
const messageInput = ref('');
const messageRecord = ref<ChatMessage[]>([]);
const chatRef = ref<InstanceType<typeof NScrollbar> | null>(null);
const lastMessageDbId = ref(0);
const aiThinkingId = ref('');

const displayMessages = computed(() =>
  messageRecord.value.map((item) => ({
    ...item,
    display: getMessageDisplay(item),
  })),
);

async function scrollToBottom() {
  await nextTick();
  chatRef.value?.scrollTo({ top: Number.MAX_SAFE_INTEGER });
}

function getMessageKey(item: ChatMessage) {
  return String(item.temp_id || item.message_id || item.id || Math.random());
}

function upsertMessages(items: Record<string, any>[]) {
  const existed = new Map<string, ChatMessage>();
  messageRecord.value.forEach((item) => {
    existed.set(getMessageKey(item), item);
  });

  items.forEach((item) => {
    const normalized = normalizeDeepflowMessage(item, props.eventId) as ChatMessage;
    if (
      aiThinkingId.value &&
      normalized.message_category === 'engineer_chat' &&
      normalized.sender_type === 'ai'
    ) {
      existed.delete(aiThinkingId.value);
      aiThinkingId.value = '';
    }
    const key = getMessageKey(normalized);
    existed.set(key, normalized);
    const numericId = Number(normalized.id || normalized.message_id || 0);
    if (Number.isFinite(numericId)) {
      lastMessageDbId.value = Math.max(lastMessageDbId.value, numericId);
    }
  });

  messageRecord.value = Array.from(existed.values()).sort((a, b) => {
    const ta = new Date(a.created_at || 0).getTime();
    const tb = new Date(b.created_at || 0).getTime();
    return ta - tb;
  });
}

function addThinkingMessage() {
  if (aiThinkingId.value) return;
  aiThinkingId.value = `ai_thinking_${Date.now()}`;
  upsertMessages([
    {
      created_at: new Date().toISOString(),
      event_id: props.eventId,
      message_category: 'engineer_chat',
      message_content: { content: 'AI助手正在思考中...' },
      message_from: 'ai_assistant',
      message_id: aiThinkingId.value,
      pending: true,
      sender_type: 'ai',
      temp_id: aiThinkingId.value,
    },
  ]);
}

function removeTempMessage(tempId: string) {
  messageRecord.value = messageRecord.value.filter((item) => item.temp_id !== tempId);
}

async function fetchMessages() {
  if (!props.eventId) return;
  const res = await deepflowGetChatRecords(props.eventId, {
    last_message_db_id: lastMessageDbId.value || 0,
  });
  if (Array.isArray(res) && res.length > 0) {
    upsertMessages(res);
    await scrollToBottom();
  }
}

const { lastUpdated } = usePolling(fetchMessages, {
  interval: 4000,
  immediate: false,
});

async function sendMessage() {
  const text = messageInput.value.trim();
  if (!text || !props.eventId) return;
  const pureText = text.replace(/^@AI\s*|^@ai\s*/i, '').trim();
  if (!pureText || (text.startsWith('@') && !/^@ai\b/i.test(text))) return;
  loading.value = true;
  const tempId = `temp_${Date.now()}`;
  upsertMessages([
    {
      temp_id: tempId,
      message_from: 'user',
      message_content: { text: pureText },
      created_at: new Date().toISOString(),
      pending: true,
    },
  ]);
  messageInput.value = '';
  await scrollToBottom();
  addThinkingMessage();
  await scrollToBottom();

  try {
    const res = await deepflowAskAI({
      event_id: props.eventId,
      message: pureText,
    });
    if (res?.user_message) {
      removeTempMessage(tempId);
      upsertMessages([res.user_message]);
    }
    await fetchMessages();
  } catch (error) {
    message.error(error instanceof Error ? error.message : '发送消息失败');
    messageRecord.value = messageRecord.value.filter((item) => item.temp_id !== aiThinkingId.value);
    aiThinkingId.value = '';
  } finally {
    loading.value = false;
  }
}

watch(
  () => props.eventId,
  async (value) => {
    messageRecord.value = [];
    lastMessageDbId.value = 0;
    if (value) {
      await fetchMessages();
    }
  },
  { immediate: true },
);

onMounted(async () => {
  if (props.eventId) {
    await fetchMessages();
  }
});
</script>

<template>
  <div class="chat-shell">
    <div class="chat-header">
      <span>研判对话</span>
      <NTag size="small" type="info">最近刷新 {{ lastUpdated || '-' }}</NTag>
    </div>
    <NScrollbar ref="chatRef" class="chat-body">
      <div v-if="displayMessages.length" class="messages">
        <div
          v-for="item in displayMessages"
          :key="String(item.message_id || item.id || item.temp_id || '')"
          :class="['message-row', item.display.isAi ? 'is-ai' : 'is-user']"
        >
          <div class="message-meta">
            <strong>{{ item.display.from }}</strong>
            <span>{{ item.display.time }}</span>
          </div>
          <div class="message-content">{{ item.display.ctx || '暂无内容' }}</div>
        </div>
      </div>
      <div v-else class="empty-text">暂无聊天记录</div>
    </NScrollbar>
    <div class="chat-input">
      <NInput
        v-model:value="messageInput"
        type="textarea"
        placeholder="请输入问题，向 AI 发起追问"
        :autosize="{ minRows: 3, maxRows: 5 }"
        @keydown.enter.ctrl.prevent="sendMessage"
      />
      <div class="chat-actions">
        <NSpin :show="loading">
          <NButton type="primary" @click="sendMessage">发送</NButton>
        </NSpin>
      </div>
    </div>
  </div>
</template>

<style scoped>
.chat-shell {
  border: 1px solid rgba(128, 128, 128, 0.12);
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 520px;
  overflow: hidden;
}
.chat-header {
  align-items: center;
  border-bottom: 1px solid rgba(128, 128, 128, 0.12);
  display: flex;
  justify-content: space-between;
  padding: 12px 16px;
}
.chat-body {
  background: rgba(128, 128, 128, 0.03);
  flex: 1;
  padding: 16px;
}
.messages {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.message-row {
  border-radius: 10px;
  max-width: 88%;
  padding: 12px;
}
.message-row.is-ai {
  align-self: flex-start;
  background: #f5f7ff;
}
.message-row.is-user {
  align-self: flex-end;
  background: #ecfdf3;
}
.message-meta {
  display: flex;
  font-size: 12px;
  justify-content: space-between;
  margin-bottom: 6px;
  opacity: 0.75;
}
.message-content {
  line-height: 1.65;
  white-space: pre-wrap;
}
.chat-input {
  border-top: 1px solid rgba(128, 128, 128, 0.12);
  padding: 12px;
}
.chat-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 8px;
}
.empty-text {
  color: #888;
  padding: 32px 0;
  text-align: center;
}
</style>
