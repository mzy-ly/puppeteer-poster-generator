# Puppeteer 海报生成器

一个基于 Express 和 Puppeteer 的海报生成服务，支持动态生成包含文本、图片和二维码的精美海报。

## 项目概述

本项目提供了一个 RESTful API 服务，能够根据用户提供的文本内容、图片和二维码数据，动态生成高质量的海报图片。主要特性包括：

- 🎨 精美的海报模板设计
- 🖼️ 支持自定义图片插入
- 📱 自动生成二维码
- 🚀 高性能的 Puppeteer 渲染
- 📦 简单易用的 REST API

## 前置条件

在运行本项目之前，请确保您的系统已安装以下软件：

- Node.js (推荐版本 14 或更高)
- npm 或 yarn 包管理器

## 安装与运行

### 1. 克隆项目

```bash
git clone <项目地址>
cd puppeteer-poster-generator
```

### 2. 安装依赖

```bash
npm install
```

### 3. 启动服务

```bash
npm start
```

服务将在 `http://localhost:3000` 启动。

## API 使用说明

### 生成海报

**端点：** `POST /generate-poster`

**前端调用示例：**
```javascript
const data = {
  title: "海报标题",
  subtitle: "海报副标题",
  content: "海报内容描述",
  imgUrl: "https://example.com/image.jpg",
  qrCodeData: "https://example.com"
};

axios('http://localhost:3000/generate-poster', {
    method: 'POST',
    data
}).then(res => {
    console.log('Success:', res);
}).catch((error) => {
    console.error('error:', error);
})
```

**请求体：**
```json
{
  "title": "海报标题",
  "subtitle": "海报副标题",
  "content": "海报内容描述",
  "imgUrl": "https://example.com/image.jpg",
  "qrCodeData": "https://example.com"
}
```

**响应：**
```json
{
  "success": true,
  "posterUrl": "http://localhost:3000/posters/uuid.png"
}
```

### 参数说明

- `title`: 海报主标题（可选）
- `subtitle`: 海报副标题（可选）
- `content`: 海报正文内容（可选）
- `imgUrl`: 要插入的图片 URL（可选，默认使用随机图片）
- `qrCodeData`: 二维码包含的数据（可选，提供后将自动生成二维码）

## 项目结构

```
server/
├── server.js          # 主服务文件
├── posters/           # 生成的海报存储目录
├── qrcodes/           # 生成的二维码存储目录
├── package.json       # 项目配置文件
└── README.md          # 项目说明文档
```

## 技术栈

- **Express.js** - Web 框架
- **Puppeteer** - 无头浏览器，用于渲染海报
- **qrcode** - 二维码生成库
- **uuid** - 生成唯一标识符

## 注意事项

1. 生成的海报和二维码图片会保存在服务器的 `posters` 和 `qrcodes` 目录中
2. 建议在生产环境中配置文件清理机制，定期清理生成的文件
3. 首次运行时，Puppeteer 会自动下载 Chromium 浏览器
