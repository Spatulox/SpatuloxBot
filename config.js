import dotenv from 'dotenv';
import configJson from './config.json' with { type: 'json' };
dotenv.config();

const { DISCORD_TOKEN } =
  process.env;


for (const [key, value] of Object.entries({DISCORD_TOKEN})) {
  if (!value) {
    throw new Error(`Environment variable ${key} is not set`);
  }
}

if (!DISCORD_TOKEN) {
  throw new Error(
    "Missing environment variables: DISCORD_TOKEN"
  );
}

const config = {
    ...configJson,
    token: process.env.DISCORD_TOKEN || "",
};

console.log(config)
export default config;