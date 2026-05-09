export function formatDeepflowDate(isoDate?: string) {
  if (!isoDate) return '';
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return isoDate;
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}/${pad(date.getMonth() + 1)}/${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

export function mapSeverityToDisplay(severity?: string) {
  const map: Record<string, string> = {
    low: '低',
    medium: '中',
    high: '高',
    critical: '极高',
  };
  return map[severity || ''] || severity || '-';
}

export function mapSeverityToTagType(severity?: string) {
  if (severity === 'critical' || severity === 'high') return 'error';
  if (severity === 'medium') return 'warning';
  if (severity === 'low') return 'success';
  return 'default';
}

export function getRoleName(from?: string) {
  const roleNameMap: Record<string, string> = {
    _operator: '安全工程师',
    _executor: '执行器',
    _manager: '安全管理员',
    _captain: '安全指挥官',
    _expert: '安全专家',
    ai_assistant: 'AI助手',
    system: '系统',
    user: '用户',
  };
  return roleNameMap[from || ''] || from || '系统';
}

export function normalizeDeepflowMessage(message: Record<string, any>, eventId = '') {
  const content = normalizeMessageContent(message.message_content || message.content);
  const createdAt =
    message.created_at ||
    message.updated_at ||
    message.timestamp ||
    content?.timestamp ||
    content?.data?.timestamp ||
    new Date().toISOString();

  return {
    ...message,
    created_at: createdAt,
    event_id: message.event_id || eventId,
    message_content: content,
    message_from: message.message_from || message.from || 'system',
    message_id: message.message_id || message.id || null,
    pending: Boolean(message.pending),
    temp_id: message.temp_id || null,
  };
}

export function normalizeMessageContent(raw: any): Record<string, any> {
  if (raw == null) return {};
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      return typeof parsed === 'object' && parsed ? parsed : { text: raw };
    } catch {
      return { text: raw };
    }
  }
  if (typeof raw === 'object') return raw;
  return { text: String(raw) };
}

export function textFromAny(value: any): string {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

export function getMessageDisplay(message: Record<string, any>) {
  const from = message?.message_from || '';
  const content = normalizeMessageContent(message?.message_content);
  const data = content?.data || {};
  const time =
    message?.updated_at ||
    message?.created_at ||
    content?.timestamp ||
    data?.timestamp ||
    '';

  function listItems(title: string, items: any[], mapper: (item: any, index: number) => string) {
    if (!items.length) return '';
    return `${title}\n\n${items.map(mapper).join('\n\n')}`;
  }

  const ctx =
    formatStructuredMessage(message, content, data) ||
    content?.content ||
    content?.text ||
    data?.response_text ||
    data?.text ||
    data?.decision ||
    data?.event_summary ||
    data?.ai_summary ||
    message?.message ||
    '';

  const isAi = message?.sender_type === 'ai' || from === 'ai_assistant';

  return {
    ctx: textFromAny(ctx),
    from: isAi ? getRoleName('ai_assistant') : getRoleName(from),
    isAi,
    time,
  };

  function formatStructuredMessage(
    source: Record<string, any>,
    sourceContent: Record<string, any>,
    sourceData: Record<string, any>,
  ) {
    const messageType = source?.message_type || '';

    if (messageType === 'action_created' || Array.isArray(sourceData?.actions)) {
      return listItems('已创建动作', sourceData?.actions || [], (action, index) => {
        return `${index + 1}. ${action.action_name || '-'}\n类型: ${action.action_type || '-'}\n执行者: ${getRoleName(action.action_assignee)}\n状态: ${action.action_status || '-'}`;
      });
    }

    if (messageType === 'command_created' || Array.isArray(sourceData?.commands)) {
      return listItems('已准备命令', sourceData?.commands || [], (command, index) => {
        const params = command.command_params?.data
          ? `\n参数: ${textFromAny(command.command_params.data)}`
          : '';
        return `${index + 1}. ${command.command_name || '-'}\n类型: ${command.command_type || '-'}\n执行者: ${getRoleName(command.command_assignee)}\n状态: ${command.command_status || '-'}${params}`;
      });
    }

    if (messageType === 'command_result' || Array.isArray(sourceData?.executions)) {
      return listItems('执行结果', sourceData?.executions || [], (execution, index) => {
        const result = execution.execution_result?.data
          ? `\n结果: ${textFromAny(execution.execution_result.data)}`
          : '';
        return `${index + 1}. ${execution.command_name || '-'}\n状态: ${execution.execution_status || '-'}${execution.execution_summary ? `\n摘要: ${execution.execution_summary}` : ''}${result}`;
      });
    }

    if (messageType === 'event_summary' || Array.isArray(sourceData?.summaries)) {
      const summaries = Array.isArray(sourceData?.summaries)
        ? sourceData.summaries.map((item: any) => `- ${textFromAny(item)}`).join('\n')
        : '';
      const suggestions = Array.isArray(sourceData?.suggestions)
        ? `\n\n建议\n${sourceData.suggestions.map((item: any) => `- ${textFromAny(item)}`).join('\n')}`
        : '';
      return [summaries, suggestions].filter(Boolean).join('');
    }

    if (messageType === 'captain_llm_request' || sourceData?.type === 'llm_request') {
      return [
        sourceData?.request?.message ? `事件描述\n${sourceData.request.message}` : '',
        Array.isArray(sourceData?.request?.observables)
          ? `观测指标\n${sourceData.request.observables
              .map((item: any) => `- ${item.type}: ${item.value} (${item.role})`)
              .join('\n')}`
          : '',
        sourceData?.system_prompt ? `系统提示\n${sourceData.system_prompt}` : '',
        sourceData?.background?.security ? `组织背景\n${sourceData.background.security}` : '',
      ]
        .filter(Boolean)
        .join('\n\n');
    }

    if (sourceContent?.data && typeof sourceContent.data === 'object') return '';
    return '';
  }
}
