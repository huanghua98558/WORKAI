// 在浏览器控制台运行此代码
(async function testAILogs() {
    console.log('=== 测试 AI 日志 API ===');

    try {
        // 测试 1: 直接调用后端 API
        console.log('\n1. 测试后端 API (http://localhost:5001)...');
        const backendResponse = await fetch('http://localhost:5001/api/monitoring/ai-logs?limit=5');
        const backendData = await backendResponse.json();
        console.log('后端 API 响应:', backendData);
        console.log('记录数量:', backendData.data?.length);
        console.log('最新记录:', backendData.data?.[0]);

        // 测试 2: 调用前端代理 API
        console.log('\n2. 测试前端代理 API...');
        const proxyResponse = await fetch('/api/monitoring/ai-logs?limit=5');
        const proxyData = await proxyResponse.json();
        console.log('代理 API 响应:', proxyData);
        console.log('记录数量:', proxyData.data?.length);
        console.log('最新记录:', proxyData.data?.[0]);

        // 测试 3: 测试数据适配器
        console.log('\n3. 测试数据适配...');
        if (proxyData.code === 0 && Array.isArray(proxyData.data)) {
            const adapted = proxyData.data.map(log => ({
                id: log.id,
                status: log.status === 'success' ? 'completed' : log.status,
                createdAt: log.createdAt,
                inputTokens: log.inputTokens,
                outputTokens: log.outputTokens,
                totalTokens: log.totalTokens
            }));
            console.log('适配后的数据:', adapted);
        }

        console.log('\n=== 测试完成 ===');
    } catch (error) {
        console.error('测试失败:', error);
    }
})();
