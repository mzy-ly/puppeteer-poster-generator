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
app.use('/assets', express.static(path.join(__dirname, 'assets')));

// 新增：获取基础URL的工具函数（动态域名）
const getBaseUrl = (req) => {
  // 优先使用环境变量配置的BASE_URL（如 Railway 部署时可手动设置）
  if (process.env.BASE_URL) {
    return process.env.BASE_URL;
  }
  // 从请求头动态获取域名（适用于直接访问的场景）
  const protocol = req.get('x-forwarded-proto') || req.protocol || 'http';
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
      content: desc,
      type='线上直播',
      time='2025年6月26日 12:34:56',
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
      await page.setViewport({ width: 310, height: 570, deviceScaleFactor: 3 });

      // 4. 构建HTML内容（海报中的图片链接使用动态URL）
      const htmlContent = `
        <!DOCTYPE html>
<html>

<head>
    <meta charset="UTF-8">
    <style>
        /* 保持原有样式不变 */
        body {
            width: 310px;
            height: 570px;
            background: transparent;
            margin: 0 auto;
        }
        #poster {
            width: 100%;
            height: 100%;
            overflow: hidden;
            background: url(${baseUrl}/assets/images/bg.png) no-repeat;
            background-size: 100% 100%;
            border-radius: 20px;
            padding: 16px;
            box-sizing: border-box;
        }
        .card{
            padding: 16px;
            background: rgba(255,255,255,0.92);
            border-radius: 16px;
        }
        .card + .card{
            margin-top: 12px;
        }
        .poster-header {
            padding: 17px 8px;
            position: relative;
        }
        .poster-header .logo-text {
            font-weight: 600;
            font-size: 22px;
            color: #FFFFFF;
            line-height: 30px;
        }
        .poster-header .logo {
            width: 96px;
            height: 96px;
            position: absolute;
            right: 0;
            top: 0;
            z-index: 0;
            transform: rotate(5.92deg);
        }
        .poster-body{
            position: relative;
        }

        .poster-body .title {
            font-size: 16px;
            color: rgba(0,0,0,0.85);
            line-height: 24px;
            margin: 0 0 10px 0;
            overflow: hidden;
            text-overflow: ellipsis;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            line-clamp: 2;
            -webkit-box-orient: vertical;
        }
        .divider {
            width: 100%;
            height: 0px;
            border: 1px dashed rgba(0,0,0,0.2);
            margin: 16px 0;
            transform: scaleY(0.5);
        }
        .poster-body .tag{
            display: inline-block;
            font-weight: 500;
            font-size: 12px;
            color: #134CB2;
            line-height: 20px;
            padding: 0 4px;
            background: rgba(60,102,255,0.1);
            border-radius: 4px;
            margin-bottom: 6px;
        }
        .poster-body .text{
            font-size: 13px;
            color: rgba(0,0,0,0.85);
            line-height: 20px;
        }
        .poster-body .content > div + div {
            margin-top: 16px;
        }
        .content-desc .text{
            overflow: hidden;
            text-overflow: ellipsis;
            display: -webkit-box;
            -webkit-line-clamp: 3;
            line-clamp: 3;
            -webkit-box-orient: vertical;
        }


        .footer-section {
            display: flex;
            align-items: center;
            justify-content: space-between;
        }

        .qr-caption img {
            display: block;
            width: 86px;
            height: 25px;
        }
        .qr-caption .text {
            font-size: 10px;
            color: rgba(0,0,0,0.53);
            line-height: 14px;
        }
        .qr-code-container {
            position: relative;
        }
        .qr-code {
            display: block;
            width: 64px;
            height: 64px;
            background: #FFFFFF;
            border-radius: 8px;
            border: 1px solid rgba(0,0,0,0.08);
        }
        .qr-code-logo {
            position: absolute;
            width: 12px;
            height: 12px;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
        }

    </style>
</head>

<body>
    <div id="poster" class="poster-container">
        <div class="poster-header">
            <div class="logo-text">
                <b>上智源社区</b>
                <br>
                <b>听AI学术报告</b>
            </div>
            <img class="logo" src="${baseUrl}/assets/images/ai-robot.png" alt="智源社区">
        </div>
        <div class="poster-body card">
            <h1 class="title">${title}</h1>
            <div class="divider"></div>
            <div class="content">
                <div class="content-desc">
                    <span class="tag">活动简介</span>
                    <div class="text">${desc}</div>
                </div>
                <div class="content-type">
                    <span class="tag">活动形式</span>
                    <div class="text">${type}</div>
                </div>
                <div class="content-time">
                    <span class="tag">活动时间</span>
                    <div class="text">${time}</div>
                </div>
            </div>
        </div>
        <div class="poster-footer card">
            <div class="footer-section">
                <div class="qr-caption">
                    <img src="${baseUrl}/assets/images/logo.svg" alt="智源社区">
                    <span class="text">长按保存图片，微信扫码参加活动</span>
                </div>
                <div class="qr-code-container">
                    <img class="qr-code" src="${qrCodeUrl}" alt="二维码">
                    <img src="${baseUrl}/assets/images/logo_baai.org.svg" alt="" class="qr-code-logo">
                </div>
            </div>
        </div>
    </div>
</body>

</html>
      `;

      await page.setContent(htmlContent);
      await page.waitForNetworkIdle();
      await page.screenshot({ path: outputPath, fullPage: true, omitBackground: true });

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
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`服务器运行在端口 ${PORT}`);
});
