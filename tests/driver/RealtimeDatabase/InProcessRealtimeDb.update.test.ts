import { InProcessRealtimeDatabase } from "../../../src"

describe("InProcessRealtimeDatabaseRef update", () => {
    const newId = "new-id"

    const database = new InProcessRealtimeDatabase(undefined, () => newId)

    beforeEach(() => {
        database.reset()
    })

    test("update value", async () => {
        // Given an in-process Firebase realtime database with a dataset;
        database.reset({
            myCollection: { field1: "value 1", field2: "value 2" },
        })

        // When we update a field;
        await database.ref("myCollection").update({ field1: "new value" })

        // Then it should be updated in the dataset
        expect(
            (await database.ref("myCollection").once("value")).val(),
        ).toEqual({ field1: "new value", field2: "value 2" })
    })

    test("update nested value", async () => {
        // Given an in-process Firebase realtime database with a dataset;
        database.reset({
            myCollection: { field1: { value: "value 1" }, field2: "value 2" },
        })

        // When we update a field;
        await database
            .ref("myCollection")
            .update({ field2: "new value 2", "/field1/value": "new value" })

        // Then it should be updated in the dataset
        expect(
            (await database.ref("myCollection").once("value")).val(),
        ).toEqual({ field1: { value: "new value" }, field2: "new value 2" })
    })
})
