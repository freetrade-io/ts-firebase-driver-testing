import { GRPCStatusCode } from "../Common/GRPCStatusCode"

export class FirestoreError extends Error {
    details: string
    constructor(public code: GRPCStatusCode, message?: string) {
        super(`${code} ${GRPCStatusCode[code]}${message ? `: ${message}` : ""}`)
        this.details = `${code} ${GRPCStatusCode[code]}${
            message ? `: ${message}` : ""
        }`
    }
}
