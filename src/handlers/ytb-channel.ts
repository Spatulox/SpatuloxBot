import type {ChatInputCommandInteraction, CommandInteraction, TextChannel} from 'discord.js';
import fs from 'fs'
import fetch from 'node-fetch';
import Parser from "rss-parser";
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
                const ytbChannel = interaction.options.getString('ytb-channel');

                if (!discordChannel || !ytbChannel) {
                    Bot.interaction.send(interaction, EmbedManager.error('Invalid parameters.'))
                    return false;
                }

                const res = await addYtbChannel(ytbChannel, discordChannel.id);

                if ('error' in res) {
                    Bot.interaction.send(interaction, EmbedManager.error(`Error when adding the YouTube channel ${ytbChannel} : ${res.error}`));
                } else {
                    Bot.interaction.send(interaction, EmbedManager.success(`Added ${res.name} (${res.channelId}) : new videos will be posted in <#${discordChannel.id}>`));
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
        // An empty iconURL fails discord.js URL validation ("Received one or more errors")
        embed.setFooter({
            text: `Total des chaînes suivies : ${listFile.length}`
        })

        // Discord embeds accept at most 25 fields
        const MAX_FIELDS = 25;
        const overflow = listFile.length > MAX_FIELDS;
        const filesToShow = overflow ? listFile.slice(0, MAX_FIELDS - 1) : listFile;

        for (const file of filesToShow) {
            const data = await FileManager.readJsonFile<ytbchannelFile>(`./ytbChannels/${file}`);

            if (!data) {
                Bot.interaction.send(interaction, EmbedManager.error(`Something went wrong when reading the file ${file}`));
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

        if (overflow) {
            EmbedManager.field(embed, {
                name: '…',
                value: `et ${listFile.length - filesToShow.length} autres chaînes`,
            })
        }

        Bot.interaction.send(interaction, embed)
        return true;
    } catch (e) {
        Bot.log.error(`Crash when listYtbChannel : ${(e as Error).stack ?? (e as Error).message}`);
        Bot.interaction.send(interaction, EmbedManager.error(`Erreur lors du listing des chaînes : ${(e as Error).message}`));
        return false;
    }
}


type AddYtbChannelResult = { name: string; channelId: string } | { error: string };

async function addYtbChannel(input: string, channelToPost: string): Promise<AddYtbChannelResult> {
    try {
        const channelRef = normalizeChannelInput(input);
        if (!channelRef) {
            return {error: 'Expected a channel ID (UC...), a @handle or a channel link'};
        }

        // The RSS feed only works with the UC... channel ID, so resolve @handles from the channel page
        const html = await getChannelInfos(channelRef);
        const metadata = extractInitialData(html)?.metadata?.channelMetadataRenderer;
        const channelId: string | undefined = metadata?.externalId;
        const channelTitle: string | undefined = metadata?.title;
        if (!channelId || !channelTitle) {
            return {error: 'Channel not found'};
        }

        const alreadyFollowed = await findFollowedChannel(channelId);
        if (alreadyFollowed) {
            return {error: `Already followed as ${alreadyFollowed.name}`};
        }

        // Seed with the videos currently in the feed so the first poll doesn't repost them
        let listVideosId: string[];
        try {
            const feed = await new Parser().parseURL('https://www.youtube.com/feeds/videos.xml?channel_id=' + channelId);
            listVideosId = feed.items
                .map(entry => entry.id?.split(':')[2])
                .filter((id): id is string => !!id);
        } catch (e) {
            return {error: `YouTube RSS feed unavailable for ${channelId}, try again later (${e})`};
        }

        const jsonToWrite: ytbchannelFile = {
            name: channelTitle,
            ytbChannel: channelId,
            guildChannelToPostVideo: channelToPost,
            videosId: listVideosId,
        };

        fs.writeFileSync(`./ytbChannels/${channelTitle.split('|')[0]!.trim()}.json`, JSON.stringify(jsonToWrite, null, 2));

        return {name: channelTitle, channelId};
    } catch (error) {
        Bot.log.error(`Crash when addYtbChannel (${input}) : ${error}`);
        return {error: `${error}`};
    }
}

/**
 * Accepts "UC...", "@handle" or a youtube.com/@handle | youtube.com/channel/UC... link
 */
function normalizeChannelInput(input: string): string | null {
    const value = input.trim();
    const fromUrl = value.match(/youtube\.com\/(?:channel\/(UC[\w-]+)|(@[\w.\-]+))/);
    if (fromUrl) return fromUrl[1] ?? fromUrl[2] ?? null;
    if (/^UC[\w-]{22}$/.test(value) || /^@[\w.\-]+$/.test(value)) return value;
    return null;
}

async function findFollowedChannel(channelId: string): Promise<ytbchannelFile | null> {
    const files = await FileManager.listJsonFiles('./ytbChannels/');
    if (!files) return null;
    for (const file of files) {
        const data = await FileManager.readJsonFile<ytbchannelFile>(`./ytbChannels/${file}`);
        if (data && !Array.isArray(data) && data.ytbChannel === channelId) return data;
    }
    return null;
}


async function getChannelInfos(channelIdOrUsername: string): Promise<string> {
    let url
    if (channelIdOrUsername.startsWith('@')) {
        url = `https://www.youtube.com/${channelIdOrUsername}`;
    } else {
        url = `https://www.youtube.com/channel/${channelIdOrUsername}`;
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
