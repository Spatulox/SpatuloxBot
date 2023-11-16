import isOnline from 'is-online';
import { log } from './functions.js'

export async function checkInternetCo() {
  let internetCo = 0;

  while (internetCo === 0) {
    const online = await isOnline();
    log('CheckingInternet')

    if (online) {
        log('Internet connection is available.');
        internetCo = 1;
    } else {
        log('No internet connection, waiting 1 minute.');
        await new Promise((resolve) => setTimeout(resolve, 60000));
    }

  }
}