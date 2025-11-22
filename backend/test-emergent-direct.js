/**
 * Direct test of Emergent LLM integration
 */

require('dotenv').config();
const OpenAI = require('openai');

const EMERGENT_LLM_KEY = process.env.EMERGENT_LLM_KEY;

console.log('Testing Emergent LLM Direct Integration\n');
console.log('='.repeat(50));
console.log('Key present:', EMERGENT_LLM_KEY ? 'YES' : 'NO');
console.log('Key value:', EMERGENT_LLM_KEY);
console.log('='.repeat(50));

const openaiClient = new OpenAI({
  apiKey: EMERGENT_LLM_KEY,
  baseURL: 'https://llm.kindo.ai/v1'
});

async function testEmergentLLM() {
  try {
    console.log('\n📝 Sending test message...');
    
    const response = await openaiClient.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: 'Say "Hello! I am working correctly." and nothing else.' }
      ],
    });

    console.log('\n✅ Success!');
    console.log('Response:', response.choices[0].message.content);
    
  } catch (error) {
    console.error('\n❌ Error:');
    console.error('Message:', error.message);
    console.error('Status:', error.status);
    console.error('Type:', error.type);
    console.error('Code:', error.code);
    
    if (error.response) {
      console.error('Response data:', JSON.stringify(error.response.data, null, 2));
    }
    
    console.error('\nFull error:', error);
  }
}

testEmergentLLM();
