import { InProcessFirebaseDriver } from "../driver/in_process_firebase_driver"
import { DependencyContainer, IDependencyContainer } from "./dependency_container"

let testDependencyContainer: IDependencyContainer
export function testContainer(): IDependencyContainer {
    if (!testDependencyContainer) {
        testDependencyContainer = new DependencyContainer()
        configureTestContainer(testDependencyContainer)
    }
    return testDependencyContainer
}

function configureTestContainer(container: IDependencyContainer) {
    container.bind("IFirebaseDriver", () => {
        return new InProcessFirebaseDriver()
    })
}
