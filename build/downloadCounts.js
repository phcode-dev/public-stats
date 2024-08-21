const fs = require('fs');
const {RELEASE_ASSET_INSTALLER_SUFFIXES, RELEASE_ASSET_UPDATER_SUFFIXES} = require("./constants");

const ALL_INSTALLER_SUFFIXES = Object.values(RELEASE_ASSET_INSTALLER_SUFFIXES);
const ALL_UPDATER_SUFFIXES = Object.values(RELEASE_ASSET_UPDATER_SUFFIXES);
function hasSuffix(assetName, suffixList) {
    // only installer and updater download names are allowed.
    for(let suffix of suffixList) {
        if(assetName.endsWith(suffix)){
            return true;
        }
    }
    return false;
}

function computeTotalDownloads(releases) {
    let totalInstallerDownloads = 0;
    let totalUpdaterDownloads = 0;
    releases.forEach(release => {
        if (!release.prerelease) {
            release.assets.forEach(asset => {
                if(hasSuffix(asset.name, ALL_INSTALLER_SUFFIXES)) {
                    totalInstallerDownloads += asset.download_count;
                }
                if(hasSuffix(asset.name, ALL_UPDATER_SUFFIXES)) {
                    totalUpdaterDownloads += asset.download_count;
                }
            });
        }
    });
    return {totalInstallerDownloads, totalUpdaterDownloads};
}

function getCurrentDownloadData() {
    try{
        const jsonText = fs.readFileSync('docs/generated/download_counts.json');
        const dataObj = JSON.parse(jsonText);
        return dataObj;
    } catch (e) {
        console.error(e);
    }
    return null;
}

function updateDownloadStats(releases) {
    const {totalInstallerDownloads, totalUpdaterDownloads} = computeTotalDownloads(releases);

    const data = {
        timestamp: new Date(),
        totalDownloads: totalInstallerDownloads + totalUpdaterDownloads,
        totalDownloadRatePerMinute: 0,
        installerDownloads: totalInstallerDownloads,
        updateDownloads: totalUpdaterDownloads,
        "downloadProofLink": "https://github.com/phcode-dev/public-stats"
    };
    const existingData = getCurrentDownloadData();
    if (existingData && existingData.timestamp && existingData.totalDownloads) {
        const lastTimeStamp = new Date(existingData.timestamp).getTime();
        const currentTimeStamp = new Date(data.timestamp).getTime();
        const timeDifferenceMinutes = (currentTimeStamp - lastTimeStamp) / (1000 * 60);
        const downloadDifference = data.totalDownloads - existingData.totalDownloads;
        data.totalDownloadRatePerMinute = timeDifferenceMinutes ?
            Math.round(downloadDifference / timeDifferenceMinutes): 0;
    }

    fs.writeFileSync('docs/generated/download_counts.json', JSON.stringify(data, null, 2));
}

exports.updateDownloadStats = updateDownloadStats;