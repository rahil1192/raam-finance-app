#!/usr/bin/env node

/**
 * Keep-alive script for Render server
 * This script can be run externally to ping the server and keep it awake
 * 
 * Usage:
 * - Run locally: node keep-alive.js
 * - Set up as a cron job on your local machine
 * - Use a service like UptimeRobot or cron-job.org
 */

const fetch = require('node-fetch');

const SERVER_URL = 'https://raam-finance-app.onrender.com';

async function pingServer() {
  try {
    console.log(`🔄 Pinging server at ${SERVER_URL}...`);
    
    const response = await fetch(`${SERVER_URL}/keep-alive`, {
      method: 'GET',
      headers: {
        'User-Agent': 'Keep-Alive-Script/1.0'
      },
      timeout: 10000
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log(`✅ Server is alive! Status: ${response.status}`);
      console.log(`📅 Timestamp: ${data.timestamp}`);
      console.log(`💬 Message: ${data.message}`);
    } else {
      console.log(`⚠️ Server responded with status: ${response.status}`);
    }
  } catch (error) {
    console.error(`❌ Failed to ping server: ${error.message}`);
  }
}

// Ping immediately
pingServer();

// If running as a script, exit after pinging
if (require.main === module) {
  setTimeout(() => {
    console.log('✅ Keep-alive script completed');
    process.exit(0);
  }, 2000);
}

module.exports = { pingServer }; 