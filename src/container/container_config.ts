import { IDependencyContainer } from "./dependency_container"
import { realContainer } from "./real_container"
import { testContainer } from "./test_container"

let dependencyContainer: IDependencyContainer
export function container(): IDependencyContainer {
    return dependencyContainer
}

export function useRealContainer(): void {
    useContainer(realContainer())
}

export function useTestContainer(): void {
    useContainer(testContainer())
}

export function useContainer(c: IDependencyContainer) {
    dependencyContainer = c
}
