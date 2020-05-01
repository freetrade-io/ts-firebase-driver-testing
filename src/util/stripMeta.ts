import _ from "lodash"

const isNotMeta = (input: any, key: string) => {
    const isMeta = key === "_meta"
    const hasMeta = Boolean(input && input._meta)

    return !(isMeta || hasMeta)
}

export const hasSubMeta = (input: any) =>
    Boolean(input) && _.isObject(input) && Boolean((input as any)._meta)

export function stripMeta<T extends { [key: string]: any }>(
    obj: T,
): Omit<T, "_meta"> {
    if (!_.isObject(obj)) {
        return obj
    }
    return _.pickBy(obj, (__, key) => key !== "_meta") as Omit<T, "_meta">
}

export function stripFirestoreMeta<T extends { [key: string]: any }>(
    obj: T,
): Omit<T, "_meta"> {
    if (!_.isObject(obj) || Array.isArray(obj)) {
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
    return _.pickBy(obj, hasSubMeta) as Omit<any, "_meta">
}
