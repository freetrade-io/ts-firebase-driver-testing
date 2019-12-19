import { InProcessFirebaseDriver } from "../../../src"

describe("Re-using an in-process RTDB ref", () => {
    const ref = new InProcessFirebaseDriver().realTimeDatabase().ref("foobars")

    beforeEach(async () => {
        jest.resetAllMocks()
    })

    test("re-use the same ref instance for multiple queries", async () => {
        // Given we have some data at an in-process RTDB ref;
        await Promise.all([
            ref.push({ foo: "A" }),
            ref.push({ foo: "B" }),
            ref.push({ foo: "C" }),
        ])
        const wholeQuery = await ref.once("value")
        expect(Object.keys(wholeQuery.val())).toHaveLength(3)
        expect(Object.values(wholeQuery.val())).toEqual([
            { foo: "A" },
            { foo: "B" },
            { foo: "C" },
        ])

        // When we re-use the same ref to make multiple separate queries;
        const queryA = await ref
            .orderByChild("foo")
            .equalTo("A")
            .once("value")
        const queryB = await ref
            .orderByChild("foo")
            .equalTo("B")
            .once("value")
        const queryC = await ref
            .orderByChild("foo")
            .equalTo("C")
            .once("value")

        // Then all the queries should get the correct results independently.
        expect(Object.values(queryA.val())).toHaveLength(1)
        expect(Object.values(queryA.val()).pop()).toEqual({ foo: "A" })

        expect(Object.values(queryB.val())).toHaveLength(1)
        expect(Object.values(queryB.val()).pop()).toEqual({ foo: "B" })

        expect(Object.values(queryC.val())).toHaveLength(1)
        expect(Object.values(queryC.val()).pop()).toEqual({ foo: "C" })
    })
})
