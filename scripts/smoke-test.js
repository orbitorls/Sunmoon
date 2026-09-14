#!/usr/bin/env node

/**
 * Simple smoke test for SEAPALO tide prediction app
 * Tests basic functionality and API endpoints
 */

const http = require('http');

const BASE_URL = 'http://localhost:3000';

async function testEndpoint(url, description) {
  return new Promise((resolve) => {
    console.log(`Testing ${description}...`);

    const req = http.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        console.log(`Response status: ${res.statusCode}`);
        if (res.statusCode === 200) {
          console.log(`✅ ${description} - OK`);
          resolve(true);
        } else {
          console.log(`❌ ${description} - Status: ${res.statusCode}`);
          resolve(false);
        }
      });
    });

    req.on('error', (err) => {
      console.log(`❌ ${description} - Error: ${err.message}`);
      console.log(`Error code: ${err.code}`);
      resolve(false);
    });

    req.setTimeout(10000, () => {
      console.log(`❌ ${description} - Timeout`);
      req.destroy();
      resolve(false);
    });
  });
}

async function runSmokeTests() {
  console.log('🚀 Running SEAPALO Smoke Tests\n');

  const tests = [
    { url: `${BASE_URL}/`, description: 'Main page load' },
    // { url: `${BASE_URL}/api/health`, description: 'Health check endpoint' },
  ];

  let passed = 0;
  let total = tests.length;

  for (const test of tests) {
    if (await testEndpoint(test.url, test.description)) {
      passed++;
    }
  }

  console.log(`\n📊 Results: ${passed}/${total} tests passed`);

  if (passed === total) {
    console.log('🎉 All smoke tests passed!');
    process.exit(0);
  } else {
    console.log('💥 Some tests failed. Check the application.');
    process.exit(1);
  }
}

runSmokeTests().catch((err) => {
  console.error('💥 Smoke test runner failed:', err);
  process.exit(1);
});