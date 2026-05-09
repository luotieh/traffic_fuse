export interface NormalizedLyEvent extends Record<string, any> {
  id: number | string;
  objText: string;
  typeText: string;
  levelText: string;
  procStatusText: string;
  aliveText: string;
  startTimeText: string;
  durationText: string;
}

const EVENT_TYPE_MAP: Record<string, string> = {
  black: '黑名单',
  sus: '风险通讯',
  scan: '扫描',
  port_scan: '端口扫描',
  ip_scan: 'IP扫描',
  dns: 'DNS',
  dns_tun: 'DNS隧道',
  frn_trip: '服务器外连',
  mining: '挖矿',
  icmp_tun: 'ICMP隧道',
  mo: '追踪',
  ti: '情报',
  cap: '包检测',
  dga: 'DGA',
  srv: '异常服务',
};

const EVENT_LEVEL_MAP: Record<string, string> = {
  '1': '低',
  '2': '中',
  '3': '高',
  '4': '极高',
  extra_low: '极低',
  low: '低',
  middle: '中',
  high: '高',
  critical: '极高',
};

const PROC_STATUS_MAP: Record<string, string> = {
  unprocessed: '未处理',
  processed: '已处理',
  assigned: '已确认',
};

export function formatTimestamp(value?: number | string | null, withTime = true) {
  if (value === '' || value === null || value === undefined) return '-';
  const num = Number(value);
  const date = Number.isFinite(num)
    ? new Date(String(value).length <= 10 ? num * 1000 : num)
    : new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  const pad = (n: number) => String(n).padStart(2, '0');
  const text = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  if (!withTime) return text;
  return `${text} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

export function formatDuration(value?: number | string | null) {
  const num = Number(value ?? 0);
  if (!Number.isFinite(num) || num <= 0) return '-';
  if (num < 60) return `${num}s`;
  if (num < 3600) return `${Math.floor(num / 60)}m ${num % 60}s`;
  const h = Math.floor(num / 3600);
  const m = Math.floor((num % 3600) / 60);
  return `${h}h ${m}m`;
}

export function translateEventType(value?: string) {
  return EVENT_TYPE_MAP[value || ''] || value || '-';
}

export function translateEventLevel(value?: number | string) {
  return EVENT_LEVEL_MAP[String(value ?? '')] || String(value ?? '-');
}

export function translateProcStatus(value?: string) {
  return PROC_STATUS_MAP[value || ''] || value || '-';
}

export function normalizeLyEvent(item: Record<string, any>): NormalizedLyEvent {
  const objText = String(item.obj || '').split(' ')[0] || '-';
  const attackDevice = item.attackDevice || objText.split('>')[0] || '-';
  const victimDevice = item.victimDevice || objText.split('>')[1] || '-';
  const alive = item.is_alive;
  const aliveText =
    alive === true || alive === 'true' || alive === 1 || alive === '1'
      ? '活跃'
      : alive === false || alive === 'false' || alive === 0 || alive === '0'
        ? '不活跃'
        : '-';

  return {
    ...item,
    id: item.id ?? item.event_id ?? item.obj ?? '-',
    attackDevice,
    victimDevice,
    objText,
    typeText: translateEventType(item.type),
    levelText: translateEventLevel(item.level),
    procStatusText: translateProcStatus(item.proc_status),
    aliveText,
    startTimeText: formatTimestamp(item.starttime || item.time || item.created_at),
    durationText: formatDuration(item.duration),
  };
}

export function normalizeLyEvents(list: Record<string, any>[] = []) {
  return list.map(normalizeLyEvent);
}

export function countByKey<T extends Record<string, any>>(list: T[], key: keyof T | string) {
  const map = new Map<string, number>();
  list.forEach((item) => {
    const value = String(item[key as keyof T] ?? '').trim();
    if (!value) return;
    map.set(value, (map.get(value) || 0) + 1);
  });
  return Array.from(map.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
}

export function paginate<T>(list: T[], page: number, pageSize: number) {
  const start = (page - 1) * pageSize;
  return list.slice(start, start + pageSize);
}
