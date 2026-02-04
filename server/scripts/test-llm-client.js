require('dotenv').config();
const { LLMClient } = require('coze-coding-dev-sdk');

async function testLLMClient() {
  console.log('Testing LLMClient...');
  
  try {
    const client = new LLMClient({
      model: 'test-model',
      temperature: 0.7,
      maxTokens: 1000
    });
    
    console.log('LLMClient created successfully');
    console.log('Client methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(client)));
    console.log('Client:', client);
  } catch (error) {
    console.error('Error:', error);
  }
  
  process.exit(0);
}

testLLMClient();
