/**
 * 测试AI角色更新API
 * 测试系统提示词是否能正确更新
 */

const http = require('http');

const options = {
  hostname: 'localhost',
  port: 5001,
  path: '/api/ai/personas',
  method: 'GET',
  headers: {
    'Content-Type': 'application/json',
  },
};

// 1. 先获取所有角色
console.log('1. 获取所有AI角色...');
const req = http.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    try {
      const result = JSON.parse(data);
      if (result.success && result.data.length > 0) {
        console.log(`✅ 找到 ${result.data.length} 个角色`);
        const firstPersona = result.data[0];
        console.log(`\n第一个角色信息:`);
        console.log(`  ID: ${firstPersona.id}`);
        console.log(`  名称: ${firstPersona.name}`);
        console.log(`  系统提示词: ${firstPersona.systemPrompt.substring(0, 50)}...`);

        // 2. 更新第一个角色的系统提示词
        console.log(`\n2. 更新角色的系统提示词...`);
        updatePersona(firstPersona.id);
      } else {
        console.log('❌ 没有找到角色');
      }
    } catch (e) {
      console.error('解析响应失败:', e);
      console.error('响应内容:', data);
    }
  });
});

req.on('error', (error) => {
  console.error('请求失败:', error);
});

req.end();

function updatePersona(personaId) {
  const newSystemPrompt = '这是一个测试的系统提示词 - 更新于 ' + new Date().toISOString();

  const updateOptions = {
    hostname: 'localhost',
    port: 5001,
    path: `/api/ai/personas/${personaId}`,
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
  };

  const updateReq = http.request(updateOptions, (res) => {
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
      try {
        const result = JSON.parse(data);
        console.log(`状态码: ${res.statusCode}`);
        console.log(`响应:`, result);

        if (result.success) {
          console.log(`✅ 角色更新成功`);
          console.log(`更新后的系统提示词: ${result.data.systemPrompt}`);

          // 3. 再次获取角色，验证更新
          console.log(`\n3. 验证更新...`);
          setTimeout(() => verifyUpdate(personaId, newSystemPrompt), 500);
        } else {
          console.log(`❌ 角色更新失败:`, result.error);
        }
      } catch (e) {
        console.error('解析响应失败:', e);
        console.error('响应内容:', data);
      }
    });
  });

  updateReq.on('error', (error) => {
    console.error('更新请求失败:', error);
  });

  updateReq.write(JSON.stringify({
    name: '测试角色',
    type: 'custom',
    category: 'service',
    description: '测试描述',
    systemPrompt: newSystemPrompt,
    temperature: 0.7,
    maxTokens: 2000,
    isActive: true
  }));

  updateReq.end();
}

function verifyUpdate(personaId, expectedPrompt) {
  const verifyOptions = {
    hostname: 'localhost',
    port: 5001,
    path: `/api/ai/personas`,
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  };

  const verifyReq = http.request(verifyOptions, (res) => {
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
      try {
        const result = JSON.parse(data);
        const persona = result.data.find(p => p.id === personaId);

        if (persona) {
          console.log(`✅ 验证成功`);
          console.log(`当前系统提示词: ${persona.systemPrompt}`);

          if (persona.systemPrompt === expectedPrompt) {
            console.log(`\n✅✅✅ 系统提示词更新成功且验证通过！`);
          } else {
            console.log(`\n❌❌❌ 系统提示词不匹配！`);
            console.log(`期望: ${expectedPrompt}`);
            console.log(`实际: ${persona.systemPrompt}`);
          }
        } else {
          console.log(`❌ 未找到角色`);
        }
      } catch (e) {
        console.error('解析响应失败:', e);
        console.error('响应内容:', data);
      }
    });
  });

  verifyReq.on('error', (error) => {
    console.error('验证请求失败:', error);
  });

  verifyReq.end();
}
