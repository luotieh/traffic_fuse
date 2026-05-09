<script lang="ts" setup>
import { useRoute } from 'vue-router';

import { NCard, NDescriptions, NDescriptionsItem } from 'naive-ui';

defineOptions({ name: 'ExampleDetail' });

const route = useRoute();
const id = route.params.id;
</script>

<template>
  <div style="padding: 16px">
    <NCard title="示例详情" size="small">
      <NDescriptions label-placement="left" :column="1" bordered>
        <NDescriptionsItem label="ID">{{ id }}</NDescriptionsItem>
        <NDescriptionsItem label="说明">
          这是一个示例详情页，展示如何定义业务路由。
        </NDescriptionsItem>
      </NDescriptions>
    </NCard>
  </div>
</template>
