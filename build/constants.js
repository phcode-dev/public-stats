const RELEASE_ASSET_INSTALLER_SUFFIXES = {
    LINUX_X64_GLIBC_2_31_INSTALLER: "_amd64_linux_bin-GLIBC-2.31.tar.gz",
    LINUX_X64_GLIBC_2_35_INSTALLER: "_amd64_linux_bin-GLIBC-2.35.tar.gz",
    WINDOWS_X64_INSTALLER: "_x64-setup.exe",
    MAC_M1_INSTALLER: "_aarch64.dmg",
    MAC_X64_INSTALLER: "_x64.dmg",
};

const RELEASE_ASSET_INSTALLER_PREFIXES = {
    LINUX_X64_GLIBC_2_31_INSTALLER: "phoenix-code_",
    LINUX_X64_GLIBC_2_35_INSTALLER: "phoenix-code_",
    WINDOWS_X64_INSTALLER: "Phoenix.Code_",
    MAC_M1_INSTALLER: "Phoenix.Code_",
    MAC_X64_INSTALLER: "Phoenix.Code_"
};

const RELEASE_ASSET_UPDATER_SUFFIXES = {
    WINDOWS_X64_UPDATER: "_x64-setup.nsis.zip",
    MAC_M1_UPDATER: "_aarch64.app.tar.gz",
    MAC_X64_UPDATER: "_x64.app.tar.gz"
};

const RELEASE_ASSET_UPDATER_PREFIXES = {
    WINDOWS_X64_UPDATER: "Phoenix.Code_",
    MAC_M1_UPDATER: "Phoenix.Code",
    MAC_X64_UPDATER: "Phoenix.Code"
};

const RELEASE_ASSET_SUFFIXES_ALL = { ...RELEASE_ASSET_INSTALLER_SUFFIXES, ...RELEASE_ASSET_UPDATER_SUFFIXES };
// Swap keys and values
const SUFFIX_TO_NAME_MAP = Object.keys(RELEASE_ASSET_SUFFIXES_ALL).reduce((acc, key) => {
    acc[RELEASE_ASSET_SUFFIXES_ALL[key]] = key;
    return acc;
}, {});

exports.RELEASE_ASSET_INSTALLER_SUFFIXES = RELEASE_ASSET_INSTALLER_SUFFIXES;
exports.RELEASE_ASSET_INSTALLER_PREFIXES = RELEASE_ASSET_INSTALLER_PREFIXES;
exports.RELEASE_ASSET_UPDATER_SUFFIXES = RELEASE_ASSET_UPDATER_SUFFIXES;
exports.RELEASE_ASSET_UPDATER_PREFIXES = RELEASE_ASSET_UPDATER_PREFIXES;
exports.RELEASE_ASSET_SUFFIXES_ALL = RELEASE_ASSET_SUFFIXES_ALL;
exports.SUFFIX_TO_NAME_MAP = SUFFIX_TO_NAME_MAP;