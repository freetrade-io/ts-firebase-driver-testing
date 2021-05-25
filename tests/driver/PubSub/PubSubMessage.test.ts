import { PubSubMessage } from "../../../src/driver/RealtimeDatabase/IFirebaseRealtimeDatabase"

describe("PubSubMessage", () => {
    test("Stores and returns a buffer", () => {
        // Given the buffer
        const testObj = {
            foo: "bar",
        }
        const buffer = Buffer.from(JSON.stringify(testObj))

        // When we build a message
        const message = new PubSubMessage(buffer, {})

        // We can retrieve it
        expect(message.json).toStrictEqual(testObj)
        expect(message.toJSON()).toStrictEqual(testObj)
    })

    test("Stores and returns attributes", () => {
        // Given the buffer
        const buffer = Buffer.from("foo")

        // Given the attributes
        const attributes = {
            attri: "butes",
            theDog: "eats butter",
        }

        // When we build a message
        const message = new PubSubMessage(buffer, attributes)

        // We can retrieve its attributes
        expect(message.attributes).toStrictEqual(attributes)
    })
})
