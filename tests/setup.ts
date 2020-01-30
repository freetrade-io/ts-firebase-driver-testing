export {}
import { GRPCStatusCode } from "../src/driver/Common/GRPCStatusCode"
import { FirestoreError } from "../src/driver/Firestore/FirestoreError"

// Stop Firebase complaining.
process.env.FIREBASE_CONFIG = "{}"

// Extend Jest
declare global {
    namespace jest {
        // tslint:disable-next-line
        interface Matchers<R, T> {
            isFirestoreErrorWithCode(code: GRPCStatusCode): object
        }
    }
}

function isFirestoreErrorWithCode(error: any, code: GRPCStatusCode) {
    const isFirestoreError = error instanceof FirestoreError
    if (!isFirestoreError) {
        return {
            message: () => `expected FirestoreError received ${typeof error}`,
            pass: false,
        }
    }

    const isCorrectCode = (error as FirestoreError).code === code

    return {
        message: () =>
            `expected FirestoreError with code: ${
                (error as FirestoreError).code
            } to be FirestoreError with code: ${code}`,
        pass: isCorrectCode,
    }
}

expect.extend({
    isFirestoreErrorWithCode,
})
