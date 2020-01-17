import { InProcessFirestore } from "../../../src"

describe("In-process Firestore transactions", () => {
    /**
     * https://firebase.google.com/docs/firestore/manage-data/transactions
     */

    test("documentation example transaction", async () => {
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

        // When we run a Firestore transaction on the data;
        let transactionSuccessful
        await firestore
            .runTransaction<boolean>((t) => {
                return t.get(cityRef).then((doc) => {
                    const data = doc.data() as { population: number }
                    const newPopulation = data.population + 1
                    t.update(cityRef, { population: newPopulation })
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
            population: 860001,
        })
    })
})
