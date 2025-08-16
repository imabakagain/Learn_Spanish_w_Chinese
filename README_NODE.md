# Node.js 服务器启动说明

## 安装步骤

1. 安装 Node.js (如果还没有安装)
   - 下载地址：https://nodejs.org/

2. 安装依赖
   ```bash
   npm install
   ```

3. 启动服务器
   ```bash
   npm start
   ```

4. 访问应用
   - 打开浏览器访问：http://localhost:3000

## 功能说明

- 服务器会自动创建 `visitor_count.txt` 文件来记录访问次数
- 每次访问页面时，访问次数会自动增加
- 如果服务器启动失败，前端会显示 '--' 作为错误提示

## 部署到生产环境

可以使用以下平台部署：
- Heroku
- Vercel
- Netlify (需要使用Serverless Functions)
- AWS
- 阿里云/腾讯云等