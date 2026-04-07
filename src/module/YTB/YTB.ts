import {Module, MultiModule} from "@spatulox/discord-module";
import {YTBFeed} from "./YTBFeed";
import {YTBReactions} from "./YTBReactions";
import {YTBDownloader} from "./YTBDownloader";
import {YTBDuplicates} from "./YTBDuplicate";
import {ChannelList} from "../../utils/ChannelList";
import {UserList} from "../../utils/UserList";

export class YTB extends MultiModule {

    name = "YTB";
    description = "Module to handle every YTB related modules";

    static get emojiReact(){
        return [
            "✅",
            "💾",
            "👀",
            "🎵"
        ]
    }

    static get channelFeed() {
        return [ChannelList.feed.musiques, ChannelList.feed.videos]
    }

    static get okUsers(){
        return [UserList.spatulox, UserList.dieudespatates]
    }

    subModules: Module[] = [
        new YTBFeed(),
        new YTBReactions(),
        new YTBDownloader(),
        new YTBDuplicates(),
    ];

}