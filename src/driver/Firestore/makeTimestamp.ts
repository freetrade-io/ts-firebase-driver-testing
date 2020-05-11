import { IFirestoreTimestamp } from "./IFirestore"

export function makeTimestamp(): IFirestoreTimestamp {
    const date = new Date()
    const milliseconds: number = date.getTime()
    const seconds: number = milliseconds / 1000
    return {
        seconds,
        nanoseconds: milliseconds * 1000000,
        toDate: () => date,
        toMillis: (): number => milliseconds,
        isEqual: (other): boolean => other.toMillis() === milliseconds,
    }
}
