const axios = require('axios');

async function testRobotApi() {
  const robotId = 'wt22phhjpt2xboerspxsote472xdnyq2';
  const apiUrl = `https://api.worktool.ymdyes.cn/robot/robotInfo/get`;

  console.log('正在测试 WorkTool 机器人 API...');
  console.log(`URL: ${apiUrl}`);
  console.log(`Robot ID: ${robotId}\n`);

  try {
    const response = await axios.get(apiUrl, {
      params: { robotId },
      headers: { 'Content-Type': 'application/json' },
      timeout: 10000
    });

    console.log('✅ API 调用成功！');
    console.log(`HTTP 状态码: ${response.status}\n`);
    console.log('返回数据:');
    console.log(JSON.stringify(response.data, null, 2));

    if (response.data.code === 200 && response.data.data) {
      const data = response.data.data;
      console.log('\n--- 提取的字段 ---');
      console.log(`机器人ID: ${data.robotId}`);
      console.log(`昵称: ${data.name}`);
      console.log(`企业: ${data.corporation}`);
      console.log(`首次登录: ${data.firstLogin}`);
      console.log(`授权过期: ${data.authExpir}`);
      console.log(`消息回调: ${data.openCallback === 1 ? '开启' : '关闭'}`);
      console.log(`回调URL: ${data.callbackUrl || '无'}`);
    }

  } catch (error) {
    console.error('❌ API 调用失败！');
    if (error.response) {
      console.error(`状态码: ${error.response.status}`);
      console.error(`响应: ${JSON.stringify(error.response.data)}`);
    } else {
      console.error(`错误: ${error.message}`);
    }
  }
}

testRobotApi();
