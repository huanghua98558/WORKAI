const http = require('http');

const CALLBACK_URL = 'http://localhost:5001/api/worktool/callback/message?robotId=wt22phhjpt2xboerspxsote472xdnyq2';

const testMessage = {
  spoken: '这是一条端到端测试消息_新',
  rawSpoken: '这是一条端到端测试消息_新',
  receivedName: '李四',
  groupName: '福州市广优农商贸有限公司',
  groupRemark: '福州市广优农商贸有限公司',
  roomType: 1,
  atMe: false,
  textType: 1,
  timestamp: Date.now()
};

async function sendCallback() {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(testMessage);
    
    const options = {
      hostname: 'localhost',
      port: 5001,
      path: '/api/worktool/callback/message?robotId=wt22phhjpt2xboerspxsote472xdnyq2',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        'User-Agent': 'WorkTool-Webhook/2.0'
      }
    };
    
    console.log('\n========================================');
    console.log('📤 发送消息到回调接口');
    console.log('========================================');
    console.log('URL:', CALLBACK_URL);
    console.log('消息:', JSON.stringify(testMessage, null, 2));
    console.log('----------------------------------------');
    
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(body);
          console.log('✅ 响应成功');
          console.log('状态码:', res.statusCode);
          console.log('响应:', JSON.stringify(result, null, 2));
          console.log('========================================\n');
          resolve(result);
        } catch (e) {
          reject(e);
        }
      });
    });
    
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

sendCallback()
  .then(() => console.log('✅ 消息发送成功'))
  .catch(err => console.error('❌ 消息发送失败:', err.message));
