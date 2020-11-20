import { InProcessFirestore } from "../../../src"

describe("In-process Firestore transactions", () => {
    /**
     * https://firebase.google.com/docs/firestore/manage-data/transactions
     */

    test("documentation example transaction, update", async () => {
        // Given we have a in-process Firestore DB;
        const firestore = new InProcessFirestore()

        // And there is some initial data;
        const cityRef = firestore.collection("cities").doc("SF")
        await cityRef.set({
            name: "San Francisco",
            state: "CA",
            country: "USA",
            capital: false,
            population: 860000,
            test: null,
        })

        // When we run a Firestore transaction on the data;
        let transactionSuccessful
        await firestore
            .runTransaction<boolean>((t) => {
                return t.get(cityRef).then((doc) => {
                    const data = doc.data() as { population: number }
                    const newPopulation = data.population + 1
                    t.update(cityRef, {
                        population: newPopulation,
                        test: "123",
                    })
                    return true
                })
            })
            .then((result) => {
                transactionSuccessful = result
            })
            .catch((err: Error) => {
                expect(err).toBeUndefined()
            })

        // Then we should get the result;
        expect(transactionSuccessful).toBe(true)

        // And the data should be updated correctly.
        const updatedDoc = await cityRef.get()
        expect(updatedDoc.data()).toEqual({
            name: "San Francisco",
            state: "CA",
            country: "USA",
            capital: false,
            test: "123",
            population: 860001,
        })
    })

    test("documentation example transaction, set", async () => {
        // Given we have a in-process Firestore DB;
        const firestore = new InProcessFirestore()

        // And there is some initial data;
        const cityRef = firestore.collection("cities").doc("SF")
        await cityRef.set({
            name: "San Francisco",
            state: "CA",
            country: "USA",
            capital: false,
            test: null,
            population: 860000,
        })

        // When we run a Firestore transaction on the data;
        let transactionSuccessful
        await firestore
            .runTransaction<boolean>((t) => {
                return t.get(cityRef).then((doc) => {
                    const data = doc.data() as { population: number }
                    const newPopulation = data.population + 1
                    t.set(cityRef, {
                        population: newPopulation,
                        test: null,
                    })
                    return true
                })
            })
            .then((result) => {
                transactionSuccessful = result
            })
            .catch((err: Error) => {
                expect(err).toBeUndefined()
            })

        // Then we should get the result;
        expect(transactionSuccessful).toBe(true)

        // And the data should be set correctly.
        const updatedDoc = await cityRef.get()
        expect(updatedDoc.data()).toEqual({
            test: null,
            population: 860001,
        })
    })

    test("throws errors from the inner transaction", async () => {
        // Given we have a in-process Firestore DB;
        const firestore = new InProcessFirestore()

        // And there is some initial data;
        const cityRef = firestore.collection("cities").doc("SF")
        await cityRef.set({
            name: "San Francisco",
            state: "CA",
            country: "USA",
            capital: false,
            population: 860000,
        })

        const error = new Error("SomeError")

        // When we run a Firestore transaction on the data;
        let transactionError
        await firestore
            .runTransaction((t) => {
                return t.get(cityRef).then((doc) => {
                    const data = doc.data() as { population: number }
                    const newPopulation = data.population + 1
                    t.update(cityRef, { population: newPopulation })
                    throw error
                })
            })
            .then((result) => {
                expect(result).toBeUndefined()
            })
            .catch((err: Error) => {
                transactionError = err
            })

        // We get returned the error
        expect(transactionError).toEqual(error)

        // And the data should equal the initial state
        const updatedDoc = await cityRef.get()
        expect(updatedDoc.data()).toEqual({
            name: "San Francisco",
            state: "CA",
            country: "USA",
            capital: false,
            population: 860000,
        })
    })

    test("a successful transaction should reset the mutex", async () => {
        // Given we have a in-process Firestore DB;
        const firestore = new InProcessFirestore()

        // When we run a Firestore transaction which does not throw
        const result = await firestore.runTransaction((t) =>
            Promise.resolve("done"),
        )
        expect(result).toEqual("done")

        // Then another transaction is not blocked from running
        expect(
            await firestore.runTransaction((t) =>
                Promise.resolve("done again"),
            ),
        ).toEqual("done again")
    })

    test("throwing a error should reset the mutex", async () => {
        // Given we have a in-process Firestore DB;
        const firestore = new InProcessFirestore()

        // When we run a Firestore transaction which throws
        const error = new Error("SomeError")
        let transactionError
        await firestore
            .runTransaction((t) => {
                throw error
            })
            .then((result) => {
                expect(result).toBeUndefined()
            })
            .catch((err: Error) => {
                transactionError = err
            })
        expect(transactionError).toEqual(error)

        // Then another transaction is not blocked from running
        expect(
            await firestore.runTransaction((t) => Promise.resolve("done")),
        ).toEqual("done")
    })
})
