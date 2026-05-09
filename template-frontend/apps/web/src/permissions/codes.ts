/**
 * 权限码常量（由路由路径自动推导）
 *
 * 推导规则：路由 path + action → 权限码
 *   /example/list + create → example:list:create
 *
 * 这些常量与路由 meta.perms 声明保持一致，
 * 是 meta.perms 的编程别名，方便在组件中使用。
 *
 * ★ 添加你自己的业务模块权限码在这里
 */

import { createPermResolver } from './route-perm';

const exampleList = createPermResolver('/example/list');

export const PERM = {
  EXAMPLE: {
    CREATE: exampleList('create'),
    UPDATE: exampleList('update'),
    DELETE: exampleList('delete'),
  },
} as const;

export type PermCode = string;
