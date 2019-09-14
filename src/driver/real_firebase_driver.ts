import { database } from "firebase-admin"
import { runWith } from "firebase-functions"
import {
    IFirebaseDriver,
    IFirebaseFunctionBuilder,
    IFirebaseRealtimeDatabase,
    MemoryOption,
} from "./firebase_driver"

export class RealFirebaseDriver implements IFirebaseDriver {
    constructor(private readonly db: database.Database) {}

    realTimeDatabase(): IFirebaseRealtimeDatabase {
        return this.db
    }

    runWith(runtimeOptions): IFirebaseFunctionBuilder {
        return runWith(runtimeOptions)
    }

    runOptions(
        memory: MemoryOption = "256MB",
        timeoutSeconds: number = 540,
    ): { memory: MemoryOption; timeoutSeconds: number } {
        return {
            memory,
            timeoutSeconds,
        }
    }
}
