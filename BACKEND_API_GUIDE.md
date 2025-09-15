# 🔐 微信登录后端接口设计指南

## 📡 接口定义

### POST /api/auth/wechat-login

**请求参数**：
```json
{
  "code": "0b2WdZZv3mKpD53fVe1w3horKf2WdZZK",  // 微信登录临时code
  "userInfo": {
    "nickName": "微信用户",
    "avatarUrl": "https://thirdwx.qlogo.cn/mmopen/...",
    "gender": 0,
    "city": "",
    "province": "",
    "country": ""
  },
  "encryptedData": "j3hr4DRvPb9xQSjliHQPbm...",  // 可选：加密用户数据
  "iv": "SkeIjy8SlJZmrY1AhJi6MQ==",           // 可选：解密向量
  "signature": "6f09414fcfb6e9a3df587df1..."    // 可选：数据签名
}
```

**响应格式**：
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "isNewUser": true,  // true=新注册用户, false=已存在用户
    "user": {
      "id": 12345,
      "openid": "ox1234567890abcdef",  // 微信openid（不返回给前端，仅内部使用）
      "nickName": "微信用户",
      "avatarUrl": "https://thirdwx.qlogo.cn/mmopen/...",
      "phone": "",      // 业务字段：手机号
      "email": "",      // 业务字段：邮箱
      "level": 1,       // 业务字段：用户等级
      "points": 0,      // 业务字段：积分
      "createdAt": "2025-09-15T10:30:00Z",
      "updatedAt": "2025-09-15T10:30:00Z"
    }
  }
}
```

## 🔧 后端实现逻辑

### 1. 获取openid（核心步骤）
```javascript
// 使用code换取openid
const wechatResponse = await axios.get('https://api.weixin.qq.com/sns/jscode2session', {
  params: {
    appid: 'your_app_id',
    secret: 'your_app_secret', 
    js_code: code,
    grant_type: 'authorization_code'
  }
})

const { openid, session_key, unionid } = wechatResponse.data
```

### 2. 用户查找或创建
```javascript
// 根据openid查找用户
let user = await User.findOne({ openid })

if (!user) {
  // 新用户：创建账户
  user = await User.create({
    openid,
    unionid,
    nickName: userInfo.nickName,
    avatarUrl: userInfo.avatarUrl,
    gender: userInfo.gender,
    city: userInfo.city,
    province: userInfo.province,
    country: userInfo.country,
    // 初始化业务字段
    level: 1,
    points: 0,
    status: 'active'
  })
  
  isNewUser = true
} else {
  // 老用户：更新信息
  await user.update({
    nickName: userInfo.nickName,
    avatarUrl: userInfo.avatarUrl,
    lastLoginAt: new Date()
  })
  
  isNewUser = false
}
```

### 3. 生成JWT Token
```javascript
const token = jwt.sign(
  { 
    userId: user.id, 
    openid: user.openid 
  },
  'your_jwt_secret',
  { expiresIn: '7d' }
)
```

## 🗄️ 数据库设计

### users表结构
```sql
CREATE TABLE users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  openid VARCHAR(100) UNIQUE NOT NULL,    -- 微信openid（唯一标识）
  unionid VARCHAR(100),                   -- 微信unionid（可选）
  session_key VARCHAR(100),               -- 微信session_key
  
  -- 微信用户信息
  nick_name VARCHAR(100),
  avatar_url TEXT,
  gender TINYINT DEFAULT 0,               -- 0:未知 1:男 2:女
  city VARCHAR(50),
  province VARCHAR(50),
  country VARCHAR(50),
  
  -- 业务字段
  phone VARCHAR(20),
  email VARCHAR(100),
  level INT DEFAULT 1,
  points INT DEFAULT 0,
  status ENUM('active', 'inactive', 'banned') DEFAULT 'active',
  
  -- 时间字段
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  last_login_at TIMESTAMP,
  
  INDEX idx_openid (openid),
  INDEX idx_phone (phone)
);
```

## 🎯 关键要点

1. **openid是唯一标识**：
   - ✅ 每个用户在每个小程序中openid唯一且固定
   - ✅ 用openid作为数据库主键关联
   - ❌ 不要用code（临时且会变化）

2. **新用户vs老用户判断**：
   - 根据openid查询数据库
   - 不存在 = 新用户（创建记录）
   - 存在 = 老用户（更新信息）

3. **安全考虑**：
   - openid不要返回给前端
   - 使用JWT token进行后续认证
   - session_key用于解密敏感数据

4. **前端处理**：
   - 根据`isNewUser`字段判断是否显示新手引导
   - 保存完整的用户信息（前端+后端数据）
   - 使用token进行后续API调用

## 🔄 完整流程

1. **前端**：获取code和用户信息 → 发送给后端
2. **后端**：code换openid → 查找/创建用户 → 返回token和用户数据
3. **前端**：保存token和完整用户信息 → 显示对应UI

这样您就可以完美实现："未注册用户自动注册，已注册用户直接登录"的业务逻辑！
