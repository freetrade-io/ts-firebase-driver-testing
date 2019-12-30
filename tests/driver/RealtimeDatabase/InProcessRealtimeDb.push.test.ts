import { InProcessRealtimeDatabase } from "../../../src"

describe("InProcessRealtimeDatabaseRef push", () => {
    const newId = "new-id"

    const database = new InProcessRealtimeDatabase(undefined, () => newId)

    beforeEach(() => {
        database.reset()
    })

    test("pushes new values inside", async () => {
        // Given an in-process Firebase realtime database with a dataset;
        database.reset({})

        // When we push a new object;
        await database.ref("").push({ key: "value" })

        // Then it should be added to the dataset
        expect((await database.ref("").once("value")).val()).toEqual({
            [newId]: {
                key: "value",
            },
        })
    })

    test("ref.push.set", async () => {
        // Given an in-process Firebase realtime database with a dataset;
        database.reset({})

        // When we call push and then set on the resulting references;
        await database
            .ref("animals")
            .push()
            .set({ name: "tiger" })

        // Then it should be added to the dataset
        expect((await database.ref("animals").once("value")).val()).toEqual({
            [newId]: {
                name: "tiger",
            },
        })
    })
})
