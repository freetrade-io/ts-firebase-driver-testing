export function versionCheck() {
    let majorVersion: number
    try {
        majorVersion = Number(process.versions.node.split(".")[0])
    } catch {
        throw new Error("Could not get the major version from process.version")
    }
    return majorVersion
}
