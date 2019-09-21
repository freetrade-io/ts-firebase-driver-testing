# Firebase Driver Testing

[![Build Status](https://travis-ci.org/hughgrigg/firebase-driver-testing.svg?branch=master)](https://travis-ci.org/freetrade-io/firebase-driver-testing)
[![npm version](https://badge.fury.io/js/firebase-driver-testing.svg)](http://badge.fury.io/js/firebase-driver-testing)

## Swap out Firebase as a driver for in-process testing

This package allows easier high-level testing of business logic in Firebase applications by
providing the ability to swap out Firebase as a "driver".

The [Firebase Test SDK for Cloud Functions](https://firebase.google.com/docs/functions/unit-testing)
has a similar use-case, but requires a lot more meddling with Firebase internals to stub out the
parts of the system that interact with the outside world.

_firebase-driver-testing_ instead provides an interface for Firebase as a driver that can be
swapped out in one go, using either the real Firebase or an in-memory version that exists in a
single process with your tests.

## Installation

Install via NPM:

```bash
npm i firebase-driver-testing
```

Or via Yarn:

```bash
yarn add firebase-driver-testing
```

## Usage

_firebase-driver-testing_ provides an interface called `IFirebaseDriver`. This interface gives
access to various parts of the Firebase API, such as Firebase Realtime Database.

Instead of grabbing the database directly from Firebase, you should instead take it from an instance
of the Firebase Driver. This allows the driver to be swapped out as one to use either the real
Firebase or an in-memory, synchronous version with largely the same behaviour.

Whereas normally you might grab the Firebase Realtime Database directly:

```typescript
import { database } from "firebase-admin"
const database = database()
// ...
```

To use _firebase-driver-testing_ you should instead get the Firebase Driver, and get the database
instance from there:

```typescript
import { firebaseDriver } from "./wherever/you/have/configured/the/driver"
const database = firebaseDriver.realTimeDatabase()
```

How you manage and configure the Firebase driver is up to you. You might want to use a dependency
container pattern to manage dependencies between tests and real usage.

For example, you can configure the real Firebase driver in an `index.ts` file that will set it up
before the rest of the application.

In tests, you can use a `setup.ts` file and ensure it's run before the tests via Jest:

```bash
jest --setupFilesAfterEnv='<rootDir>/__tests__/setup.ts'
```

You can also configure Jest to use the setup file in your project's `package.json`:

```json
{
    "jest": {
        "setupFilesAfterEnv": ["<rootDir>/__tests__/setup.ts"]
    }
}
```

Either way, the important thing is that the driver is configured before the rest of the application.
This package doesn't have an opinion on how you should do that; it just provides the in-process
Firebase driver implementation for your tests to use.

### Available driver components

So far the Firebase driver offers these components:

```typescript
export interface IFirebaseDriver {
    realTimeDatabase(): IFirebaseRealtimeDatabase
    runWith(runtimeOptions: IRunTimeOptions): IFirebaseFunctionBuilder
    runOptions(memory?: MemoryOption, timeoutSeconds?: number): IRunTimeOptions
}
```

We'll be adding more components as we need them for our own testing.

### Trigger functions

Firebase pubsub and Realtime Database trigger functions are handled within the Firebase driver with
the same API as the real Firebase.

This means you can set up a database event trigger as normal, and it will be triggered during your
tests in the same process, so that you can debug it and have fast-running, controllable tests.

## FAQ

### What is this for?

_firebase-driver-testing_ is intended to make it easier to write higher-level tests for business
logic in Firebase applications.

For example, this kind of test case:

```gherkin
// Given a pub-sub message is sent to the foobar topic;

// Then an update should be made to foobar/some-id;

// And bar/foo/some-id should also be updated. 
```

There may be business logic in event trigger functions and pub-sub functions that needs to be tested
as a whole. This is tricky to do with the _Firebase Test SDK for Cloud Functions_ as you have to
carefully stub out the right parts and manage the overall behaviour from the test.

_firebase-driver-testing_ lets you swap out the Firebase pub-sub and event trigger functions for the
test, so that you can interact with an application entry point as normal, and then assert that the
correct behaviour happened across functions.

### Why would I want this?

If you want to benefit from high-level business logic tests that run quickly in a single process
without interacting with the outside world, then you might find _firebase-driver-testing_ useful.

### How is this different to the Firebase Function Test SDK?

The [Firebase Test SDK for Cloud Functions](https://firebase.google.com/docs/functions/unit-testing)
also lets you run in-process tests for your Firebase functions, and provides a more complete and
accurate representation of the Firebase API than _firebase-driver-testing_.

The _Firebase Test SDK_ requires carefully stubbing out the correct parts of the Firebase
application under test, whereas _firebase-driver-testing_ allows swapping it all out and once and
then checking that the application interacted with Firebase correctly.
