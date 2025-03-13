import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import emoji from "node-emoji";

export default definePlugin({
    name: "QuickEmoji",
    description: "Quickly insert emojis with \":emoji:\" syntax like in Discord",
    authors: [Devs.TPM28],
    start() {
        // Create and append the emoji preview element
        const previewElement = document.createElement('div');
        previewElement.classList.add('betterx-emoji-preview');
        previewElement.style.display = 'none';
        document.body.appendChild(previewElement);
        this.previewElement = previewElement;

        // Store current context for emoji insertion
        let currentTextNode = null;
        let currentPartialMatch = null;
        let preventHideOnBlur = false;

        function replaceWithEmoji() {
            const sel = window.getSelection();
            const range = sel.getRangeAt(0);
            const textNode = range.startContainer;
            const text = textNode.nodeValue;
            
            if (text) {
                const regex = /:([\w+-]+):/g;
                let match;
                let found = false;
                
                while ((match = regex.exec(text)) !== null) {
                    const emojiName = match[1];
                    const emojiCode = emoji.get(emojiName);
                    
                    if (emojiCode && emojiCode !== `:${emojiName}:`) {
                        found = true;
                        const startPos = match.index;
                        const endPos = match.index + match[0].length;
                        
                        const before = text.slice(0, startPos);
                        const after = text.slice(endPos);
                        
                        textNode.nodeValue = before + after;
                        range.setStart(textNode, before.length);
                        range.setEnd(textNode, before.length);
                        sel.removeAllRanges();
                        sel.addRange(range);
                        document.execCommand('insertText', false, emojiCode);
                        
                        regex.lastIndex = before.length + 1;
                        break;
                    }
                }
            }
        }

        function insertEmoji(emojiName) {
            if (!currentTextNode || !currentPartialMatch) return;
            
            const sel = window.getSelection();
            const range = document.createRange();
            const emojiCode = emoji.get(emojiName);
            
            // Replace the partial with the full emoji
            const text = currentTextNode.nodeValue;
            const startPos = currentPartialMatch.index;
            const endPos = startPos + currentPartialMatch[0].length;
            
            const before = text.slice(0, startPos);
            const after = text.slice(endPos);
            
            currentTextNode.nodeValue = before + after;
            range.setStart(currentTextNode, before.length);
            range.setEnd(currentTextNode, before.length);
            sel.removeAllRanges();
            sel.addRange(range);
            document.execCommand('insertText', false, emojiCode);
            
            // Force focus back to the input after inserting emoji
            setTimeout(() => {
                const tweetInput = document.querySelector('.DraftEditor-root .DraftEditor-editorContainer .public-DraftEditor-content[contenteditable="true"]');
                if (tweetInput) tweetInput.focus();
            }, 0);
            
            hideEmojiPreview();
        }

        function showEmojiPreview(textNode, partial, cursorPosition) {
            // Find emojis that start with the partial text
            const matchingEmojis = Object.keys(emoji.emoji)
                .filter(name => name.toLowerCase().startsWith(partial.toLowerCase()))
                .slice(0, 5); // Limit to 5 suggestions
            
            if (matchingEmojis.length === 0) {
                previewElement.style.display = 'none';
                currentTextNode = null;
                currentPartialMatch = null;
                return;
            }

            // Store current context for emoji insertion
            currentTextNode = textNode;
            currentPartialMatch = {
                index: cursorPosition - partial.length - 1, // -1 for the colon
                0: `:${partial}`
            };

            // Create the preview content
            previewElement.innerHTML = '';
            matchingEmojis.forEach(name => {
                const emojiCode = emoji.get(name);
                const item = document.createElement('div');
                item.classList.add('betterx-emoji-item');
                item.innerHTML = `<span class="betterx-emoji">${emojiCode}</span> <span class="betterx-emoji-name">${name}</span>`;
                item.dataset.name = name;
                item.addEventListener('mousedown', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    preventHideOnBlur = true;
                    setTimeout(() => {
                        insertEmoji(name);
                        preventHideOnBlur = false;
                    }, 10);
                });
                previewElement.appendChild(item);
            });

            // Position the preview element near the cursor
            const range = document.createRange();
            range.setStart(textNode, cursorPosition);
            const rect = range.getBoundingClientRect();
            previewElement.style.position = 'absolute';
            previewElement.style.left = `${rect.left}px`;
            previewElement.style.top = `${rect.bottom + 5}px`;
            previewElement.style.display = 'block';
        }

        function hideEmojiPreview() {
            if (preventHideOnBlur) return;
            previewElement.style.display = 'none';
            currentTextNode = null;
            currentPartialMatch = null;
        }

        function handleTabCompletion(e) {
            if (e.key === 'Tab') {
                e.preventDefault(); // Prevent default tab behavior
                
                const sel = window.getSelection();
                const range = sel.getRangeAt(0);
                const textNode = range.startContainer;
                const text = textNode.nodeValue;
                
                if (text) {
                    // Look for pattern ":xx" - a colon followed by at least 2 characters
                    const regex = /:([a-zA-Z0-9_+-]{2,})$/;
                    const match = text.slice(0, range.startOffset).match(regex);
                    
                    if (match) {
                        const partial = match[1].toLowerCase();
                        // Find emojis that start with the partial text
                        const matchingEmojis = Object.keys(emoji.emoji)
                            .filter(name => name.toLowerCase().startsWith(partial));
                        
                        if (matchingEmojis.length > 0) {
                            // Take the first match
                            insertEmoji(matchingEmojis[0]);
                        }
                    }
                }
            }
        }

        function handleInputForPreview(e) {
            const sel = window.getSelection();
            if (!sel.rangeCount) return;
            
            const range = sel.getRangeAt(0);
            const textNode = range.startContainer;
            const text = textNode.nodeValue;
            
            if (text) {
                // Look for pattern ":xx" - a colon followed by at least 2 characters
                const regex = /:([a-zA-Z0-9_+-]{2,})$/;
                const match = text.slice(0, range.startOffset).match(regex);
                
                if (match) {
                    const partial = match[1];
                    showEmojiPreview(textNode, partial, range.startOffset);
                } else {
                    hideEmojiPreview();
                }
            } else {
                hideEmojiPreview();
            }
        }

        function handleDocumentClick(e) {
            // Check if the click is outside the preview
            if (!previewElement.contains(e.target)) {
                hideEmojiPreview();
            }
        }

        function handleBlur() {
            // Add a small delay to allow click events to process first
            setTimeout(() => {
                if (!preventHideOnBlur) {
                    hideEmojiPreview();
                }
            }, 100);
        }

        function attachInputEvent() {
            const tweetInput = document.querySelector('.DraftEditor-root .DraftEditor-editorContainer .public-DraftEditor-content[contenteditable="true"]');
            if (tweetInput) {
                tweetInput.removeEventListener('input', replaceWithEmoji);
                tweetInput.addEventListener('input', replaceWithEmoji);
                tweetInput.removeEventListener('keydown', handleTabCompletion);
                tweetInput.addEventListener('keydown', handleTabCompletion);
                tweetInput.removeEventListener('input', handleInputForPreview);
                tweetInput.addEventListener('input', handleInputForPreview);
                tweetInput.removeEventListener('blur', handleBlur);
                tweetInput.addEventListener('blur', handleBlur);
            }
        }

        attachInputEvent();
        const observer = new MutationObserver(attachInputEvent);
        observer.observe(document.body, { childList: true, subtree: true });
        
        // Add global click handler to hide preview when clicking elsewhere
        document.addEventListener('click', handleDocumentClick);

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
        if (tweetInput) {
            tweetInput.removeEventListener('input', this.replaceWithEmoji);
            tweetInput.removeEventListener('keydown', this.handleTabCompletion);
            tweetInput.removeEventListener('input', this.handleInputForPreview);
            tweetInput.removeEventListener('blur', this.handleBlur);
        }

        document.removeEventListener('click', this.handleDocumentClick);

        if (this.previewElement) {
            this.previewElement.remove();
        }
    }
});
