const http = require('http');

const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/flow-engine/definitions?limit=50',
  method: 'GET',
};

const req = http.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    try {
      const parsed = JSON.parse(data);
      console.log('Status:', res.statusCode);
      console.log('Success:', parsed.success);
      console.log('Total:', parsed.total);
      console.log('Data length:', parsed.data ? parsed.data.length : 0);
      if (parsed.data && parsed.data.length > 0) {
        console.log('First flow:', parsed.data[0].name);
        console.log('Last flow:', parsed.data[parsed.data.length - 1].name);
      }
    } catch (e) {
      console.error('Parse error:', e);
      console.log('Raw data:', data.substring(0, 500));
    }
  });
});

req.on('error', (e) => {
  console.error('Request error:', e);
});

req.end();
