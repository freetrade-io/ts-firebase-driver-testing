import _ from "lodash"
import { objGet, objSet } from "./objPath"

export function expandDotPaths<T>(dotNotatedObject: T): T {
    if (
        dotNotatedObject &&
        _.isObject(dotNotatedObject) &&
        !_.isArray(dotNotatedObject)
    ) {
        const expanded = {} as T
        const paths: string[] = Object.getOwnPropertyNames(dotNotatedObject)
        for (const path of paths) {
            const value = objGet(dotNotatedObject as { [key: string]: any }, [
                path,
            ])
            objSet(expanded, path.split(/\.+/), expandDotPaths(value))
        }
        return expanded
    }
    return dotNotatedObject
}
