/**
 * API响应处理工具
 * 提供统一的API响应处理方法
 */

import { ref, readonly, computed } from 'vue'

/**
 * 处理API响应的通用方法
 * @param {Function} apiFunction - API请求函数
 * @param {Object} options - 选项配置
 * @returns {Promise} 处理后的数据
 */
export async function handleApiResponse(apiFunction, options = {}) {
  const {
    showLoading = true,
    showError = true,
    loadingText = '加载中...',
    errorCallback = null,
    successCallback = null
  } = options

  try {
    if (showLoading) {
      uni.showLoading({
        title: loadingText,
        mask: true
      })
    }

    const result = await apiFunction()

    if (showLoading) {
      uni.hideLoading()
    }

    if (successCallback) {
      successCallback(result)
    }

    return result
  } catch (error) {
    if (showLoading) {
      uni.hideLoading()
    }

    console.error('API请求失败:', error)

    if (showError && error.message) {
      uni.showToast({
        title: error.message,
        icon: 'none',
        duration: 2000
      })
    }

    if (errorCallback) {
      errorCallback(error)
    }

    throw error
  }
}

/**
 * 创建分页数据处理器
 * @param {Object} options - 配置选项
 * @returns {Object} 分页处理器
 */
export function createPaginationHandler(options = {}) {
  const {
    pageSize = 20,
    initialPage = 1,
    dataKey = 'list' // 如果返回的数据是对象，指定数组的键名
  } = options

  let currentPage = initialPage
  let hasMore = true
  let loading = false

  return {
    // 重置分页状态
    reset() {
      currentPage = initialPage
      hasMore = true
      loading = false
    },

    // 加载数据
    async loadData(apiFunction, params = {}) {
      if (loading || !hasMore) return []

      try {
        loading = true
        
        const requestParams = {
          ...params,
          page: currentPage,
          pageSize
        }

        const result = await apiFunction(requestParams)
        
        // 处理返回的数据
        let dataList = Array.isArray(result) ? result : result[dataKey] || []
        
        // 更新分页状态
        hasMore = dataList.length === pageSize
        currentPage++

        return dataList
      } catch (error) {
        console.error('分页加载失败:', error)
        throw error
      } finally {
        loading = false
      }
    },

    // 获取当前状态
    getState() {
      return {
        currentPage,
        hasMore,
        loading
      }
    }
  }
}

/**
 * 创建列表数据管理器
 * @param {Function} apiFunction - API请求函数
 * @param {Object} options - 配置选项
 * @returns {Object} 列表管理器
 */
export function createListManager(apiFunction, options = {}) {
  const {
    autoLoad = true,
    showLoading = true,
    ...paginationOptions
  } = options

  const data = ref([])
  const loading = ref(false)
  const error = ref(null)
  const pagination = createPaginationHandler(paginationOptions)

  // 加载首页数据
  const loadFirstPage = async (params = {}) => {
    try {
      loading.value = true
      error.value = null
      
      pagination.reset()
      
      const result = await handleApiResponse(
        () => pagination.loadData(apiFunction, params),
        { showLoading, showError: true }
      )

      data.value = result
    } catch (err) {
      error.value = err
    } finally {
      loading.value = false
    }
  }

  // 加载更多数据
  const loadMore = async (params = {}) => {
    if (loading.value || !pagination.getState().hasMore) return

    try {
      const result = await handleApiResponse(
        () => pagination.loadData(apiFunction, params),
        { showLoading: false, showError: true }
      )

      data.value.push(...result)
    } catch (err) {
      error.value = err
    }
  }

  // 刷新数据
  const refresh = async (params = {}) => {
    await loadFirstPage(params)
  }

  return {
    data: readonly(data),
    loading: readonly(loading),
    error: readonly(error),
    hasMore: computed(() => pagination.getState().hasMore),
    loadFirstPage,
    loadMore,
    refresh
  }
}

/**
 * 通用的表单提交处理
 * @param {Function} apiFunction - API请求函数
 * @param {Object} formData - 表单数据
 * @param {Object} options - 选项配置
 * @returns {Promise} 提交结果
 */
export async function handleFormSubmit(apiFunction, formData, options = {}) {
  const {
    showLoading = true,
    showSuccess = true,
    successMessage = '提交成功',
    successCallback = null,
    errorCallback = null
  } = options

  try {
    const result = await handleApiResponse(
      () => apiFunction(formData),
      { 
        showLoading, 
        loadingText: '提交中...',
        showError: true
      }
    )

    if (showSuccess) {
      uni.showToast({
        title: successMessage,
        icon: 'success',
        duration: 1500
      })
    }

    if (successCallback) {
      successCallback(result)
    }

    return result
  } catch (error) {
    if (errorCallback) {
      errorCallback(error)
    }
    throw error
  }
}

export default {
  handleApiResponse,
  createPaginationHandler,
  createListManager,
  handleFormSubmit
} 