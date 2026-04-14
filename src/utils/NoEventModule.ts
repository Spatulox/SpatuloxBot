import {Module, ModuleEventsMap} from "@spatulox/discord-module";

export abstract class NoEventModule extends Module {
    get events(): ModuleEventsMap {
        return {}
    }
}