import { InProcessFirestore } from "../../../src/driver/Firestore/InProcessFirestore"

describe("InProcessFirestore querying with where", () => {
    const firestore = new InProcessFirestore()

    beforeEach(() => {
        firestore.resetStorage()
    })

    test("where == true", async () => {
        // Given a collection of docs with differing values in a field;
        firestore.resetStorage({
            animals: {
                tiger: {
                    name: "tiger",
                    cat: true,
                },
                hyena: {
                    name: "hyena",
                    cat: false,
                },
                lion: {
                    name: "lion",
                    cat: true,
                },
                bear: {
                    name: "bear",
                    cat: false,
                },
            },
        })

        // When we query docs by that field;
        const result = await firestore
            .collection("animals")
            .where("cat", "==", true)
            .get()

        // Then we should get the correct results.
        expect(result.size).toBe(2)
        expect(result.empty).toBeFalsy()
        expect(result.docs).toHaveLength(2)
        expect(result.docs.map((doc) => doc.id)).toEqual(["tiger", "lion"])
        expect(result.docs.map((doc) => doc.data())).toEqual([
            { name: "tiger", cat: true },
            { name: "lion", cat: true },
        ])
    })

    test("where == false", async () => {
        // Given a collection of docs with differing values in a field;
        firestore.resetStorage({
            animals: {
                tiger: {
                    name: "tiger",
                    cat: true,
                },
                hyena: {
                    name: "hyena",
                    cat: false,
                },
                lion: {
                    name: "lion",
                    cat: true,
                },
                bear: {
                    name: "bear",
                    cat: false,
                },
            },
        })

        // When we query docs by that field;
        const result = await firestore
            .collection("animals")
            .where("cat", "==", false)
            .get()

        // Then we should get the correct results.
        expect(result.docs).toHaveLength(2)
        expect(result.docs.map((doc) => doc.id)).toEqual(["hyena", "bear"])
        expect(result.docs.map((doc) => doc.data())).toEqual([
            { name: "hyena", cat: false },
            { name: "bear", cat: false },
        ])
    })

    test("where == string", async () => {
        // Given a collection of docs with differing values in a field;
        firestore.resetStorage({
            animals: {
                tiger: {
                    name: "tiger",
                    size: "chunky",
                },
                hyena: {
                    name: "hyena",
                    size: "medium",
                },
                lion: {
                    name: "lion",
                    size: "quite big",
                },
                bear: {
                    name: "bear",
                    size: "chunky",
                },
            },
        })

        // When we query docs by that field;
        const result = await firestore
            .collection("animals")
            .where("size", "==", "chunky")
            .get()

        // Then we should get the correct results.
        expect(result.docs).toHaveLength(2)
        expect(result.docs.map((doc) => doc.id)).toEqual(["tiger", "bear"])
        expect(result.docs.map((doc) => doc.data())).toEqual([
            { name: "tiger", size: "chunky" },
            { name: "bear", size: "chunky" },
        ])
    })

    test("where == number", async () => {
        // Given a collection of docs with differing values in a field;
        firestore.resetStorage({
            animals: {
                tiger: {
                    name: "tiger",
                    popularityRating: 5,
                },
                hyena: {
                    name: "hyena",
                    popularityRating: 2,
                },
                lion: {
                    name: "lion",
                    popularityRating: 3,
                },
                bear: {
                    name: "bear",
                    popularityRating: 3,
                },
            },
        })

        // When we query docs by that field;
        const result = await firestore
            .collection("animals")
            .where("popularityRating", "==", 3)
            .get()

        // Then we should get the correct results.
        expect(result.docs).toHaveLength(2)
        expect(result.docs.map((doc) => doc.id)).toEqual(["lion", "bear"])
        expect(result.docs.map((doc) => doc.data())).toEqual([
            { name: "lion", popularityRating: 3 },
            { name: "bear", popularityRating: 3 },
        ])
    })

    test("where < number", async () => {
        // Given a collection of docs with differing values in a field;
        firestore.resetStorage({
            animals: {
                tiger: {
                    name: "tiger",
                    popularityRating: 5,
                },
                hyena: {
                    name: "hyena",
                    popularityRating: 1,
                },
                lion: {
                    name: "lion",
                    popularityRating: 3,
                },
                bear: {
                    name: "bear",
                    popularityRating: 2,
                },
            },
        })

        // When we query docs by that field;
        const result = await firestore
            .collection("animals")
            .where("popularityRating", "<", 3)
            .get()

        // Then we should get the correct results.
        expect(result.docs).toHaveLength(2)
        expect(result.docs.map((doc) => doc.id)).toEqual(["hyena", "bear"])
        expect(result.docs.map((doc) => doc.data())).toEqual([
            { name: "hyena", popularityRating: 1 },
            { name: "bear", popularityRating: 2 },
        ])
    })

    test("where <= number", async () => {
        // Given a collection of docs with differing values in a field;
        firestore.resetStorage({
            animals: {
                tiger: {
                    name: "tiger",
                    popularityRating: 5,
                },
                hyena: {
                    name: "hyena",
                    popularityRating: 1,
                },
                lion: {
                    name: "lion",
                    popularityRating: 3,
                },
                bear: {
                    name: "bear",
                    popularityRating: 2,
                },
            },
        })

        // When we query docs by that field;
        const result = await firestore
            .collection("animals")
            .where("popularityRating", "<=", 3)
            .get()

        // Then we should get the correct results.
        expect(result.docs).toHaveLength(3)
        expect(result.docs.map((doc) => doc.id)).toEqual([
            "hyena",
            "lion",
            "bear",
        ])
        expect(result.docs.map((doc) => doc.data())).toEqual([
            { name: "hyena", popularityRating: 1 },
            { name: "lion", popularityRating: 3 },
            { name: "bear", popularityRating: 2 },
        ])
    })

    test("where >= number", async () => {
        // Given a collection of docs with differing values in a field;
        firestore.resetStorage({
            animals: {
                tiger: {
                    name: "tiger",
                    popularityRating: 5,
                },
                hyena: {
                    name: "hyena",
                    popularityRating: 1,
                },
                lion: {
                    name: "lion",
                    popularityRating: 3,
                },
                bear: {
                    name: "bear",
                    popularityRating: 2,
                },
            },
        })

        // When we query docs by that field;
        const result = await firestore
            .collection("animals")
            .where("popularityRating", ">=", 2)
            .get()

        // Then we should get the correct results.
        expect(result.docs).toHaveLength(3)
        expect(result.docs.map((doc) => doc.id)).toEqual([
            "tiger",
            "lion",
            "bear",
        ])
        expect(result.docs.map((doc) => doc.data())).toEqual([
            { name: "tiger", popularityRating: 5 },
            { name: "lion", popularityRating: 3 },
            { name: "bear", popularityRating: 2 },
        ])
    })

    test("where > number", async () => {
        // Given a collection of docs with differing values in a field;
        firestore.resetStorage({
            animals: {
                tiger: {
                    name: "tiger",
                    popularityRating: 5,
                },
                hyena: {
                    name: "hyena",
                    popularityRating: 1,
                },
                lion: {
                    name: "lion",
                    popularityRating: 3,
                },
                bear: {
                    name: "bear",
                    popularityRating: 2,
                },
            },
        })

        // When we query docs by that field;
        const result = await firestore
            .collection("animals")
            .where("popularityRating", ">", 2)
            .get()

        // Then we should get the correct results.
        expect(result.docs).toHaveLength(2)
        expect(result.docs.map((doc) => doc.id)).toEqual(["tiger", "lion"])
        expect(result.docs.map((doc) => doc.data())).toEqual([
            { name: "tiger", popularityRating: 5 },
            { name: "lion", popularityRating: 3 },
        ])
    })

    test("where < string", async () => {
        // Given a collection of docs with differing values in a field;
        firestore.resetStorage({
            animals: {
                tiger: {
                    name: "tiger",
                    favouriteBand: "Band of Horses",
                },
                hyena: {
                    name: "hyena",
                    favouriteBand: "AC/DC",
                },
                lion: {
                    name: "lion",
                    favouriteBand: "ZZ Top",
                },
                bear: {
                    name: "bear",
                    favouriteBand: "Com Truise",
                },
            },
        })

        // When we query docs by that field;
        const result = await firestore
            .collection("animals")
            .where("favouriteBand", "<", "C")
            .get()

        // Then we should get the correct results.
        expect(result.docs).toHaveLength(2)
        expect(result.docs.map((doc) => doc.id)).toEqual(["tiger", "hyena"])
        expect(result.docs.map((doc) => doc.data())).toEqual([
            { name: "tiger", favouriteBand: "Band of Horses" },
            { name: "hyena", favouriteBand: "AC/DC" },
        ])
    })

    test("where <= string", async () => {
        // Given a collection of docs with differing values in a field;
        firestore.resetStorage({
            animals: {
                tiger: {
                    name: "tiger",
                    favouriteBand: "Band of Horses",
                },
                hyena: {
                    name: "hyena",
                    favouriteBand: "AC/DC",
                },
                lion: {
                    name: "lion",
                    favouriteBand: "ZZ Top",
                },
                bear: {
                    name: "bear",
                    favouriteBand: "Com Truise",
                },
            },
        })

        // When we query docs by that field;
        const result = await firestore
            .collection("animals")
            .where("favouriteBand", "<=", "Com Truise")
            .get()

        // Then we should get the correct results.
        expect(result.docs).toHaveLength(3)
        expect(result.docs.map((doc) => doc.id)).toEqual([
            "tiger",
            "hyena",
            "bear",
        ])
        expect(result.docs.map((doc) => doc.data())).toEqual([
            { name: "tiger", favouriteBand: "Band of Horses" },
            { name: "hyena", favouriteBand: "AC/DC" },
            { name: "bear", favouriteBand: "Com Truise" },
        ])
    })

    test("where >= string", async () => {
        // Given a collection of docs with differing values in a field;
        firestore.resetStorage({
            animals: {
                tiger: {
                    name: "tiger",
                    favouriteBand: "Band of Horses",
                },
                hyena: {
                    name: "hyena",
                    favouriteBand: "AC/DC",
                },
                lion: {
                    name: "lion",
                    favouriteBand: "ZZ Top",
                },
                bear: {
                    name: "bear",
                    favouriteBand: "Com Truise",
                },
            },
        })

        // When we query docs by that field;
        const result = await firestore
            .collection("animals")
            .where("favouriteBand", ">=", "Com Truise")
            .get()

        // Then we should get the correct results.
        expect(result.docs).toHaveLength(2)
        expect(result.docs.map((doc) => doc.id)).toEqual(["lion", "bear"])
        expect(result.docs.map((doc) => doc.data())).toEqual([
            { name: "lion", favouriteBand: "ZZ Top" },
            { name: "bear", favouriteBand: "Com Truise" },
        ])
    })

    test("where > string", async () => {
        // Given a collection of docs with differing values in a field;
        firestore.resetStorage({
            animals: {
                tiger: {
                    name: "tiger",
                    favouriteBand: "Band of Horses",
                },
                hyena: {
                    name: "hyena",
                    favouriteBand: "AC/DC",
                },
                lion: {
                    name: "lion",
                    favouriteBand: "ZZ Top",
                },
                bear: {
                    name: "bear",
                    favouriteBand: "Com Truise",
                },
            },
        })

        // When we query docs by that field;
        const result = await firestore
            .collection("animals")
            .where("favouriteBand", ">", "B")
            .get()

        // Then we should get the correct results.
        expect(result.docs).toHaveLength(3)
        expect(result.docs.map((doc) => doc.id)).toEqual([
            "tiger",
            "lion",
            "bear",
        ])
        expect(result.docs.map((doc) => doc.data())).toEqual([
            { name: "tiger", favouriteBand: "Band of Horses" },
            { name: "lion", favouriteBand: "ZZ Top" },
            { name: "bear", favouriteBand: "Com Truise" },
        ])
    })

    test("where array-contains", async () => {
        // Given a collection of docs with differing values in a field;
        firestore.resetStorage({
            animals: {
                tiger: {
                    name: "tiger",
                    eats: ["chips", "burgers"],
                },
                hyena: {
                    name: "hyena",
                    eats: ["dead things", "pizza"],
                },
                lion: {
                    name: "lion",
                    eats: ["gazelles", "pizza"],
                },
                bear: {
                    name: "bear",
                    eats: ["honey", "chips"],
                },
            },
        })

        // When we query docs by that field;
        const result = await firestore
            .collection("animals")
            .where("eats", "array-contains", "chips")
            .get()

        // Then we should get the correct results.
        expect(result.docs).toHaveLength(2)
        expect(result.docs.map((doc) => doc.id)).toEqual(["tiger", "bear"])
        expect(result.docs.map((doc) => doc.data())).toEqual([
            { name: "tiger", eats: ["chips", "burgers"] },
            { name: "bear", eats: ["honey", "chips"] },
        ])
    })

    test("where in", async () => {
        // Given a collection of docs with differing values in a field;
        firestore.resetStorage({
            animals: {
                tiger: {
                    name: "tiger",
                    favouriteBand: "Band of Horses",
                },
                hyena: {
                    name: "hyena",
                    favouriteBand: "AC/DC",
                },
                lion: {
                    name: "lion",
                    favouriteBand: "ZZ Top",
                },
                bear: {
                    name: "bear",
                    favouriteBand: "Com Truise",
                },
            },
        })

        // When we query docs by that field;
        const result = await firestore
            .collection("animals")
            .where("favouriteBand", "in", ["AC/DC", "ZZ Top"])
            .get()

        // Then we should get the correct results.
        expect(result.docs).toHaveLength(2)
        expect(result.docs.map((doc) => doc.id)).toEqual(["hyena", "lion"])
        expect(result.docs.map((doc) => doc.data())).toEqual([
            { name: "hyena", favouriteBand: "AC/DC" },
            { name: "lion", favouriteBand: "ZZ Top" },
        ])
    })

    test("where array-contains-any", async () => {
        // Given a collection of docs with differing values in a field;
        firestore.resetStorage({
            animals: {
                tiger: {
                    name: "tiger",
                    eats: ["chips", "burgers", "pizza"],
                },
                hyena: {
                    name: "hyena",
                    eats: ["dead things"],
                },
                lion: {
                    name: "lion",
                    eats: ["gazelles", "pizza"],
                },
                bear: {
                    name: "bear",
                    eats: ["honey", "chips"],
                },
            },
        })

        // When we query docs by that field;
        const result = await firestore
            .collection("animals")
            .where("eats", "array-contains-any", ["chips", "pizza"])
            .get()

        // Then we should get the correct results.
        expect(result.docs).toHaveLength(3)
        expect(result.docs.map((doc) => doc.id)).toEqual([
            "tiger",
            "lion",
            "bear",
        ])
        expect(result.docs.map((doc) => doc.data())).toEqual([
            { name: "tiger", eats: ["chips", "burgers", "pizza"] },
            { name: "lion", eats: ["gazelles", "pizza"] },
            { name: "bear", eats: ["honey", "chips"] },
        ])
    })
})
