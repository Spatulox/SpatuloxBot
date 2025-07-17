import isOnline from 'is-online';
import { log } from './functions.js';

export async function checkInternetCo(): Promise<void> {
  let internetCo = 0;

  while (internetCo === 0) {
    const online = await isOnline();
    log('INFO : CheckingInternet');

    if (online) {
      log('INFO : Internet connection is available.');
      internetCo = 1;
    } else {
      log('INFO : No internet connection, waiting 1 minute.');
      try {
        await new Promise((resolve) => setTimeout(resolve, 60000));
      } catch {
        log('ERROR : When awaiting the promise to await 1 minute');
      }
    }
  }
}

// ------------------------------------------------------------------------------ //

export async function checkXTimesInternetCo(xTime: number): Promise<'Connected' | 'Error'> {
  let count = 0;

  while (count < xTime) {
    log('INFO : CheckingInternet');
    const online = await isOnline();

    if (online) {
      log('INFO : Internet connection is available.');
      return 'Connected';
    } else {
      count++;
      log('INFO : No internet connection, waiting 1 minute.');
      try {
        await new Promise((resolve) => setTimeout(resolve, 60000));
      } catch {
        log('ERROR : When awaiting the promise to await 1 minute');
      }
    }
  }
  return 'Error';
}