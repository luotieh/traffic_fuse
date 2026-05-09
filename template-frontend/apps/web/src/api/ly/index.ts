import { requestClient } from '#/api/request';

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

function post<T = any>(url: string, data?: Record<string, any>) {
  return requestClient.post<T>(url, data ?? {});
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
  return post('/event/push', data);
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
