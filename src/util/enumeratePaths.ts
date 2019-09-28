export function enumeratePaths(value: any): string[] {
    let paths: string[] = []
    if (typeof value === "object") {
        paths = Object.getOwnPropertyNames(value)
        for (const key of Object.getOwnPropertyNames(value)) {
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
