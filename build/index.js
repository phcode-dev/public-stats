const fs = require('fs');
const downloadCounts = require("./downloadCounts");
const downloadHistory = require("./downloadHistory");

async function getReleaseDetails() {
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
        const data = await response.json();
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
    // for debugging uncomment the below lines  and comment the github fetch line
    // fs.writeFileSync('temp/release.json', JSON.stringify(releases, null, 2)); // only do this once and comment
    //const releases = JSON.parse(fs.readFileSync('temp/release.json'));
    await downloadCounts.updateDownloadStats(releases);
    await downloadHistory.updateDownloadHistory(releases);
}

updateDocs();
