import {Module, ModuleEventsMap} from "@spatulox/discord-module";
import {Events, Interaction} from "discord.js";
import {executeSlashCommand} from "./executeCommand";
import {executeModalSubmit} from "./executeModalSubmit";

export class Interactions extends Module {
    name = "Interactions";
    description = "Module to handle every Interactions type";

    get events(): ModuleEventsMap {
        return {
            [Events.InteractionCreate]: this.interactions
        }
    }

    private async interactions(interaction: Interaction): Promise<void> {
        if(interaction.isCommand()){
            executeSlashCommand(interaction)
        }
        if(interaction.isModalSubmit()){
            executeModalSubmit(interaction)
        }
    }
}