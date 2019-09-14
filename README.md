# Firebase Driver Testing

## Swap out Firebase as a driver for in-process testing

This package allows easier high-level testing of business logic in Firebase applications by
providing the ability to swap out Firebase as a "driver".

The [Firebase Test SDK for Cloud Functions](https://firebase.google.com/docs/functions/unit-testing)
has a similar use-case, but requires a lot more meddling with Firebase internals to stub out the
parts of the system that interact with the outside world.

_firebase-driver-testing_ instead provides an interface for Firebase as a "driver" that can be
swapped out in one go, using either the real Firebase or an in-memory, synchronous version that
exists in a single process with your tests.

## Installation

Install via NPM:

```bash
npm i firebase-driver-testing
```

Or via Yarn:

```bash
yarn add firebase-driver-testing
```

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

## Usage

_firebase-driver-testing_ provides an interface called `IFirebaseDriver`. This interface gives
access to various parts of the Firebase API, such as Firebase Realtime Database.

Instead of grabbing the database directly from Firebase, you should instead take it from an instance
of the Firebase Driver. This allows the driver to be swapped out as one to use either the real
Firebase or an in-memory, synchronous version with largely the same behaviour.

This should be handled with a dependency container which is provided by the `IDependencyContaineer`
interface.

Whereas normally you might grab the Firebase Realtime Database directly:

```typescript
import { database } from "firebase-admin"
const database = database()
// ...
```

To use _firebase-driver-testing_ you should instead get the Firebase Driver from the container, and
get the database instance from there:

```typescript
import { container, IFirebaseDriver } from "firebase-driver-testing"
const database = container().make<IFirebaseDriver>('IFirebaseDriver').realTimeDatabase()
// ...
```

This is more convoluted, but once it's in place you can swap out Firebase in tests without changing
the application code (this is the principle that
[details should depend on abstractions](https://en.wikipedia.org/wiki/Dependency_inversion_principle))

You need to indicate which set of dependencies (real or testing) should be used before application
components start pulling dependencies out of the container.

To use the real dependencies that interact with the outside world:

```typescript
import { useRealContainer } from "firebase-driver-testing"
useRealContainer()
```

Or for the test dependencies that all existing in-memory in the same process as your tests:

```typescript
import { useTestContainer } from "firebase-driver-testing"
useTestContainer()
```

Those functions create a container with appropriate default dependencies set up. You will need to
configure the container with other dependencies that are necessary for the subjects under test.

To do this you bind an identifier for the dependency (the name of the class or interface is
recommended) with a factory function that will receive an instance of the container when the
dependency is resolved.

```typescript
import { container } from "firebase-driver-testing"

container().bind<IFooBarDependency>('IFooBarDependency', (c) => {
    return new FooBarDependency(
        c.make<ISomeOtherDependency>('ISomeOtherDependency')
    )
})
```

In this way you can set up your dependencies, keeping implementations separate for real vs test
runs. You will need to have container configurations for real and test dependencies, and apply the
configurations before the container is used.

Again, this is more complex, but that's the trade-off for allowing the dependencies to be swapped
out easily for testing.
