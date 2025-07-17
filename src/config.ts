import dotenv from 'dotenv';
import configJson from './config.json' with { type: 'json' };

dotenv.config();

const { DISCORD_TOKEN, MUSIC_PATH } = process.env;

for (const [key, value] of Object.entries({ DISCORD_TOKEN, MUSIC_PATH })) {
  if (!value) {
    throw new Error(`Environment variable ${key} is not set`);
  }
}

if (!DISCORD_TOKEN || !MUSIC_PATH) {
  throw new Error('Missing environment variables: DISCORD_TOKEN, MUSIC_PATH');
}

const config = parseConfig(configJson);
export default config;



function parseConfig(json: typeof configJson): Config {
  if (json.sendChannelErrors !== "yes" && json.sendChannelErrors !== "no") {
    throw new Error('sendChannelErrors must be "yes" or "no"');
  }

  return {
    ...json,
    token: DISCORD_TOKEN || '',
    sendChannelErrors: json.sendChannelErrors,
    music_path: MUSIC_PATH || ''
  };
}


type Config = {
  appId: string,
  channelPingLogin:string,
  downloadChannel: string[],
  sendToOwnerOrChannel: string,
  emojiReact: string[],
  errorChannel: string,
  getReactionChannel: string[],
  owner: string,
  sendChannelErrors:"yes" | "no",
  sendDuplicateMessageChannel: string[],
  userCanReact: string[],
  token: string,
  music_path: string,
}