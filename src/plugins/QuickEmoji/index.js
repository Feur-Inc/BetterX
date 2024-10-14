import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";

export default definePlugin({
    name: "QuickEmoji",
    description: "Quickly insert emojis with \":emoji:\" syntax like in Discord",
    authors: [Devs.TPM28],
    start() {
        const tweetInput = document.querySelector('.DraftEditor-root .DraftEditor-editorContainer .public-DraftEditor-content[contenteditable="true"]');
        const emojiMap = {
            ':joy:': '😂',
            ':heart:': '❤️',
            ':sunglasses:': '😎',
            ':poop:': '💩',
            ':thumbsup:': '👍',
            ':thumbsdown:': '👎',
            ':100:': '💯',
            ':fire:': '🔥',
            ':ok_hand:': '👌',
            ':pray:': '🙏',
            ':muscle:': '💪',
            ':clap:': '👏',
            ':raised_hands:': '🙌',
            ':sparkles:': '✨',
            ':star2:': '🌟',
            ':boom:': '💥',
            ':sweat_drops:': '💦',
            ':zzz:': '💤',
            ':alien:': '👽',
            ':tada:': '🎉',
            ':gift:': '🎁',
            ':bulb:': '💡',
            ':speech_balloon:': '💬',
            ':thought_balloon:': '💭',
            ':mag:': '🔍',
            ':bulb:': '💡',
            ':bell:': '🔔',
            ':key:': '🔑',
            ':lock:': '🔒',
            ':unlock:': '🔓',
            ':mailbox:': '📫',
            ':mailbox_closed:': '📪',
            ':mailbox_with_mail:': '📬',
            ':smile:': '😄',
            ':heart_eyes:': '😍',
            ':kissing_heart:': '😘',
            ':blush:': '😊',
            ':wink:': '😉',
            ':sunglasses:': '😎',
            ':grin:': '😁',
            ':tongue:': '😛',
            ':sweat_smile:': '😅',
            ':relaxed:': '☺️',
            ':smirk:': '😏',
            ':unamused:': '😒',
            ':sob:': '😭',
            ':cry:': '😢',
            ':scream:': '😱',
            ':angry:': '😠',
            ':rage:': '😡',
            ':triumph:': '😤',
            ':confused:': '😕',
            ':sleepy:': '😌',
            ':yum:': '😋',
            ':mask:': '😷',
            ':star_struck:': '🤩',
            ':heart_eyes_cat:': '😻',
            ':kissing_cat:': '😽',
            ':smiley_cat:': '😸',
            ':joy_cat:': '😹',
            ':smirk_cat:': '😼',
            ':scream_cat:': '🙀',
            ':crying_cat_face:': '😿',
            ':pouting_cat:': '😾',
            ':see_no_evil:': '🙈',
            ':hear_no_evil:': '🙉',
            ':speak_no_evil:': '🙊',
            ':kiss:': '💋',
            ':love_letter:': '💌',
            ':cupid:': '💘',
            ':gift_heart:': '💝',
            ':sparkling_heart:': '💖',
            ':heartpulse:': '💗',
            ':heartbeat:': '💓',
            ':revolving_hearts:': '💞',
            ':two_hearts:': '💕',
            ':heart_decoration:': '💟',
            ':broken_heart:': '💔',
            ':yellow_heart:': '💛',
            ':green_heart:': '💚',
            ':blue_heart:': '💙',
            ':purple_heart:': '💜',
            ':black_heart:': '🖤',
            ':100:': '💯',
            ':anger:': '💢',
            ':boom:': '💥',
            ':dizzy:': '💫',
            ':see_no_evil:': '🙈',
            ':hear_no_evil:': '🙉',
            ':speak_no_evil:': '🙊',
            ':kiss:': '💋',
            ':love_letter:': '💌',
            ':cupid:': '💘',
            ':gift_heart:': '💝',
            ':sparkling_heart:': '💖',
            ':heartpulse:': '💗',
            ':heartbeat:': '💓',
            ':revolving_hearts:': '💞',
            ':two_hearts:': '💕',
            ':heart_decoration:': '💟',
            ':broken_heart:': '💔',
            ':yellow_heart:': '💛',
            ':green_heart:': '💚',
            ':blue_heart:': '💙',
            ':purple_heart:': '💜',
            ':black_heart:': '🖤',
            ':100:': '💯',
            ':anger:': '💢',
            ':boom:': '💥',
            ':dizzy:': '💫',
            ':sweat_drops:': '💦',
            ':dash:': '💨',
            ':hole:': '🕳️',
            ':bomb:': '💣',
            ':speech_balloon:': '💬',
            ':eye_speech_bubble:': '👁️‍🗨️',
            ':right_anger_bubble:': '🗯️',
            ':thought_balloon:': '💭',
            ':zzz:': '💤',
            ':wave:': '👋',
            ':raised_hand:': '✋',
            ':ok_hand:': '👌',
            ':thumbsup:': '👍',
            ':thumbsdown:': '👎',
            ':clap:': '👏',
            ':open_hands:': '👐',
            ':crown:': '👑'
        };

        function replaceWithEmoji() {
            const sel = window.getSelection();
            const range = sel.getRangeAt(0);
            const textNode = range.startContainer;
            const text = textNode.nodeValue;
            if (text) {
                for (let key in emojiMap) {
                    const emoji = emojiMap[key];
                    const index = text.indexOf(key);
                    if (index !== -1) {
                        const before = text.slice(0, index);
                        const after = text.slice(index + key.length);
                        textNode.nodeValue = before + after;
                        range.setStart(textNode, before.length);
                        range.setEnd(textNode, before.length);
                        sel.removeAllRanges();
                        sel.addRange(range);
                        document.execCommand('insertText', false, emoji);
                    }
                }
            }
        }

        function attachInputEvent() {
            const tweetInput = document.querySelector('.DraftEditor-root .DraftEditor-editorContainer .public-DraftEditor-content[contenteditable="true"]');
            if (tweetInput) {
                tweetInput.removeEventListener('input', replaceWithEmoji); // Remove previous listener if any
                tweetInput.addEventListener('input', replaceWithEmoji);
            }
        }

        attachInputEvent();
        const observer = new MutationObserver(attachInputEvent);
        observer.observe(document.body, { childList: true, subtree: true });

        this.observer = observer;
        this.replaceWithEmoji = replaceWithEmoji;
    },
    stop() {
        if (this.observer) {
            this.observer.disconnect();
        }

        const tweetInput = document.querySelector('.DraftEditor-root .DraftEditor-editorContainer .public-DraftEditor-content[contenteditable="true"]');
        if (tweetInput) {
            tweetInput.removeEventListener('input', this.replaceWithEmoji);
        }
    }
});