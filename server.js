const express = require('express');
const cors = require('cors');
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const qrcode = require('qrcode');

const app = express();
app.use(express.json());
app.use(cors());

// 创建存储目录
const POSTER_DIR = path.join(__dirname, 'posters');
const QRCODE_DIR = path.join(__dirname, 'qrcodes');
if (!fs.existsSync(POSTER_DIR)) fs.mkdirSync(POSTER_DIR);
if (!fs.existsSync(QRCODE_DIR)) fs.mkdirSync(QRCODE_DIR);

// 提供静态文件访问
app.use('/posters', express.static(POSTER_DIR));
app.use('/qrcodes', express.static(QRCODE_DIR));

// 新增：获取基础URL的工具函数（动态域名）
const getBaseUrl = (req) => {
  // 优先使用环境变量配置的BASE_URL（如 Railway 部署时可手动设置）
  if (process.env.BASE_URL) {
    return process.env.BASE_URL;
  }
  // 从请求头动态获取域名（适用于直接访问的场景）
  const protocol = req.secure ? 'https' : 'http';
  const host = req.get('host'); // 自动获取部署后的域名（如 xxxx.railway.app）
  return `${protocol}://${host}`;
};

// 生成二维码的辅助函数（使用动态URL）
const generateQrCode = async (data, baseUrl) => {
  try {
    const qrId = uuidv4();
    const qrPath = path.join(QRCODE_DIR, `${qrId}.png`);
    
    await qrcode.toFile(qrPath, data, {
      width: 200,
      margin: 2,
      color: {
        dark: '#333333',
        light: '#ffffff'
      }
    });
    
    // 动态生成二维码访问链接（使用基础URL）
    return `${baseUrl}/qrcodes/${qrId}.png`;
  } catch (error) {
    console.error('生成二维码失败:', error);
    throw new Error('生成二维码失败');
  }
};

// 生成海报的API（使用动态URL）
app.post('/generate-poster', async (req, res) => {
  try {
    const {
      title,
      subtitle,
      content,
      imgUrl,
      qrCodeData
    } = req.body;
    
    // 1. 获取当前环境的基础URL
    const baseUrl = getBaseUrl(req);
    
    // 2. 生成二维码（传入动态baseUrl）
    let qrCodeUrl = '';
    if (qrCodeData) {
      qrCodeUrl = await generateQrCode(qrCodeData, baseUrl);
    }

    // 3. 生成海报文件
    const posterId = uuidv4();
    const outputPath = path.join(POSTER_DIR, `${posterId}.png`);

    const browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    try {
      const page = await browser.newPage();
      await page.setViewport({ width: 800, height: 1000 });

      // 4. 构建HTML内容（海报中的图片链接使用动态URL）
      const htmlContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
            <style>
              /* 保持原有样式不变 */
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
              .header { text-align: center; margin-bottom: 20px; }
              .title { font-size: 30px; color: #333; margin: 0 0 10px 0; }
              .subtitle { font-size: 20px; color: #666; margin: 0; }
              .avatar-section { display: flex; align-items: center; justify-content: center; margin: 20px 0; }
              .avatar { max-width: 100%; height: 50%; border-radius: 30px; object-fit: cover; border: 6px solid #eee; }
              .content { font-size: 24px; line-height: 1.8; color: #444; margin: 30px 0; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; line-clamp: 2; -webkit-box-orient: vertical; }
              .qr-code-section { display: flex; flex-direction: column; align-items: center; margin: 30px 0 10px 0; }
              .qr-code { width: 180px; height: 180px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
              .qr-caption { margin-top: 15px; font-size: 18px; color: #666; }
              .footer { margin-top: auto; text-align: center; color: #999; font-size: 20px; }
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
                ${content || '默认内容描述...'}
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

      await page.setContent(htmlContent);
      await page.waitForNetworkIdle();
      await page.screenshot({ path: outputPath, fullPage: true });

      // 5. 动态生成海报访问链接
      const posterUrl = `${baseUrl}/posters/${posterId}.png`;

      res.json({
        success: true,
        posterUrl: posterUrl
      });
    } finally {
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

// 启动服务器（支持环境变量指定端口，适应Railway动态端口）
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`服务器运行在端口 ${PORT}`);
});
