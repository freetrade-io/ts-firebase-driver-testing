import _ from "lodash"

const isNotMeta = (input: any, key: string) => {
    const isMeta = key === "_meta"
    const hasMeta = Boolean(input._meta)

    return !(isMeta || hasMeta)
}

const isSubMeta = (input: any, key: string) => Boolean(input._meta)

export function stripMeta<T extends { [key: string]: any }>(
    obj: T,
): Omit<T, "_meta"> {
    if (!_.isObject(obj)) {
        return obj
    }
    return _.pickBy(obj, isNotMeta) as Omit<T, "_meta">
}

export function pickSubMeta<T extends { [key: string]: any }>(
    obj: T,
): Omit<any, "_meta"> {
    if (!_.isObject(obj)) {
        return obj
    }
    return _.pickBy(obj, isSubMeta) as Omit<any, "_meta">
}
