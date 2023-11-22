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
        try{
          await new Promise((resolve) => setTimeout(resolve, 60000));
        }
        catch{
          log('ERROR when awaiting the promise to await 1 minutes')
        }
    }

  }
}


export async function checkXTimesInternetCo(xTime) {
  let count = 0;

  while (count < xTime || count !== 'Connected') {
    
    log('CheckingInternet')
    const online = await isOnline();

    if (online) {
        log('Internet connection is available.');
        count = 'Connected';
        return 'Connected'
    } else {
      count ++
        log('No internet connection, waiting 1 minute.');
        try{
          await new Promise((resolve) => setTimeout(resolve, 60000));
        }
        catch{
          log('ERROR when awaiting the promise to await 1 minutes')
        }
    }

  }
  return 'Error'
}