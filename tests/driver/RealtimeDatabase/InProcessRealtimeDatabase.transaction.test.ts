import { InProcessRealtimeDatabase, TransactionResult } from "../../../src"

describe("InProcessRealtimeDatabaseRef transaction", () => {
    const database = new InProcessRealtimeDatabase()

    beforeEach(() => {
        database.reset()
    })

    test("transaction no contention", async () => {
        // Given there is a field in the database;
        database.reset({
            chilled_out: "foo value",
        })

        // When we transactionally update it;
        const result = await database.ref("chilled_out").transaction(() => {
            return "new value"
        })

        // Then we should get a transaction result;
        expect(result.committed).toBe(true)
        expect(result.snapshot).toBeTruthy()
        if (result.snapshot) {
            expect(result.snapshot.val()).toBe("new value")
        }

        // And the value should be updated.
        const snapshot = await database.ref("chilled_out").once("value")
        expect(snapshot.val()).toBe("new value")
    })

    test("transaction on missing value", async () => {
        // When we transact on a missing field in the database;
        let valueSeenInTransaction
        const result = await database
            .ref("i_dont_exist")
            .transaction((current: any) => {
                valueSeenInTransaction = current
                return "new value"
            })

        // Then the transaction should see a null value;
        expect(valueSeenInTransaction).not.toBeUndefined()
        expect(valueSeenInTransaction).toBeNull()

        // And the transaction should succeed accordingly.
        expect(result.committed).toBe(true)
    })

    test("transaction abort", async () => {
        // Given there is a field in the database;
        database.reset({
            leave_me_alone: "foo value",
        })

        // When a transaction decides to abort;
        const result = await database.ref("chilled_out").transaction(() => {
            return TransactionResult.ABORT
        })

        // Then the update should fail;
        expect(result.committed).toBe(false)

        // And no update should be made.
        const snapshot = await database.ref("leave_me_alone").once("value")
        expect(snapshot.val()).toBe("foo value")
    })

    test("transaction retry", async () => {
        // Given there is a field in the database;
        database.reset({
            keep_trying: "foo value",
        })

        // When a transaction decides to retry;
        let counter: number = 0
        const result = await database.ref("keep_trying").transaction(() => {
            if (++counter < 5) {
                return TransactionResult.RETRY
            }
            return `new value ${counter}`
        })

        // Then the update should succeed;
        expect(result.committed).toBe(true)

        // And the final update should be made.
        const snapshot = await database.ref("keep_trying").once("value")
        expect(snapshot.val()).toBe("new value 5")
    })

    test("aborting transactions with contention", async () => {
        // Given there is a field in the database;
        database.reset({
            contentious: "foo value",
        })

        // When multiple processes try to update it at once, aborting when there
        // is any contention;
        const ref = database.ref("contentious")
        let counter: number = 0
        const update = (current: string) => {
            if (current !== "foo value") {
                return TransactionResult.ABORT
            }
            return `new value ${++counter}`
        }
        await Promise.all([
            ref.transaction(update),
            ref.transaction(update),
            ref.transaction(update),
        ])

        // Then one update should win out.
        const snapshot = await database.ref("contentious").once("value")
        const updatedValue = snapshot.val()
        expect(["new value 1", "new value 2", "new value 3"]).toContain(
            updatedValue,
        )
    })

    test("retrying transactions with contention", async () => {
        // Given there is a field in the database;
        database.reset({
            contentious: 0,
        })

        // When multiple processes try to update it at once, retrying when there
        // is any contention;
        const ref = database.ref("contentious")
        await Promise.all([
            ref.transaction((c) => {
                return c === 2 ? 3 : TransactionResult.RETRY
            }),
            ref.transaction((c) => {
                return c === 1 ? 2 : TransactionResult.RETRY
            }),
            ref.transaction((c) => {
                return c === 0 ? 1 : TransactionResult.RETRY
            }),
        ])

        // And the final update should win out;
        const snapshot = await database.ref("contentious").once("value")
        expect(snapshot.val()).toBe(3)
    })

    test("retry lock", async () => {
        // Given we're using a database field as a lock;
        database.reset({})

        // When multiple processes try to acquire the lock;
        const ref = database.ref("lock_field")
        const lockAttempts = await Promise.all([
            ref.transaction((cv) => (cv ? TransactionResult.RETRY : "lock_1")),
            ref.transaction((cv) => (cv ? TransactionResult.RETRY : "lock_2")),
            ref.transaction((cv) => (cv ? TransactionResult.RETRY : "lock_3")),
        ])

        // Then only one process should acquire the lock;
        const lockAcquired = lockAttempts.filter((la) => la.committed)
        expect(lockAcquired).toHaveLength(1)

        // And the lock should be set.
        const snapshot = await database.ref("lock_field").once("value")
        expect(["lock_1", "lock_2", "lock_3"]).toContain(snapshot.val())
    })
})
