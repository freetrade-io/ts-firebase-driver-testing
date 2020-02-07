export function enumeratePaths(value: any): string[] {
    let paths: string[] = []
    if (value && typeof value === "object") {
        paths = Object.getOwnPropertyNames(value).filter((p) => p !== "_meta")
        for (const key of Object.getOwnPropertyNames(value).filter(
            (p) => p !== "_meta",
        )) {
            paths = [
                ...paths,
                ...enumeratePaths(value[key]).map(
                    (subKey) => `${key}/${subKey}`,
                ),
            ]
        }
    }
    return paths
}
