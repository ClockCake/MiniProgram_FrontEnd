<script setup>
import { ref } from 'vue'

const loading = ref(true)
const skeleton = ref([{
	type: 'line',
	num: 3,
	gap: '40rpx'
}])
</script>

<template>
  <view class="root-container">
	<div>111</div>
  </view>
</template>

<style scoped>
.root-container {
  padding: 5rem 2.5rem;
  text-align: center;
}
</style>
