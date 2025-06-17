<script setup>
import { onMounted, ref } from 'vue'
import { commonApi } from '@/api'

const brandList = ref([])
const loading = ref(false)

// 处理品牌项点击事件
const handleBrandClick = (brand) => {
  console.log('点击了品牌:', brand)
  // 可以根据需要跳转到品牌详情页或其他操作
  uni.showToast({
    title: `点击了 ${brand.name}`,
    icon: 'none'
  })
}

onMounted(async () => {
  try {
    loading.value = true
    const res = await commonApi.getBrands()
    brandList.value = res || []
  } catch (error) {
    console.error('获取品牌数据失败:', error)
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <uni-nav-bar :title="品牌列表" :fixed="true" :placeholder="true" :border="false"></uni-nav-bar>
  <view class="root-container">
      <!-- 加载状态 -->
    <view v-if="loading" class="loading">
      <text>加载中...</text>
    </view>
    
    <!-- 品牌列表 -->
    <view v-else-if="brandList.length > 0" class="brand-list">
      <view class="brand-item" v-for="item in brandList" :key="item.id" @click="handleBrandClick(item)">
        <image :src="item.image" mode="widthFix" class="brand-logo" />
        <view class="brand-name">{{ item.name }}</view>
      </view>
    </view>
    
    <!-- 空数据状态 -->
    <view v-else class="empty">
      <text>暂无品牌数据</text>
    </view>
  </view>
</template>

<style scoped>
.root-container {
  padding: 2rem;
  min-height: 100vh;
}

.loading, .empty {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 200px;
  color: #999;
}

.brand-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 1rem;
}

.brand-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 1rem;
  border: 1px solid #eee;
  border-radius: 8px;
  background: #fff;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  cursor: pointer;
  transition: all 0.3s ease;
}

.brand-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0,0,0,0.15);
}

.brand-item:active {
  transform: translateY(0);
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.brand-logo {
  width: 60px;
  height: 60px;
  margin-bottom: 0.5rem;
}

.brand-name {
  font-size: 14px;
  color: #333;
  text-align: center;
  font-weight: bold;
}
</style>
