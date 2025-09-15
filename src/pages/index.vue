<script setup>
import { onMounted, ref } from 'vue'
import { commonApi, userApi } from '@/api'

const brandList = ref([])
const loading = ref(false)
const userInfo = ref(null)
const loginLoading = ref(false)

// 检查用户登录状态
const checkLoginStatus = () => {
  const token = uni.getStorageSync('token')
  const completeUserInfo = uni.getStorageSync('completeUserInfo')
  const wechatLoginData = uni.getStorageSync('wechat_login_data')
  
  // 优先使用完整用户信息（包含后端业务数据）
  if (token && completeUserInfo) {
    userInfo.value = completeUserInfo
    console.log('恢复完整登录状态:', completeUserInfo)
    return
  }
  
  // 备用：使用微信登录数据
  if (wechatLoginData && wechatLoginData.userInfo) {
    // 检查登录是否过期（7天）
    const loginTime = wechatLoginData.loginTime
    const now = Date.now()
    const sevenDays = 7 * 24 * 60 * 60 * 1000
    
    if (now - loginTime < sevenDays) {
      userInfo.value = wechatLoginData.userInfo
      console.log('恢复微信登录状态:', wechatLoginData.userInfo)
    } else {
      // 登录过期，清除所有数据
      uni.removeStorageSync('token')
      uni.removeStorageSync('completeUserInfo')
      uni.removeStorageSync('wechat_login_data')
      uni.removeStorageSync('userInfo')
      console.log('登录已过期，已清除所有数据')
    }
  }
}

// 微信快捷登录
const handleWechatLogin = async () => {
  try {
    loginLoading.value = true
    
    // 1. 先检查微信登录状态
    const checkSession = await new Promise((resolve) => {
      uni.checkSession({
        success: () => resolve(true),
        fail: () => resolve(false)
      })
    })
    
    // 2. 获取微信登录code
    const loginRes = await new Promise((resolve, reject) => {
      uni.login({
        provider: 'weixin',
        success: resolve,
        fail: reject
      })
    })
    
    if (!loginRes.code) {
      throw new Error('获取微信登录code失败')
    }
    
    console.log('微信登录code:', loginRes.code)
    
    // 3. 获取用户信息（使用微信SDK）
    const userInfoRes = await new Promise((resolve, reject) => {
      uni.getUserInfo({
        provider: 'weixin',
        success: (res) => {
          console.log('获取用户信息成功:', res)
          resolve(res.userInfo)
        },
        fail: (err) => {
          console.log('获取用户信息失败:', err)
          // 如果获取失败，使用getUserProfile
          uni.getUserProfile({
            desc: '用于完善用户资料',
            success: (profileRes) => {
              console.log('getUserProfile成功:', profileRes)
              resolve(profileRes.userInfo)
            },
            fail: reject
          })
        }
      })
    })
    
    // 4. 发送登录数据到后端进行用户关联（注册或登录）
    try {
      console.log('发送登录数据到后端...')
      
      const backendRes = await userApi.wechatLogin({
        code: loginRes.code,  // 核心：用于后端获取openid
        userInfo: {
          nickName: userInfoRes.nickName,
          avatarUrl: userInfoRes.avatarUrl,
          gender: userInfoRes.gender,
          city: userInfoRes.city,
          province: userInfoRes.province,
          country: userInfoRes.country
        },
        // 可选：加密数据（如果需要更详细信息）
        encryptedData: userInfoRes.encryptedData || '',
        iv: userInfoRes.iv || '',
        signature: userInfoRes.signature || ''
      })
      
      console.log('后端响应:', backendRes)
      
      // 保存后端返回的数据
      if (backendRes.token) {
        uni.setStorageSync('token', backendRes.token)
        console.log('保存token成功')
      }
      
      if (backendRes.user) {
        // 合并前端和后端的用户信息
        const completeUserInfo = {
          ...userInfoRes,           // 前端获取的微信信息
          ...backendRes.user,       // 后端返回的业务信息
          isNewUser: backendRes.isNewUser || false  // 是否为新注册用户
        }
        
        uni.setStorageSync('completeUserInfo', completeUserInfo)
        userInfo.value = completeUserInfo
        
        // 如果是新用户，显示欢迎信息
        if (backendRes.isNewUser) {
          uni.showToast({
            title: '欢迎新用户！',
            icon: 'success',
            duration: 2000
          })
        } else {
          uni.showToast({
            title: '欢迎回来！',
            icon: 'success'
          })
        }
        
        console.log('用户信息保存成功:', completeUserInfo)
        return // 成功完成，直接返回
      }
      
    } catch (backendError) {
      console.error('后端登录失败:', backendError)
      
      // 如果后端失败，仍保存前端信息，但提示用户
      uni.showToast({
        title: '登录成功，但数据同步失败',
        icon: 'none',
        duration: 2000
      })
    }
    
    // 5. 保存前端用户信息和登录状态
    const loginData = {
      code: loginRes.code,
      userInfo: userInfoRes,
      loginTime: Date.now(),
      openid: null, // 后端返回后可更新
      unionid: null // 后端返回后可更新
    }
    
    uni.setStorageSync('wechat_login_data', loginData)
    uni.setStorageSync('userInfo', userInfoRes)
    userInfo.value = userInfoRes
    
    uni.showToast({
      title: '登录成功',
      icon: 'success'
    })
    
  } catch (error) {
    console.error('微信登录失败:', error)
    uni.showToast({
      title: error.message || '登录失败，请重试',
      icon: 'none'
    })
  } finally {
    loginLoading.value = false
  }
}

// 退出登录
const handleLogout = () => {
  uni.showModal({
    title: '提示',
    content: '确定要退出登录吗？',
    success: (res) => {
      if (res.confirm) {
        // 清除所有登录相关数据
        uni.removeStorageSync('token')
        uni.removeStorageSync('completeUserInfo')
        uni.removeStorageSync('wechat_login_data')
        uni.removeStorageSync('userInfo')
        userInfo.value = null
        
        uni.showToast({
          title: '已退出登录',
          icon: 'success'
        })
        
        console.log('用户已退出登录，清除所有数据')
      }
    }
  })
}

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
  // 检查登录状态
  checkLoginStatus()
  
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
  <uni-nav-bar title="品牌列表" :fixed="true" :placeholder="true" :border="false"></uni-nav-bar>
  <view class="root-container">
    <!-- 用户登录区域 -->
    <view class="login-section">
      <!-- 未登录状态 -->
      <view v-if="!userInfo" class="login-card">
        <view class="login-title">欢迎使用</view>
        <view class="login-desc">请先登录以获得更好的体验</view>
        <button 
          class="wechat-login-btn" 
          :loading="loginLoading"
          @click="handleWechatLogin"
        >
          <text class="wechat-icon">👤</text>
          <text>{{ loginLoading ? '登录中...' : '微信快捷登录' }}</text>
        </button>
      </view>
      
      <!-- 已登录状态 -->
      <view v-else class="user-card">
        <view class="user-avatar">
          <image v-if="userInfo.avatarUrl" :src="userInfo.avatarUrl" class="avatar-img" />
          <view v-else class="avatar-placeholder">👤</view>
        </view>
        <view class="user-info">
          <view class="user-name">{{ userInfo.nickName || userInfo.name || '微信用户' }}</view>
          <view class="user-desc">{{ userInfo.city && userInfo.province ? `${userInfo.province} ${userInfo.city}` : '已登录' }}</view>
        </view>
        <button class="logout-btn" @click="handleLogout">退出</button>
      </view>
    </view>

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

/* 登录区域样式 */
.login-section {
  margin-bottom: 2rem;
}

.login-card {
  background: linear-gradient(135deg, #07c160, #07a653);
  border-radius: 16px;
  padding: 2rem;
  text-align: center;
  color: white;
  box-shadow: 0 8px 24px rgba(7, 193, 96, 0.3);
}

.login-title {
  font-size: 20px;
  font-weight: bold;
  margin-bottom: 0.5rem;
}

.login-desc {
  font-size: 14px;
  opacity: 0.9;
  margin-bottom: 1.5rem;
}

.wechat-login-btn {
  background: rgba(255, 255, 255, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 25px;
  padding: 12px 24px;
  color: white;
  font-size: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: all 0.3s ease;
  backdrop-filter: blur(10px);
}

.wechat-login-btn:active {
  background: rgba(255, 255, 255, 0.3);
  transform: scale(0.98);
}

.wechat-icon {
  font-size: 18px;
}

.user-card {
  background: white;
  border-radius: 16px;
  padding: 1.5rem;
  display: flex;
  align-items: center;
  gap: 1rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  border: 1px solid #f0f0f0;
}

.user-avatar {
  width: 50px;
  height: 50px;
  border-radius: 25px;
  overflow: hidden;
  background: #f5f5f5;
  display: flex;
  align-items: center;
  justify-content: center;
}

.avatar-img {
  width: 100%;
  height: 100%;
  border-radius: 25px;
}

.avatar-placeholder {
  font-size: 24px;
  color: #999;
}

.user-info {
  flex: 1;
}

.user-name {
  font-size: 16px;
  font-weight: bold;
  color: #333;
  margin-bottom: 4px;
}

.user-desc {
  font-size: 12px;
  color: #07c160;
}

.logout-btn {
  background: #f5f5f5;
  border: none;
  border-radius: 20px;
  padding: 8px 16px;
  color: #666;
  font-size: 14px;
}

.logout-btn:active {
  background: #e5e5e5;
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
