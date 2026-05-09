/**
 * 示例业务 API
 *
 * 使用 requestClient 发送请求，Token 注入、错误处理、
 * 登录过期跳转等均已由模板自动处理。
 */
import { requestClient } from '#/api/request';

export interface ExampleItem {
  id: number;
  name: string;
  status: string;
  created_at: string;
}

export function getExampleList(params?: Record<string, any>) {
  return requestClient.get<{ items: ExampleItem[]; count: number }>(
    '/example/list',
    { params },
  );
}

export function getExampleDetail(id: number) {
  return requestClient.get<ExampleItem>(`/example/${id}`);
}

export function createExample(data: Partial<ExampleItem>) {
  return requestClient.post('/example', data);
}

export function updateExample(id: number, data: Partial<ExampleItem>) {
  return requestClient.put(`/example/${id}`, data);
}

export function deleteExample(id: number) {
  return requestClient.delete(`/example/${id}`);
}
