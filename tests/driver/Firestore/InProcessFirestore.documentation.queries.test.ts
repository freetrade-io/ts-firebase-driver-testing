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
        expect(stateQuery.empty).toBe(false)
        expect(stateQuery.size).toBe(2)
        expect(stateQuery.docs).toHaveLength(2)
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
        expect(populationQuery.empty).toBe(false)
        expect(populationQuery.size).toBe(2)
        expect(populationQuery.docs).toHaveLength(2)
        expect(populationQuery.docs.map((doc) => doc.data())).toEqual([
            {
                name: "San Francisco",
                state: "CA",
                country: "USA",
                capital: false,
                population: 860000,
                regions: ["west_coast", "norcal"],
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

        const nameQuery = await citiesRef
            .where("name", ">=", "San Francisco")
            .get()
        expect(nameQuery.empty).toBe(false)
        expect(nameQuery.size).toBe(3)
        expect(nameQuery.docs).toHaveLength(3)
        expect(nameQuery.docs.map((doc) => doc.data())).toEqual([
            {
                name: "San Francisco",
                state: "CA",
                country: "USA",
                capital: false,
                population: 860000,
                regions: ["west_coast", "norcal"],
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
    })

    /**
     * https://firebase.google.com/docs/firestore/query-data/queries#array_membership
     */
    test("Array membership", async () => {
        const citiesRef = db.collection("cities")

        const westCoastCities = await citiesRef
            .where("regions", "array-contains", "west_coast")
            .get()

        expect(westCoastCities.empty).toBe(false)
        expect(westCoastCities.size).toBe(2)
        expect(westCoastCities.docs).toHaveLength(2)
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

        expect(usaOrJapan.empty).toBe(false)
        expect(usaOrJapan.size).toBe(4)
        expect(usaOrJapan.empty).toBeFalsy()
        expect(usaOrJapan.docs).toHaveLength(4)
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
        expect(eastOrWestCoastCities.empty).toBe(false)
        expect(eastOrWestCoastCities.size).toBe(3)
        expect(eastOrWestCoastCities.docs).toHaveLength(3)
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

    /**
     * https://firebase.google.com/docs/firestore/query-data/queries#compound_queries
     */
    test("Compound queries", async () => {
        const citiesRef = db.collection("cities")

        const stateNameQuery = await citiesRef
            .where("state", "==", "CO")
            .where("name", "==", "Denver")
            .get()
        expect(stateNameQuery.size).toBe(0)
        expect(stateNameQuery.docs).toHaveLength(0)
        expect(stateNameQuery.empty).toBe(true)
        expect(stateNameQuery.docs).toEqual([])

        const statePopulationLtQuery = await citiesRef
            .where("state", "==", "CA")
            .where("population", "<", 1000000)
            .get()
        expect(statePopulationLtQuery.size).toBe(1)
        expect(statePopulationLtQuery.docs).toHaveLength(1)
        expect(statePopulationLtQuery.empty).toBe(false)
        expect(statePopulationLtQuery.docs.map((doc) => doc.data())).toEqual([
            {
                name: "San Francisco",
                state: "CA",
                country: "USA",
                capital: false,
                population: 860000,
                regions: ["west_coast", "norcal"],
            },
        ])

        const stateStateQuery = await citiesRef
            .where("state", ">=", "CA")
            .where("state", "<=", "IN")
            .get()
        expect(stateStateQuery.size).toBe(2)
        expect(stateStateQuery.docs).toHaveLength(2)
        expect(stateStateQuery.empty).toBe(false)
        expect(stateStateQuery.docs.map((doc) => doc.data())).toEqual([
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

        const statePopulationGtQuery = await citiesRef
            .where("state", "==", "CA")
            .where("population", ">", 1000000)
            .get()
        expect(statePopulationGtQuery.size).toBe(1)
        expect(statePopulationGtQuery.docs).toHaveLength(1)
        expect(statePopulationGtQuery.empty).toBe(false)
        expect(statePopulationGtQuery.docs.map((doc) => doc.data())).toEqual([
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
})
