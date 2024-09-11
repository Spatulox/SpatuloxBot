import {log} from "../../functions/functions.js";
import {createEmbed, createErrorEmbed, returnToSendEmbed} from "../../functions/embeds.js";

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
        await interaction.editReply(returnToSendEmbed(embed));
        log(`Status switched for '${newStatus}'`)
        return
    }
    catch(err){
        log(`ERROR : Impossible to set the activity of the bot : ${err}`)
        try{
            const embed = createEmbed("red")
            embed.title = "Set Status CRASH"
            embed.description = `Impossible to set the activity of the bot : ${err}`
            await interaction.editReply(returnToSendEmbed(embed))
            return
        } catch{
            
        }

    }


    try{
        log("Sortie du premier try catch sans aucune raison pendant setStatus")
        await interaction.editReply(`Sortie du premier try catch sans aucune raison`)
    }
    catch{
        log("Meh when setting status :/")
    }
}