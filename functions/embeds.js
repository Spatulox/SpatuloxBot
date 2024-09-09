import {log} from "./functions.js";

// ------------------------------------------------------------- //

export function createEmbed(){

    return {
        title: "Titre",
        description:"",
        thumbnail: {
            url: ""
        },
        /*author: {
            name: "Spatulox",
            icon_url: "https://cdn.discordapp.com/avatars/556461959042564098/506aa3cc0992f63c99d3ae98b36625e3"
        },*/
        color: 0xfcfcf9,
        fields: [],
        footer:{
            icon_url:"https://cdn.discordapp.com/app-icons/1162081210693075056/4f016ba107045821e7e9ac1f88dc7abd.png"
        },
        timestamp: new Date(),
        url:""
    };

}

// ------------------------------------------------------------- //

export async function sendEmbed(targetChannel, embed){

    if(embed === { embeds: [embed] }){
        await targetChannel.send(embed)
    } else {
        await targetChannel.send({ embeds: [embed] })
    }
    log(`Embed sent to ${targetChannel}`)
    return false
}

// ------------------------------------------------------------- //

export function readyToSendEmbed(embed, privateVisibility = false){

    // The visibility private will not work if there is a deferReply without a epheremal waiting before
    // you shold use the waitPrivateEmbed() inside the deferReply to have a private respons after
    const response = { embeds: [embed] };
    response.ephemeral = privateVisibility;
    return response;
}

// ------------------------------------------------------------- //

/**
 * Only used like that : interaction.deferReply(waitPrivateEmbedOrMessage())
 * @returns {{}}
 */
export function waitPrivateEmbedOrMessage(){
    const response = {};
    response.ephemeral = true;
    return response;
}

// ------------------------------------------------------------- //

export async function fillEmbed(embed){

    if(!embed?.color){
        embed.color = 0xfcfcf9
    }

    if(!embed?.footer.icon_url){
        embed.footer.icon_url = "https://cdn.discordapp.com/app-icons/1162081210693075056/4f016ba107045821e7e9ac1f88dc7abd.png"
    }

    if(!embed?.timestamp){
        embed.timestamp = new Date();
    }

}