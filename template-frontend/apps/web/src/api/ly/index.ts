import { preferences } from '@vben/preferences';
import { useAccessStore } from '@vben/stores';

export interface LyEventItem extends Record<string, any> {
  id: number | string;
  obj?: string;
  peer?: string;
  type?: string;
  desc?: string;
  level?: number | string;
  proc_status?: string;
  starttime?: number | string;
  duration?: number | string;
  is_alive?: boolean | string | number;
  attackDevice?: string;
  victimDevice?: string;
}

export interface LyConfigItem extends Record<string, any> {
  id?: number | string;
}

async function parseResponse(response: Response) {
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const data = await response.json();

  if (data?.code !== undefined) {
    if (![0, 200, 2000].includes(data.code)) {
      throw new Error(data.msg || data.message || 'Request failed');
    }
    return data.data !== undefined ? data.data : data;
  }

  if (data?.status !== undefined) {
    if (data.status !== 'success') {
      throw new Error(data.msg || data.message || 'Request failed');
    }
    return data.data !== undefined ? data.data : data;
  }

  return data;
}

function createHeaders() {
  const accessStore = useAccessStore();
  const headers = new Headers();
  headers.set('Content-Type', 'application/json');
  headers.set('Accept-Language', preferences.app.locale);

  if (accessStore.accessToken) {
    headers.set('Authorization', `Bearer ${accessStore.accessToken}`);
  }

  return headers;
}

async function post<T = any>(
  url: string,
  data?: Record<string, any>,
  prefix = '/d',
) {
  const response = await fetch(`${prefix}${url}`, {
    body: JSON.stringify(data ?? {}),
    headers: createHeaders(),
    method: 'POST',
  });

  return parseResponse(response) as Promise<T>;
}

async function postInternal<T = any>(url: string, data?: Record<string, any>) {
  const headers = new Headers();
  headers.set('Content-Type', 'application/json');
  headers.set('X-API-Key', 'change-me-internal-key');

  const response = await fetch(`/internal${url}`, {
    body: JSON.stringify(data ?? {}),
    headers,
    method: 'POST',
  });

  return parseResponse(response) as Promise<T>;
}

export function lyEventGet(params?: Record<string, any>) {
  return post<LyEventItem[]>('/event', {
    req_type: 'aggre',
    ...(params ?? {}),
  });
}

export function lyEventStatusMod(params: Record<string, any>) {
  return post('/event', {
    req_type: 'set_proc_status',
    ...params,
  });
}

export function lyFeatureMo(params?: Record<string, any>) {
  return post<any[]>('/feature', {
    ...(params ?? {}),
    type: 'mo',
    limit: 0,
  });
}

export function lyEventPushToAi(data: Record<string, any>) {
  return postInternal('/event/push', data);
}

export function lyEventSearch(params?: Record<string, any>) {
  return lyEventGet(params);
}

export function lyConfigGet(params?: Record<string, any>) {
  return post<any[]>('/config', {
    op: 'get',
    ...(params ?? {}),
  });
}

export function lyConfigSave(params: Record<string, any>) {
  return post('/config', params);
}

export function lyInternalApi(params?: Record<string, any>) {
  return lyConfigGet({ type: 'internalip', ...(params ?? {}) });
}

export function lyBlacklistApi(params?: Record<string, any>) {
  return lyConfigGet({ type: 'bwlist', target: 'blacklist', ...(params ?? {}) });
}

export function lyWhitelistApi(params?: Record<string, any>) {
  return lyConfigGet({ type: 'bwlist', target: 'whitelist', ...(params ?? {}) });
}

export function lyDeviceApi(params?: Record<string, any>) {
  return lyConfigGet({ type: 'agent', target: 'device', ...(params ?? {}) });
}

export function lyProxyApi(params?: Record<string, any>) {
  return lyConfigGet({ type: 'agent', ...(params ?? {}) });
}

export function lyUserApi(params?: Record<string, any>) {
  return lyConfigGet({ type: 'user', ...(params ?? {}) });
}

export function lyMoApi(params?: Record<string, any>) {
  return lyConfigGet({ type: 'mo', ...(params ?? {}) });
}

export function lyMoGroupApi(params?: Record<string, any>) {
  return lyConfigGet({ type: 'mo_group', op: 'gget', ...(params ?? {}) });
}

export function lyEventRulesApi(params?: Record<string, any>) {
  return lyConfigGet({ type: 'event', ...(params ?? {}) });
}

export function lyEventIgnoreApi(params?: Record<string, any>) {
  return lyConfigGet({ type: 'event_ignore', ...(params ?? {}) });
}

export function lyEventTypeApi(params?: Record<string, any>) {
  return lyConfigGet({ type: 'event_type', ...(params ?? {}) });
}

export function lyEventLevelApi(params?: Record<string, any>) {
  return lyConfigGet({ type: 'event_level', ...(params ?? {}) });
}

export function lyEventActionApi(params?: Record<string, any>) {
  return lyConfigGet({ type: 'event_action', ...(params ?? {}) });
}
