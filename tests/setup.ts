export {}
import { GRPCStatusCode } from "../src/driver/Common/GRPCStatusCode"
import { FirestoreError } from "../src/driver/Firestore/FirestoreError"

// Stop Firebase complaining.
process.env.FIREBASE_CONFIG = "{}"

function isFirestoreErrorWithCode(
    error: any,
    code: GRPCStatusCode,
    matchMessage?: RegExp,
) {
    const isFirestoreError = error instanceof FirestoreError
    if (!isFirestoreError) {
        return {
            message: () => `expected FirestoreError received ${typeof error}`,
            pass: false,
        }
    }

    const isCorrectCode = (error as FirestoreError).code === code
    const isMessageMatched = matchMessage
        ? matchMessage.test(error.message) && matchMessage.test(error.details)
        : true

    return {
        message: () =>
            `expected FirestoreError with code: ${
                (error as FirestoreError).code
            } to be FirestoreError with code: ${code}`,
        pass: isCorrectCode && isMessageMatched,
    }
}

expect.extend({
    isFirestoreErrorWithCode,
})
