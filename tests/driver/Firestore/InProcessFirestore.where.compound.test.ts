import { InProcessFirestore } from "../../../src/driver/Firestore/InProcessFirestore"

describe("InProcessFirestore compound querying with where", () => {
    const firestore = new InProcessFirestore()

    beforeEach(() => {
        firestore.resetStorage()
    })

    test("a == string and b == string", async () => {
        // Given a collection of docs with differing values in two fields;
        firestore.resetStorage({
            animals: {
                tiger: {
                    name: "tiger",
                    colour: "orange",
                    sound: "purr",
                },
                hyena: {
                    name: "hyena",
                    colour: "brown",
                    sound: "hehe",
                },
                lion: {
                    name: "lion",
                    colour: "yellow",
                    sound: "roar",
                },
                bear: {
                    name: "bear",
                    colour: "brown",
                    sound: "grunt",
                },
            },
        })

        // When we make a compound query on those fields;
        const result = await firestore
            .collection("animals")
            .where("colour", "==", "brown")
            .where("sound", "==", "grunt")
            .get()

        // Then we should get the correct result.
        expect(result.size).toBe(1)
        expect(result.empty).toBeFalsy()
        expect(result.docs).toHaveLength(1)
        expect(result.docs.map((doc) => doc.id)).toEqual(["bear"])
        expect(result.docs.map((doc) => doc.data())).toEqual([
            { name: "bear", colour: "brown", sound: "grunt" },
        ])
    })

    test("a == string and b < number", async () => {
        // Given a collection of docs with differing values in two fields;
        firestore.resetStorage({
            animals: {
                tiger: {
                    name: "tiger",
                    colour: "orange",
                    weight: 500,
                },
                hyena: {
                    name: "hyena",
                    colour: "brown",
                    weight: 80,
                },
                lion: {
                    name: "lion",
                    colour: "yellow",
                    weight: 300,
                },
                bear: {
                    name: "bear",
                    colour: "brown",
                    weight: 600,
                },
            },
        })

        // When we make a compound query on those fields;
        const result = await firestore
            .collection("animals")
            .where("colour", "==", "brown")
            .where("weight", "<", 400)
            .get()

        // Then we should get the correct result.
        expect(result.size).toBe(1)
        expect(result.empty).toBeFalsy()
        expect(result.docs).toHaveLength(1)
        expect(result.docs.map((doc) => doc.id)).toEqual(["hyena"])
        expect(result.docs.map((doc) => doc.data())).toEqual([
            { name: "hyena", colour: "brown", weight: 80 },
        ])
    })

    test("a == string and b <= string", async () => {
        // Given a collection of docs with differing values in two fields;
        firestore.resetStorage({
            drinks: {
                aperolSpritz: {
                    name: "aperol spritz",
                    flavour: "zesty",
                    colour: "orange",
                    strength: 8,
                },
                beer: {
                    name: "beer",
                    flavour: "crisp",
                    colour: "yellow",
                    strength: 4,
                },
                champagne: {
                    name: "champagne",
                    flavour: "fizzy",
                    colour: "yellow",
                    strength: 11,
                },
                whiskey: {
                    name: "whiskey",
                    flavour: "pungent",
                    colour: "orange",
                    strength: 40,
                },
            },
        })

        // When we make a compound query on those fields;
        const result = await firestore
            .collection("drinks")
            .where("colour", "==", "orange")
            .where("strength", "<=", 50)
            .get()

        // Then we should get the correct result.
        expect(result.size).toBe(2)
        expect(result.empty).toBeFalsy()
        expect(result.docs).toHaveLength(2)
        expect(result.docs.map((doc) => doc.id)).toEqual([
            "aperolSpritz",
            "whiskey",
        ])
        expect(result.docs.map((doc) => doc.data())).toEqual([
            {
                name: "aperol spritz",
                flavour: "zesty",
                colour: "orange",
                strength: 8,
            },
            {
                name: "whiskey",
                flavour: "pungent",
                colour: "orange",
                strength: 40,
            },
        ])
    })

    test("a == string and b > number", async () => {
        // Given a collection of docs with differing values in two fields;
        firestore.resetStorage({
            drinks: {
                aperolSpritz: {
                    name: "aperol spritz",
                    flavour: "zesty",
                    colour: "orange",
                    strength: 8,
                },
                beer: {
                    name: "beer",
                    flavour: "crisp",
                    colour: "yellow",
                    strength: 4,
                },
                champagne: {
                    name: "champagne",
                    flavour: "fizzy",
                    colour: "yellow",
                    strength: 11,
                },
                whiskey: {
                    name: "whiskey",
                    flavour: "pungent",
                    colour: "orange",
                    strength: 40,
                },
            },
        })

        // When we make a compound query on those fields;
        const result = await firestore
            .collection("drinks")
            .where("colour", "==", "orange")
            .where("strength", ">", 8)
            .get()

        // Then we should get the correct result.
        expect(result.size).toBe(1)
        expect(result.empty).toBeFalsy()
        expect(result.docs).toHaveLength(1)
        expect(result.docs.map((doc) => doc.id)).toEqual(["whiskey"])
        expect(result.docs.map((doc) => doc.data())).toEqual([
            {
                name: "whiskey",
                flavour: "pungent",
                colour: "orange",
                strength: 40,
            },
        ])
    })

    test("cannot have range filters on different fields", async () => {
        // Given a collection of docs with differing values in two fields;
        firestore.resetStorage({
            drinks: {
                aperolSpritz: {
                    name: "aperol spritz",
                    flavour: "zesty",
                    colour: "orange",
                    strength: 8,
                },
                beer: {
                    name: "beer",
                    flavour: "crisp",
                    colour: "yellow",
                    strength: 4,
                },
                champagne: {
                    name: "champagne",
                    flavour: "fizzy",
                    colour: "yellow",
                    strength: 11,
                },
                whiskey: {
                    name: "whiskey",
                    flavour: "pungent",
                    colour: "orange",
                    strength: 40,
                },
            },
        })

        // When we try to perform range queries on different fields;
        let error: Error | null = null
        try {
            firestore
                .collection("drinks")
                .where("name", ">", "b")
                .where("strength", "<", 20)
        } catch (err) {
            error = err as any
        }

        // Then we should get an error.
        expect(error).toBeInstanceOf(Error)
        expect((error as Error).message).toContain(
            "Firestore cannot have range filters on different fields",
        )
    })

    test("a > number and a < number", async () => {
        // Given a collection of docs with differing values in two fields;
        firestore.resetStorage({
            drinks: {
                aperolSpritz: {
                    name: "aperol spritz",
                    flavour: "zesty",
                    colour: "orange",
                    strength: 8,
                },
                beer: {
                    name: "beer",
                    flavour: "crisp",
                    colour: "yellow",
                    strength: 4,
                },
                champagne: {
                    name: "champagne",
                    flavour: "fizzy",
                    colour: "yellow",
                    strength: 11,
                },
                whiskey: {
                    name: "whiskey",
                    flavour: "pungent",
                    colour: "orange",
                    strength: 40,
                },
            },
        })

        // When we make a compound query on those fields;
        const result = await firestore
            .collection("drinks")
            .where("strength", ">", 4)
            .where("strength", "<", 40)
            .get()

        // Then we should get the correct result.
        expect(result.size).toBe(2)
        expect(result.empty).toBeFalsy()
        expect(result.docs).toHaveLength(2)
        expect(result.docs.map((doc) => doc.id)).toEqual([
            "aperolSpritz",
            "champagne",
        ])
        expect(result.docs.map((doc) => doc.data())).toEqual([
            {
                name: "aperol spritz",
                flavour: "zesty",
                colour: "orange",
                strength: 8,
            },
            {
                name: "champagne",
                flavour: "fizzy",
                colour: "yellow",
                strength: 11,
            },
        ])
    })
})
