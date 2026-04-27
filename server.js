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
      content='详细内容，可微信扫描下方二维码，查看活动详情页，获得活动具体介绍，期待你的参与哦~',
      type='线上直播',
      time='2025年6月26日 12:34',
      qrCodeData,
      userList = []
    } = req.body;
    
    // 1. 获取当前环境的基础URL
    const baseUrl = getBaseUrl(req);
    
    // 2. 生成二维码（传入动态baseUrl）
    let qrCodeUrl = '';
    if (qrCodeData) {
      qrCodeUrl = await generateQrCode(qrCodeData, baseUrl);
    }

    let userListHtml = '';
    if (userList.length > 0) {
        const userInfo = userList.splice(0, 3); // 只取前3个用户展示
        const html = userInfo.map(user => `
            <div class="user-item">
                <div class="user-item-thumb">
                <img class="avatar" src="${user.avatar_url}" alt="${user.name}">
                </div>
                <div class="user-item-body">
                    <div class="user-name">${user.name}</div>
                    <div class="user-desc">${user.company} ${user.position}</div>
                </div>
            </div>
        `).join('');
        userListHtml = `
            <div class="content-users card">
                <span class="tag">活动嘉宾</span>
                <div class="user-list">
                    ${html}
                </div>
            </div>
        `;
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
        *{
            box-sizing: border-box;
        }
        body {
            width: 750px;
            background: transparent;
            margin: 0 auto;
        }
        .poster-container {
            width: 100%;
            height: 100%;
            overflow: hidden;
            background: url(${baseUrl}/assets/images/bg.png) no-repeat;
            background-size: cover;
            background-position: center 370px;
        }
        .card{
            padding: 58px 26px 28px;
            border-radius: 20px;
            background: rgba(255, 255, 255, 0.4);
            box-shadow: 0px 4px 10px 0px #ACD3FC,inset 0px 0px 2px 2px rgba(255, 255, 255, 0.9);
            position: relative;
        }
        .card + .card{
            margin-top: 36px;
        }
        .poster-header {
            height: 370px;
            position: relative;
            background: url(${baseUrl}/assets/images/ai-robot.png) no-repeat;
            background-size: cover;
        }

        .poster-body{
            position: relative;
            margin-top: -82px;
        }
        .poster-body::after {
            position: absolute;
            bottom: -185px;
            left: -127px;
            content: '';
            width: 707px;
            height: 692px;
            background: url(./assets/images/AI.png) no-repeat;
            background-size: cover;
            z-index: 1;
        }
        .poster-body-main {
            position: relative;
            z-index: 2;
            padding: 0 54px 64px 48px;
        }

        .title-container {
            padding: 0 16px;
            background: linear-gradient(90deg, #E8F46C 0%, #58F0F5 100%);
            border-radius: 20px;
            margin-bottom: 47px;
        }
        .title-container .title {
            margin: 0;
            padding: 18px 52px;
            text-align: center;
            font-family: Alimama ShuHeiTi;
            font-size: 32px;
            font-weight: bold;
            color: #FFFFFF;
            border-radius: 20px;
            background: linear-gradient(90deg, #0172FF 3%, #003CFF 92%);
        }

        .poster-body .tag{
            display: inline-block;
            font-family: Source Han Sans;
            font-size: 32px;
            font-weight: bold;
            color: #FFFFFF;
            padding: 20px 50px 16px;
            background: url(${baseUrl}/assets/images/tag-bg.png) no-repeat;
            background-size: 100% 100%;
            margin-bottom: 6px;
            position: absolute;
            top: -27px;
            left: -12px;
        }
        .poster-body .text{
            font-family: Source Han Sans;
            font-size: 22px;
            font-weight: normal;
            line-height: 40px;
            color: #2D539E;
        }

        .content-desc .text{
            text-indent: 44px;
        }

        .user-item{
            display: flex;
            align-items: center;
        }
        .user-item + .user-item{
            margin-top: 25px;
        }
        .user-item-thumb{
            margin-right: 17px;
        }
        .user-item .avatar{
            display: block;
            width: 74px;
            height: 74px;
            border-radius: 50%;
            object-fit: cover;
        }
        .user-item .user-item-body{
            flex: 1;
            font-family: Source Han Sans;
            line-height: 40px;
            color: #2D539E;
        }
        .user-item .user-name{
            width: fit-content;
            font-size: 24px;
            font-weight: bold;
            padding: 0 20px;
            background: linear-gradient(90deg, #E3FF13 0%, #60F0F0 100%);
        }
        .user-item .user-desc{
            font-size: 22px;
            overflow: hidden;
            text-overflow: ellipsis;
            display: -webkit-box;
            -webkit-line-clamp: 1;
            line-clamp: 1;
            -webkit-box-orient: vertical;
        }


        .footer-section {
            margin-top: 24px;
            display: flex;
            align-items: end;
            justify-content: space-between;
        }

        .qr-caption img {
            display: block;
            width: 166px;
            height: 48px;
        }
        .qr-caption .text {
            font-size: 10px;
            color: rgba(0,0,0,0.53);
            line-height: 14px;
        }
        .qr-code-container {
            display: flex;
        }
        .qr-code-item {
            margin-left: 16px;
            text-align: center;
            padding: 12px 12px 0;
            border-radius: 20px;
            background: linear-gradient(180deg, #E3FF13 0%, #60F0F0 100%);
        }
        .qr-code {
            display: block;
            width: 178px;
            height: 178px;
        }
        .qr-code-item .text {
            display: block;
            font-family: Source Han Sans;
            font-size: 22px;
            font-weight: bold;
            color: #2D539E;
        }

    </style>
</head>

<body>
    <div class="poster-container">
        <div class="poster-header"></div>
        <div class="poster-body">
            <div class="poster-body-main">
                <div class="title-container">
                    <h1 class="title">${title}</h1>
                </div>
                <div class="content">
                    <div class="content-desc card">
                        <span class="tag">活动介绍</span>
                        <div class="text">${content}</div>
                    </div>
                    ${userListHtml}
                    <div class="content-time card">
                        <span class="tag">活动时间</span>
                        <div class="text">${time} ${type}</div>
                    </div>
                </div>
                <div class="footer-section">
                    <div class="qr-caption">
                        <img src="${baseUrl}/assets/images/logo.svg" alt="智源社区">
                    </div>
                    <div class="qr-code-container">
                        <div class="qr-code-item">
                            <img class="qr-code" src="${qrCodeUrl}" alt="立即报名">
                            <span class="text">立即报名</span>
                        </div>
                        <div class="qr-code-item">
                            <img class="qr-code" src="${baseUrl}/assets/images/qrcode-baai.jpg" alt="关注社区">
                            <span class="text">关注社区</span>
                        </div>
                    </div>
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
