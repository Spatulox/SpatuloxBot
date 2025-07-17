import type { ChatInputCommandInteraction, CommandInteraction, TextChannel } from 'discord.js';
import { log } from '../../functions/functions.js';
import { createEmbed, createErrorEmbed, createSimpleEmbed, EmbedColor, sendInteractionEmbed } from '../../functions/embeds.js';
import { listJsonFile, readJsonFile } from '../../functions/files.js';
import fs from 'fs'
import fetch from 'node-fetch';


type ytbchannelFile = {
  ytbChannel: string;
  name: string;
  guildChannelToPostVideo: string;
  videosId: string[];
}

export async function ytbChannelCommand(interaction: ChatInputCommandInteraction): Promise<boolean | void> {
  try {
    const subcommand = interaction.options.getSubcommand();

    switch (subcommand) {
      case 'add':
        await interaction.deferReply();

        const discordChannel = interaction.options.getChannel('discord-channel-to-post') as TextChannel;
        const ytbChannel = interaction.options.getString('ytb-channel-id');

        if (!discordChannel || !ytbChannel) {
          await sendInteractionEmbed(interaction, createErrorEmbed('Invalid parameters.'));
          return false;
        }

        const res = await addYtbChannel(ytbChannel, discordChannel.id);

        if (res === 'Error') {
          await sendInteractionEmbed(interaction, createErrorEmbed(`Error when adding the YouTube channel ${ytbChannel}`));
        } else {
          await sendInteractionEmbed(interaction, createSimpleEmbed(`Added ${res} : ${ytbChannel}`));
        }
        break;

      case 'list':
        await interaction.deferReply();
        await listYtbChannel(interaction);
        break;

      default:
        await sendInteractionEmbed(interaction, createErrorEmbed('Something went wrong, but what are you doing here?'));
    }
  } catch (e) {
    await sendInteractionEmbed(interaction, createErrorEmbed(`ERROR : Crash when ytbChannelCommand : ${(e as Error).message}`));
    return false;
  }
}

// -------------------------------------------------------------------------- //

async function listYtbChannel(interaction: CommandInteraction): Promise<boolean> {
  try {
    const listFile = await listJsonFile('./ytbChannels/');

    if (listFile === 'Error') {
      await sendInteractionEmbed(interaction, createErrorEmbed('Something went wrong when listing channels'));
      return false;
    }

    const embed = createEmbed(EmbedColor.youtube);
    embed.title = '\n # Liste des chaînes youtube suivies # ';
    embed.thumbnail = {
      url: 'https://cdn.discordapp.com/attachments/123456789/youtube_icon.png',
    };
    embed.footer = {
      text: `Total des chaînes suivies : ${listFile.length}`,
      icon_url: ""
    };
    embed.fields = [];

    for (const file of listFile) {
      const data = readJsonFile<ytbchannelFile>(`./ytbChannels/${file}`);

      if(!data){
        return false
      }

      if (Array.isArray(data) && data[0] === 'Error') {
        await sendInteractionEmbed(interaction, createErrorEmbed(`Something went wrong when reading the file ${file}`));
        return false;
      }

      const channelWhereItPost = data.guildChannelToPostVideo;
      const numberVideoPosted = data.videosId?.length ?? 0;

      embed.fields.push({
        name: `🎥 __${data.name}__ (${data.ytbChannel})`,
        value: `.\n**${numberVideoPosted} Vidéos postées** dans <#${channelWhereItPost}>`,
      });
    }

    await sendInteractionEmbed(interaction, embed);
    return true;
  } catch (e) {
    log(`ERROR : Crash when listYtbChannel : ${(e as Error).message}`);
    await sendInteractionEmbed(interaction, createErrorEmbed((e as Error).message));
    return false;
  }
}







async function addYtbChannel(channelId: string, channelToPost: string) {
  try {
    const html = await getChannelInfos(channelId);
    const initialData = extractInitialData(html);
    const { channelTitle, videos } = parseVideosFromInitialData(initialData);

    let listVideosId = videos.map((v: any) => v.id);

    const jsonToWrite = {
      name: channelTitle,
      ytbChannel: channelId,
      guildChannelToPostVideo: channelToPost,
      videosId: listVideosId,
    };

    const jsonData = JSON.stringify(jsonToWrite, null, 2);

    fs.writeFileSync(`./ytbChannels/${channelTitle.split('|')[0].trim()}.json`, jsonData);

    return channelTitle;
  } catch (error) {
    log(`ERROR : ${error}`);
    return 'Error';
  }
}


async function getChannelInfos(channelIdOrUsername: string): Promise<string>{
  let url
  if (channelIdOrUsername.startsWith('@')) {
    url = `https://www.youtube.com/${channelIdOrUsername}/videos`;
  } else {
    url = `https://www.youtube.com/channel/${channelIdOrUsername}/videos`;
  }

  const response = await fetch(url, {
    headers: {
      'Accept-Language': 'fr-FR,fr'
    }
  });
  if (!response.ok) throw new Error('HTTP error ' + response.status);
  const html = await response.text();
  return html;
}

function extractInitialData(html: string) {
  const regex = /var ytInitialData = (.*?);<\/script>/s;
  const match = html.match(regex);
  if (!match) throw new Error('Impossible de trouver ytInitialData');
  return JSON.parse(match[1]!);
}

function parseVideosFromInitialData(data: any) {
  const tabs = data.contents.twoColumnBrowseResultsRenderer.tabs;
  const videosTab = tabs.find((tab: any) =>
    tab.tabRenderer && tab.tabRenderer.title.toLowerCase().includes('vidéo')
  );
  const gridRenderer = videosTab.tabRenderer.content.sectionListRenderer.contents[0]
    .itemSectionRenderer.contents[0].gridRenderer;

  const videos = gridRenderer.items
    .filter((item: any) => item.gridVideoRenderer)
    .map((item: any) => {
      const v = item.gridVideoRenderer;
      return {
        id: v.videoId,
        title: v.title.runs[0].text
      };
    });

  // Nom de la chaîne (exemple dans la donnée, possible ailleurs)
  const channelTitle = data.metadata.channelMetadataRenderer.title;

  return { channelTitle, videos };
}
