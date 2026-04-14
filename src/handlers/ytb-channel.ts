import type {ChatInputCommandInteraction, CommandInteraction, TextChannel} from 'discord.js';
import fs from 'fs'
import fetch from 'node-fetch';
import {Bot, EmbedManager, FileManager, SimpleColor} from "@spatulox/simplediscordbot";


export type ytbchannelFile = {
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
                    Bot.interaction.send(interaction, EmbedManager.error('Invalid parameters.'))
                    return false;
                }

                const res = await addYtbChannel(ytbChannel, discordChannel.id);

                if (res === 'Error') {
                    Bot.interaction.send(interaction, EmbedManager.error(`Error when adding the YouTube channel ${ytbChannel}`));
                } else {
                    Bot.interaction.send(interaction, EmbedManager.error(`Added ${res} : ${ytbChannel}`));
                }
                break;

            case 'list':
                await interaction.deferReply();
                await listYtbChannel(interaction);
                break;

            default:
                Bot.interaction.send(interaction, EmbedManager.error('Something went wrong, but what are you doing here?'))
        }
    } catch (e) {
        await Bot.interaction.send(interaction, EmbedManager.error(`Crash when ytbChannelCommand : ${(e as Error).message}`))
        return false;
    }
}

// -------------------------------------------------------------------------- //

async function listYtbChannel(interaction: CommandInteraction): Promise<boolean> {
    try {
        const listFile = await FileManager.listJsonFiles('./ytbChannels/')

        if (!listFile) {
            Bot.interaction.send(interaction, EmbedManager.error('Something went wrong when listing channels'))
            return false;
        }

        const embed = EmbedManager.create(SimpleColor.youtube)
        embed.setTitle('\n # Liste des chaînes youtube suivies # ')
        embed.setThumbnail('https://cdn.discordapp.com/attachments/123456789/youtube_icon.png')
        embed.setFooter({
            text: `Total des chaînes suivies : ${listFile.length}`,
            iconURL: ""
        })

        for (const file of listFile) {
            const data = await FileManager.readJsonFile<ytbchannelFile>(`./ytbChannels/${file}`);

            if (!data) {
                return false
            }

            if (Array.isArray(data) && data[0] === 'Error') {
                Bot.interaction.send(interaction, EmbedManager.error(`Something went wrong when reading the file ${file}`));
                return false;
            }

            const channelWhereItPost = data.guildChannelToPostVideo;
            const numberVideoPosted = data.videosId?.length ?? 0;

            EmbedManager.field(embed, {
                name: `🎥 __${data.name}__ (${data.ytbChannel})`,
                value: `.\n**${numberVideoPosted} Vidéos postées** dans <#${channelWhereItPost}>`,
            })
        }

        Bot.interaction.send(interaction, embed)
        return true;
    } catch (e) {
        Bot.log.error(`Crash when listYtbChannel : ${(e as Error).message}`);
        Bot.interaction.send(interaction, EmbedManager.error((e as Error).message));
        return false;
    }
}


async function addYtbChannel(channelId: string, channelToPost: string) {
    try {
        const html = await getChannelInfos(channelId);
        const initialData = extractInitialData(html);
        const {channelTitle, videos} = parseVideosFromInitialData(initialData);

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
        Bot.log.error(`${error}`);
        return 'Error';
    }
}


async function getChannelInfos(channelIdOrUsername: string): Promise<string> {
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

    return {channelTitle, videos};
}
