/**
 * Test script for chatbot fallback mechanism
 * Tests both OpenRouter (primary) and Emergent LLM (fallback)
 */

const axios = require('axios');
const jwt = require('jsonwebtoken');

const BASE_URL = 'http://localhost:8001';
const TEST_USER_ID = '69210154df62757bc4e3518c'; // From database
const JWT_SECRET = process.env.JWT_SECRET || 'UwC5vUfhnPmO9gfBCLEyysSa5zrXqWNhthVEffTzhLM4vogvaIcze0CfI70vpbYifsL7YYM0bpZaEPPQ/FOokg==';

// Generate test token
const token = jwt.sign({ userId: TEST_USER_ID }, JWT_SECRET, { expiresIn: '1h' });

async function testChatbot() {
  console.log('🧪 Testing Chatbot Fallback Mechanism\n');
  console.log('=' .repeat(50));
  
  try {
    // Test 1: Simple chat message (should use OpenRouter if available)
    console.log('\n📝 Test 1: Simple chat message');
    console.log('-'.repeat(50));
    
    const response1 = await axios.post(
      `${BASE_URL}/api/chatbot/chat`,
      {
        message: 'Hello! Can you tell me what you can help me with?',
        conversationHistory: []
      },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        timeout: 60000
      }
    );
    
    console.log('✅ Response received:');
    console.log(`   Used Fallback: ${response1.data.usedFallback ? '✓ YES (Emergent LLM)' : '✗ NO (OpenRouter)'}`);
    console.log(`   Response length: ${response1.data.response.length} characters`);
    console.log(`   Response preview: ${response1.data.response.substring(0, 100)}...`);
    
    // Test 2: Query with tool usage
    console.log('\n📝 Test 2: Query that might trigger tools');
    console.log('-'.repeat(50));
    
    const response2 = await axios.post(
      `${BASE_URL}/api/chatbot/chat`,
      {
        message: 'Show me my account statistics',
        conversationHistory: []
      },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        timeout: 60000
      }
    );
    
    console.log('✅ Response received:');
    console.log(`   Used Fallback: ${response2.data.usedFallback ? '✓ YES (Emergent LLM)' : '✗ NO (OpenRouter)'}`);
    console.log(`   Tools Used: ${response2.data.toolsUsed ? '✓ YES' : '✗ NO'}`);
    console.log(`   Response length: ${response2.data.response.length} characters`);
    
    if (response2.data.toolResults) {
      console.log(`   Tool Results: ${JSON.stringify(response2.data.toolResults, null, 2)}`);
    }
    
    console.log('\n' + '='.repeat(50));
    console.log('✅ All tests completed successfully!');
    console.log('='.repeat(50));
    
    // Summary
    console.log('\n📊 Summary:');
    console.log(`   Test 1 used: ${response1.data.usedFallback ? 'Emergent LLM (Fallback)' : 'OpenRouter (Primary)'}`);
    console.log(`   Test 2 used: ${response2.data.usedFallback ? 'Emergent LLM (Fallback)' : 'OpenRouter (Primary)'}`);
    
  } catch (error) {
    console.error('\n❌ Test failed:');
    console.error('   Error:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', JSON.stringify(error.response.data, null, 2));
    }
    process.exit(1);
  }
}

// Run tests
testChatbot();
