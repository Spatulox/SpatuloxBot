import config from '../config.json' assert { type: 'json' };
import {log, searchClientChannel} from "./functions.js";
import {createEmbed, createErrorEmbed, returnToSendEmbed, sendEmbedErrorMessage} from "./embeds.js";

//----------------------------------------------------------------------------//

export async function postMessage(client, sentence, channelId, reactions = "default") {

    try{
        let targetChannel = await searchClientChannel(client, channelId)
        if(!targetChannel){
            return false
        }
        targetChannel.send(sentence)
            .then(message => {

                if (reactions != null && reactions !== "default" && reactions.length !== 0) {
                    for (let i = 0; i < reactions.length; i++) {
                        message.react(reactions[i]);
                    }
                }

                log(`Message posted : ${sentence.split('\n')[0]}`)

                message.crosspost()
                    .then(() => log(`Crossposted message : ${sentence.split('\n')[0]}`))
                    .catch(error => {
                        sendEmbedErrorMessage(targetChannel, 'ERROR when posting message : '+error)
                        log('ERROR when posting message : '+error)
                    });

            })
            .catch(error => {
                log('ERROR when crossposting message : '+error)
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
    log(message)
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


export async function sendInteractionError(interaction, embedOrMessage, privateVisibility = false){
    try{
        let message
        if(typeof embedOrMessage === 'string'){
            message = createErrorEmbed(embedOrMessage)
        } else {
            message = embedOrMessage
        }

        if(message?.description){
            log(`${interaction.commandName} : ${message.description}`)
        } else {
            log(`INFO : Executing ${interaction.commandName || interaction.customId}`)
        }

        if (interaction.deferred) {
            await interaction.editReply(returnToSendEmbed(message, privateVisibility));
        } else if (interaction.isRepliable()) {
            await interaction.reply(returnToSendEmbed(message, privateVisibility));
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

        if(embed?.description){
            log(`${interaction.commandName} : ${embed.description}`)
        } else {
            log(`INFO : Executing ${interaction.commandName || interaction.customId}`)
        }

        try {
            const messageOptions = returnToSendEmbed(embed, privateVisibility);

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

            return true;
        } catch (error) {
            log(`ERROR : Erreur lors de la réponse à l'interaction (${interaction.commandName}): ${error}`);

            try {
                const errorEmbed = returnToSendEmbed(createErrorEmbed(`${error.message}`));

                if (interaction.deferred) {
                    await interaction.editReply(errorEmbed);
                } else if (interaction.replied) {
                    await interaction.followUp(errorEmbed);
                } else if (interaction.isRepliable()) {
                    await interaction.reply(errorEmbed);
                } else {
                    // Tentative d'envoi dans le canal si l'interaction ne peut pas être utilisée
                    const channel = interaction.channel;
                    if (channel) {
                        await channel.send(errorEmbed);
                    } else {
                        log(`ERROR : Impossible d'envoyer un message dans le canal (${interaction.commandName})`);
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