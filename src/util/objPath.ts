import _ from "lodash"
import * as objectPath from "object-path"

function normalisePath(path: string[]): string[] {
    return path.map((p) => String(p).trim()).filter((p) => p.length > 0)
}

export function objGet<T extends object>(
    object: { [key: string]: T },
    path: string[],
    defaultValue?: T | null,
): T | undefined {
    const result: T | undefined | null = objectPath.get(
        object,
        normalisePath(path),
        defaultValue,
    )

    // Remove subcollections
    if (result) {
        const toOmit = Object.keys(result)
            .map((key) => {
                const innerValue: any = (result as any)[key]
                return (
                    (innerValue &&
                        innerValue._meta && { key, remove: true }) || {
                        key,
                        remove: false,
                    }
                )
            })
            .filter((res) => res.remove)
            .map((res) => res.key)

        return _.omit(result as T, toOmit) as T
    }

    return undefined
}

export function objHas<T>(
    object: { [key: string]: T },
    path: string[],
): boolean {
    return objectPath.has(object, normalisePath(path))
}

export function objSet<T>(
    object: { [key: string]: T },
    path: string[],
    value: T,
): void {
    const currentValue = objectPath.get(object, normalisePath(path))
    objectPath.set(object, normalisePath(path), value)

    // Remove subcollections
    if (currentValue && !path.includes("_meta")) {
        Object.keys(currentValue).forEach((key) => {
            const innerValue = currentValue[key]
            if (innerValue && innerValue._meta) {
                objectPath.set(
                    object,
                    normalisePath([...path, key]),
                    currentValue[key],
                )
            }
        })
    }
}

export function objDel<T>(object: { [key: string]: T }, path: string[]): void {
    objectPath.del(object, normalisePath(path))
}
