<script lang="ts" setup>
import { ref } from 'vue';

import { NButton, NCard, NDataTable, NSpace } from 'naive-ui';

defineOptions({ name: 'ExampleList' });

const columns = [
  { title: 'ID', key: 'id', width: 80 },
  { title: '名称', key: 'name' },
  { title: '状态', key: 'status', width: 100 },
  { title: '创建时间', key: 'created_at', width: 180 },
];

const data = ref([
  { id: 1, name: '示例数据 A', status: '启用', created_at: '2026-01-01 12:00:00' },
  { id: 2, name: '示例数据 B', status: '禁用', created_at: '2026-01-02 14:30:00' },
  { id: 3, name: '示例数据 C', status: '启用', created_at: '2026-01-03 09:15:00' },
]);
</script>

<template>
  <div style="padding: 16px">
    <NCard title="示例列表" size="small">
      <template #header-extra>
        <NSpace :size="8">
          <NButton v-perm="'example:list:create'" type="primary" size="small">
            新建
          </NButton>
        </NSpace>
      </template>
      <NDataTable
        :columns="columns"
        :data="data"
        :bordered="false"
        size="small"
        striped
      />
    </NCard>
  </div>
</template>
