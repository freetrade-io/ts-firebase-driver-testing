import { performance } from "perf_hooks"
import { IAsyncJobs } from "../AsyncJobs"
import { IDatabaseChangePerformanceStats } from "../ChangeObserver/DatabaseChangeObserver"
import {
    CloudFunction,
    IAttributes,
    IFirebaseBuilderPubSub,
    IFirebaseScheduleBuilder,
    IFirebaseTopicBuilder,
    IPubSub,
    IPubSubPublisher,
    IPubSubTopic,
} from "../FirebaseDriver"
import {
    IFirebaseEventContext,
    IPubSubMessage,
    PubSubMessage,
} from "../RealtimeDatabase/IFirebaseRealtimeDatabase"

export class InProcessFirebaseScheduleBuilder
    implements IFirebaseScheduleBuilder {
    onRun(handler: (context: object) => PromiseLike<any>): CloudFunction<{}> {
        const scheduledFunction = async (context: object): Promise<any> => {
            return handler(context)
        }
        scheduledFunction.run = scheduledFunction
        return scheduledFunction
    }

    timeZone(timeZone: string): IFirebaseScheduleBuilder {
        return this
    }
}

export class InProcessFirebaseTopicBuilder implements IFirebaseTopicBuilder {
    constructor(
        readonly name: string,
        private readonly pubSub: InProcessFirebaseBuilderPubSub,
    ) {}

    onPublish(
        handler: (
            message: IPubSubMessage,
            context: IFirebaseEventContext,
        ) => PromiseLike<any> | any,
    ): CloudFunction<IPubSubMessage> {
        const topicFunction = async (
            message: IPubSubMessage,
            context: IFirebaseEventContext,
        ): Promise<any> => {
            return handler(message, context)
        }
        topicFunction.run = topicFunction
        this.pubSub._addSubscription(this.name, topicFunction)
        return topicFunction
    }
}

export class InProcessFirebaseBuilderPubSub implements IFirebaseBuilderPubSub {
    private readonly subscriptions: {
        [key: string]: Array<CloudFunction<any>>
    } = {}

    constructor(
        private readonly jobs: IAsyncJobs,
        private readonly now: () => Date = () => new Date(),
    ) {}

    schedule(schedule: string): InProcessFirebaseScheduleBuilder {
        return new InProcessFirebaseScheduleBuilder()
    }

    topic(topic: string): InProcessFirebaseTopicBuilder {
        return new InProcessFirebaseTopicBuilder(topic, this)
    }

    _addSubscription(topicName: string, handler: CloudFunction<any>): void {
        if (!this.subscriptions[topicName]) {
            this.subscriptions[topicName] = []
        }
        this.subscriptions[topicName].push(handler)
    }

    _publish(topicName: string, data: Buffer, attributes?: IAttributes): void {
        if (!this.subscriptions[topicName]) {
            return
        }
        for (const handler of this.subscriptions[topicName]) {
            const start = performance.now()
            const job = new Promise<IDatabaseChangePerformanceStats>(
                (resolve) => {
                    const message = new PubSubMessage(data, attributes ?? {})
                    handler(message, {
                        timestamp: this.now().toISOString(),
                    }).then(() =>
                        resolve({
                            topicName,
                            durationMillis: performance.now() - start,
                        }),
                    )
                },
            )
            this.jobs.pushJob(job)
        }
    }
}

class InProcessPubSubPublisher implements IPubSubPublisher {
    constructor(private readonly topic: InProcessFirebasePubSubTopic) {}

    // @ts-ignore
    publish(data: Buffer, attributes?: Attributes): Promise<void> {
        this.topic._publish(data, attributes)
    }
}

class InProcessFirebasePubSubTopic implements IPubSubTopic {
    readonly publisher: IPubSubPublisher

    constructor(
        readonly name: string,
        private readonly pubSub: InProcessFirebaseBuilderPubSub,
    ) {
        this.publisher = new InProcessPubSubPublisher(this)
    }

    _publish(data: Buffer, attributes?: IAttributes) {
        this.pubSub._publish(this.name, data, attributes)
    }
}

export class InProcessFirebasePubSubCl implements IPubSub {
    private readonly topics: {
        [key: string]: InProcessFirebasePubSubTopic
    } = {}

    constructor(private readonly pubSub: InProcessFirebaseBuilderPubSub) {}

    topic(name: string): InProcessFirebasePubSubTopic {
        if (!this.topics[name]) {
            this.topics[name] = new InProcessFirebasePubSubTopic(
                name,
                this.pubSub,
            )
        }
        return this.topics[name]
    }
}
