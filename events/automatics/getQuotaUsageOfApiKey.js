import config from '../../config.json' assert {type : 'json'}
import { google } from 'googleapis'

// export async function getQuotaUsageOfApiKey(){

//     const auth = new google.auth.GoogleAuth({
//         keyFile: config.ytbToken[config.usingYtbToken],
//         scopes: ['https://www.googleapis.com/auth/youtube.force-ssl']
//     });

//     const client = await google.youtube({
//         version: 'v3',
//         auth
//     });

//     const response = await client.youtube.quotaUsage.list({
//         part: 'all'
//     });
    
//     console.log(`Number of requests made: ${response.data.quotaBytesUsed}`);
// }


async function getQuotaUsageOfApiKey() {
  const auth = new google.auth.GoogleAuth({
    key: config.ytbToken[config.usingYtbToken],
    scopes: ['https://www.googleapis.com/auth/youtube.force-ssl']
  });

  const client = await google.youtube({
    version: 'v3',
    auth
  });

  const response = await client.search.list({
    part: 'id',
    type: 'video',
    q: 'cats',
    maxResults: 1
  });

  const quotaUsage = response.data.quotaDetails;

  console.log(`INFO : Nombre de demandes effectuées : ${quotaUsage.total}`);
}

getQuotaUsageOfApiKey();


// A tester
// const fetch = require('node-fetch');

// const API_KEY = 'YOUR_API_KEY';

// fetch(`https://www.googleapis.com/youtube/v3/quota?part=snippet&key=${API_KEY}`)
//   .then(response => response.json())
//   .then(data => {
//     const { usage } = data.items[0].snippet;
//     console.log(`Current quota usage: ${usage}`);
//   })
//   .catch(error => {
//     console.error(error);
//   });
