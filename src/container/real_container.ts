import { database } from "firebase-admin"
import { IFirebaseDriver } from ".."
import { RealFirebaseDriver } from "../driver/real_firebase_driver"
import { DependencyContainer, IConfigValues, IDependencyContainer } from "./dependency_container"

let realDependencyContainer: IDependencyContainer
export function realContainer(): IDependencyContainer {
    if (!realDependencyContainer) {
        realDependencyContainer = new DependencyContainer()
        configureRealContainer(realDependencyContainer)
    }
    return realDependencyContainer
}

function configureRealContainer(container: IDependencyContainer) {
    container.bind<IFirebaseDriver>("IFirebaseDriver", (c) => {
        return new RealFirebaseDriver(database())
    })
}
