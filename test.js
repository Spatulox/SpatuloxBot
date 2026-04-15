import youtubedl from "yt-dlp-exec";
import {createWriteStream} from "node:fs";
import * as https from "node:https";
import { URL } from "node:url";

const videoID = "mj4tbYH6XsM";

async function download() {
    const url = `https://www.youtube.com/watch?v=${videoID}`;

    const info = await youtubedl(url, {
        dumpSingleJson: true,
        noCheckCertificates: true,
        noWarnings: true,
        preferFreeFormats: true,
    });

    console.log(info.channel)
    console.log(info.fulltitle)

    const audioFormat = info.formats
        .filter((f) => f.acodec !== "none" && f.vcodec === "none")
        .sort((a, b) => b.abr - a.abr)[0];

    console.log("Audio URL:", audioFormat.url);

    // Télécharger dans un fichier
    const output = "output.mp3"; // ou .webm/.ogg selon le format
    await downloadFile(audioFormat.url, output);
    console.log("Audio downloaded to", output);
}

// Télécharger une URL vers un fichier
async function downloadFile(url, filename) {
    return new Promise((resolve, reject) => {
        const file = createWriteStream(filename);
        const urlObj = new URL(url);

        const client = urlObj.protocol === "https:" ? https : require("http");

        client.get(url, (res) => {
            const { statusCode } = res;
            if (statusCode && (statusCode < 200 || statusCode >= 300)) {
                return reject(new Error(`HTTP ${statusCode}: ${res.statusMessage}`));
            }

            res.pipe(file);
            file.on("finish", () => resolve());
            file.on("error", reject);
        }).on("error", reject);
    });
}

download().catch(console.error);