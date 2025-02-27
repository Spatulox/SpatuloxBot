import config from '../config.json' with { type: 'json' };
import {log, searchClientChannel} from "./functions.js";
import {createEmbed, createErrorEmbed, returnToSendEmbed, sendEmbedErrorMessage} from "./embeds.js";
import {returnToSendSelectMenu} from "./selectMenu.js";

//----------------------------------------------------------------------------//

export async function postMessage(client, sentence, channelId, reactions = "default") {

    try{
        let targetChannel = await searchClientChannel(client, channelId)
        if(!targetChannel){
            return false
        }
        targetChannel.send(sentence)
            .then(async message => {

                /*if (reactions != null && reactions !== "default" && reactions.length !== 0) {
                    for (let i = 0; i < reactions.length; i++) {
                        await message.react(reactions[i]);
                    }
                }*/

                log(`INFO : Message posted : ${sentence.split('\n')[0]}`)

                try{
                    // Waiting 1 seconde before crossposting the message
                    await new Promise(resolve => setTimeout(resolve, 1000));
                } catch (e) {
                    log("WARNING : Problème lors de la promise d'attente d'une secondes (postMessage)")
                }

                message.crosspost()
                    .then(() => log(`INFO : Crossposted message : ${sentence.split('\n')[0]}`))
                    .catch(error => {
                        sendEmbedErrorMessage(targetChannel, 'ERROR when posting message : '+error+`\n> - Message : ${message}\n> - TargetChannel : ${targetChannel}`)
                        log('ERROR : Error when posting message : '+error)
                    });

            })
            .catch(error => {
                log('ERROR : Error when crossposting message : '+error)
            });
    } catch (e){
        let msg = `ERROR : Impossible to find the channel to send the message : \n> ${sentence}\n\n> ${e}`
        log(msg)
        try{
            const errorChannel = await searchClientChannel(client, config.errorChannel)
            if(errorChannel){
                errorChannel.send(returnToSendEmbed(createErrorEmbed(msg)))
            } else {
                log("ERROR : Impossible to execute the postMessage function, channel is false")
            }
        } catch (err){
            log(`ERROR : [postMessage() - second try catch] : ${err}`)
        }
    }
}

//----------------------------------------------------------------------------//

export async function sendMessage(targetChannel, message){
    log("INFO : "+message)
    targetChannel.send(message)
}

//----------------------------------------------------------------------------//

export async function sendLongMessage(channel, title, longMessage) {
    // Parse long sentence (> 2000) into different messages to send it
    // Use full to recap the error of the bots..
    const maxLength = 2000;
    const chunks = longMessage.split('\n');
    let currentMessage = '';

    channel.send(title)

    for (const chunk of chunks) {
        if (currentMessage.length + chunk.length < maxLength) {
            currentMessage += chunk + '\n';
        } else {
            channel.send(currentMessage);
            currentMessage = chunk + '\n';
        }
    }

    if (currentMessage.length > 0) {
        channel.send(currentMessage);
    }
}

//----------------------------------------------------------------------------//

function returnTypeMessage(interaction, embed, embedOrMessage, privateVisibility){
    let result = isEmbedOrSelectMenu(embed)

    let messageOptions;
    if(result === "embed"){
        if(embed?.description){
            log(`INFO : Executing ${interaction.commandName || interaction.customId} : ${embed.description}`)
        } else {
            log(`DEBUG : Executing ${interaction.commandName || interaction.customId}`)
        }
        messageOptions = returnToSendEmbed(embed, privateVisibility);

    } else if (result === "selectMenu"){
        if(embed?.content){
            log(`INFO : Executing ${interaction.commandName || interaction.customId} : (${embedOrMessage.content || "No content provided"})`)
            messageOptions = returnToSendSelectMenu(embedOrMessage, embedOrMessage.content, privateVisibility);
        } else {
            log(`DEBUG : Impossible to execute ${interaction.commandName || interaction.customId} || Need to placeholder (content) for the selectMenu`)
            messageOptions = returnToSendEmbed(createErrorEmbed("No content provided, plz use the (returnToSendSelectMenu) function only for selectMenu, before calling 'sendInteractionReply'"))
        }
    } else {
        messageOptions = embed
    }
    return messageOptions
}
function isEmbedOrSelectMenu(responseObject) {
    if (responseObject?.title && (responseObject?.description || responseObject.description === "" )) {
        return "embed";
    } else if (responseObject?.content) {
        return "selectMenu";
    } else {
        return "other";
    }
}

export async function sendInteractionError(interaction, embedOrMessage, privateVisibility = false) {
    try {
        let message
        if (typeof embedOrMessage === 'string') {
            message = createErrorEmbed(embedOrMessage)
        } else {
            message = embedOrMessage
        }

        let messageOptions = returnTypeMessage(interaction, message, embedOrMessage, privateVisibility)

        if (interaction.deferred) {
            await interaction.editReply(messageOptions);
        } else if (interaction.replied) {
            await interaction.followUp(messageOptions);
        } else if (interaction.isRepliable()) {
            await interaction.reply(messageOptions);
        } else {
            log(`L'interaction ${interaction.commandName} n'est pas dans un état permettant une réponse.`)
            return false
        }

        return true
    } catch (e) {
        log(`ERROR : Impossible to execute the sendInteractionError for ${interaction.commandName || interaction.customId} : ${e}`)
        return false
    }

}

export async function sendInteractionReply(interaction, embedOrMessage, privateVisibility = false) {
    try{
        let embed
        if(typeof embedOrMessage === 'string'){
            embed = createEmbed('botColor')
            embed.title = "INFORMATION"
            embed.description = embedOrMessage
        } else {
            embed = embedOrMessage
        }

        let messageOptions = returnTypeMessage(interaction, embed, embedOrMessage, privateVisibility)

        try {
            if (interaction.deferred) {
                return await interaction.editReply(messageOptions);
            } else if (interaction.replied) {
                return await interaction.followUp(messageOptions);
            } else if (interaction.isRepliable()) {
                return await interaction.reply(messageOptions);
            } else {
                log(`L'interaction ${interaction.commandName} n'est pas dans un état permettant une réponse.`)
                return false
            }
        } catch (error) {
            log(`ERROR : Erreur lors de la réponse à l'interaction (${interaction.commandName}): ${error}`);

            try {
                const errorEmbed = returnToSendEmbed(createErrorEmbed(`${error.message}`));

                if (interaction.deferred) {
                    return await interaction.editReply(errorEmbed);
                } else if (interaction.replied) {
                    return await interaction.followUp(errorEmbed);
                } else if (interaction.isRepliable()) {
                    return await interaction.reply(errorEmbed);
                } else {
                    // Tentative d'envoi dans le canal si l'interaction ne peut pas être utilisée
                    const channel = interaction.channel;
                    if (channel) {
                        return await channel.send(errorEmbed);
                    } else {
                        log(`ERROR : Impossible d'envoyer un message dans le canal (${interaction.commandName})`);
                        return false
                    }
                }
            } catch (finalError) {
                log(`ERROR : Échec de toutes les tentatives de réponse pour ${interaction.commandName} : ${finalError}`);
            }

            return false;
        }
    } catch (e) {
        log(`ERROR : Impossible to execute the sendInteractionReply for ${interaction.commandName || interaction.customId} : ${e}`)
        return false
    }
}

//----------------------------------------------------------------------------//