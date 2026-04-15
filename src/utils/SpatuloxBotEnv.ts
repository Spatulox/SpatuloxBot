export const SpatuloxBotEnv = {
    get music_path(): string {
        const music = process.env.MUSIC_PATH
        if(!music) throw new Error('Missing environment variable : MUSIC_PATH')
        return music
    }
} as const