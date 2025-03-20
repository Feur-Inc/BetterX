/**
 * Declaration file for the node-emoji module
 */
declare module 'node-emoji' {
    interface EmojiData {
        key: string;
        value: string;
    }

    interface NodeEmoji {
        get(emoji: string): string;
        random(): EmojiData;
        search(searchTerm: string): EmojiData[];
        emojify(str: string): string;
        unemojify(str: string): string;
        which(emoji_code: string): string;
        find(emoji: string): EmojiData | null;
        hasEmoji(str: string): boolean;
        strip(str: string): string;
        replace(str: string, callback: (emoji: EmojiData) => string): string;
    }

    const emoji: NodeEmoji;
    export default emoji;
}
