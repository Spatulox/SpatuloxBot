import {log} from "../../functions/functions.js";
import {createEmbed, createErrorEmbed, returnToSendEmbed} from "../../functions/embeds.js";

export async function setStatus(client, interaction){
    try{
        await interaction.deferReply()
        client.user.setActivity({
            name: interaction.options.getString('new-status')
        })

        const embed = createEmbed("botColor")
        embed.title = "Set Status OK"
        embed.description = `Status switched for ${interaction.options.getString('new-status')}`
        await interaction.editReply(returnToSendEmbed(embed));
        log(`Status switched for ${interaction.options.getString('new-status')}`)
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