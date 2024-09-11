import {log} from "./functions.js";

// ------------------------------------------------------------- //

export function createEmbed(color = null){

    const embed = {
        title: "Titre",
        description:"",
        thumbnail: {
            url: ""
        },
        /*author: {
            name: "Spatulox",
            icon_url: "https://cdn.discordapp.com/avatars/556461959042564098/506aa3cc0992f63c99d3ae98b36625e3"
        },*/
        color: 0xba06ae,
        fields: [],
        footer:{
            text:"Spatulox's Bot",
            icon_url:"https://cdn.discordapp.com/app-icons/1162081210693075056/4f016ba107045821e7e9ac1f88dc7abd.png"
        },
        timestamp: new Date(),
        url:""
    };

    const colors = {
        "black": 0x000000,
        "white": 0xFFFFFF,
        "red": 0xFF0000,
        "green": 0x00FF00,
        "blue": 0x0000FF,
        "yellow": 0xFFFF00,
        "cyan": 0x00FFFF,
        "magenta": 0xFF00FF,
        "gray": 0x808080,
        "lightgray": 0xD3D3D3,
        "darkgray": 0xA9A9A9,
        "orange": 0xFFA500,
        "purple": 0x800080,
        "pink": 0xFFC0CB,
        "brown": 0xA52A2A,
        "lime": 0x00FF00,
        "navy": 0x000080,
        "teal": 0x008080,
        "olive": 0x808000,
        "gold": 0xFFD700,
        "silver": 0xC0C0C0,
        "coral": 0xFF7F50,
        "salmon": 0xFA8072,
        "khaki": 0xF0E68C,
        "plum": 0xDDA0DD,
        "lavender": 0xE6E6FA,
        "beige": 0xF5F5DC,
        "mint": 0x98FF98,
        "peach": 0xFFDAB9,
        "chocolate": 0xD2691E,
        "crimson": 0xDC143C,
        "youtube":0xff1a1a,
        "botColor":0xba06ae,
        "minecraft": 0x006400
    }

    if(!colors[color]){
        log("ERROR : The color specified don't exist inside the dictionnary")
    } else{
        embed.color = colors[color]
    }

    return embed
}

// ------------------------------------------------------------- //

export function createErrorEmbed(description){
    const embed = createEmbed("youtube")
    embed.title = "Something went Wrong"
    embed.description = description.toString()
    return embed
}

// ------------------------------------------------------------- //

export function createSuccessEmbed(description){
    const embed = createEmbed("minecraft")
    embed.title = "Success"
    embed.description = description.toString()
    return embed
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

//----------------------------------------------------------------------------//

export async function sendEmbedErrorMessage(targetChannel, message){
    log(message)
    targetChannel.send(returnToSendEmbed(createErrorEmbed(message)))
}

// ------------------------------------------------------------- //

export function returnToSendEmbed(embed, privateVisibility = false){

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