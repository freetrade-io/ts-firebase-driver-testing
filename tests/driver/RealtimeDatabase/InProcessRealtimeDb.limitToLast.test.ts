import { InProcessRealtimeDatabase } from "../../../src"

describe("InProcessRealtimeDatabaseRef.limitToLast", () => {
    const database = new InProcessRealtimeDatabase()

    beforeEach(() => {
        database.reset()
    })

    test("limit to last zero", async () => {
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

        // When we limit the collection to the last zero items;
        const snapshot = await database
            .ref("roman")
            .limitToLast(0)
            .once("value")

        // Then we should get an empty collection.
        expect(snapshot.val()).toStrictEqual({})
    })

    test("limit to last one", async () => {
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

        // When we limit the collection to the last one item;
        const snapshot = await database
            .ref("roman")
            .limitToLast(1)
            .once("value")

        // Then we should get a collection with the last item only.
        expect(snapshot.val()).toStrictEqual({ six: "VI" })
    })

    test("limit to last half", async () => {
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

        // When we limit the collection to the last three items;
        const snapshot = await database
            .ref("roman")
            .limitToLast(3)
            .once("value")

        // Then we should get a collection with the last three items only.
        expect(snapshot.val()).toStrictEqual({
            four: "IV",
            five: "V",
            six: "VI",
        })
    })

    test("limit to last max", async () => {
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

        // When we limit the collection to the last six items;
        const snapshot = await database
            .ref("roman")
            .limitToLast(6)
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

    test("limit to last beyond max", async () => {
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

        // When we limit the collection to the last seven items;
        const snapshot = await database
            .ref("roman")
            .limitToLast(7)
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
