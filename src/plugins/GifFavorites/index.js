import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";

export default definePlugin({
    name: "GifFavorites",
    description: "Add favorites like on discord",
    authors: [Devs.Mopi, Devs.TPM28],
    start() {
        let originalXHR = {};
        let observer;

        function overrideXHR() {
            var XHR = XMLHttpRequest.prototype;
            originalXHR.open = XHR.open;
            originalXHR.send = XHR.send;

            XHR.open = function (method, url) {
                this._method = method;
                this._url = url;
                return originalXHR.open.apply(this, arguments);
            };

            XHR.send = function () {
                this._startTime = new Date().getTime();

                var self = this;
                var onReadyStateChange = this.onreadystatechange;

                this.onreadystatechange = function () {
                    if (self.readyState === 4) {
                        if (self._url.includes('/foundmedia/categories.json')) {
                            try {
                                var response = JSON.parse(self.responseText);
                                if (response.data && Array.isArray(response.data.groups)) {
                                    response.data.groups.unshift(favoritesGroup);
                                    Object.defineProperty(self, 'responseText', {
                                        writable: true,
                                        value: JSON.stringify(response)
                                    });
                                }
                            } catch (e) {
                                console.error('Error modifying categories response:', e);
                            }
                        } else if (self._url.includes('/foundmedia/categories/_favorites_.json')) {
                            try {
                                var favoritesResponse = createFavoritesResponse();
                                Object.defineProperty(self, 'responseText', {
                                    writable: true,
                                    value: JSON.stringify(favoritesResponse)
                                });
                            } catch (e) {
                                console.error('Error creating favorites response:', e);
                            }
                        }
                    }

                    if (onReadyStateChange) {
                        return onReadyStateChange.apply(this, arguments);
                    }
                };

                return originalXHR.send.apply(this, arguments);
            };
        }

        const favoritesGroup = {
            display_name: "★ Favorites",
            id: "_favorites_",
            thumbnail_images: [
                {
                    url: "",
                    width: 0,
                    height: 0,
                    byte_count: 0,
                    still_image_url: ""
                }
            ],
            original_image: {
                url: "",
                width: 0,
                height: 0,
                byte_count: 0,
                still_image_url: ""
            },
            object_type: "group"
        };

        function createFavoritesResponse() {
            const favorites = JSON.parse(localStorage.getItem('xcomGifFavorites') || '{}');

            const items = Object.entries(favorites).map(([altText, url]) => {
                let provider = { name: "unknown", display_name: "Unknown", icon_images: [] };
                let id = `unknown_${Math.random().toString(36).substr(2, 9)}`;

                if (url.includes('giphy.com')) {
                    provider = { name: "giphy", display_name: "GIPHY", icon_images: [] };
                    id = `giphy_${Math.random().toString(36).substr(2, 9)}`;
                    // Modify Giphy URL
                    url = url.replace(/\/200_.+$/, '/giphy.gif');
                } else if (url.includes('tenor.com')) {
                    provider = { name: "riffsy", display_name: "Tenor", icon_images: [] };
                    id = `riffsy_${Math.random().toString(36).substr(2, 9)}`;
                    // Modify Riffsy (Tenor) URL
                    url = url.replace(/AAAA.{1}\/[^\/]*/, 'AAAAC/');
                }

                return {
                    provider,
                    item_type: "gif",
                    id,
                    found_media_origin: {
                        provider: provider.name,
                        id: id.split('_')[1]
                    },
                    url,
                    thumbnail_images: [
                        {
                            url,
                            width: 200,
                            height: 200,
                            byte_count: 0,
                            still_image_url: url
                        }
                    ],
                    original_image: {
                        url,
                        width: 480,
                        height: 480,
                        byte_count: 0,
                        still_image_url: url
                    },
                    preview_image: {
                        url,
                        width: 480,
                        height: 480,
                        byte_count: 0,
                        still_image_url: url
                    },
                    alt_text: altText,
                    object_type: "item"
                };
            });
            console.log(items);
            return { data: { items } };
        }


        function handleGifElements() {
            const favorites = JSON.parse(localStorage.getItem('xcomGifFavorites') || '{}');
            const gifElements = document.querySelectorAll('div[data-testid="gifSearchGifImage"]');

            gifElements.forEach((gifElement) => {
                if (gifElement.querySelector('.gif-favorite-star')) return;

                const imgElement = gifElement.querySelector('img');
                if (!imgElement) return;

                const gifUrl = imgElement.src;
                let isFavorite = false;

                if (gifUrl.startsWith('https://media.tenor.com/')) {
                    const tenorMatch = gifUrl.match(/^(https:\/\/media\.tenor\.com\/[^/]+AAAA)/);
                    if (tenorMatch) {
                        isFavorite = Object.values(favorites).some(favUrl =>
                            favUrl.startsWith(tenorMatch[1])
                        );
                    }
                }

                else if (gifUrl.match(/^https:\/\/media\d+\.giphy\.com\//)) {
                    const giphyMatch = gifUrl.match(/^(https:\/\/media\d+\.giphy\.com\/media\/[^/]+)/);
                    if (giphyMatch) {
                        isFavorite = Object.values(favorites).some(favUrl =>
                            favUrl.startsWith(giphyMatch[1])
                        );
                    }
                }

                const starIcon = createStarIcon(isFavorite);
                starIcon.classList.add('gif-favorite-star');

                starIcon.addEventListener('click', (event) => {
                    event.stopPropagation();
                    event.preventDefault();

                    const newFavorites = JSON.parse(localStorage.getItem('xcomGifFavorites') || '{}');
                    const starInner = starIcon.querySelector('div');
                    let existingKey;

                    if (gifUrl.startsWith('https://media.tenor.com/')) {
                        const tenorUrlPart = gifUrl.match(/^(https:\/\/media\.tenor\.com\/[^/]+AAAA)/)[1];
                        existingKey = Object.keys(newFavorites).find(key =>
                            newFavorites[key].startsWith(tenorUrlPart)
                        );
                    } else if (gifUrl.match(/^https:\/\/media\d+\.giphy\.com\//)) {
                        const giphyUrlPart = gifUrl.match(/^(https:\/\/media\d+\.giphy\.com\/media\/[^/]+)/)[1];
                        existingKey = Object.keys(newFavorites).find(key =>
                            newFavorites[key].startsWith(giphyUrlPart)
                        );
                    }

                    if (existingKey) {
                        delete newFavorites[existingKey];
                        starInner.style.color = 'white';
                    } else {
                        const altText = imgElement.alt || 'Untitled GIF';
                        newFavorites[altText] = gifUrl;
                        starInner.style.color = 'gold';
                    }
                    localStorage.setItem('xcomGifFavorites', JSON.stringify(newFavorites));
                });

                gifElement.style.position = 'relative';
                gifElement.appendChild(starIcon);
            });
        }

        function createStarIcon(isFavorite) {
            const starContainer = document.createElement('div');
            starContainer.style.cssText = `
                position: absolute;
                top: 5px;
                right: 5px;
                width: 40px;
                height: 40px;
                background-color: rgba(0, 0, 0, 0.3);
                border-radius: 50%;
                display: flex;
                justify-content: center;
                align-items: center;
                cursor: pointer;
                z-index: 10;
                user-select: none;
                -webkit-user-select: none;
            `;

            const star = document.createElement('div');
            star.innerHTML = '★';
            star.style.cssText = `
                font-size: 30px;
                color: ${isFavorite ? 'gold' : 'white'};
            `;

            starContainer.appendChild(star);
            return starContainer;
        }

        function init() {
            overrideXHR();

            observer = new MutationObserver((mutations) => {
                for (const mutation of mutations) {
                    if (mutation.type === 'childList') {
                        handleGifElements();
                    }
                }
            });

            observer.observe(document.body, {
                childList: true,
                subtree: true
            });

            handleGifElements();
        }

        init();

    },
    stop() {
        if (originalXHR.open && originalXHR.send) {
            XMLHttpRequest.prototype.open = originalXHR.open;
            XMLHttpRequest.prototype.send = originalXHR.send;
        }

        if (observer) {
            observer.disconnect();
        }

        const starIcons = document.querySelectorAll('.gif-favorite-star');
        starIcons.forEach(icon => icon.remove());
    }
});
