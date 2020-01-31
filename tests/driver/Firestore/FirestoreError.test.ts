import { GRPCStatusCode } from "../../../src/driver/Common/GRPCStatusCode"
import { FirestoreError } from "../../../src/driver/Firestore/FirestoreError"

describe("Firestore Error", () => {
    test("Correctly handles missing message", () => {
        const error = new FirestoreError(GRPCStatusCode.UNKNOWN)

        expect(error.message).toEqual("2 UNKNOWN")
        expect(error.code).toEqual(GRPCStatusCode.UNKNOWN)
        expect(error.details).toEqual(error.message)
    })

    test("Correctly handles adding a message", () => {
        const error = new FirestoreError(
            GRPCStatusCode.UNKNOWN,
            "My Custom Message",
        )

        expect(error.message).toEqual("2 UNKNOWN My Custom Message")
        expect(error.code).toEqual(GRPCStatusCode.UNKNOWN)
        expect(error.details).toEqual(error.message)
    })
})
