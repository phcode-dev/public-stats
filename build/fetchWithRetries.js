async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Fetches `url`, retries on transient failures, and validates the parsed JSON
// against `validate(data)` (returns a string describing the problem, or null).
// On final failure: exits the process unless ALLOW_HISTORY_RESET=true is set,
// in which case it returns null so the caller can proceed with a blank slate.
async function fetchWithRetries(url, validate, label, attempts = 3) {
    let lastError;
    for (let attempt = 1; attempt <= attempts; attempt++) {
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status} ${response.statusText}`);
            }
            const data = await response.json();
            const problem = validate(data);
            if (problem) {
                throw new Error(`unexpected payload: ${problem}`);
            }
            return data;
        } catch (error) {
            lastError = error;
            console.warn(`[${label}] attempt ${attempt}/${attempts} failed: ${error.message}`);
            if (attempt < attempts) {
                await sleep(1000 * attempt);
            }
        }
    }
    if (process.env.ALLOW_HISTORY_RESET === 'true') {
        console.warn(`[${label}] ALLOW_HISTORY_RESET=true; proceeding with blank slate after ${attempts} failed attempts.`);
        return null;
    }
    console.error(`[${label}] fetch failed ${attempts} times. Last error: ${lastError && lastError.message}`);
    console.error(`[${label}] Refusing to overwrite live history with a blank slate.`);
    console.error(`[${label}] If you genuinely want to start fresh, re-run with ALLOW_HISTORY_RESET=true.`);
    process.exit(1);
}

exports.fetchWithRetries = fetchWithRetries;
