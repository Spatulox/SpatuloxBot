import { Client } from "discord.js";
import config from "../config.js";
import { log } from "./functions.js";

export async function loginBot(client: Client): Promise<string | undefined> {
  let ok = 'Not Connected';

  if (config.token !== '') {
    while (ok === 'Not Connected') {
      ok = await client.login(config.token)
        .then(() => {
          log('INFO : Logged in successfully!');
          return 'Connected';
        })
        .catch(async (err: any) => {
          log(`ERROR : ${err}, retrying...`);
          await new Promise(resolve => setTimeout(resolve, 30000));
          return 'Not Connected';
        });
    }
  } else {
    log('ERROR : Please enter a valid Discord token....');
    return 'Token error';
  }
}