const fs = require('fs');
const {SUFFIX_TO_NAME_MAP, RELEASE_ASSET_SUFFIXES_ALL} = require("./constants");

const ALL_SUFFIXES = Object.values(RELEASE_ASSET_SUFFIXES_ALL);
function getAssetType(assetName) {
    // only installer and updater download names are allowed.
    for(let suffix of ALL_SUFFIXES) {
        if(assetName.endsWith(suffix)){
            return SUFFIX_TO_NAME_MAP[suffix];
        }
    }
    return null;
}

function getReleaseDetails(release) {
    const version = release.tag_name.replace("prod-app-v", "");
    const publishDate = release.published_at;
    const releaseData = {
        version,
        publishDate,
        downloads: {}
    };
    let totalDownloads = 0;
    release.assets.forEach(asset => {
        const assetType = getAssetType(asset.name);
        if(assetType) {
            releaseData.downloads[assetType] = asset.download_count;
            totalDownloads += asset.download_count;
        }
    });
    releaseData.downloads.totalDownloads = totalDownloads;
    return releaseData;
}

function getCurrentDate() {
    const date = new Date();
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0'); // getMonth() is zero-indexed
    const year = date.getFullYear();

    return `${day}-${month}-${year}`;
}

const HISTORY_KEYS = [...Object.keys(RELEASE_ASSET_SUFFIXES_ALL), "totalDownloads"];
function mergeHistory(existingEntry, releaseDetails, today) {
    const timeSeries = existingEntry.timeSeries;
    const timeMap = {};
    for(let i=0; i<timeSeries.length; i++) {
        const time = timeSeries[i];
        timeMap[time] = {};
        for(let key of Object.keys(existingEntry)) {
            if(HISTORY_KEYS.includes(key)){
                timeMap[time][key] = existingEntry[key][i];
            }
        }
    }
    // now overwrite the new release detail for the date
    const newEntry = {}
    for(let key of Object.keys(releaseDetails.downloads)) {
        newEntry[key] = releaseDetails.downloads[key];
    }
    timeMap[today] = newEntry;
    // now we recompute the sorted timeMap to history json format
    const newHistory = {
        publishDate: existingEntry.publishDate,
        timeSeries: []
    };
    for(let key of HISTORY_KEYS) {
        newHistory[key] = [];
    }
    const LatestSortedTimes = Object.keys(timeMap)
        .map(dateStr => {
            // Split the date into parts
            const parts = dateStr.split('-');
            // Convert "dd-mm-yyyy" to "yyyy-mm-dd"
            const isoStr = `${parts[2]}-${parts[1]}-${parts[0]}`;
            // Return an object that keeps track of the original date string and the date object
            return { original: dateStr, date: new Date(isoStr) };
        })
        .sort((a, b) => b.date - a.date)
        .map(obj => obj.original);
    for(let i=0; i<LatestSortedTimes.length; i++) {
        const time = LatestSortedTimes[i];
        newHistory.timeSeries.push(time);
        for(let key of HISTORY_KEYS) {
            newHistory[key].push(timeMap[time][key] || 0);
        }
    }
    return newHistory;
}

function patchHistory(releases, existingProdReleaseHistory) {
    const prodReleaseHistory = {};
    const today = getCurrentDate();
    console.log("today is: ", today);
    releases.forEach(release => {
        if (!release.prerelease && (release.tag_name || "").startsWith("prod-app-v")) {
            const releaseDetails = getReleaseDetails(release);
            console.log("Processing release: ", toStr(releaseDetails));
            if(!existingProdReleaseHistory[releaseDetails.version]){
                const newEntry = {
                    "publishDate": releaseDetails.publishDate,
                    "timeSeries": [today],
                }
                for(let key of HISTORY_KEYS) {
                    newEntry[key] = [];
                }
                for(let key of Object.keys(releaseDetails.downloads)) {
                    newEntry[key] = [releaseDetails.downloads[key]];
                }
                prodReleaseHistory[releaseDetails.version] = newEntry;
            } else {
                const existingEntry = existingProdReleaseHistory[releaseDetails.version];
                prodReleaseHistory[releaseDetails.version] = mergeHistory(existingEntry, releaseDetails, today);
            }
        }
    });
    return prodReleaseHistory;
}

function toStr(obj) {
    if(process.env.GITHUB_TOKEN){
        return JSON.stringify(obj);
    }
    return JSON.stringify(obj, null, 2);
}

const DOWNLOAD_HISTORY_URL = "https://public-stats.phcode.io/generated/download_history.json";
async function getCurrentHistoryData() {
    try{
        const fetchedData = await fetch(DOWNLOAD_HISTORY_URL);
        return await fetchedData.json();
    } catch (e) {
        console.error("No previous data", e);
    }
    return null;
}

async function updateDownloadHistory(releases) {
    const existingHistory = await getCurrentHistoryData();
    const existingProdReleaseHistory = (existingHistory && existingHistory.prodReleaseHistory) ?
        existingHistory.prodReleaseHistory : {};
    console.log(`Current history data from ${DOWNLOAD_HISTORY_URL}`, toStr(existingHistory));

    const prodReleaseHistory = patchHistory(releases, existingProdReleaseHistory);

    const data = {
        timestamp: new Date(),
        prodReleaseHistory: prodReleaseHistory,
        "downloadProofLink": "https://github.com/phcode-dev/public-stats"
    };
    console.log("writing to docs/generated/download_history.json", toStr(data));
    fs.writeFileSync('docs/generated/download_history.json', toStr(data));
}

exports.updateDownloadHistory = updateDownloadHistory;