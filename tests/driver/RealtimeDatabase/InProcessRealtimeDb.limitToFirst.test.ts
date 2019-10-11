import { InProcessRealtimeDatabase } from "../../../src"

describe("InProcessRealtimeDatabaseRef.limitToFirst", () => {
    const database = new InProcessRealtimeDatabase()

    beforeEach(() => {
        database.reset()
    })

    test("limit to first zero", async () => {
        // Given a dataset of six items.
        const dataset = {
            one: "I",
            two: "II",
            three: "III",
            four: "IV",
            five: "V",
            six: "VI",
        }
        await database.ref("roman").set(dataset)

        // When we limit the collection to the first zero items;
        const snapshot = await database
            .ref("roman")
            .limitToFirst(0)
            .once("value")

        // Then we should get an empty collection.
        expect(snapshot.val()).toStrictEqual({})
    })

    test("limit to first one", async () => {
        // Given a dataset of six items.
        const dataset = {
            one: "I",
            two: "II",
            three: "III",
            four: "IV",
            five: "V",
            six: "VI",
        }
        await database.ref("roman").set(dataset)

        // When we limit the collection to the first one item;
        const snapshot = await database
            .ref("roman")
            .limitToFirst(1)
            .once("value")

        // Then we should get a collection with the first item only.
        expect(snapshot.val()).toStrictEqual({ one: "I" })
    })

    test("limit to first half", async () => {
        // Given a dataset of six items.
        const dataset = {
            one: "I",
            two: "II",
            three: "III",
            four: "IV",
            five: "V",
            six: "VI",
        }
        await database.ref("roman").set(dataset)

        // When we limit the collection to the first three items;
        const snapshot = await database
            .ref("roman")
            .limitToFirst(3)
            .once("value")

        // Then we should get a collection with the first three items only.
        expect(snapshot.val()).toStrictEqual({
            one: "I",
            two: "II",
            three: "III",
        })
    })

    test("limit to first max", async () => {
        // Given a dataset of six items.
        const dataset = {
            one: "I",
            two: "II",
            three: "III",
            four: "IV",
            five: "V",
            six: "VI",
        }
        await database.ref("roman").set(dataset)

        // When we limit the collection to the first six items;
        const snapshot = await database
            .ref("roman")
            .limitToFirst(6)
            .once("value")

        // Then we should get a collection with all six items.
        expect(snapshot.val()).toStrictEqual({
            one: "I",
            two: "II",
            three: "III",
            four: "IV",
            five: "V",
            six: "VI",
        })
    })

    test("limit to first beyond max", async () => {
        // Given a dataset of six items.
        const dataset = {
            one: "I",
            two: "II",
            three: "III",
            four: "IV",
            five: "V",
            six: "VI",
        }
        await database.ref("roman").set(dataset)

        // When we limit the collection to the first seven items;
        const snapshot = await database
            .ref("roman")
            .limitToFirst(7)
            .once("value")

        // Then we should get a collection with all six items.
        expect(snapshot.val()).toStrictEqual({
            one: "I",
            two: "II",
            three: "III",
            four: "IV",
            five: "V",
            six: "VI",
        })
    })
})
