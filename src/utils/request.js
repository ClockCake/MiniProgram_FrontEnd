/**
 * 网络请求框架
 * 基于uniapp的uni.request封装
 */

// 请求配置
const config = {
  baseURL: '/api', // 开发环境使用代理，生产环境需要修改为实际API地址
  // baseURL: 'https://service.iweekly.top/api',
  timeout: 10000, // 超时时间
  header: {
    'Content-Type': 'application/json'
  }
}

// 响应状态码枚举
const StatusCode = {
  SUCCESS: 200,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  SERVER_ERROR: 500,
  NETWORK_ERROR: -1
}

// 请求拦截器队列
const requestInterceptors = []
// 响应拦截器队列
const responseInterceptors = []

/**
 * 添加请求拦截器
 * @param {Function} fulfilled 成功回调
 * @param {Function} rejected 失败回调
 */
function addRequestInterceptor(fulfilled, rejected) {
  requestInterceptors.push({ fulfilled, rejected })
}

/**
 * 添加响应拦截器
 * @param {Function} fulfilled 成功回调
 * @param {Function} rejected 失败回调
 */
function addResponseInterceptor(fulfilled, rejected) {
  responseInterceptors.push({ fulfilled, rejected })
}

/**
 * 执行请求拦截器
 * @param {Object} config 请求配置
 * @returns {Object} 处理后的配置
 */
async function executeRequestInterceptors(config) {
  let processedConfig = config
  
  for (const interceptor of requestInterceptors) {
    try {
      if (interceptor.fulfilled) {
        processedConfig = await interceptor.fulfilled(processedConfig)
      }
    } catch (error) {
      if (interceptor.rejected) {
        return await interceptor.rejected(error)
      }
      throw error
    }
  }
  
  return processedConfig
}

/**
 * 执行响应拦截器
 * @param {Object} response 响应数据
 * @returns {Object} 处理后的响应
 */
async function executeResponseInterceptors(response) {
  let processedResponse = response
  
  for (const interceptor of responseInterceptors) {
    try {
      if (interceptor.fulfilled) {
        processedResponse = await interceptor.fulfilled(processedResponse)
      }
    } catch (error) {
      if (interceptor.rejected) {
        return await interceptor.rejected(error)
      }
      throw error
    }
  }
  
  return processedResponse
}

/**
 * 统一错误处理
 * @param {Object} error 错误信息
 */
function handleError(error) {
  console.error('网络请求错误:', error)
  
  let message = '网络请求失败'
  
  if (error.statusCode) {
    switch (error.statusCode) {
      case StatusCode.UNAUTHORIZED:
        message = '未授权，请重新登录'
        // 可以在这里处理跳转到登录页面的逻辑
        break
      case StatusCode.FORBIDDEN:
        message = '拒绝访问'
        break
      case StatusCode.NOT_FOUND:
        message = '请求资源不存在'
        break
      case StatusCode.SERVER_ERROR:
        message = '服务器内部错误'
        break
      default:
        message = error.errMsg || '网络请求失败'
    }
  } else if (error.errMsg) {
    if (error.errMsg.includes('timeout')) {
      message = '请求超时'
    } else if (error.errMsg.includes('fail')) {
      message = '网络连接失败'
    }
  }
  
  // 显示错误提示
  uni.showToast({
    title: message,
    icon: 'none',
    duration: 2000
  })
  
  return Promise.reject(error)
}

/**
 * 核心请求方法
 * @param {Object} options 请求配置
 * @returns {Promise} 请求Promise
 */
function request(options = {}) {
  return new Promise(async (resolve, reject) => {
    try {
      // 合并默认配置
      let requestConfig = {
        ...config,
        ...options,
        url: options.url.startsWith('http') ? options.url : config.baseURL + options.url,
        header: {
          ...config.header,
          ...options.header
        }
      }
      
      // 执行请求拦截器
      requestConfig = await executeRequestInterceptors(requestConfig)
      
      // 发起请求
      uni.request({
        ...requestConfig,
        success: async (res) => {
          try {
            // 构造响应对象
            const response = {
              data: res.data,
              statusCode: res.statusCode,
              header: res.header,
              config: requestConfig
            }
            
            // 执行响应拦截器
            const processedResponse = await executeResponseInterceptors(response)
            resolve(processedResponse)
          } catch (error) {
            reject(await handleError(error))
          }
        },
        fail: async (error) => {
          reject(await handleError({
            ...error,
            statusCode: StatusCode.NETWORK_ERROR
          }))
        }
      })
    } catch (error) {
      reject(await handleError(error))
    }
  })
}

/**
 * GET请求
 * @param {String} url 请求地址
 * @param {Object} params 请求参数
 * @param {Object} options 其他配置
 * @returns {Promise} 请求Promise
 */
function get(url, params = {}, options = {}) {
  return request({
    url,
    method: 'GET',
    data: params,
    ...options
  })
}

/**
 * POST请求
 * @param {String} url 请求地址
 * @param {Object} data 请求数据
 * @param {Object} options 其他配置
 * @returns {Promise} 请求Promise
 */
function post(url, data = {}, options = {}) {
  return request({
    url,
    method: 'POST',
    data,
    ...options
  })
}

/**
 * PUT请求
 * @param {String} url 请求地址
 * @param {Object} data 请求数据
 * @param {Object} options 其他配置
 * @returns {Promise} 请求Promise
 */
function put(url, data = {}, options = {}) {
  return request({
    url,
    method: 'PUT',
    data,
    ...options
  })
}

/**
 * DELETE请求
 * @param {String} url 请求地址
 * @param {Object} params 请求参数
 * @param {Object} options 其他配置
 * @returns {Promise} 请求Promise
 */
function del(url, params = {}, options = {}) {
  return request({
    url,
    method: 'DELETE',
    data: params,
    ...options
  })
}

/**
 * 文件上传
 * @param {String} url 上传地址
 * @param {String} filePath 文件路径
 * @param {Object} formData 附加表单数据
 * @param {Object} options 其他配置
 * @returns {Promise} 上传Promise
 */
function upload(url, filePath, formData = {}, options = {}) {
  return new Promise((resolve, reject) => {
    const uploadTask = uni.uploadFile({
      url: url.startsWith('http') ? url : config.baseURL + url,
      filePath,
      name: options.name || 'file',
      formData,
      header: {
        ...config.header,
        ...options.header
      },
      success: (res) => {
        try {
          const data = typeof res.data === 'string' ? JSON.parse(res.data) : res.data
          resolve({
            data,
            statusCode: res.statusCode
          })
        } catch (error) {
          reject(error)
        }
      },
      fail: (error) => {
        handleError(error)
        reject(error)
      }
    })
    
    // 如果需要监听上传进度
    if (options.onProgress) {
      uploadTask.onProgressUpdate(options.onProgress)
    }
  })
}

/**
 * 设置基础URL
 * @param {String} url 基础URL
 */
function setBaseURL(url) {
  config.baseURL = url
}

/**
 * 设置请求头
 * @param {Object} headers 请求头对象
 */
function setHeaders(headers) {
  config.header = {
    ...config.header,
    ...headers
  }
}

/**
 * 设置超时时间
 * @param {Number} timeout 超时时间（毫秒）
 */
function setTimeout(timeout) {
  config.timeout = timeout
}

// 导出API
export default {
  request,
  get,
  post,
  put,
  delete: del,
  upload,
  setBaseURL,
  setHeaders,
  setTimeout,
  addRequestInterceptor,
  addResponseInterceptor,
  StatusCode
}

// 导出各个方法以支持按需引入
export {
  request,
  get,
  post,
  put,
  del as delete,
  upload,
  setBaseURL,
  setHeaders,
  setTimeout,
  addRequestInterceptor,
  addResponseInterceptor,
  StatusCode
} 