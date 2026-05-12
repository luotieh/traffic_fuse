<script lang="ts" setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue';

import { marked } from 'marked';
import { NButton, NInput, NScrollbar, NSpin } from 'naive-ui';

import { deepflowAskAI, deepflowGetChatRecords } from '#/api/ly/deepflow';
import { message } from '#/adapter/naive';
import { getMessageDisplay, normalizeDeepflowMessage } from '#/utils/deepflow';
import deepflowSocket from '#/utils/deepflow-socket';

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
  eventContext?: Record<string, any>;
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
    isUser: isUserMessage(item),
  })),
);

const timelineMessages = computed(() =>
  displayMessages.value.map((item) => ({
    content: item.display.ctx || '暂无内容',
    from: item.display.from,
    isUser: item.isUser,
    time: formatMessageTime(item.display.time),
  })),
);

function formatMessageTime(value?: string) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.replace('T', ' ').replace(/\.\d+Z?$/, '');

  const pad = (num: number) => String(num).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(
    date.getHours(),
  )}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}


function isUserMessage(item: ChatMessage) {
  const from = String(item?.message_from || item?.from || '');
  const senderType = String(item?.sender_type || '').toLowerCase();
  const category = String(item?.message_category || '');

  if (category === 'engineer_chat') {
    return senderType !== 'ai';
  }

  return from === 'user' || from.includes('-');
}

async function scrollToBottom() {
  await nextTick();
  chatRef.value?.scrollTo({ top: Number.MAX_SAFE_INTEGER });
}

function getMessageKey(item: ChatMessage) {
  return String(
    item.temp_id ||
      item.message_id ||
      item.id ||
      `${item.message_from || 'msg'}-${item.created_at || ''}`,
  );
}

function getMessageText(item: ChatMessage) {
  const content = item?.message_content || {};
  return String(
    content?.text ||
      content?.content ||
      content?.response_text ||
      content?.data?.text ||
      content?.data?.response_text ||
      item?.message ||
      '',
  ).trim();
}

function isAiResultMessage(item: ChatMessage) {
  const from = String(item?.message_from || item?.from || '');
  const senderType = String(item?.sender_type || '').toLowerCase();

  return senderType === 'ai' || from === 'ai_assistant';
}

function removeThinkingMessage(existed: Map<string, ChatMessage>) {
  if (!aiThinkingId.value) return;

  existed.delete(aiThinkingId.value);
  Array.from(existed.entries()).forEach(([key, item]) => {
    if (item?.temp_id === aiThinkingId.value || item?.message_id === aiThinkingId.value) {
      existed.delete(key);
    }
  });
  aiThinkingId.value = '';
}

function removeDuplicatedPendingUserMessage(existed: Map<string, ChatMessage>, message: ChatMessage) {
  if (!isUserMessage(message) || message.pending) return;

  const messageText = getMessageText(message);
  if (!messageText) return;

  Array.from(existed.entries()).forEach(([key, item]) => {
    if (!item?.pending || !isUserMessage(item)) return;
    if (getMessageText(item) === messageText) {
      existed.delete(key);
    }
  });
}

function upsertMessages(items: Record<string, any>[]) {
  const existed = new Map<string, ChatMessage>();
  messageRecord.value.forEach((item) => {
    existed.set(getMessageKey(item), item);
  });

  [...items]
    .sort((a, b) => Number(Boolean(a?.pending)) - Number(Boolean(b?.pending)))
    .forEach((item) => {
    const normalized = normalizeDeepflowMessage(item, props.eventId) as ChatMessage;
    if (isAiResultMessage(normalized) && !normalized.pending) removeThinkingMessage(existed);
    removeDuplicatedPendingUserMessage(existed, normalized);

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

function resetMessages() {
  messageRecord.value = [];
  lastMessageDbId.value = 0;
  aiThinkingId.value = '';
}

async function fetchMessages() {
  if (!props.eventId) return;
  try {
    const res = await deepflowGetChatRecords(props.eventId, {
      last_message_db_id: lastMessageDbId.value || 0,
    });
    const list = Array.isArray(res)
      ? res
      : res?.messages || res?.data?.messages || res?.data || [];
    if (Array.isArray(list) && list.length > 0) {
      upsertMessages(list);
      await scrollToBottom();
    }
  } catch {
    // 历史消息接口不可用时保留当前会话内容。
  }
}

async function sendAIMessage(text: string) {
  const pureText = text.replace(/^@AI\s*|^@ai\s*/i, '').trim();
  if (!pureText) return;

  loading.value = true;
  const tempId = `temp_${Date.now()}`;
  upsertMessages([
    {
      created_at: new Date().toISOString(),
      event_id: props.eventId,
      message_content: { text: pureText },
      message_from: 'user',
      message_id: tempId,
      message_type: 'user_message',
      pending: true,
      temp_id: tempId,
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

async function sendNormalMessage(text: string) {
  const tempId = `temp_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
  const pendingMessage = {
    created_at: new Date().toISOString(),
    event_id: props.eventId,
    message_content: { text, type: 'text' },
    message_from: 'user',
    message_id: tempId,
    message_type: 'user_message',
    pending: true,
    temp_id: tempId,
  };

  upsertMessages([pendingMessage]);
  await scrollToBottom();

  const sent = deepflowSocket.send('message', {
    event_id: props.eventId,
    message: pendingMessage.message_content,
    sender: 'user',
    temp_id: tempId,
  });

  if (!sent) {
    removeTempMessage(tempId);
    message.warning('实时连接未建立，普通消息发送失败');
  }
}

async function sendMessage() {
  const text = messageInput.value.trim();
  if (!text || !props.eventId) return;

  messageInput.value = '';

  if (/^@ai\b/i.test(text)) {
    await sendAIMessage(text);
    return;
  }

  if (text.startsWith('@')) return;

  await sendNormalMessage(text);
}

function handleSocketConnected() {
  if (!props.eventId) return;
  deepflowSocket.join(props.eventId);
}

function handleNewMessage(data: any) {
  const messages = Array.isArray(data) ? data : [data];
  const currentEventId = String(props.eventId || '');
  const matched = messages.filter((item) => {
    if (!item) return false;
    const itemEventId = String(item.event_id || '');
    return !itemEventId || itemEventId === currentEventId;
  });

  if (matched.length === 0) return;
  upsertMessages(matched);
  scrollToBottom();
}

function renderMarkdown(text?: string) {
  if (!text) return '';
  try {
    return marked.parse(text, { async: false }) as string;
  } catch {
    return text;
  }
}

watch(
  () => props.eventId,
  async (value, oldValue) => {
    if (oldValue) deepflowSocket.leave(oldValue);
    resetMessages();
    if (value) {
      deepflowSocket.join(value);
      await fetchMessages();
    }
  },
  { immediate: true },
);

onMounted(async () => {
  if (props.eventId) {
    deepflowSocket.join(props.eventId);
    await fetchMessages();
  }
  deepflowSocket.on('connected', handleSocketConnected);
  deepflowSocket.on('new_message', handleNewMessage);
  deepflowSocket.connect();
});

onUnmounted(() => {
  if (props.eventId) deepflowSocket.leave(props.eventId);
  deepflowSocket.off('connected', handleSocketConnected);
  deepflowSocket.off('new_message', handleNewMessage);
});
</script>

<template>
  <div class="chat-shell">
    <NScrollbar ref="chatRef" class="chat-body">
      <div v-if="timelineMessages.length" class="messages">
        <div
          v-for="(item, index) in timelineMessages"
          :key="`${item.from}-${item.time}-${index}`"
          :class="['message-row', item.isUser ? 'is-user' : 'is-ai']"
        >
          <template v-if="!item.isUser">
            <div class="message-avatar ai-avatar">{{ item.from.slice(0, 1) }}</div>
            <div class="message-panel">
              <div class="message-meta">
                <strong>{{ item.from }}</strong>
                <span>{{ item.time }}</span>
              </div>
              <div class="message-content" v-html="renderMarkdown(item.content || '暂无内容')"></div>
            </div>
          </template>
          <template v-else>
            <div class="message-panel user-panel">
              <div class="message-meta user-meta">
                <span>{{ item.time }}</span>
                <strong>{{ item.from }}</strong>
              </div>
              <div class="message-content user-content" v-html="renderMarkdown(item.content || '暂无内容')"></div>
            </div>
            <div class="message-avatar user-avatar">{{ item.from.slice(0, 1) || 'U' }}</div>
          </template>
        </div>
      </div>
      <div v-else class="empty-text">暂无聊天记录</div>
    </NScrollbar>
    <div class="chat-input">
      <NInput
        v-model:value="messageInput"
        type="textarea"
        placeholder="输入消息...（使用 @AI 向 AI 助手提问）"
        :autosize="{ minRows: 2, maxRows: 4 }"
        @keydown.enter.exact.prevent="sendMessage"
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
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  overflow: hidden;
}
.chat-body {
  flex: 1;
  min-height: 0;
  padding: 28px 26px 24px;
}
.messages {
  display: flex;
  flex-direction: column;
  gap: 22px;
  padding-left: 36px;
  position: relative;
}
.messages::before {
  background: #c9dcff;
  bottom: 0;
  content: '';
  left: 14px;
  position: absolute;
  top: 0;
  width: 2px;
}
.message-row {
  display: flex;
  gap: 12px;
  max-width: 880px;
  position: relative;
}
.message-row.is-ai {
  align-self: flex-start;
}
.message-row.is-user {
  align-self: flex-end;
  margin-left: auto;
}
.message-avatar {
  align-items: center;
  background: linear-gradient(135deg, #3f79ff, #6275ff);
  border-radius: 50%;
  box-shadow: 0 8px 18px rgba(57, 104, 255, 0.24);
  color: #fff;
  display: flex;
  flex: 0 0 28px;
  font-size: 13px;
  font-weight: 700;
  height: 28px;
  justify-content: center;
  width: 28px;
  z-index: 1;
}
.ai-avatar {
  background: linear-gradient(135deg, #3f79ff, #6275ff);
}
.user-avatar {
  background: linear-gradient(135deg, #6b7280, #374151);
}
.message-panel {
  min-width: 260px;
  max-width: 720px;
}
.user-panel {
  align-items: flex-end;
  display: flex;
  flex-direction: column;
}
.message-meta {
  align-items: center;
  display: flex;
  font-size: 12px;
  gap: 12px;
  margin-bottom: 8px;
}
.user-meta {
  justify-content: flex-end;
}
.message-meta strong {
  color: #1e3a76;
}
.message-meta span {
  color: #8aa0c7;
}
.message-content {
  background: #eef5ff;
  border: 1px solid #cfe0ff;
  border-radius: 10px;
  box-shadow: 0 12px 28px rgba(79, 119, 198, 0.08);
  color: #173464;
  line-height: 1.8;
  overflow-wrap: break-word;
  padding: 14px 18px;
}
.message-content :deep(h1),
.message-content :deep(h2),
.message-content :deep(h3),
.message-content :deep(h4),
.message-content :deep(h5),
.message-content :deep(h6) {
  color: #1e3a76;
  font-weight: 700;
  line-height: 1.4;
  margin: 10px 0 8px;
}
.message-content :deep(h1) {
  font-size: 18px;
}
.message-content :deep(h2) {
  font-size: 16px;
}
.message-content :deep(h3),
.message-content :deep(h4),
.message-content :deep(h5),
.message-content :deep(h6) {
  font-size: 14px;
}
.message-content :deep(p) {
  margin: 6px 0;
}
.message-content :deep(p:first-child),
.message-content :deep(h1:first-child),
.message-content :deep(h2:first-child),
.message-content :deep(h3:first-child) {
  margin-top: 0;
}
.message-content :deep(p:last-child),
.message-content :deep(ul:last-child),
.message-content :deep(ol:last-child),
.message-content :deep(pre:last-child) {
  margin-bottom: 0;
}
.message-content :deep(ul),
.message-content :deep(ol) {
  margin: 8px 0;
  padding-left: 22px;
}
.message-content :deep(li) {
  margin: 4px 0;
}
.message-content :deep(code) {
  background: #dfe9ff;
  border-radius: 4px;
  color: #b42318;
  font-family: Consolas, Monaco, 'Courier New', monospace;
  font-size: 12px;
  padding: 2px 5px;
}
.message-content :deep(pre) {
  background: #172033;
  border-radius: 8px;
  color: #d7e0f4;
  margin: 10px 0;
  overflow-x: auto;
  padding: 12px;
  white-space: pre;
}
.message-content :deep(pre code) {
  background: transparent;
  color: inherit;
  padding: 0;
}
.message-content :deep(blockquote) {
  background: #e5eeff;
  border-left: 4px solid #4f7cff;
  border-radius: 0 6px 6px 0;
  color: #536684;
  margin: 10px 0;
  padding: 8px 12px;
}
.message-content :deep(a) {
  color: #2563eb;
  text-decoration: underline;
}
.message-content :deep(table) {
  border-collapse: collapse;
  margin: 10px 0;
  width: 100%;
}
.message-content :deep(th),
.message-content :deep(td) {
  border: 1px solid #c6d7f5;
  padding: 7px 9px;
  text-align: left;
}
.message-content :deep(th) {
  background: #dfe9ff;
  font-weight: 700;
}
.message-content :deep(hr) {
  border: 0;
  border-top: 1px solid #c6d7f5;
  margin: 14px 0;
}
.user-content {
  background: #e8f0ff;
  border-color: #c8d8ff;
  text-align: left;
}
.chat-input {
  align-items: flex-end;
  background: #fff;
  border-top: 1px solid #ccd8ea;
  display: flex;
  flex: 0 0 auto;
  gap: 10px;
  min-height: 76px;
  padding: 10px 12px;
  z-index: 2;
}
.chat-input :deep(.n-input) {
  background: #fff;
  border: 1px solid #b8c5d9;
  border-radius: 3px;
  flex: 1;
}
.chat-input :deep(.n-input .n-input-wrapper) {
  min-height: 52px;
}
.chat-input :deep(.n-input__textarea-el) {
  color: #1d355f;
  line-height: 1.5;
}
.chat-input :deep(.n-input__placeholder) {
  color: #8b98aa;
  opacity: 1;
}
.chat-actions {
  display: flex;
  justify-content: flex-end;
  padding-bottom: 2px;
}
.chat-actions :deep(.n-button) {
  border-radius: 3px;
  height: 42px;
  min-width: 58px;
}
.empty-text {
  color: #888;
  padding: 32px 0;
  text-align: center;
}
</style>
