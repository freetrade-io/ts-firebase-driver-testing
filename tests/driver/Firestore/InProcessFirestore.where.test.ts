import { InProcessFirestore } from "../../../src/driver/Firestore/InProcessFirestore"

describe("InProcessFirestore querying with where", () => {
    const firestore = new InProcessFirestore()

    beforeEach(() => {
        firestore.reset()
    })

    test("where == true", async () => {
        // Given a collection of docs with differing values in a field;
        firestore.reset({
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
        expect(result.docs).toHaveLength(2)
        expect(result.docs.map((doc) => doc.id)).toEqual(["tiger", "lion"])
        expect(result.docs.map((doc) => doc.data())).toEqual([
            { name: "tiger", cat: true },
            { name: "lion", cat: true },
        ])
    })

    test("where == false", async () => {
        // Given a collection of docs with differing values in a field;
        firestore.reset({
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
        firestore.reset({
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
        firestore.reset({
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
        firestore.reset({
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
        firestore.reset({
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

    test("where => number", async () => {
        //
    })

    test("where > number", async () => {
        //
    })

    test("where < string", async () => {
        //
    })

    test("where <= string", async () => {
        //
    })

    test("where => string", async () => {
        //
    })

    test("where > string", async () => {
        //
    })

    test("where array-contains", async () => {
        //
    })

    test("where in", async () => {
        //
    })

    test("where array-contains-any", async () => {
        //
    })
})
