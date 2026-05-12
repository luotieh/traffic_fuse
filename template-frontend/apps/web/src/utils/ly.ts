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

export const MOCK_LY_EVENTS: Record<string, any>[] = [
  {
    id: 10001,
    attackDevice: '1.2.3.4',
    victimDevice: '192.168.1.100',
    type: 'black',
    typeText: '黑名单通讯',
    desc: '外部黑名单地址与内网主机建立异常连接。',
    level: 'critical',
    proc_status: 'unprocessed',
    starttime: 1_730_102_460,
    duration: 120,
    is_alive: true,
    mock: true,
  },
  {
    id: 10002,
    attackDevice: '10.0.0.55',
    victimDevice: '192.168.1.200',
    type: 'port_scan',
    typeText: '端口扫描',
    desc: '源主机在短时间内探测多个端口。',
    level: 'high',
    proc_status: 'assigned',
    starttime: 1_730_102_460,
    duration: 180,
    is_alive: true,
    mock: true,
  },
  {
    id: 10003,
    attackDevice: '8.8.8.8',
    victimDevice: '172.16.0.30',
    type: 'dns_tun',
    desc: '检测到疑似 DNS 隧道通信特征。',
    level: 'high',
    proc_status: 'unprocessed',
    starttime: 1_730_102_460,
    duration: 90,
    is_alive: true,
    mock: true,
  },
  {
    id: 10004,
    attackDevice: 'pool.minexmr.com',
    victimDevice: '192.168.1.50',
    type: 'mining',
    desc: '发现矿池域名访问与挖矿行为特征。',
    level: 'critical',
    proc_status: 'unprocessed',
    starttime: 1_730_102_460,
    duration: 240,
    is_alive: true,
    mock: true,
  },
  {
    id: 10005,
    attackDevice: '185.220.101.5',
    victimDevice: '10.10.1.88',
    type: 'ti',
    typeText: '威胁情报',
    desc: '命中威胁情报库中的恶意出口节点。',
    level: 'high',
    proc_status: 'processed',
    starttime: 1_730_102_420,
    duration: 60,
    is_alive: false,
    mock: true,
  },
  {
    id: 10006,
    attackDevice: '45.33.32.156',
    victimDevice: '192.168.2.10',
    type: 'dos',
    typeText: 'DoS攻击',
    desc: '目标主机遭遇异常高频请求。',
    level: 'critical',
    proc_status: 'unprocessed',
    starttime: 1_730_102_460,
    duration: 300,
    is_alive: true,
    mock: true,
  },
  {
    id: 10007,
    attackDevice: '203.0.113.10',
    victimDevice: '172.16.5.20',
    type: 'icmp_tun',
    desc: 'ICMP 数据包载荷存在隧道通信特征。',
    level: 'middle',
    proc_status: 'assigned',
    starttime: 1_730_102_440,
    duration: 75,
    is_alive: false,
    mock: true,
  },
  {
    id: 10008,
    attackDevice: '91.108.4.15',
    victimDevice: '192.168.3.77',
    type: 'sus',
    desc: '检测到可疑外联和风险通讯行为。',
    level: 'middle',
    proc_status: 'unprocessed',
    starttime: 1_730_102_460,
    duration: 110,
    is_alive: true,
    mock: true,
  },
  {
    id: 10009,
    attackDevice: '192.168.100.200',
    victimDevice: '10.0.0.1',
    type: 'ip_scan',
    desc: '内网主机对目标网段进行 IP 扫描。',
    level: 'middle',
    proc_status: 'processed',
    starttime: 1_730_102_380,
    duration: 150,
    is_alive: false,
    mock: true,
  },
  {
    id: 10010,
    attackDevice: '114.114.114.114',
    victimDevice: '192.168.1.150',
    type: 'dns_abnormal',
    typeText: 'DNS异常',
    desc: 'DNS 查询频率和返回模式异常。',
    level: 'low',
    proc_status: 'unprocessed',
    starttime: 1_730_102_460,
    duration: 50,
    is_alive: true,
    mock: true,
  },
];

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
    typeText: item.typeText || translateEventType(item.type),
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
