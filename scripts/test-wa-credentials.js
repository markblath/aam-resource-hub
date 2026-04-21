#!/usr/bin/env node
// Run this to verify your Wild Apricot credentials are working:
// node scripts/test-wa-credentials.js
//
// Requires a .env file with WILD_APRICOT_API_KEY and WILD_APRICOT_ACCOUNT_ID set.

const fs = require("fs");
const path = require("path");

// Simple .env loader (no dependencies needed)
const envPath = path.join(__dirname, "../.env");
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, "utf8")
    .split("\n")
    .forEach((line) => {
      const [key, ...rest] = line.split("=");
      if (key && rest.length) process.env[key.trim()] = rest.join("=").trim();
    });
}

const { WILD_APRICOT_API_KEY, WILD_APRICOT_ACCOUNT_ID } = process.env;

if (!WILD_APRICOT_API_KEY || !WILD_APRICOT_ACCOUNT_ID) {
  console.error("ERROR: WILD_APRICOT_API_KEY and WILD_APRICOT_ACCOUNT_ID must be set in .env");
  process.exit(1);
}

async function test() {
  console.log("Testing Wild Apricot API Key authentication...\n");

  // Step 1: Get an access token using the API key
  const credentials = Buffer.from(`APIKEY:${WILD_APRICOT_API_KEY}`).toString("base64");

  const tokenRes = await fetch("https://oauth.wildapricot.org/auth/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials&scope=auto",
  });

  if (!tokenRes.ok) {
    console.error("FAILED — Could not get access token.");
    console.error("Status:", tokenRes.status);
    console.error("Response:", await tokenRes.text());
    return;
  }

  const { access_token } = await tokenRes.json();
  console.log("✓ API Key auth succeeded — got access token.\n");

  // Step 2: Fetch account info
  const accountRes = await fetch(
    `https://api.wildapricot.org/v2.3/accounts/${WILD_APRICOT_ACCOUNT_ID}`,
    {
      headers: {
        Authorization: `Bearer ${access_token}`,
        Accept: "application/json",
      },
    }
  );

  if (!accountRes.ok) {
    console.error("FAILED — Could not fetch account info.");
    console.error("Status:", accountRes.status);
    console.error(
      "Check that WILD_APRICOT_ACCOUNT_ID is correct:",
      WILD_APRICOT_ACCOUNT_ID
    );
    return;
  }

  const account = await accountRes.json();
  console.log("✓ Account found:");
  console.log("  Name:", account.Name);
  console.log("  ID:  ", account.Id);
  console.log("  URL: ", account.PrimaryDomainName);
  console.log("\nAll credentials working correctly.");
}

test().catch(console.error);
