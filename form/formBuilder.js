import {readJsonFile} from "../functions/files.js";
import {log} from "../functions/functions.js";
import {ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle} from "discord.js";

export async function loadForm(name){
    let componentCount = 0;
    const MAX_COMPONENTS = 5;

    const form = await readJsonFile(`./form/json/${name}.json`)

    if(form === ['Error']){
        return false
    }

    if(!form?.title){
        log(`ERROR : Need a 'title' for the form ${name}.json`)
        return false
    }

    if(!form?.id){
        log(`ERROR : Need a 'id' for the form ${name}.json`)
        return false
    }

    if(!form?.inputs){
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

                modal.addComponents(new ActionRowBuilder().addComponents(textInput));

                break;

            case 'text_placeholder':
                const textInputWithPlaceholder = new TextInputBuilder()
                    .setCustomId(input.id)
                    .setLabel(input.title)
                    .setRequired(input.required || false)
                    .setStyle(input.style === "short" ? TextInputStyle.Short : TextInputStyle.Paragraph)
                    .setPlaceholder(input.placeholder || '');
                modal.addComponents(new ActionRowBuilder().addComponents(textInputWithPlaceholder));
                break;

            case 'text_minmax_length':
                const textInputWithLength = new TextInputBuilder()
                    .setCustomId(input.id)
                    .setLabel(input.title)
                    .setRequired(input.required || false)
                    .setStyle(input.style === "short" ? TextInputStyle.Short : TextInputStyle.Paragraph)
                    .setMinLength(input.minLength || 0)
                    .setMaxLength(input.maxLength || 4000);
                modal.addComponents(new ActionRowBuilder().addComponents(textInputWithLength));
                break;


            case 'number':
                const numberInput = new TextInputBuilder()
                    .setCustomId(input.id)
                    .setLabel(input.title)
                    .setRequired(input.required || false)
                    .setStyle(TextInputStyle.Short)
                    .setPlaceholder('Entrez un nombre');
                modal.addComponents(new ActionRowBuilder().addComponents(numberInput));
                break;


            case 'date':
                const dateInput = new TextInputBuilder()
                    .setCustomId(input.id)
                    .setLabel(input.title)
                    .setRequired(input.required || false)
                    .setStyle(TextInputStyle.Short)
                    .setPlaceholder('JJ/MM/AAAA');
                modal.addComponents(new ActionRowBuilder().addComponents(dateInput));
                break;


        }
        componentCount++;
    }

    if (form.inputs.length > MAX_COMPONENTS) {
        log(`WARNING: Form '${form.title}' has ${form.inputs.length} inputs, but only ${MAX_COMPONENTS} can be displayed in a modal.`);
    }

    return modal

}