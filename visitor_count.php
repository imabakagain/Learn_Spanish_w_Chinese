<?php
// 访问统计API
$countFile = 'visitor_count.txt';

// 读取当前计数
if (file_exists($countFile)) {
    $count = (int)file_get_contents($countFile);
} else {
    $count = 0;
}

// 增加计数
$count++;

// 保存新计数
file_put_contents($countFile, $count);

// 返回JSON响应
header('Content-Type: application/json');
echo json_encode(['count' => $count]);
?>