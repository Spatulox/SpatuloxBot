import { log } from '../functions/functions.js';
import config from '../config.js';
import type { Message } from 'discord.js';

export async function addReactions(message: Message): Promise<void> {
  try {
    const regexUrl = /https?:\/\/(www\.)?youtu(be\.com\/watch\?v=|\.be\/)[\w-]{11}/;

    if (config.getReactionChannel.includes(message.channelId) && regexUrl.test(message.content)) {
      for (const emoji of config.emojiReact) {
        await message.react(emoji);
      }
    }
  } catch {
    log('ERROR : Impossible to react');
  }
}