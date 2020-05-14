import { InProcessFirebaseDriver } from "../../../../src"

describe("onWrite trigger of in-process realtime database", () => {
    test("", async () => {
        // Given we set up an onWrite listener on the RTDB;
        let userId: string = ""
        let timestamp: string = ""
        let data: object | undefined
        let delta: object | undefined

        const driver = new InProcessFirebaseDriver()
        driver
            .runWith()
            .database.ref("/users/{userId}")
            .onWrite(async (change, context) => {
                userId = context.params.userId
                timestamp = context.timestamp
                data = change.data
                delta = change.delta
            })

        // When we make a first write;
        await driver
            .realTimeDatabase()
            .ref("users")
            .child("user-123")
            .set({
                foo: "bar",
            })
        await driver.jobsComplete()

        // Then the onWrite event should be triggered correctly;
        expect(userId).toBe("user-123")
        expect(timestamp).toBeTruthy()
        expect(data).toBeUndefined()
        expect(delta).toEqual({
            foo: "bar",
        })

        // And when we make a subsequent write;
        await driver
            .realTimeDatabase()
            .ref("users")
            .child("user-123")
            .set({
                foo: "bar",
                hello: 123,
            })
        await driver.jobsComplete()

        // Then the second onWrite trigger should occur correctly.
        expect(userId).toBe("user-123")
        expect(timestamp).toBeTruthy()
        expect(data).toEqual({ foo: "bar" })
        expect(delta).toEqual({ hello: 123 })
    })
})
