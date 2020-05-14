import _ from "lodash"

import { enumeratePaths } from "./enumeratePaths"
import { JsonValue } from "./json"
import { objGet, objSet } from "./objPath"

function isJsonObject(
    potentialObject: JsonValue,
): potentialObject is { [key: string]: JsonValue } {
    return _.isObject(potentialObject)
}

export function makeDelta(
    oldObject: JsonValue,
    newObject: JsonValue,
): JsonValue {
    if (typeof newObject !== typeof oldObject) {
        return newObject
    }
    if (!isJsonObject(oldObject) || !isJsonObject(newObject)) {
        return newObject
    }

    const paths: string[] = _.uniq(
        enumeratePaths(oldObject).concat(enumeratePaths(newObject)),
    )
    let pathSplits: string[][] = paths.map((path: string): string[] =>
        path.split("/"),
    )
    pathSplits = pathSplits.filter((thisPath: string[]): boolean => {
        return !pathSplits.find((otherPath: string[]): boolean => {
            return (
                otherPath[0] === thisPath[0] &&
                otherPath.length > thisPath.length
            )
        })
    })

    const delta: JsonValue = {}

    pathSplits.forEach((pathSplit: string[]): void => {
        const oldValue = objGet(oldObject, pathSplit)
        const newValue = objGet(newObject, pathSplit)
        if (newValue !== oldValue) {
            objSet(delta, pathSplit, newValue)
        }
    })

    return delta
}
