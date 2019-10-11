import { InProcessRealtimeDatabase } from "../../../src"

describe("InProcessRealtimeDatabaseRef.orderByValue", () => {
    const database = new InProcessRealtimeDatabase()

    beforeEach(() => {
        database.reset()
    })

    test("InProcessRealtimeDatabaseRef.orderByValue", async () => {
        // Given a collection of string values;
        const dataset = {
            three: "kangaroo",
            one: "aardvark",
            five: "zebra",
            two: "badger",
            four: "platypus",
        }

        await database.ref("animals").set(dataset)

        // And the collection is not ordered;
        expect(Object.keys(dataset)).toStrictEqual([
            "three",
            "one",
            "five",
            "two",
            "four",
        ])
        expect(Object.keys(dataset)).not.toStrictEqual([
            "one",
            "two",
            "three",
            "four",
            "five",
        ])

        // When we get the collection ordered by value;
        const snapshot = await database
            .ref("animals")
            .orderByValue()
            .once("value")

        // Then we should get a string ordering of the objects by value.
        expect(snapshot.val()).toStrictEqual({
            one: "aardvark",
            two: "badger",
            three: "kangaroo",
            four: "platypus",
            five: "zebra",
        })
        expect(Object.keys(snapshot.val())).toStrictEqual([
            "one",
            "two",
            "three",
            "four",
            "five",
        ])
        expect(Object.keys(snapshot.val())).not.toStrictEqual([
            "three",
            "one",
            "five",
            "two",
            "four",
        ])
    })

    test("InProcessRealtimeDatabaseRef.orderByValue.equalTo single", async () => {
        // Given a collection of string values;
        const dataset = {
            three: "kangaroo",
            one: "aardvark",
            five: "zebra",
            two: "badger",
            four: "platypus",
        }

        await database.ref("animals").set(dataset)

        // When we filter to items equal to a value;
        const snapshot = await database
            .ref("animals")
            .orderByValue()
            .equalTo("badger")
            .once("value")

        // Then we should get the single item with that value.
        expect(snapshot.val()).toStrictEqual({ two: "badger" })
    })

    test("InProcessRealtimeDatabaseRef.orderByValue.equalTo multiple", async () => {
        // Given a collection of string values;
        const dataset = {
            four: "kangaroo",
            three: "badger",
            one: "aardvark",
            six: "zebra",
            two: "badger",
            five: "platypus",
        }

        await database.ref("animals").set(dataset)

        // When we filter to items equal to a value;
        const snapshot = await database
            .ref("animals")
            .orderByValue()
            .equalTo("badger")
            .once("value")

        // Then we should get the multiple items with that value.
        expect(snapshot.val()).toStrictEqual({ two: "badger", three: "badger" })
    })

    test("InProcessRealtimeDatabaseRef.orderByValue.startAt", async () => {
        // Given a collection of string values;
        const dataset = {
            three: "cyclops",
            one: "aardvark",
            five: "elephant",
            two: "badger",
            four: "donkey",
        }

        await database.ref("animals").set(dataset)

        // And the collection is not ordered;
        expect(Object.keys(dataset)).toStrictEqual([
            "three",
            "one",
            "five",
            "two",
            "four",
        ])
        expect(Object.keys(dataset)).not.toStrictEqual([
            "one",
            "two",
            "three",
            "four",
            "five",
        ])

        // When we filter to items starting at a value;
        const snapshot = await database
            .ref("animals")
            .orderByValue()
            .startAt("cyclops")
            .once("value")

        // Then we should get the items ordered starting from that value.
        expect(snapshot.val()).toStrictEqual({
            three: "cyclops",
            four: "donkey",
            five: "elephant",
        })
        expect(Object.keys(snapshot.val())).toStrictEqual([
            "three",
            "four",
            "five",
        ])
        expect(Object.keys(snapshot.val())).not.toStrictEqual([
            "three",
            "five",
            "four",
        ])
        expect(Object.values(snapshot.val())).toStrictEqual([
            "cyclops",
            "donkey",
            "elephant",
        ])
        expect(Object.values(snapshot.val())).not.toStrictEqual([
            "cyclops",
            "elephant",
            "donkey",
        ])
    })

    test("InProcessRealtimeDatabaseRef.orderByValue.endAt", async () => {
        // Given a collection of string values;
        const dataset = {
            three: "cyclops",
            one: "aardvark",
            five: "elephant",
            two: "badger",
            four: "donkey",
        }

        await database.ref("animals").set(dataset)

        // And the collection is not ordered;
        expect(Object.keys(dataset)).toStrictEqual([
            "three",
            "one",
            "five",
            "two",
            "four",
        ])
        expect(Object.keys(dataset)).not.toStrictEqual([
            "one",
            "two",
            "three",
            "four",
            "five",
        ])

        // When we filter to items ending at a value;
        const snapshot = await database
            .ref("animals")
            .orderByValue()
            .endAt("cyclops")
            .once("value")

        // Then we should get the items ordered ending at that value.
        expect(snapshot.val()).toStrictEqual({
            one: "aardvark",
            two: "badger",
            three: "cyclops",
        })
        expect(Object.keys(snapshot.val())).toStrictEqual([
            "one",
            "two",
            "three",
        ])
        expect(Object.keys(snapshot.val())).not.toStrictEqual([
            "three",
            "one",
            "two",
        ])
        expect(Object.values(snapshot.val())).toStrictEqual([
            "aardvark",
            "badger",
            "cyclops",
        ])
        expect(Object.values(snapshot.val())).not.toStrictEqual([
            "cyclops",
            "aardvark",
            "badger",
        ])
    })

    test("InProcessRealtimeDatabaseRef.orderByValue.startAt.endAt", async () => {
        // Given a collection of string values;
        const dataset = {
            four: "donkey",
            three: "cyclops",
            one: "aardvark",
            five: "elephant",
            two: "badger",
        }

        await database.ref("animals").set(dataset)

        // And the collection is not ordered;
        expect(Object.keys(dataset)).toStrictEqual([
            "four",
            "three",
            "one",
            "five",
            "two",
        ])
        expect(Object.keys(dataset)).not.toStrictEqual([
            "one",
            "two",
            "three",
            "four",
            "five",
        ])

        // When we filter to items starting at one value and ending at another;
        const snapshot = await database
            .ref("animals")
            .orderByValue()
            .startAt("badger")
            .endAt("donkey")
            .once("value")

        // Then we should get the items ordered starting from that value and ending at the other.
        expect(snapshot.val()).toStrictEqual({
            two: "badger",
            three: "cyclops",
            four: "donkey",
        })
        expect(Object.keys(snapshot.val())).toStrictEqual([
            "two",
            "three",
            "four",
        ])
        expect(Object.keys(snapshot.val())).not.toStrictEqual([
            "four",
            "three",
            "two",
        ])
        expect(Object.values(snapshot.val())).toStrictEqual([
            "badger",
            "cyclops",
            "donkey",
        ])
        expect(Object.values(snapshot.val())).not.toStrictEqual([
            "donkey",
            "cyclops",
            "badger",
        ])
    })

    test("InProcessRealtimeDatabaseRef.orderByValue.limitToFirst", async () => {
        // Given a collection of string values;
        const dataset = {
            three: "cyclops",
            one: "aardvark",
            five: "elephant",
            two: "badger",
            four: "donkey",
        }

        await database.ref("animals").set(dataset)

        // When we order items by value and limit to the first three;
        const snapshot = await database
            .ref("animals")
            .orderByValue()
            .limitToFirst(3)
            .once("value")

        // Then we should get the first three items items ordered by value.
        expect(snapshot.val()).toStrictEqual({
            one: "aardvark",
            two: "badger",
            three: "cyclops",
        })
        expect(Object.keys(snapshot.val())).toStrictEqual([
            "one",
            "two",
            "three",
        ])
        expect(Object.values(snapshot.val())).toStrictEqual([
            "aardvark",
            "badger",
            "cyclops",
        ])
    })

    test("InProcessRealtimeDatabaseRef.orderByValue.limitToLast", async () => {
        // Given a collection of string values;
        const dataset = {
            three: "cyclops",
            one: "aardvark",
            five: "elephant",
            two: "badger",
            four: "donkey",
        }

        await database.ref("animals").set(dataset)

        // When we order items by value and limit to the last three;
        const snapshot = await database
            .ref("animals")
            .orderByValue()
            .limitToLast(3)
            .once("value")

        // Then we should get the last three items items ordered by value.
        expect(snapshot.val()).toStrictEqual({
            three: "cyclops",
            four: "donkey",
            five: "elephant",
        })
        expect(Object.keys(snapshot.val())).toStrictEqual([
            "three",
            "four",
            "five",
        ])
        expect(Object.values(snapshot.val())).toStrictEqual([
            "cyclops",
            "donkey",
            "elephant",
        ])
    })
})
