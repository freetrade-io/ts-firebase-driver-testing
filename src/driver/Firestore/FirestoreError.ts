import { GRPCStatusCode } from "../Common/GRPCStatusCode"

const getErrorMessage = (code: GRPCStatusCode, message: string = "") => {
    return `${code} ${GRPCStatusCode[code]} ${message}`.trim()
}

export class FirestoreError extends Error {
    details: string
    constructor(public code: GRPCStatusCode, message?: string) {
        super(getErrorMessage(code, message))
        this.details = getErrorMessage(code, message)
    }
}
