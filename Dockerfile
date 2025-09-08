# 使用官方Node.js镜像作为基础
FROM node:18-slim

# 设置工作目录
WORKDIR /app

# 安装系统依赖（Puppeteer需要的浏览器依赖）
RUN apt-get update && apt-get install -y \
    chromium \
    fonts-ipafont-gothic \
    fonts-wqy-zenhei \
    fonts-thai-tlwg \
    fonts-kacst \
    fonts-freefont-ttf \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# 设置环境变量，告诉Puppeteer使用已安装的Chromium
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

# 复制package.json和package-lock.json
COPY package*.json ./

# 安装依赖
RUN npm install

# 复制项目文件
COPY . .

# 创建存储海报和二维码的目录
RUN mkdir -p posters qrcodes

# 暴露端口
EXPOSE 3000

# 启动命令
CMD ["node", "server.js"]
    
