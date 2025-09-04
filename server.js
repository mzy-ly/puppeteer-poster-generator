const express = require('express');
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const qrcode = require('qrcode'); // 新增：二维码生成库

const app = express();
app.use(express.json());

// 创建存储海报和临时二维码的目录
const POSTER_DIR = path.join(__dirname, 'posters');
const QRCODE_DIR = path.join(__dirname, 'qrcodes');
if (!fs.existsSync(POSTER_DIR)) fs.mkdirSync(POSTER_DIR);
if (!fs.existsSync(QRCODE_DIR)) fs.mkdirSync(QRCODE_DIR);

// 提供静态文件访问
app.use('/posters', express.static(POSTER_DIR));
app.use('/qrcodes', express.static(QRCODE_DIR));

// 生成二维码的辅助函数
const generateQrCode = async (data) => {
  try {
    const qrId = uuidv4();
    const qrPath = path.join(QRCODE_DIR, `${qrId}.png`);
    
    // 生成二维码并保存为图片
    await qrcode.toFile(qrPath, data, {
      width: 200,
      margin: 2,
      color: {
        dark: '#333333',
        light: '#ffffff'
      }
    });
    
    return `http://localhost:3000/qrcodes/${qrId}.png`;
  } catch (error) {
    console.error('生成二维码失败:', error);
    throw new Error('生成二维码失败');
  }
};

// 生成海报的API
app.post('/generate-poster', async (req, res) => {
  try {
    const {
      title,
      subtitle,
      content,
      imgUrl,
      qrCodeData // 新增：二维码包含的数据
    } = req.body;
    
    // 生成二维码（如果提供了数据）
    let qrCodeUrl = '';
    if (qrCodeData) {
      qrCodeUrl = await generateQrCode(qrCodeData);
    }

    // 创建唯一文件名
    const posterId = uuidv4();
    const outputPath = path.join(POSTER_DIR, `${posterId}.png`);

    // 启动浏览器
    const browser = await puppeteer.launch({
      headless: 'new', // 最新无头模式
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    try {
      // 创建页面
      const page = await browser.newPage();

      // 设置页面尺寸 (海报尺寸)
      await page.setViewport({
        width: 800,
        height: 1000
      });

      // 构建HTML内容 (复杂UI布局)
      const htmlContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
            <style>
              body {
                width: 800px;
                height: 1000px;
                margin: 0;
                padding: 40px;
                background: linear-gradient(to right,#5b65f5 0%,#de81de 100%);
                font-family: 'Arial', sans-serif;
                box-sizing: border-box;
              }
              .poster-container {
                width: 100%;
                height: 100%;
                border-radius: 20px;
                background: white;
                padding: 30px;
                box-shadow: 0 10px 30px rgba(0,0,0,0.1);
                box-sizing: border-box;
              }
              .header {
                text-align: center;
                margin-bottom: 20px;
              }
              .title {
                font-size: 30px;
                color: #333;
                margin: 0 0 10px 0;
              }
              .subtitle {
                font-size: 20px;
                color: #666;
                margin: 0;
              }
              .avatar-section {
                display: flex;
                align-items: center;
                justify-content: center;
                margin: 20px 0;
              }
              .avatar {
                max-width: 100%;
                height: 50%;
                border-radius: 30px;
                object-fit: cover;
                border: 6px solid #eee;
              }
              .content {
                font-size: 24px;
                line-height: 1.8;
                color: #444;
                margin: 30px 0;
                overflow: hidden;
                text-overflow: ellipsis;
                display: -webkit-box;
                -webkit-line-clamp: 2;
                line-clamp: 2;
                -webkit-box-orient: vertical;
              }
              .qr-code-section {
                display: flex;
                flex-direction: column;
                align-items: center;
                margin: 30px 0 10px 0;
              }
              .qr-code {
                width: 180px;
                height: 180px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
              }
              .qr-caption {
                margin-top: 15px;
                font-size: 18px;
                color: #666;
              }
              .footer {
                margin-top: auto;
                text-align: center;
                color: #999;
                font-size: 20px;
              }
            </style>
          </head>
          <body>
            <div class="poster-container">
              <div class="header">
                <h1 class="title">${title || '默认标题'}</h1>
                <p class="subtitle">${subtitle || '副标题'}</p>
              </div>
              
              <div class="avatar-section">
                <img class="avatar" src="${imgUrl || 'https://picsum.photos/200'}" alt="">
              </div>
              
              <div class="content">
                ${content || '通过图形用户界面（GUI）操控计算机的智能体在处理复杂、长时、多步骤任务时，常常在效率与可靠性上表现不佳。尽管为此类智能体配备规划器有助于任务分解，但当所有动作都必须通过GUI操作完成时，其内在局限仍会导致脆弱性与低效。'}
              </div>
              
              ${qrCodeUrl ? `
                <div class="qr-code-section">
                  <img class="qr-code" src="${qrCodeUrl}" alt="二维码">
                  <p class="qr-caption">扫码了解更多</p>
                </div>
              ` : ''}
            </div>
          </body>
        </html>
      `;

      // 加载HTML内容
      await page.setContent(htmlContent);

      // 等待所有资源加载完成
      await page.waitForNetworkIdle();

      // 截取整个页面作为海报
      await page.screenshot({
        path: outputPath,
        fullPage: true, // 截取整个页面
      });

      // 生成访问链接
      const posterUrl = `http://localhost:3000/posters/${posterId}.png`;

      res.json({
        success: true,
        posterUrl: posterUrl
      });
    } finally {
      // 确保浏览器关闭
      await browser.close();
    }
  } catch (error) {
    console.error('生成海报失败:', error);
    res.status(500).json({
      success: false,
      error: '生成海报失败'
    });
  }
});

// 启动服务器
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`服务器运行在 http://localhost:${PORT}`);
});