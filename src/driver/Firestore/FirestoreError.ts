import { GRPCStatusCode } from "../Common/GRPCStatusCode"

export class FirestoreError extends Error {
    constructor(public code: GRPCStatusCode, message?: string) {
        super(`${code} ${GRPCStatusCode[code]}${message ? `: ${message}` : ""}`)
    }
}
