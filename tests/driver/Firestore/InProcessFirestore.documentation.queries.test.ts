import { InProcessFirestore } from "../../../src/driver/Firestore/InProcessFirestore"

describe("InProcessFirestore queries behave as in documentation", () => {
    /**
     * https://firebase.google.com/docs/firestore/query-data/queries
     */

    const db = new InProcessFirestore()

    beforeEach(async () => {
        // https://firebase.google.com/docs/firestore/query-data/queries#example_data
        db.reset()

        const citiesRef = db.collection("cities")

        await citiesRef.doc("SF").set({
            name: "San Francisco",
            state: "CA",
            country: "USA",
            capital: false,
            population: 860000,
            regions: ["west_coast", "norcal"],
        })
        await citiesRef.doc("LA").set({
            name: "Los Angeles",
            state: "CA",
            country: "USA",
            capital: false,
            population: 3900000,
            regions: ["west_coast", "socal"],
        })
        await citiesRef.doc("DC").set({
            name: "Washington, D.C.",
            state: null,
            country: "USA",
            capital: true,
            population: 680000,
            regions: ["east_coast"],
        })
        await citiesRef.doc("TOK").set({
            name: "Tokyo",
            state: null,
            country: "Japan",
            capital: true,
            population: 9000000,
            regions: ["kanto", "honshu"],
        })
        await citiesRef.doc("BJ").set({
            name: "Beijing",
            state: null,
            country: "China",
            capital: true,
            population: 21500000,
            regions: ["jingjinji", "hebei"],
        })
    })

    /**
     * https://firebase.google.com/docs/firestore/query-data/queries#execute_a_query
     */
    test("Execute a query", async () => {
        const citiesRef = db.collection("cities")
        await citiesRef
            .where("capital", "==", true)
            .get()
            .then((snapshot) => {
                expect(snapshot.empty).toBeFalsy()
                expect(snapshot.docs.length).toEqual(3)
                snapshot.forEach((doc) => {
                    expect(doc.data()).toBeTruthy()
                })
            })
            .catch((err) => {
                expect(err).toBeUndefined()
            })
    })

    /**
     * https://firebase.google.com/docs/firestore/query-data/queries#query_operators
     */
    test("Query operators", async () => {
        const citiesRef = db.collection("cities")

        const stateQuery = await citiesRef.where("state", "==", "CA").get()
        expect(stateQuery.docs.map((doc) => doc.data())).toEqual([
            {
                name: "San Francisco",
                state: "CA",
                country: "USA",
                capital: false,
                population: 860000,
                regions: ["west_coast", "norcal"],
            },
            {
                name: "Los Angeles",
                state: "CA",
                country: "USA",
                capital: false,
                population: 3900000,
                regions: ["west_coast", "socal"],
            },
        ])

        const populationQuery = await citiesRef
            .where("population", "<", 1000000)
            .get()
        expect(populationQuery.docs.map((doc) => doc.data())).toEqual([
            {
                name: "San Francisco",
                state: "CA",
                country: "USA",
                capital: false,
                population: 860000,
                regions: ["west_coast", "norcal"],
            },
        ])

        const nameQuery = await citiesRef
            .where("name", ">=", "San Francisco")
            .get()
        expect(nameQuery.docs.map((doc) => doc.data())).toEqual([
            {
                name: "San Francisco",
                state: "CA",
                country: "USA",
                capital: false,
                population: 860000,
                regions: ["west_coast", "norcal"],
            },
        ])
    })

    /**
     * https://firebase.google.com/docs/firestore/query-data/queries#array_membership
     */
    test("Array membership", async () => {
        const citiesRef = db.collection("cities")

        const westCoastCities = await citiesRef
            .where("regions", "array-contains", "west_coast")
            .get()

        expect(westCoastCities.docs.map((doc) => doc.data())).toEqual([
            {
                name: "San Francisco",
                state: "CA",
                country: "USA",
                capital: false,
                population: 860000,
                regions: ["west_coast", "norcal"],
            },
            {
                name: "Los Angeles",
                state: "CA",
                country: "USA",
                capital: false,
                population: 3900000,
                regions: ["west_coast", "socal"],
            },
        ])
    })

    /**
     * https://firebase.google.com/docs/firestore/query-data/queries#in_and_array-contains-any
     */
    test("in and array-contains-any", async () => {
        const citiesRef = db.collection("cities")

        const usaOrJapan = await citiesRef
            .where("country", "in", ["USA", "Japan"])
            .get()

        expect(usaOrJapan.docs.map((doc) => doc.data())).toEqual([
            {
                name: "San Francisco",
                state: "CA",
                country: "USA",
                capital: false,
                population: 860000,
                regions: ["west_coast", "norcal"],
            },
            {
                name: "Los Angeles",
                state: "CA",
                country: "USA",
                capital: false,
                population: 3900000,
                regions: ["west_coast", "socal"],
            },
            {
                name: "Washington, D.C.",
                state: null,
                country: "USA",
                capital: true,
                population: 680000,
                regions: ["east_coast"],
            },
            {
                name: "Tokyo",
                state: null,
                country: "Japan",
                capital: true,
                population: 9000000,
                regions: ["kanto", "honshu"],
            },
        ])

        const eastOrWestCoastCities = await citiesRef
            .where("regions", "array-contains-any", [
                "east_coast",
                "west_coast",
            ])
            .get()
        expect(eastOrWestCoastCities.docs.map((doc) => doc.data())).toEqual([
            {
                name: "San Francisco",
                state: "CA",
                country: "USA",
                capital: false,
                population: 860000,
                regions: ["west_coast", "norcal"],
            },
            {
                name: "Los Angeles",
                state: "CA",
                country: "USA",
                capital: false,
                population: 3900000,
                regions: ["west_coast", "socal"],
            },
            {
                name: "Washington, D.C.",
                state: null,
                country: "USA",
                capital: true,
                population: 680000,
                regions: ["east_coast"],
            },
        ])
    })
})
