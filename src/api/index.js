/**
 * API管理中心
 * 统一管理所有接口
 */

import http from '@/utils/request'

// 配置基础URL
// http.setBaseURL('/api') // 开发环境使用代理，生产环境需要修改为实际API地址
http.setBaseURL('https://service.iweekly.top/api')

// 不需要token的接口列表
const NO_TOKEN_APIS = [
  '/home/brand',  // 获取品牌列表
  '/auth/login',  // 用户登录
  '/user/wechat-login',  // 微信登录

]

// 添加请求拦截器
http.addRequestInterceptor(
  (config) => {
    // 在发送请求之前做些什么
    console.log('发送请求:', config)
    
    // 检查是否需要添加token
    const needsToken = !NO_TOKEN_APIS.some(api => config.url.includes(api))
    
    if (needsToken) {
      // 添加token到请求头
      const token = uni.getStorageSync('token')
      if (token) {
        config.header = {
          ...config.header,
          'Authorization': `Bearer ${token}`
        }
      } else {
        // 如果需要token但没有token，提示用户登录
        console.warn('接口需要token但未找到有效token:', config.url)
        uni.showToast({
          title: '请先登录',
          icon: 'none',
          duration: 2000
        })
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
      // 兼容两种返回格式：
      // 格式1: { code: 200, data: {...}, msg: "..." }
      // 格式2: 直接返回数据对象 { token: "...", user: {...} }
      
      if (data.code !== undefined) {
        // 格式1：有 code 字段
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
        // 格式2：直接返回数据对象
        // 检查是否是错误响应（通常错误会有 error 或 message 字段）
        if (data.error || (data.message && !data.token && !data.user)) {
          const message = data.error || data.message || '请求失败'
          uni.showToast({
            title: message,
            icon: 'none',
            duration: 2000
          })
          return Promise.reject(new Error(message))
        }
        // 成功：直接返回数据
        return data
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
      
      uni.showToast({
        title: '登录已过期，请重新登录',
        icon: 'none',
        duration: 2000
      })
      
      // 延迟跳转到登录页面（如果有登录页面的话）
      setTimeout(() => {
        // uni.navigateTo({
        //   url: '/pages/login/login'
        // })
        console.log('需要跳转到登录页面')
      }, 2000)
    } else {
      // 处理其他错误，避免重复显示access_token missing错误
      const message = error.errMsg || error.message || '请求失败'
      if (!message.includes('access_token missing')) {
        uni.showToast({
          title: message,
          icon: 'none',
          duration: 2000
        })
      }
    }
    
    return Promise.reject(error)
  }
)

// 用户相关接口
export const userApi = {
  // 用户登录
  login: (data) => http.post('/auth/login', data),
  
  // 微信登录
  wechatLogin: (data) => http.post('/user/wechat-login', data),
  
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