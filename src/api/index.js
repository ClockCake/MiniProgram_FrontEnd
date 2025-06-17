/**
 * API管理中心
 * 统一管理所有接口
 */

import http from '@/utils/request'

// 配置基础URL
//http.setBaseURL('/api') // 开发环境使用代理，生产环境需要修改为实际API地址
http.setBaseURL('https://service.iweekly.top/api')

// 添加请求拦截器
http.addRequestInterceptor(
  (config) => {
    // 在发送请求之前做些什么
    console.log('发送请求:', config)
    
    // 添加token到请求头
    const token = uni.getStorageSync('token')
    if (token) {
      config.header = {
        ...config.header,
        'Authorization': `Bearer ${token}`
      }
    }
    
    // 显示加载提示（可选）
    uni.showLoading({
      title: '加载中...',
      mask: true
    })
    
    return config
  },
  (error) => {
    // 对请求错误做些什么
    console.error('请求拦截器错误:', error)
    return Promise.reject(error)
  }
)

// 添加响应拦截器
http.addResponseInterceptor(
  (response) => {
    // 隐藏加载提示
    uni.hideLoading()
    
    console.log('收到响应:', response)
    
    // 对响应数据做点什么
    const { data, statusCode } = response
    
    if (statusCode === 200) {
      // 根据统一的返回格式处理：{ code: 200, data: {...}, msg: "..." }
      if (data.code === 200) {
        // 成功：返回实际数据
        return data.data
      } else {
        // 业务错误：显示错误消息
        const message = data.msg || data.message || '请求失败'
        uni.showToast({
          title: message,
          icon: 'none',
          duration: 2000
        })
        return Promise.reject(new Error(message))
      }
    } else {
      // HTTP状态码错误
      return Promise.reject(new Error(`HTTP ${statusCode}`))
    }
  },
  (error) => {
    // 隐藏加载提示
    uni.hideLoading()
    
    // 对响应错误做点什么
    console.error('响应拦截器错误:', error)
    
    // 处理401未授权错误
    if (error.statusCode === 401) {
      // 清除本地token
      uni.removeStorageSync('token')
      // 跳转到登录页面
      uni.navigateTo({
        url: '/pages/login/login'
      })
    }
    
    return Promise.reject(error)
  }
)

// 用户相关接口
export const userApi = {
  // 用户登录
  login: (data) => http.post('/auth/login', data),
  
  // 获取用户信息
  getUserInfo: () => http.get('/user/info'),
  
}

//通用接口
export const commonApi = {
  // 首页获取手机品牌
  getBrands: () => http.get('/home/brand'),

}

// 默认导出所有API
export default {
  userApi,
  commonApi,
}

// 也可以直接导出http实例，用于自定义请求
export { http } 