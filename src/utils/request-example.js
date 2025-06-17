/**
 * 网络请求框架使用示例
 * 演示如何在项目中使用封装的网络请求框架
 */

// 方式1: 使用定义好的API
import api, { userApi, commonApi } from '@/api/index'

// 方式2: 直接使用http实例
import { http } from '@/api/index'

// 方式3: 直接导入请求方法
import { get, post, put, delete as del } from '@/utils/request'

/**
 * 示例1: 在Vue组件中使用API
 */
export const vueComponentExample = {
  data() {
    return {
      userInfo: {},
      loading: false
    }
  },
  
  async mounted() {
    await this.loadUserInfo()
  },
  
  methods: {
    // 获取用户信息
    async loadUserInfo() {
      try {
        this.loading = true
        const userInfo = await userApi.getUserInfo()
        this.userInfo = userInfo
      } catch (error) {
        console.error('获取用户信息失败:', error)
      } finally {
        this.loading = false
      }
    },
    
    // 用户登录
    async handleLogin(loginForm) {
      try {
        const result = await userApi.login(loginForm)
        // 保存token
        uni.setStorageSync('token', result.token)
        // 跳转到首页
        uni.switchTab({
          url: '/pages/index/index'
        })
      } catch (error) {
        console.error('登录失败:', error)
      }
    },
    
    // 文件上传
    async handleUpload() {
      try {
        // 选择图片
        const res = await uni.chooseImage({
          count: 1,
          sizeType: ['compressed'],
          sourceType: ['album', 'camera']
        })
        
        const filePath = res.tempFilePaths[0]
        
        // 上传文件
        const uploadResult = await api.fileApi.uploadFile(filePath, {
          type: 'avatar'
        })
        
        console.log('上传成功:', uploadResult)
      } catch (error) {
        console.error('上传失败:', error)
      }
    }
  }
}

/**
 * 示例2: 在Composition API中使用
 */
export const compositionApiExample = () => {
  const { ref, onMounted } = require('vue')
  
  const userList = ref([])
  const loading = ref(false)
  
  // 获取用户列表
  const fetchUserList = async (params = {}) => {
    try {
      loading.value = true
      const data = await api.exampleApi.getList(params)
      userList.value = data.list || data
    } catch (error) {
      console.error('获取列表失败:', error)
    } finally {
      loading.value = false
    }
  }
  
  // 删除用户
  const deleteUser = async (id) => {
    try {
      await uni.showModal({
        title: '确认删除',
        content: '确定要删除这个用户吗？'
      })
      
      await api.exampleApi.delete(id)
      
      // 重新加载列表
      await fetchUserList()
      
      uni.showToast({
        title: '删除成功',
        icon: 'success'
      })
    } catch (error) {
      if (error.errMsg && error.errMsg.includes('cancel')) {
        return // 用户取消删除
      }
      console.error('删除失败:', error)
    }
  }
  
  onMounted(() => {
    fetchUserList()
  })
  
  return {
    userList,
    loading,
    fetchUserList,
    deleteUser
  }
}

/**
 * 示例3: 直接使用http实例
 */
export const directHttpExample = {
  // 自定义请求
  async customRequest() {
    try {
      const response = await http.request({
        url: '/custom/endpoint',
        method: 'POST',
        data: { key: 'value' },
        header: {
          'Custom-Header': 'custom-value'
        }
      })
      
      return response.data
    } catch (error) {
      console.error('自定义请求失败:', error)
      throw error
    }
  },
  
  // 并发请求
  async concurrentRequests() {
    try {
      const [userInfo, configData, dictData] = await Promise.all([
        userApi.getUserInfo(),
        commonApi.getConfig(),
        commonApi.getDictData('status')
      ])
      
      return {
        userInfo,
        configData,
        dictData
      }
    } catch (error) {
      console.error('并发请求失败:', error)
      throw error
    }
  }
}

/**
 * 示例4: 请求重试机制
 */
export const retryExample = {
  async requestWithRetry(requestFn, maxRetries = 3) {
    let lastError
    
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await requestFn()
      } catch (error) {
        lastError = error
        console.warn(`请求失败，重试第${i + 1}次:`, error)
        
        // 延迟重试
        if (i < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)))
        }
      }
    }
    
    throw lastError
  },
  
  // 使用重试机制
  async fetchImportantData() {
    return await this.requestWithRetry(async () => {
      return await userApi.getUserInfo()
    })
  }
}

/**
 * 示例5: 缓存机制
 */
export const cacheExample = {
  cache: new Map(),
  
  async getWithCache(key, requestFn, cacheTime = 5 * 60 * 1000) {
    const cached = this.cache.get(key)
    
    if (cached && Date.now() - cached.timestamp < cacheTime) {
      return cached.data
    }
    
    const data = await requestFn()
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    })
    
    return data
  },
  
  // 使用缓存
  async getCachedUserInfo() {
    return await this.getWithCache('userInfo', () => userApi.getUserInfo())
  }
}

/**
 * 示例6: 分页请求
 */
export const paginationExample = {
  data() {
    return {
      list: [],
      loading: false,
      loadingMore: false,
      hasMore: true,
      page: 1,
      pageSize: 20
    }
  },
  
  methods: {
    // 加载第一页
    async loadFirstPage() {
      this.page = 1
      this.list = []
      this.hasMore = true
      await this.loadData()
    },
    
    // 加载更多
    async loadMore() {
      if (!this.hasMore || this.loadingMore) return
      
      this.page++
      await this.loadData(true)
    },
    
    // 加载数据
    async loadData(isLoadMore = false) {
      try {
        if (isLoadMore) {
          this.loadingMore = true
        } else {
          this.loading = true
        }
        
        const params = {
          page: this.page,
          pageSize: this.pageSize
        }
        
        const response = await api.exampleApi.getList(params)
        
        if (isLoadMore) {
          this.list.push(...response.list)
        } else {
          this.list = response.list
        }
        
        this.hasMore = response.list.length === this.pageSize
        
      } catch (error) {
        console.error('加载数据失败:', error)
        if (isLoadMore) {
          this.page-- // 回滚页码
        }
      } finally {
        this.loading = false
        this.loadingMore = false
      }
    }
  }
}

export default {
  vueComponentExample,
  compositionApiExample,
  directHttpExample,
  retryExample,
  cacheExample,
  paginationExample
} 