const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const https = require('https');
require('dotenv').config();

const app = express();
const PORT = 8000;
const COUNT_FILE = path.join(__dirname, 'visitor_count.txt');

// 静态文件服务
app.use(express.static(__dirname));

// 解析JSON请求体
app.use(express.json());

// 访问统计API
app.get('/api/visitor-count', async (req, res) => {
    try {
        let count = 0;
        
        // 读取当前计数
        try {
            const data = await fs.readFile(COUNT_FILE, 'utf8');
            count = parseInt(data) || 0;
        } catch (error) {
            // 文件不存在，从0开始
            count = 0;
        }
        
        // 增加计数
        count++;
        
        // 保存新计数
        await fs.writeFile(COUNT_FILE, count.toString());
        
        res.json({ count: count });
    } catch (error) {
        console.error('Error updating visitor count:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// AI对话代理接口
app.post('/api/chat', async (req, res) => {
    const { messages } = req.body;

    if (!messages || !Array.isArray(messages)) {
        return res.status(400).json({ error: '无效的请求格式' });
    }

    const apiKey = process.env.MINIMAX_API_KEY;
    if (!apiKey) {
        return res.status(500).json({ error: '未配置API密钥' });
    }

    try {
        const requestBody = JSON.stringify({
            model: 'MiniMax-M2.7',
            messages: messages
        });

        const options = {
            hostname: 'api.minimaxi.com',
            port: 443,
            path: '/v1/chat/completions',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
                'Content-Length': Buffer.byteLength(requestBody)
            }
        };

        const proxyReq = https.request(options, (proxyRes) => {
            let data = '';
            proxyRes.on('data', (chunk) => data += chunk);
            proxyRes.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    res.json(parsed);
                } catch (e) {
                    res.status(500).json({ error: 'AI响应解析失败' });
                }
            });
        });

        proxyReq.on('error', (error) => {
            console.error('MiniMax API error:', error);
            res.status(500).json({ error: 'AI服务暂时不可用' });
        });

        proxyReq.write(requestBody);
        proxyReq.end();
    } catch (error) {
        console.error('Chat API error:', error);
        res.status(500).json({ error: '请求处理失败' });
    }
});

// 启动服务器
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running at http://0.0.0.0:${PORT}`);
    console.log(`Local access: http://localhost:${PORT}`);
});