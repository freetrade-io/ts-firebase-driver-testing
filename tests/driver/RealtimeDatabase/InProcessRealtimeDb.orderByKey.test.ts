import { InProcessRealtimeDatabase } from "../../../src"

describe("InProcessRealtimeDatabaseRef.orderByKey", () => {
    const database = new InProcessRealtimeDatabase()

    beforeEach(() => {
        database.reset()
    })

    test("InProcessRealtimeDatabaseRef.orderByKey", async () => {
        // Given a collection of string keys to values;
        const dataset = {
            c: "let",
            b: "gonna",
            e: "down",
            d: "you",
            a: "never",
        }

        await database.ref("words").set(dataset)

        // And the collection is not ordered by key;
        expect(Object.keys(dataset)).toStrictEqual(["c", "b", "e", "d", "a"])
        expect(Object.keys(dataset)).not.toStrictEqual([
            "a",
            "b",
            "c",
            "d",
            "e",
        ])

        // When we get the collection ordered by key;
        const snapshot = await database
            .ref("words")
            .orderByKey()
            .once("value")

        // Then we should get a string ordering of the objects by key.
        expect(snapshot.val()).toStrictEqual({
            a: "never",
            b: "gonna",
            c: "let",
            d: "you",
            e: "down",
        })
        expect(Object.keys(snapshot.val())).toStrictEqual([
            "a",
            "b",
            "c",
            "d",
            "e",
        ])
        expect(Object.keys(snapshot.val())).not.toStrictEqual([
            "c",
            "b",
            "e",
            "d",
            "a",
        ])
    })

    test("InProcessRealtimeDatabaseRef.orderByKey.equalTo", async () => {
        // Given a collection of string keys to values;
        const dataset = {
            c: "let",
            b: "gonna",
            e: "down",
            d: "you",
            a: "never",
        }

        await database.ref("words").set(dataset)

        // When we filter to items with a key equal to something;
        const snapshot = await database
            .ref("words")
            .orderByKey()
            .equalTo("b")
            .once("value")

        // Then we should get the single item with that key.
        expect(snapshot.val()).toStrictEqual({ b: "gonna" })
    })

    test("InProcessRealtimeDatabaseRef.orderByKey.startAt", async () => {
        // Given a collection of string keys to values;
        const dataset = {
            c: "let",
            b: "gonna",
            e: "down",
            d: "you",
            a: "never",
        }

        await database.ref("words").set(dataset)

        // And the collection is not ordered;
        expect(Object.keys(dataset)).toStrictEqual(["c", "b", "e", "d", "a"])
        expect(Object.keys(dataset)).not.toStrictEqual([
            "a",
            "b",
            "c",
            "d",
            "e",
        ])

        // When we filter to items starting at a key;
        const snapshot = await database
            .ref("words")
            .orderByKey()
            .startAt("c")
            .once("value")

        // Then we should get the items ordered starting from that key.
        expect(snapshot.val()).toStrictEqual({
            c: "let",
            d: "you",
            e: "down",
        })
        expect(Object.keys(snapshot.val())).toStrictEqual(["c", "d", "e"])
        expect(Object.values(snapshot.val())).toStrictEqual([
            "let",
            "you",
            "down",
        ])
    })

    test("InProcessRealtimeDatabaseRef.orderByKey.endAt", async () => {
        // Given a collection of string keys to values;
        const dataset = {
            c: "let",
            b: "gonna",
            e: "down",
            d: "you",
            a: "never",
        }

        await database.ref("words").set(dataset)

        // And the collection is not ordered;
        expect(Object.keys(dataset)).toStrictEqual(["c", "b", "e", "d", "a"])
        expect(Object.keys(dataset)).not.toStrictEqual([
            "a",
            "b",
            "c",
            "d",
            "e",
        ])

        // When we filter to items ending at a key;
        const snapshot = await database
            .ref("words")
            .orderByKey()
            .endAt("c")
            .once("value")

        // Then we should get the items ordered ending at that key.
        expect(snapshot.val()).toStrictEqual({
            a: "never",
            b: "gonna",
            c: "let",
        })
        expect(Object.keys(snapshot.val())).toStrictEqual(["a", "b", "c"])
        expect(Object.values(snapshot.val())).toStrictEqual([
            "never",
            "gonna",
            "let",
        ])
    })

    test("InProcessRealtimeDatabaseRef.orderByKey.startAt.endAt", async () => {
        // Given a collection of string keys to values;
        const dataset = {
            c: "let",
            b: "gonna",
            e: "down",
            d: "you",
            a: "never",
        }

        await database.ref("words").set(dataset)

        // And the collection is not ordered;
        expect(Object.keys(dataset)).toStrictEqual(["c", "b", "e", "d", "a"])
        expect(Object.keys(dataset)).not.toStrictEqual([
            "a",
            "b",
            "c",
            "d",
            "e",
        ])

        // When we filter to items starting at one key and ending at another;
        const snapshot = await database
            .ref("words")
            .orderByKey()
            .startAt("b")
            .endAt("d")
            .once("value")

        // Then we should get the items ordered starting from that key and ending at the other.
        expect(snapshot.val()).toStrictEqual({
            b: "gonna",
            c: "let",
            d: "you",
        })
        expect(Object.keys(snapshot.val())).toStrictEqual(["b", "c", "d"])
        expect(Object.values(snapshot.val())).toStrictEqual([
            "gonna",
            "let",
            "you",
        ])
    })

    test("InProcessRealtimeDatabaseRef.orderByKey.limitToFirst", async () => {
        // Given a collection of string keys to values;
        const dataset = {
            c: "let",
            b: "gonna",
            e: "down",
            d: "you",
            a: "never",
        }

        await database.ref("words").set(dataset)

        // And the collection is not ordered;
        expect(Object.keys(dataset)).toStrictEqual(["c", "b", "e", "d", "a"])
        expect(Object.keys(dataset)).not.toStrictEqual([
            "a",
            "b",
            "c",
            "d",
            "e",
        ])

        // When we order items by key limited to the first three;
        const snapshot = await database
            .ref("words")
            .orderByKey()
            .limitToFirst(3)
            .once("value")

        // Then we should get the first three items ordered starting from that key.
        expect(snapshot.val()).toStrictEqual({
            a: "never",
            b: "gonna",
            c: "let",
        })
        expect(Object.keys(snapshot.val())).toStrictEqual(["a", "b", "c"])
        expect(Object.values(snapshot.val())).toStrictEqual([
            "never",
            "gonna",
            "let",
        ])
    })

    test("InProcessRealtimeDatabaseRef.orderByKey.limitToLast", async () => {
        // Given a collection of string keys to values;
        const dataset = {
            c: "let",
            b: "gonna",
            e: "down",
            d: "you",
            a: "never",
        }

        await database.ref("words").set(dataset)

        // And the collection is not ordered;
        expect(Object.keys(dataset)).toStrictEqual(["c", "b", "e", "d", "a"])
        expect(Object.keys(dataset)).not.toStrictEqual([
            "a",
            "b",
            "c",
            "d",
            "e",
        ])

        // When we order items by key limited to the last three;
        const snapshot = await database
            .ref("words")
            .orderByKey()
            .limitToLast(3)
            .once("value")

        // Then we should get the last three items ordered starting from that key.
        expect(snapshot.val()).toStrictEqual({
            c: "let",
            d: "you",
            e: "down",
        })
        expect(Object.keys(snapshot.val())).toStrictEqual(["c", "d", "e"])
        expect(Object.values(snapshot.val())).toStrictEqual([
            "let",
            "you",
            "down",
        ])
    })
})
