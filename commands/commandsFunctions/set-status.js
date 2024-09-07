import {log} from "../../Functions/functions.js";

export async function setStatus(interaction){
    await interaction.deferReply()
    try{
        client.user.setActivity({
            name: interaction.options.getString('new-status')
        })
        await interaction.editReply(`Status switched for ${interaction.options.getString('new-status')}`);
        log(`Status switched for ${interaction.options.getString('new-status')}`)
        return
    }
    catch(err){
        log(`ERROR : Impossible to set the activity of the bot : ${err}`)
        await interaction.editReply(`May have some crash :/`)
        return
    }


    try{
        await interaction.editReply(`Sortie du premier try catch sans aucune raison`)
        log("Sortie du premier try catch sans aucune raison")
    }
    catch{
        log("Meh when setting status :/")
    }
}