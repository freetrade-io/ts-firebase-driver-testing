import * as objectPath from "object-path"

function normalisePath(path: string[]): string[] {
    return path.map((p) => String(p).trim()).filter((p) => p.length > 0)
}

export function objGet<T>(
    object: { [key: string]: T },
    path: string[],
    defaultValue?: T,
): T | undefined {
    return objectPath.get(object, normalisePath(path), defaultValue)
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
    objectPath.set(object, normalisePath(path), value)
}

export function objDel<T>(object: { [key: string]: T }, path: string[]): void {
    objectPath.del(object, normalisePath(path))
}
