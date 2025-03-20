import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import emoji from "node-emoji";
import { createEmojiPreview } from "./EmojiPreview";

// Interface for the emoji preview system return values
interface EmojiPreviewSystem {
    previewElement: HTMLElement;
    observer: MutationObserver;
    replaceWithEmoji: (event: Event) => void;
    handleTabCompletion: (event: KeyboardEvent) => void;
    handleInputForPreview: (event: Event) => void;
    handleBlur: (event: FocusEvent) => void;
    handleDocumentClick: (event: MouseEvent) => void;
}

export default definePlugin({
    name: "QuickEmoji",
    description: "Quickly insert emojis with \":emoji:\" syntax like in Discord",
    authors: [Devs.TPM28],
    
    // Properties for the plugin
    previewElement: null as HTMLElement | null,
    observer: null as MutationObserver | null,
    replaceWithEmoji: null as ((event: Event) => void) | null,
    handleTabCompletion: null as ((event: KeyboardEvent) => void) | null,
    handleInputForPreview: null as ((event: Event) => void) | null,
    handleBlur: null as ((event: FocusEvent) => void) | null,
    handleDocumentClick: null as ((event: MouseEvent) => void) | null,
    
    start() {
        // Initialize the emoji preview system
        const { 
            previewElement,
            observer,
            replaceWithEmoji, 
            handleTabCompletion, 
            handleInputForPreview, 
            handleBlur, 
            handleDocumentClick 
        }: EmojiPreviewSystem = createEmojiPreview(emoji);
        
        this.previewElement = previewElement;
        this.observer = observer;
        this.replaceWithEmoji = replaceWithEmoji;
        this.handleTabCompletion = handleTabCompletion;
        this.handleInputForPreview = handleInputForPreview;
        this.handleBlur = handleBlur;
        this.handleDocumentClick = handleDocumentClick;
    },
    stop() {
        if (this.observer) {
            this.observer.disconnect();
        }

        const tweetInput = document.querySelector('.DraftEditor-root .DraftEditor-editorContainer .public-DraftEditor-content[contenteditable="true"]');
        if (tweetInput && this.replaceWithEmoji && this.handleTabCompletion && this.handleInputForPreview && this.handleBlur) {
            tweetInput.removeEventListener('input', this.replaceWithEmoji);
            tweetInput.removeEventListener('keydown', this.handleTabCompletion);
            tweetInput.removeEventListener('input', this.handleInputForPreview);
            tweetInput.removeEventListener('blur', this.handleBlur);
        }

        if (this.handleDocumentClick) {
            document.removeEventListener('click', this.handleDocumentClick);
        }

        if (this.previewElement) {
            this.previewElement.remove();
        }
    }
});
