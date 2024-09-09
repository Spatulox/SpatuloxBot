import {log} from "../../functions/functions.js";
import {createEmbed, readyToSendEmbed} from "../../functions/embeds.js";

export async function setStatus(client, interaction){
    try{
        await interaction.deferReply()
        client.user.setActivity({
            name: interaction.options.getString('new-status')
        })

        const embed = createEmbed()
        embed.title = "Set Status OK"
        embed.description = `Status switched for ${interaction.options.getString('new-status')}`
        embed.color = 0xba06ae
        await interaction.editReply(readyToSendEmbed(embed));
        log(`Status switched for ${interaction.options.getString('new-status')}`)
        return
    }
    catch(err){
        log(`ERROR : Impossible to set the activity of the bot : ${err}`)
        try{
            const embed = createEmbed()
            embed.title = "Set Status CRASH"
            embed.description = `Impossible to set the activity of the bot : ${err}`
            embed.color = 0xba06ae
            await interaction.editReply(readyToSendEmbed(embed))
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