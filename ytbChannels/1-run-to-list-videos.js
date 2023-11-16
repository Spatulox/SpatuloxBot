import config from '../config.json' assert { type: 'json' };
import fetch from 'node-fetch'
import { listJsonFile } from '../Functions/functions.js'
import fs from 'fs'

// How to have Id channel ?
// Clique droit => Code source de la page
// ctrl + f "brawse_id"

// Replace 'YOUR_API_KEY' with your actual YouTube API key
const apiKey = config.ytbToken[config.usingYtbToken];
// Replace 'USERNAME' with the desired YouTube username
//'UCeZje_7vr6CPK9vPQDfV3WA' // Syrex
//'UCeZje_7vr6CPK9vPQDfV3WA' // Fuze²
//'UCfznY5SlSoZoXN0-kBPtCdg' // Fuze III
//UCRlEFn0L2G_DktbyvN0AZ5A Wadzee
//UCmCLlnZfSe93AoSGc03l7eA Savun
//UC8THb_fnOptyVgpi3xuCd-A Amalee
//UC_yP2DpIgs5Y1uWC0T03Chw JDG
//UCmn3G8-KWwyRthihWhlnkBg Myu-Chan
//UCnngczdIv1OJiYzs440V7mw Wad2zee
//UCIVSqoHCUN1XdEpiVItxfoQ aCookieGod
//UCqGtqSn0NiOCottKpYwBc4w Futakuchi Mana
// @aCookieGod // @WadZee

const channelId = 'UCqGtqSn0NiOCottKpYwBc4w'

let channelMusique = "1132993974689341550"
let channelVideos = "1172961385731342458"
let channelToPost = channelMusique

// Set the number of latest videos to retrieve
const maxResults = 5000;


async function getLatestVideos() {
  try {
    console.log(`Checking YouTube...`);

    if(channelId.includes('@')){
      var response = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&forUsername=${channelId}&maxResults=${maxResults}&order=date&type=video&key=${apiKey}`);
    }
    else{
      var response = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${channelId}&maxResults=${maxResults}&order=date&type=video&key=${apiKey}`);
    }
    

    const data = await response.json();

    console.log(`Total videos: ${data.items.length}`);

    // Load the existing channel JSON file
    let channelsList = await listJsonFile();
    //console.log("Channel list:", channelsList);

    let listVideosId = []
    for (var i = 0; i < data.items.length; i++) {
      listVideosId.push(data.items[i].id.videoId)
    }

    console.log(listVideosId)

    // if (!channelsList.includes(`${channelId}.json`)){
      const jsonToWrite = {
        name: data.items[0].snippet.channelTitle,
        ytbChannel : channelId,
        guildChannelToPostVideo : channelToPost,
        videosId : listVideosId
      }

      const jsonData = JSON.stringify(jsonToWrite, null, 2);

      fs.writeFile(`${data.items[0].snippet.channelTitle.split('|')[0].trim()}.json`, jsonData, (err) => {
        if (err) {
          console.error(err);
          return;
        }
        console.log('JSON file has been created.');
      });
    // }

    console.log(`Checking completed...`);
  } catch (error) {
    console.error('Error:', error);
  }
}

getLatestVideos();




