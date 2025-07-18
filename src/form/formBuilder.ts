import {ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle} from "discord.js";
import { readJsonFile } from "../functions/files.js";
import { log } from "../functions/functions.js";

export async function loadForm(name: string){
    let componentCount = 0;
    const MAX_COMPONENTS = 5;

    const form = await readJsonFile(`./form/${name}.json`)
    if(form === 'Error'){
        return false
    }

    if(!form.hasOwnProperty("title")){
        log(`ERROR : Need a 'title' for the form ${name}.json`)
        return false
    }

    if(!form.hasOwnProperty("id")){
        log(`ERROR : Need a 'id' for the form ${name}.json`)
        return false
    }

    if(!form.hasOwnProperty("inputs")){
        log(`ERROR : Need a 'inputs' for the form ${name}.json`)
        return false
    }

    const modal = new ModalBuilder()
        .setCustomId(form.id)
        .setTitle(form.title);

    for (const input of form.inputs) {
        if (componentCount >= MAX_COMPONENTS) {
            log(`WARNING: Modal can only have ${MAX_COMPONENTS} components. Skipping remaining inputs.`);
            break;
        }

        if(!input?.type || !input?.id || !input?.style || !input?.title){
            let okArray = ["number", "date"]
            if(!okArray.includes(input.type)){
                log(`ERROR : Need the 'type', 'id', 'style' and 'title' field for the input '${input.title}' for '${form.title}' form`)
                break
            }
        }

        switch (input.type) {

            case 'text':

                const textInput = new TextInputBuilder()
                    .setCustomId(input.id)
                    .setLabel(input.title)
                    .setRequired(input.required || false)
                    .setStyle(input.style === "short" ? TextInputStyle.Short : TextInputStyle.Paragraph);

                modal.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(textInput));

                break;

            case 'text_placeholder':
                const textInputWithPlaceholder = new TextInputBuilder()
                    .setCustomId(input.id)
                    .setLabel(input.title)
                    .setRequired(input.required || false)
                    .setStyle(input.style === "short" ? TextInputStyle.Short : TextInputStyle.Paragraph)
                    .setPlaceholder(input.placeholder || '');
                modal.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(textInputWithPlaceholder));
                break;

            case 'text_minmax_length':
                const textInputWithLength = new TextInputBuilder()
                    .setCustomId(input.id)
                    .setLabel(input.title)
                    .setRequired(input.required || false)
                    .setStyle(input.style === "short" ? TextInputStyle.Short : TextInputStyle.Paragraph)
                    .setMinLength(input.minLength || 0)
                    .setMaxLength(input.maxLength || 4000);
                modal.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(textInputWithLength));
                break;


            case 'number':
                const numberInput = new TextInputBuilder()
                    .setCustomId(input.id)
                    .setLabel(input.title)
                    .setRequired(input.required || false)
                    .setStyle(TextInputStyle.Short)
                    .setPlaceholder('Entrez un nombre');
                modal.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(numberInput));
                break;


            case 'date':
                const dateInput = new TextInputBuilder()
                    .setCustomId(input.id)
                    .setLabel(input.title)
                    .setRequired(input.required || false)
                    .setStyle(TextInputStyle.Short)
                    .setPlaceholder('JJ/MM/AAAA');
                modal.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(dateInput));
                break;

            case 'date-hour':
                const dateHourInput = new TextInputBuilder()
                    .setCustomId(input.id)
                    .setLabel(input.title)
                    .setRequired(input.required || false)
                    .setStyle(TextInputStyle.Short)
                    .setPlaceholder('JJ/MM/AAAA hh:mm');
                modal.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(dateHourInput));
                break;


        }
        componentCount++;
    }

    if (form.inputs.length > MAX_COMPONENTS) {
        log(`WARNING: Form '${form.title}' has ${form.inputs.length} inputs, but only ${MAX_COMPONENTS} can be displayed in a modal.`);
    }

    return modal

}