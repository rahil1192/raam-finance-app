const cron = require("cron");
const https = require("https");

// Validate API_URL is set
if (!process.env.API_URL) {
  console.error("❌ CRON JOB ERROR: API_URL environment variable is not set!");
  console.error("Please set API_URL in your Render environment variables.");
}

const job = new cron.CronJob("*/14 * * * *", function () {
  console.log("🕐 Cron job executing at:", new Date().toISOString());
  
  if (!process.env.API_URL) {
    console.error("❌ Skipping cron job - API_URL not configured");
    return;
  }

  const healthUrl = `${process.env.API_URL}/health`;
  console.log("📡 Making request to:", healthUrl);
  
  https
    .get(healthUrl, (res) => {
      if (res.statusCode === 200) {
        console.log("✅ Health check request sent successfully");
      } else {
        console.log("⚠️ Health check request failed with status:", res.statusCode);
      }
    })
    .on("error", (e) => {
      console.error("❌ Error while sending health check request:", e.message);
    });
});

module.exports = job;


// CRON JOB EXPLANATION:
// Cron jobs are scheduled tasks that run periodically at fixed intervals
// we want to send 1 GET request for every 14 minutes

// How to define a "Schedule"?
// You define a schedule using a cron expression, which consists of 5 fields representing:

//! MINUTE, HOUR, DAY OF THE MONTH, MONTH, DAY OF THE WEEK

//? EXAMPLES && EXPLANATION:
//* 14 * * * * - Every 14 minutes
//* 0 0 * * 0 - At midnight on every Sunday
//* 30 3 15 * * - At 3:30 AM, on the 15th of every month
//* 0 0 1 1 * - At midnight, on January 1st
//* 0 * * * * - Every hour