const fs = require('fs');
const downloadCounts = require("./downloadCounts");
const downloadHistory = require("./downloadHistory");

async function fetchAllReleasePages() {
    const headers = {
        'Accept': 'application/vnd.github.v3+json'
    };
    if (process.env.GITHUB_TOKEN) {
        console.log("Using GITHUB_TOKEN from process.env.GITHUB_TOKEN");
        headers['Authorization'] = `token ${process.env.GITHUB_TOKEN}`;
    } else {
        console.warn('process.env.GITHUB_TOKEN not found. Calling GitHub API without auth!');
    }

    let releases = [];
    let nextPage = 'https://api.github.com/repos/phcode-dev/phoenix-desktop/releases?per_page=100';  // Start with the first page

    while (nextPage) {
        const response = await fetch(nextPage, { headers });
        if (!response.ok) {
            throw new Error(`HTTP ${response.status} ${response.statusText} fetching ${nextPage}`);
        }
        const data = await response.json();
        if (!Array.isArray(data)) {
            throw new Error(`unexpected payload: releases page is not an array (${JSON.stringify(data).slice(0, 200)})`);
        }
        releases = releases.concat(data);

        const linkHeader = response.headers.get('link');
        nextPage = null; // Reset nextPage
        if (linkHeader) {
            const links = linkHeader.split(',').map(a => a.split(';'));
            const nextLink = links.find(link => link[1].includes('rel="next"'));
            if (nextLink) {
                nextPage = nextLink[0].trim().slice(1, -1); // Slice to remove the angle brackets
            }
        }
    }
    return releases;
}

// The GitHub API occasionally returns an empty/partial release list (transient glitches, rate limits, etc).
// If we blindly trust that, we publish "0 downloads" and wipe download_history.json (this happened on
// 2026-08-17 13:35 UTC). So we validate the payload and retry, and never proceed with an unusable list.
function validateReleases(releases) {
    if (!Array.isArray(releases)) return 'releases is not an array';
    if (releases.length === 0) return 'GitHub returned an empty release list';
    const prodReleases = releases.filter(r => !r.prerelease && (r.tag_name || "").startsWith("prod-app-v"));
    if (prodReleases.length === 0) return 'no prod-app-v releases in payload';
    if (!prodReleases.some(r => Array.isArray(r.assets) && r.assets.length > 0)) {
        return 'no prod release has any assets';
    }
    return null;
}

async function getReleaseDetails(attempts = 3) {
    let lastError;
    for (let attempt = 1; attempt <= attempts; attempt++) {
        try {
            const releases = await fetchAllReleasePages();
            const problem = validateReleases(releases);
            if (problem) {
                throw new Error(`unexpected payload: ${problem}`);
            }
            return releases;
        } catch (error) {
            lastError = error;
            console.warn(`[github_releases] attempt ${attempt}/${attempts} failed: ${error.message}`);
            if (attempt < attempts) {
                await new Promise(resolve => setTimeout(resolve, 5000 * attempt));
            }
        }
    }
    console.error(`[github_releases] fetch failed ${attempts} times. Last error: ${lastError && lastError.message}`);
    console.error(`[github_releases] Refusing to publish stats computed from an invalid release list.`);
    process.exit(1);
}

function ensureDirectoryExists(dirPath) {
    try {
        // The 'recursive' option ensures all parent directories are created if not existing
        fs.mkdirSync(dirPath, { recursive: true });
        console.log(`Directory '${dirPath}' is ensured (created if it didn't exist).`);
    } catch (error) {
        // This will catch any errors, like permission issues or filesystem errors
        console.error(`Error ensuring directory '${dirPath}':`, error);
    }
}

async function updateDocs() {
    ensureDirectoryExists('docs/generated');
    const releases = await getReleaseDetails();
    console.log("Releases Details from GitHub", JSON.stringify(releases, null, 2));
    // for debugging uncomment the below lines  and comment the github fetch line
    // fs.writeFileSync('temp/release.json', JSON.stringify(releases, null, 2)); // only do this once and comment
    //const releases = JSON.parse(fs.readFileSync('temp/release.json'));
    await downloadCounts.updateDownloadStats(releases);
    await downloadHistory.updateDownloadHistory(releases);
}

updateDocs();
