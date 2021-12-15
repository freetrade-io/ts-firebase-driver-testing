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

type NodeToProcess = {
    // We store this so we don't have to drill back down through the object
    containingObject: any
    // This is the property name we want to process
    propertyName: string
    // We keep a / delimited location to add to paths to save use having to work it out
    containingPath: string
}

// Use a BFS to build a list of object paths
export const getChangePaths = (change: {} | []) => {
    const nodesToProcess: Array<NodeToProcess> = Object.keys(change).map<
        NodeToProcess
    >((propertyName) => ({
        containingObject: change,
        containingPath: "",
        propertyName,
    }))

    const paths = []

    while (nodesToProcess.length > 0) {
        const {
            containingObject,
            propertyName,
            containingPath,
        } = nodesToProcess.shift()!

        // We don't trigger changes on _meta so ignore
        if (propertyName === "_meta") continue

        const currentPropertyLocation = containingPath
            ? `${containingPath}/${propertyName}`
            : propertyName

        paths.push(currentPropertyLocation)

        // Check if this property needs flattening
        const value = containingObject[propertyName]

        if (typeof value === "object" && value !== null) {
            const propertyNames = Object.keys(value)
            const newNodes = propertyNames.map<NodeToProcess>(
                (propertyName) => ({
                    containingObject: value,
                    containingPath: currentPropertyLocation,
                    propertyName,
                }),
            )

            nodesToProcess.push(...newNodes)
        }
    }

    return paths
}
