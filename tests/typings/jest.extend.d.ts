export {}
import { GRPCStatusCode } from "../../src/driver/Common/GRPCStatusCode"

declare global {
    namespace jest {
        // tslint:disable-next-line
        interface Matchers<R, T = {}> {
            isFirestoreErrorWithCode: (
                code: GRPCStatusCode,
                matchMessage?: RegExp,
            ) => object
        }

        // tslint:disable-next-line
        interface Expect {
            isFirestoreErrorWithCode: (
                code: GRPCStatusCode,
                matchMessage?: RegExp,
            ) => object
        }
    }
}
