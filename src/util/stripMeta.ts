import _ from "lodash"

export function stripMeta<T extends { [key: string]: any }>(
    obj: T,
): Omit<T, "_meta"> {
    if (!_.isObject(obj)) {
        return obj
    }
    return _.pickBy(obj, (__, key) => key !== "_meta") as Omit<T, "_meta">
}
