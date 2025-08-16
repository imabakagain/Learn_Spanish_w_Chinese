const express = require('express');
const fs = require('fs').promises;
const path = require('path');

const app = express();
const PORT = 8000;
const COUNT_FILE = 'visitor_count.txt';

// 静态文件服务
app.use(express.static(__dirname));

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

// 启动服务器
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running at http://0.0.0.0:${PORT}`);
    console.log(`Local access: http://localhost:${PORT}`);
});