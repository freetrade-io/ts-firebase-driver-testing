import {
    InProcessFirebaseBuilderPubSub,
    InProcessFirebasePubSubCl,
} from "../../../src"
import { AsyncJobs } from "../../../src/driver/AsyncJobs"
import { IPubSubMessage } from "../../../src/driver/RealtimeDatabase/IFirebaseRealtimeDatabase"

describe("InProcessFirebasePubSubTopic publisher.publish", () => {
    test("Publishes a message to a topic with attributes and context.", async () => {
        // Given the mocks
        const topic = "Test-Topic"
        const asyncJobs = new AsyncJobs(20)
        const dateMock = jest.fn()

        // Given the time is
        dateMock.mockReturnValue(
            new Date(Date.parse("2021-05-25T12:00:00.000Z")),
        )

        // Given the topic builder under test
        const pubSubBuilder = new InProcessFirebaseBuilderPubSub(
            asyncJobs,
            dateMock,
        )
        const topicBuilder = pubSubBuilder.topic(topic)

        // Given the test message and attributes
        const testMessage = {
            foo: "bah",
            theBatGoes: ["moo", 1, null],
        }
        const testAttributes = {
            flavour: "chocolate",
        }

        // Given a function is subscribed to the topic
        const subFunc = jest
            .fn()
            .mockImplementation((message: IPubSubMessage, context: any) => {
                // Which validates its inputs
                expect(context.timestamp).toStrictEqual(
                    "2021-05-25T12:00:00.000Z",
                )
                expect(message.json).toStrictEqual(testMessage)
                expect(message.attributes).toStrictEqual(testAttributes)
            })
        topicBuilder.onPublish(subFunc)

        // Given we have a pubsub client
        const publisher = new InProcessFirebasePubSubCl(pubSubBuilder)

        // When we publish a message to it, it does the subFunc does not catch any errors
        await publisher
            .topic(topic)
            .publisher.publish(
                Buffer.from(JSON.stringify(testMessage)),
                testAttributes,
            )

        await asyncJobs.jobsComplete()

        // And the subFunc has been called
        expect(subFunc).toHaveBeenCalled()
    })
})
