import { log } from './functions.js';
import { TextChannel, EmbedBuilder, EmbedData, APIEmbed, JSONEncodable } from 'discord.js';

/* interface EmbedField {
  name: string;
  value: string;
  inline?: boolean;
}


interface EmbedData extends Omit<Parameters<typeof EmbedBuilder.prototype.setFields>[0], 'fields'> {
  fields?: EmbedField[];
} */

// ------------------------------------------------------------- //

export function createEmbed(color: string | null = null): EmbedData {
  const embed: EmbedData = {
    title: 'Titre',
    description: '',
    thumbnail: { url: '' },
    color: 0xba06ae,
    fields: [],
    footer: {
      text: "Spatulox's Bot",
      iconURL: 'https://cdn.discordapp.com/app-icons/1162081210693075056/4f016ba107045821e7e9ac1f88dc7abd.png',
    },
    timestamp: new Date(),
    url: '',
  };

  const colors: Record<string, number> = {
    black: 0x000000,
    white: 0xffffff,
    red: 0xff0000,
    green: 0x00ff00,
    blue: 0x0000ff,
    yellow: 0xffff00,
    cyan: 0x00ffff,
    magenta: 0xff00ff,
    gray: 0x808080,
    lightgray: 0xd3d3d3,
    darkgray: 0xa9a9a9,
    orange: 0xffa500,
    purple: 0x800080,
    pink: 0xffc0cb,
    brown: 0xa52a2a,
    lime: 0x00ff00,
    navy: 0x000080,
    teal: 0x008080,
    olive: 0x808000,
    gold: 0xffd700,
    silver: 0xc0c0c0,
    coral: 0xff7f50,
    salmon: 0xfa8072,
    khaki: 0xf0e68c,
    plum: 0xdda0dd,
    lavender: 0xe6e6fa,
    beige: 0xf5f5dc,
    mint: 0x98ff98,
    peach: 0xffdab9,
    chocolate: 0xd2691e,
    crimson: 0xdc143c,
    youtube: 0xff1a1a,
    botColor: 0xba06ae,
    minecraft: 0x006400,
  };

  if (color === null) {
    embed.color = colors.botColor;
  } else if (!colors[color]) {
    log(`ERROR : The color '${color}' specified doesn't exist inside the dictionary`);
    embed.color = colors.botColor;
  } else {
    embed.color = colors[color];
  }

  return embed;
}

export function createSimpleEmbed(description: string, color: string = 'botColor'): EmbedData {
  const embed = createEmbed(color);
  embed.title = '';
  embed.description = description;
  embed.footer = {text: "", iconURL: ""};
  embed.timestamp = new Date();
  return embed;
}

// ------------------------------------------------------------- //

export function createErrorEmbed(description: string): EmbedData {
    const embed = createEmbed('youtube');
    embed.title = 'Something went Wrong';
    try {
        embed.description = description.toString();
    } catch {
    }

    return embed;
}

// ------------------------------------------------------------- //

export function createSuccessEmbed(description: string): EmbedData {
  const embed = createEmbed('minecraft');
  embed.title = 'Success';
  embed.description = description.toString();
  return embed;
}

// ------------------------------------------------------------- //

export async function sendEmbed(targetChannel: TextChannel | null | undefined, embed: EmbedData | string): Promise<boolean> {
  if (!targetChannel || !embed) {
    log('WARNING : Impossible to execute the function, one of the parameters is null or undefined (sendEmbed)');
    return false;
  }

  try {
    if (typeof embed !== 'string') {
      await targetChannel.send(returnToSendEmbed(embed));
    } else {
      await targetChannel.send(returnToSendEmbed(createSimpleEmbed(embed)));
    }
    log(`INFO : Embed '${(embed as EmbedData).title || embed || 'without title :/'}' sent to '${targetChannel.name || 'No name'}'`);
    return true;
  } catch (e) {
    log(`ERROR : Impossible to send the embed '${(embed as EmbedData).title || embed || 'without title :/'}' to '${targetChannel.name || 'No name'}' : ${e}`);
    return false;
  }
}

//----------------------------------------------------------------------------//

export async function sendEmbedErrorMessage(targetChannel: TextChannel | null | undefined, embed: EmbedData | string): Promise<boolean> {
  if (!targetChannel || !embed) {
    log('WARNING : Impossible to execute the function, one of the parameters is null or undefined (sendEmbedErrorMessage)');
    return false;
  }

  try {
    if (typeof embed !== 'string') {
      await targetChannel.send(returnToSendEmbed(embed));
    } else {
      log(embed);
      await targetChannel.send(returnToSendEmbed(createErrorEmbed(embed)));
    }
    log(`INFO : Embed '${(embed as EmbedData).title || embed || 'without title :/'}' sent to '${targetChannel.name || 'No name'}'`);
    return true;
  } catch (e) {
    log(`ERROR : Error when sendEmbedErrorMessage : ${e}`);
    return false;
  }
}

// ------------------------------------------------------------- //

export function returnToSendEmbed(embed: EmbedData, privateVisibility = false): { embeds: JSONEncodable<APIEmbed>[]; ephemeral: boolean } {
    let timestamp: string | undefined = undefined;
    if (embed.timestamp) {
        if (embed.timestamp instanceof Date) {
            timestamp = embed.timestamp.toISOString();
        } else if (typeof embed.timestamp === 'number') {
            timestamp = new Date(embed.timestamp).toISOString();
        } else if (typeof embed.timestamp === 'string') {
            timestamp = embed.timestamp;
        }
    }

    const cleanEmbed: APIEmbed = {
        ...(embed as Omit<APIEmbed, 'timestamp'>),
        timestamp,
    };

    const discordEmbed = EmbedBuilder.from(cleanEmbed);

    return {
        embeds: [discordEmbed],
        ephemeral: privateVisibility,
    };
}

// ------------------------------------------------------------- //

/**
 * Only used like that : interaction.deferReply(waitPrivateEmbedOrMessage())
 */
export function waitPrivateEmbedOrMessage(): { ephemeral: boolean } {
  return { ephemeral: true };
}

// ------------------------------------------------------------- //

export async function fillEmbed(embed: EmbedData): Promise<void> {
  if (!embed.color) {
    embed.color = 0xfcfcf9;
  }

  if (!embed.footer?.iconURL) {
    embed.footer = embed.footer || {text: "", iconURL: ""};
    embed.footer.iconURL = 'https://cdn.discordapp.com/app-icons/1162081210693075056/4f016ba107045821e7e9ac1f88dc7abd.png';
  }

  if (!embed.timestamp) {
    embed.timestamp = new Date();
  }
}