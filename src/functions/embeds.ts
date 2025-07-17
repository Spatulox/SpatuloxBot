import { DMChannel, EmbedBuilder, InteractionDeferReplyOptions, TextChannel, ThreadChannel, MessageCreateOptions, InteractionReplyOptions, InteractionEditReplyOptions, CommandInteraction, ModalSubmitInteraction, BaseInteraction, MessageFlags } from "discord.js";
import { ActionRowBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } from "@discordjs/builders";
import config from "../config.js";
import { log, searchClientChannel } from "./functions.js";
//import { client } from "../client";
//import config from "../../config.json";

// ------------------------------------------------------------- //

export enum EmbedColor {
  error = 0x880015,       // Rouge
  success = 0x00FF00,     // Vert
  black = 0x000000,       // Noir
  white = 0xFFFFFF,       // Blanc
  red = 0xFF0000,         // Rouge
  green = 0x00FF00,       // Vert
  blue = 0x0000FF,        // Bleu
  yellow = 0xFFFF00,      // Jaune
  cyan = 0x00FFFF,        // Cyan
  magenta = 0xFF00FF,     // Magenta
  gray = 0x808080,        // Gris
  lightgray = 0xD3D3D3,   // Gris clair
  darkgray = 0xA9A9A9,    // Gris foncé
  orange = 0xFFA500,      // Orange
  purple = 0x800080,      // Violet
  pink = 0xFFC0CB,        // Rose
  brown = 0xA52A2A,       // Marron
  lime = 0x00FF00,        // Vert lime (identique à green)
  navy = 0x000080,        // Bleu marine
  teal = 0x008080,        // Bleu sarcelle
  olive = 0x808000,       // Olive
  gold = 0xFFD700,        // Or
  silver = 0xC0C0C0,      // Argenté
  coral = 0xFF7F50,       // Corail
  salmon = 0xFA8072,      // Saumon
  khaki = 0xF0E68C,       // Kaki
  plum = 0xDDA0DD,        // Prune
  lavender = 0xE6E6FA,    // Lavande
  beige = 0xF5F5DC,       // Beige
  mint = 0x98FF98,        // Menthe
  peach = 0xFFDAB9,       // Pêche
  chocolate = 0xD2691E,   // Chocolat
  crimson = 0xDC143C,     // Cramoisi
  youtube = 0xFF1A1A,     // Rouge Youtube
  botColor = 0x5C8AD8,    // Couleur personnalisée (bleu clair)
  minecraft = 0x006400    // Vert Minecraft
}

  
export type Embed = {
    title: string;
    description?: string;
    
    color: number
    
    image?: {
      url?: string;
    };

    thumbnail?: {
      url?: string;
    };

    author?: {
      name?: string;
      url?: string;
      icon_url?: string;
    };

    fields?: Array<{
      name: string;
      value: string;
      inline?: boolean;
    }>;

    footer?: {
        text: string;
        icon_url: string;
    };

    timestamp: string | Date;
    url?: string;
};
  
export function isEmbed(obj: any): obj is Embed {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof obj.title === 'string' &&
    typeof obj.color === 'number' &&
    'timestamp' in obj
  );
}

export function createEmbed(color:  EmbedColor | null = null): Embed{

    const embedColor = color ? color : EmbedColor.botColor;

    const embed: Embed = {
        title: "Titre",
        description:"",
        thumbnail: {
            url: ""
        },
        color: embedColor!,
        fields: [],
        footer:{
            text:"Helldivers [FR] Bot",
            icon_url:"https://cdn.discordapp.com/app-icons/1358119106087358675/2b09d868914dc494b0ce375a9c4e184f.png"
        },
        timestamp: new Date(),
        url:""
    };
    return embed
}

export function createSimpleEmbed(description: string, color: EmbedColor | null): Embed{
    const embed = createEmbed(color ? color : EmbedColor.botColor)
    embed.title = ""
    embed.description = description
    embed.timestamp = ""
    return embed
}

// ------------------------------------------------------------- //

export function createErrorEmbed(description: string, title?: string): Embed{
  const embed = createEmbed(EmbedColor.error)
  embed.title = title || "Erreur"
  embed.description = description
  return embed
}

// ------------------------------------------------------------- //

export function createSuccessEmbed(description: string): Embed{
    const embed = createEmbed(EmbedColor.minecraft)
    embed.title = "Success"
    embed.description = description.toString()
    return embed
}

// ------------------------------------------------------------- //

export async function sendEmbed(embed: Embed, targetChannel: TextChannel | DMChannel | ThreadChannel): Promise<boolean>{
    if(!targetChannel || !embed){
        log("WARNING : Impossible to execute the fonction, one of the two (or the two) parameter are null : (sendEmbed)")
        return false
    }

    try{
        await targetChannel.send(returnToSendEmbed(embed))
        log(`INFO : Embed '${embed?.title || embed?.description || 'without title :/'}' sent to '${targetChannel.id}'`)
        return true
    } catch (e) {
        log(`ERROR : Impossible to send the embed '${embed?.title || embed?.description || 'without title :/'}' sent to '${targetChannel.id}' : ${e}`)
        return false
    }
}

// ------------------------------------------------------------- //

export async function sendEmbedToInfoChannel(embed: Embed){
    try{
        const channel = await searchClientChannel(client, config.errorChannel)
        if(channel){
            sendEmbed(embed, channel)
        }
    } catch(e){
        console.error(e)
    }
}

export async function sendEmbedToAdminChannel(embed: Embed){
    try{
        const channel = await searchClientChannel(client, config.errorChannel)
        if(channel){
            sendEmbed(embed, channel)
        }
    } catch(e){
        console.error(e)
    }
}

// ------------------------------------------------------------- //

export async function sendInteractionEmbed(interaction: CommandInteraction | ModalSubmitInteraction | BaseInteraction, embed: Embed, privateVisibility: boolean = false): Promise<boolean> {
    if (!embed) {
        console.log("WARNING : Impossible d'exécuter la fonction, l'embed est null : (sendInteractionEmbed)");
        return false;
    }

    if (!interaction.isRepliable()) {
        console.log("WARNING : L'interaction ne peut pas recevoir de réponse : (sendInteractionEmbed)");
        return false;
    }

    try {
        const replyOptions: InteractionReplyOptions = returnToSendEmbedForInteraction(embed, privateVisibility);

        if (interaction.deferred) {
            const replyEditOptions: InteractionEditReplyOptions = returnToSendEmbedForEditInteraction(embed);
            await interaction.editReply(replyEditOptions);

        } else if (interaction.replied) {
            await interaction.followUp(replyOptions);

        } else if (interaction.isRepliable()) {
            await interaction.reply(replyOptions);

        } else {
            log("Error when sending interaction !")
            return false
        }
        // Interaction.update existe aussi

        console.log(`INFO : Embed '${embed?.title || 'sans titre :/'}' : '${embed?.description || 'sans description'}' envoyé à l'utilisateur via l'interaction '${interaction.id}'`);
        return true;
    } catch (e) {
        console.error(
            `ERROR : Impossible d'envoyer l'embed '${embed?.title || embed?.description || 'sans titre :/'}' via l'interaction '${interaction.id}' : ${e}`
        );
        return false;
    }
}

//----------------------------------------------------------------------------//

export async function sendEmbedErrorMessage(message: string, targetChannel: TextChannel | DMChannel | ThreadChannel): Promise<boolean>{
    
    if(!targetChannel || !message){
        log("WARNING : Impossible to execute the fonction, one of the two (or the two) parameter are null : (sendEmbedErrorMessage)")
        return false
    }
    const embed = createErrorEmbed(message)
    sendEmbed(embed, targetChannel)
    return true
}

// ------------------------------------------------------------- //
/**
 * 
 * @param embed
 * @returns 
 */
export function returnToSendEmbed(embed: Embed): MessageCreateOptions {
    const embedBuilder = new EmbedBuilder();
  
    // Vérification et ajout du titre
    if (embed.title) {
      embedBuilder.setTitle(embed.title);
    }
  
    // Vérification et ajout de la couleur
    if (typeof embed.color === 'number') {
      embedBuilder.setColor(embed.color);
    }
  
    // Vérification et ajout de la description
    if (embed.description) {
      embedBuilder.setDescription(embed.description);
    }
  
    // Vérification et ajout du timestamp
    if (embed.timestamp) {
      const timestamp =
        typeof embed.timestamp === 'string'
          ? new Date(embed.timestamp)
          : embed.timestamp;
  
      if (!isNaN(timestamp.getTime())) {
        embedBuilder.setTimestamp(timestamp);
      }
    }
  
    // Vérification et ajout de l'URL
    if (embed.url && isValidUrl(embed.url)) {
      embedBuilder.setURL(embed.url);
    }
  
    // Vérification et ajout de l'image
    if (embed.image?.url && isValidUrl(embed.image.url)) {
      embedBuilder.setImage(embed.image.url);
    }
  
    // Vérification et ajout de la miniature (thumbnail)
    if (embed.thumbnail?.url && isValidUrl(embed.thumbnail.url)) {
      embedBuilder.setThumbnail(embed.thumbnail.url);
    }
  
    // Vérification et ajout de l'auteur
    if (embed.author) {
      const authorData = {
        name: embed.author.name || '',
        iconURL: embed.author.icon_url && isValidUrl(embed.author.icon_url)
          ? embed.author.icon_url
          : undefined,
        url: embed.author.url && isValidUrl(embed.author.url)
          ? embed.author.url
          : undefined,
      };
  
      // Ajout uniquement si un nom est défini ou si une URL est valide
      if (authorData.name || authorData.iconURL || authorData.url) {
        embedBuilder.setAuthor(authorData);
      }
    }
  
    // Vérification et ajout du footer
    if (embed.footer) {
      const footerData = {
        text: embed.footer.text || '',
        iconURL: embed.footer.icon_url && isValidUrl(embed.footer.icon_url)
          ? embed.footer.icon_url
          : undefined,
      };
  
      // Ajout uniquement si le texte du footer est défini
      if (footerData.text) {
        embedBuilder.setFooter(footerData);
      }
    }
  
    // Vérification et ajout des champs (fields)
    if (Array.isArray(embed.fields) && embed.fields.length > 0) {
      const validFields = embed.fields.map((field) => ({
        name: field.name || 'Sans titre',
        value: field.value || 'Aucune valeur',
        inline: field.inline ?? false,
      }));
  
      embedBuilder.addFields(...validFields);
    }
    
    return { embeds: [embedBuilder.toJSON()] };
  }
  
  // Fonction utilitaire pour vérifier la validité d'une URL
  function isValidUrl(url: string): boolean {
    try {
      new URL(url); // Essaie de créer un objet URL
      return true;
    } catch (_) {
      return false; // Retourne false si une exception est levée
    }
  }
  

/**
 * 
 * @param embed 
 * @param privateVisibility 
 * @returns 
 */
export function returnToSendEmbedForInteraction(embed: Embed, privateVisibility: boolean = false): InteractionReplyOptions {
    const messageOptions: MessageCreateOptions = returnToSendEmbed(embed);
    if(messageOptions.embeds && messageOptions.embeds[0]){
        return {
            embeds: [messageOptions.embeds[0]],
            flags: privateVisibility ? MessageFlags.Ephemeral : undefined
        }
    }
  
    return {
        content: "Une erreur est survenue :(",
        flags: privateVisibility ? MessageFlags.Ephemeral : undefined
    };
}

function returnToSendEmbedForEditInteraction(embed: Embed): InteractionEditReplyOptions {
    const replyOptions = returnToSendEmbedForInteraction(embed);
    const { ...editReplyOptions } = replyOptions;
    return editReplyOptions as InteractionEditReplyOptions;
}



// ------------------------------------------------------------- //


/**
 * Only used like that: interaction.deferReply(waitPrivateEmbedOrMessage())
 * @returns {InteractionDeferReplyOptions}
 */
export function waitPrivateEmbedOrMessage(): InteractionDeferReplyOptions {
    return {
        flags: MessageFlags.Ephemeral
    };
}

// ------------------------------------------------------------- //

export async function fillEmbed(embed: Embed): Promise<void>{

    if(!embed.color){
        embed.color = 0xfcfcf9
    }

    if (!embed.footer) {
        embed.footer = {
            text: "",
            icon_url: "https://cdn.discordapp.com/app-icons/1358119106087358675/2b09d868914dc494b0ce375a9c4e184f.png"
        };
    } else if (!embed.footer.icon_url) {
        embed.footer.icon_url = "https://cdn.discordapp.com/app-icons/1358119106087358675/2b09d868914dc494b0ce375a9c4e184f.png";
    }

    if(!embed?.timestamp){
        embed.timestamp = new Date();
    }
}

//----------------------------------------------------------------------------//

export function createEmbedFromFile(file: any): EmbedBuilder{

  const embed = new EmbedBuilder()
    .setColor(file.color)
    .setTitle(file.title)
    .setFooter({
      text: "GWW Wiki - Mis à jour le "+file.footerDate+" par "+file.footerUser,
      iconURL: "https://cdn.discordapp.com/attachments/1219746976325701652/1219749512504016996/Logo_bot_wiki_3.png?ex=660c6f41&is=65f9fa41&hm=e476d7b2a1ff75cad995c0057ed3bb26f171d3acb2af621f15ae5660f6a115cc&"
    });


  for (const field of file.field){
    embed.addFields(
       {
            name: field.name,
            value: field.value
        },
    )
  }

  if(file.image){
    embed.setImage(file.image)
  }
  else{
    embed.setThumbnail(file.thumbnail)
  }


  return embed

}

//----------------------------------------------------------------------------//

export async function embedError(): Promise<{ choice?: ActionRowBuilder<StringSelectMenuBuilder>; embed: EmbedBuilder }> {
  const today = new Date();
  
  // Création de l'embed
  const embed = new EmbedBuilder()
      .setColor(0xff1a1a)
      .setTitle('ERREUR')
      .addFields({
          name: ' ',
          value: '```OUPS ! LA DEMOCRATIE REVIENT VITE !!```',
          inline: true,
      })
      .setFooter({
          text: `Amiral Super Terre - Mis à jour le ${today.toLocaleDateString()} par Rapport d'Erreurs Automatic`,
          iconURL: "https://cdn.discordapp.com/attachments/1219746976325701652/1219749512504016996/Logo_bot_wiki_3.png",
      });
  
  // Création du menu déroulant désactivé
  const selectMenu = new StringSelectMenuBuilder()
      .setCustomId('wikiSubject')
      .setPlaceholder('Rien à voir ici')
      .setDisabled(true)
      .addOptions(
        new StringSelectMenuOptionBuilder()
            .setLabel('Erreur')
            .setValue('Error')
            .setDescription('Error')
    );

  // Ajout du menu déroulant dans une ActionRow
  const choice = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu);

  // Retourne l'embed et le menu désactivé
  return { choice, embed };
}