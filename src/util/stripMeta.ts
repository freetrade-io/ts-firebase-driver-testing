import _ from "lodash"

export function stripMeta<T extends { [key: string]: any }>(
    obj: T,
): Omit<T, "_meta"> {
    return _.pickBy(obj, (__, key) => key !== "_meta") as Omit<T, "_meta">
}
