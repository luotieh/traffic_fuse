<script lang="ts" setup>
import { reactive } from 'vue';
import { useRouter } from 'vue-router';

import { NButton, NCard, NForm, NFormItem, NInput, NSpace } from 'naive-ui';

defineOptions({ name: 'LySearch' });

const router = useRouter();
const form = reactive({
  devid: '',
  keyword: '',
  starttime: '',
  endtime: '',
});

function startSearch() {
  router.push({ path: '/ly/result', query: { ...form } });
}
</script>

<template>
  <div class="ly-search-page">
    <NCard title="全局搜索引擎" size="small" class="search-card">
      <NForm label-placement="left" label-width="90">
        <NFormItem label="设备ID">
          <NInput v-model:value="form.devid" placeholder="可选" />
        </NFormItem>
        <NFormItem label="关键字">
          <NInput v-model:value="form.keyword" placeholder="可选" />
        </NFormItem>
        <NFormItem label="开始时间戳">
          <NInput v-model:value="form.starttime" placeholder="秒级时间戳" />
        </NFormItem>
        <NFormItem label="结束时间戳">
          <NInput v-model:value="form.endtime" placeholder="秒级时间戳" />
        </NFormItem>
      </NForm>
      <NSpace justify="center">
        <NButton type="primary" @click="startSearch">搜索</NButton>
      </NSpace>
    </NCard>
  </div>
</template>

<style scoped>
.ly-search-page {
  display: flex;
  justify-content: center;
  padding: 24px 12px;
}
.search-card {
  width: min(860px, 100%);
}
</style>
