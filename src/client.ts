import { Client, GatewayIntentBits } from "discord.js";
import { log } from "./functions/functions.js";

log('INFO : Creating Client');
export const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
      GatewayIntentBits.GuildMessageReactions,
      GatewayIntentBits.DirectMessageReactions,
    ],
});