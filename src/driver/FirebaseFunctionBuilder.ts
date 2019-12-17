import {
    IFirebaseBuilderDatabase,
    IFirebaseBuilderPubSub,
} from "./FirebaseDriver"

export declare const SUPPORTED_REGIONS: readonly [
    "us-central1",
    "us-east1",
    "us-east4",
    "europe-west1",
    "europe-west2",
    "asia-east2",
    "asia-northeast1",
]

export interface IFirebaseFunctionBuilder {
    pubsub: IFirebaseBuilderPubSub
    database: IFirebaseBuilderDatabase

    region(
        ...regions: Array<typeof SUPPORTED_REGIONS[number]>
    ): IFirebaseFunctionBuilder
}
