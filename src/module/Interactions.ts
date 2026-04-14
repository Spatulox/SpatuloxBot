import {InteractionsManager, Module, ModuleEventsMap} from "@spatulox/discord-module";
import {client} from "../client";


import { ytbChannelCommand } from '../handlers/ytb-channel';
import { setStatus } from "../handlers/set-status";
import { reminderCommand } from "../handlers/reminder";

import ytb from "../../commands/addytbchannel.json"
import status from "../../commands/setstatus.json"
import reminder from "../../commands/reminder.json"


import add_reminder from "../../form/reminderForm.json"
import {addReminder} from "../handlers/reminder";

export class Interactions extends Module {
    name = "Interactions";
    description = "Module to handle every Interactions type";

    get events(): ModuleEventsMap {
        return {}
    }

    constructor() {
        super();
        const interactions = InteractionsManager.createOrGetInstance(client);
        interactions.registerSlash(ytb.name, ytbChannelCommand)
        interactions.registerSlash(status.name, setStatus)
        interactions.registerSlash(reminder.name, reminderCommand)

        interactions.registerModal(add_reminder.id, addReminder)
    }

    /*private async interactions(interaction: Interaction): Promise<void> {
        if(interaction.isCommand()){
            executeSlashCommand(interaction)
        }
        if(interaction.isModalSubmit()){
            executeModalSubmit(interaction)
        }
    }*/
}