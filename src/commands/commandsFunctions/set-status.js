import {log} from "../../functions/functions.js";
import {createEmbed, createErrorEmbed, returnToSendEmbed} from "../../functions/embeds.js";
import {sendInteractionError, sendInteractionReply} from "../../functions/messages.js";

export async function setStatus(client, interaction){
    try{
        await interaction.deferReply()
        const newStatus = interaction.options.getString('new-status')
        client.user.setActivity({
            name: newStatus
        })
        client.user.setStatus('dnd');

        const embed = createEmbed("botColor")
        embed.title = "Set Status OK"
        embed.description = `Status switched for ${newStatus}`
        await sendInteractionReply(interaction, embed)
        //await interaction.editReply(returnToSendEmbed(embed));
        log(`INFO : Status switched for '${newStatus}'`)
        return
    }
    catch(err){
        log(`ERROR : Impossible to set the activity of the bot : ${err}`)
        try{
            const embed = createEmbed("red")
            embed.title = "Set Status CRASH"
            embed.description = `Impossible to set the activity of the bot : ${err}`
            await sendInteractionError(interaction, embed)
            //await interaction.editReply(returnToSendEmbed(embed))
            return
        } catch{
            
        }

    }


    try{
        log("WARNING : Sortie du premier try catch sans aucune raison pendant setStatus")
        await sendInteractionError(interaction, `Sortie du premier try catch sans aucune raison`)
        //await interaction.editReply(`Sortie du premier try catch sans aucune raison`)
    }
    catch{
        log("WARNING : Meh when setting status :/")
    }
}