import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";

let observer;
let statusInterval;
let settingsObserver;
let pageObserver;
let heartbeatInterval;
let joinDateObserver;
let joinDateExists = false;

const STATUS_COLORS = {
    0: '#747f8d',
    1: '#43b581',
    2: '#f04747'
};

const STATUS_LABELS = {
    0: 'Invisible',
    1: 'Normal (Online)',
    2: 'Do not disturb'
};

export default definePlugin({
    name: "UsersStatus",
    description: "Shows BetterX badge and status dot on user profiles",
    authors: [Devs.TPM28],

    retryCount: 0,
    maxRetries: 5,

    hashToken(token) {
        let hash = 0;
        for (let i = 0; i < token.length; i++) {
            const char = token.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return Math.abs(hash).toString(16);
    },

    AuthToken() {
        return localStorage.getItem('betterx_token');
    },

    getAppUsername() {
        const profileLink = document.querySelector('a[data-testid="AppTabBar_Profile_Link"]');
        let username = null;
        
        if (profileLink) {
            const href = profileLink.getAttribute('href');
            if (href) {
                username = href.substring(1);
                localStorage.setItem('betterx-app-username', username);
            }
        }

        if (!username) {
            username = localStorage.getItem('betterx-app-username');
        }

        return username;
    },

    getProfileUsername() {
        const path = window.location.pathname;
        const username = path.split('/')[1] || null;
        return username;
    },

    async createAuthPopup() {
        if (!document.cookie.includes('twid=')) return;
        if (document.querySelector('.betterx-auth-popup')) {
            return;
        }

        const overlay = document.createElement('div');
        overlay.className = 'betterx-auth-popup';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 99999;
        `;

        const popup = document.createElement('div');
        popup.style.cssText = `
            background: rgb(0, 0, 0);
            padding: 20px;
            border-radius: 16px;
            border: 1px solid rgb(47, 51, 54);
            width: 400px;
            box-shadow: 0px 0px 10px rgba(255, 255, 255, 0.1);
            box-sizing: border-box;
        `;

        try {
            let authWindowOpened = false;

            const connectResponse = await window.api.fetch('https://tpm28.com/betterx/connect-request');
            const connectData = await connectResponse.json();
            const { auth_url, token: oauth_token } = connectData;

            popup.innerHTML = `
                <h2 style="color: rgb(247, 249, 249); margin-bottom: 20px; font-family: TwitterChirp, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;">
                    BetterX Authentication Required
                </h2>
                <button id="openAuth" style="
                    width: 100%;
                    padding: 12px;
                    background: rgb(29, 155, 240);
                    border: none;
                    border-radius: 9999px;
                    color: white;
                    font-weight: bold;
                    cursor: pointer;
                    margin-bottom: 15px;
                    transition: background-color 0.2s;
                    box-sizing: border-box;
                ">Open Authentication Page</button>
                <div id="verifierSection" style="display: none;">
                    <p style="color: rgb(231, 233, 234); margin-bottom: 15px;">
                        Paste the verification code below:
                    </p>
                    <input type="text" id="verifierInput" placeholder="Verification code" style="
                        width: 100%;
                        padding: 10px;
                        margin-bottom: 15px;
                        background: rgb(32, 35, 39);
                        border: 1px solid rgb(83, 100, 113);
                        border-radius: 8px;
                        color: rgb(247, 249, 249);
                        font-size: 15px;
                        box-sizing: border-box;
                    ">
                    <button id="submitVerifier" style="
                        width: 100%;
                        padding: 12px;
                        background: rgb(29, 155, 240);
                        border: none;
                        border-radius: 9999px;
                        color: white;
                        font-weight: bold;
                        cursor: pointer;
                        box-sizing: border-box;
                    ">Connect</button>
                </div>
            `;

            overlay.appendChild(popup);
            document.body.appendChild(overlay);

            const openAuthButton = popup.querySelector('#openAuth');
            const verifierSection = popup.querySelector('#verifierSection');
            
            openAuthButton.addEventListener('click', () => {
                if (!authWindowOpened) {
                    window.open(auth_url, '_blank');
                    authWindowOpened = true;
                    openAuthButton.style.display = 'none';
                    verifierSection.style.display = 'block';
                }
            });

            const submitButton = popup.querySelector('#submitVerifier');
            submitButton.addEventListener('mouseenter', () => {
                submitButton.style.backgroundColor = 'rgb(26, 140, 216)';
            });
            submitButton.addEventListener('mouseleave', () => {
                submitButton.style.backgroundColor = 'rgb(29, 155, 240)';
            });

            submitButton.addEventListener('click', async () => {
                const verifier = popup.querySelector('#verifierInput').value.trim();
                if (!verifier) return;

                try {
                    const tokenResponse = await window.api.fetch(
                        `https://tpm28.com/betterx/get-token?oauth_token=${oauth_token}&oauth_verifier=${verifier}`
                    );
                    const tokenData = await tokenResponse.json();
                    
                    localStorage.setItem('betterx_token', tokenData.oauth_token);
                    
                    await window.api.fetch('https://tpm28.com/betterx/users', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            username: this.getAppUsername(),
                            token: tokenData.oauth_token
                        })
                    });

                    overlay.remove();
                    this.startHeartbeat();
                } catch (error) {
                    console.error('Error getting auth token:', error);
                    popup.innerHTML += `
                        <p style="color: rgb(244, 33, 46); margin-top: 10px; text-align: center;">
                            Error: Invalid verification code
                        </p>
                    `;
                    setTimeout(() => {
                        window.location.reload();
                    }, 2000);
                }
            });

        } catch (error) {
            console.error('Error creating auth popup:', error);
            popup.innerHTML = `
                <p style="color: rgb(244, 33, 46); text-align: center;">
                    An error occurred while connecting to BetterX
                </p>
            `;
            overlay.appendChild(popup);
            document.body.appendChild(overlay);
        }
    },

    async sendHeartbeat() {
        try {
            if (document.querySelector('.betterx-auth-popup')) {
                return;
            }

            const username = this.getAppUsername();
            const token = this.AuthToken();
            
            if (!token) {
                await this.createAuthPopup();
                return;
            }

            if (!username || !token) {
                return;
            }

            await window.api.fetch(`https://tpm28.com/betterx/users/${username}/heartbeat?token=${token}`, {
                method: 'POST'
            });
        } catch (error) {
            console.error('Error sending heartbeat:', error);
        }
    },

    startHeartbeat() {
        if (this.getCurrentUserStatus() === 0) {
            return;
        }

        if (heartbeatInterval) {
            clearInterval(heartbeatInterval);
        }

        this.sendHeartbeat();
        
        heartbeatInterval = setInterval(() => {
            this.sendHeartbeat();
        }, 60000);
    },

    updateProfileDot(status) {
        const avatarContainer = document.querySelector('div.css-175oi2r.r-1adg3ll.r-bztko3.r-16l9doz.r-6gpygo.r-2o1y69.r-1v6e3re.r-1xce0ei[data-testid^="UserAvatar-Container-"]');
        if (avatarContainer) {
            const existingStatusDot = document.querySelector('.betterx-status-dot');
            if (existingStatusDot) {
                existingStatusDot.remove();
            }

            const targetDiv = avatarContainer.querySelector('div.r-1p0dtai.r-1pi2tsx.r-1d2f490.r-u8s1d.r-ipm5af.r-13qz1uu');
            if (targetDiv) {
                const statusDot = document.createElement('div');
                statusDot.className = 'betterx-status-dot';
                statusDot.style.cssText = `
                    position: absolute;
                    bottom: 9%;
                    right: 9%;
                    width: 22px;
                    height: 22px;
                    background-color: ${STATUS_COLORS[status]};
                    border-radius: 100%;
                    border: 5px solid rgb(0 0 0);
                    box-sizing: content-box;
                    z-index: 999;
                `;

                targetDiv.appendChild(statusDot);
            }
        }
    },

    startJoinDateObserver() {
        if (joinDateObserver) joinDateObserver.disconnect();

        const updateJoinDate = () => {
            const prevExists = joinDateExists;
            joinDateExists = !!document.querySelector('span[data-testid="UserJoinDate"]');
            
            if (!prevExists && joinDateExists) {
                const profileUsername = this.getProfileUsername();
                if (profileUsername) {
                    this.checkUserAndInjectIcon(profileUsername);
                }
            }
        };
        joinDateObserver = new MutationObserver(updateJoinDate);
        joinDateObserver.observe(document.body, { childList: true, subtree: true });
        updateJoinDate();
    },

    async checkUserStatus(username) {
        if (!joinDateExists) return;

        const path = window.location.pathname;
        if (path.startsWith('/home') || path.startsWith('/explore') || path.startsWith('/notifications') || path.startsWith('/messages') || path.startsWith('/i') || path.startsWith('/jobs')) {
            return;
        }

        try {
            const response = await window.api.fetch(`https://tpm28.com/betterx/users/${username}/status`);
            const data = await response.json();
            this.updateProfileDot(data.status);
        } catch (error) {
            console.error('Error checking user status:', error);
        }
    },

    startStatusInterval(username) {
        if (statusInterval) {
            clearInterval(statusInterval);
        }
        
        this.checkUserStatus(username);
        
        statusInterval = setInterval(() => {
            this.checkUserStatus(username);
        }, 10000);
    },

    clearBetterXElements() {
        document.querySelectorAll('[data-testid="icon-betterx"]').forEach(icon => {
            icon.parentElement.remove();
        });

        document.querySelectorAll('.betterx-status-dot').forEach(dot => {
            dot.remove();
        });

        if (statusInterval) {
            clearInterval(statusInterval);
            statusInterval = null;
        }
    },

    async checkUserAndInjectIcon(username) {
        try {
            if (!joinDateExists) {
                return;
            }

            const path = window.location.pathname;
            if (path.startsWith('/home') || path.startsWith('/explore') || path.startsWith('/notifications') || path.startsWith('/messages') || path.startsWith('/i') || path.startsWith('/jobs')) {
                return;
            }

            const statusResponse = await window.api.fetch(`https://tpm28.com/betterx/users/${username}/status`);
            const statusData = await statusResponse.json();
            const response = await window.api.fetch(`https://tpm28.com/betterx/users/${username}`);
            const data = await response.json();
            
            this.clearBetterXElements();
            if (data.exists) {
                const tryInject = () => {
                    const userNameContainer = document.querySelector('div[data-testid="UserName"]');
                    const profileLink = document.querySelector('a[href*="/photo"]');
                    
                    if (!userNameContainer || !profileLink) {
                        if (this.retryCount < this.maxRetries) {
                            this.retryCount++;
                            setTimeout(tryInject, 80);
                            return;
                        }
                        return;
                    }
                    this.retryCount = 0;
                    this.updateProfileDot(statusData.status);
                    const targetSpan = userNameContainer.querySelector('.css-1jxf684.r-bcqeeo.r-1ttztb7.r-qvutc0.r-poiln3.r-1awozwy.r-xoduu5');
                    if (targetSpan && !userNameContainer.querySelector('[data-testid="icon-betterx"]')) {
                        const newDiv = document.createElement('div');
                        newDiv.className = 'css-175oi2r r-xoduu5';
                        newDiv.innerHTML = `
                            <svg viewBox="0 0 22 22" aria-label="BetterX" role="img" class="r-4qtqp9 r-yyyyoo r-1xvli5t r-bnwqim r-lrvibr r-m6rgpd r-1cvl2hr r-f9ja8p r-og9te1" data-testid="icon-betterx" style="border: 1px solid white;border-radius: 4px;margin-left: 8px;top: 2px;">
                                <image href="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAMAAABEpIrGAAAAIGNIUk0AAHomAACAhAAA+gAAAIDoAAB1MAAA6mAAADqYAAAXcJy6UTwAAAGnUExURQAAAAAAAAAAACEhIUtLS0dHR0lJSUhISEFBQS4uLhMTEwICAjs7O7+/v/j4+Pf39+fn5+Tk5O7u7vn5+fb29vr6+v39/ebm5tHR0d7e3tLS0o6OjigoKB8fH9TU1Ojo6EVFRSYmJpKSkvv7+319fVRUVGtra66urtzc3HR0dD09PYeHh+rq6tXV1TQ0NAMDAzw8PAcHB4ODg1BQUPDw8KurqwEBAaenp+Xl5SIiIqioqAUFBaysrOnp6ScnJw0NDcvLy8zMzA4ODoaGhhAQENDQ0MfHxwwMDJGRkfPz8zIyMpeXlxISEsjIyBYWFuPj4zU1NYGBgXFxcXx8fGxsbEBAQGFhYbm5udfX12hoaEpKSqqqqoKCggsLC/////Hx8YWFhfz8/I+Pj21tbYmJiTk5OZqampaWlp2dne/v73V1dYqKigQEBLq6uiwsLBgYGHh4eFtbW2ZmZtvb2xcXF35+flpaWhQUFMXFxevr6wYGBnl5eUNDQxEREZSUlCAgIJOTk4CAgFZWVmpqavT09Hd2dsrKyqSkpMDAwN/f37S0tEZGRh0dHaWWml4AAAACdFJOU/79P6CPqgAAAAFiS0dEXgTWYbsAAAAJcEhZcwAALiMAAC4jAXilP3YAAAAHdElNRQfoCgsRCRUKiToKAAABUklEQVQ4y2Ngwg8YGAaPAmYWVlY2NnZWdnZWVlYOTi5udAU8vHz8AoJCwvwiomLiEpJS0jLoVsjKySsoKimrqKqpa2hqaevo6qEp0FcXlGVS4TNgYjI00mFlMjYxNURVYGZuAVKgBWRaClrpW9vY2uFUYO/g6MTkzMeDU4GLq5s7k4enHk4FXkLeTD6+cn5YFQAd6WPuH2AYKBLEhEVBsGhIaFh4RGRUtGBMLFYFccLCcfFBCYLCCe5MWBUkJiWnONgGp6bJp/sw4XKDX0Ymu34Wf7Y+7oCStMlxz7XNw6lAX10jn6kgrhCnAqYMcWamojg1nAq4TYtLmErjynAqKNE11S+vqOTEFd1V1eI1tXVidTmoCuqBCcauQbmxqTm6xaa1ja89Hy3JdfCLiAsK8fGLCCeKyHd2FdqjhWR9VHc3MMF2gwCHXo8h6cmepgoIAEYAdQJPWDoMAEsAAAAOZVhJZk1NACoAAAAIAAAAAAAAANJTkwAAACV0RVh0ZGF0ZTpjcmVhdGUAMjAyNC0xMC0xMVQxNzowOToyMSswMDowMOSvVEsAAAAldEVYdGRhdGU6bW9kaWZ5ADIwMjQtMTAtMTFUMTc6MDk6MjErMDA6MDCV8uz3AAAAKHRFWHRkYXRlOnRpbWVzdGFtcAAyMDI0LTEwLTExVDE3OjA5OjIxKzAwOjAwwufNKAAAAABJRU5ErkJggg==" width="22" height="22"></image>
                            </svg>
                        `;
                        targetSpan.appendChild(newDiv);
                    }

                    this.startStatusInterval(username);
                };
                tryInject();
            }
        } catch (error) {
            console.error('Error checking user status:', error);
            this.clearBetterXElements();
        }
    },

    getCurrentUserStatus() {
        try {
            return parseInt(localStorage.getItem('betterx-user-status') || '1');
        } catch {
            return 1;
        }
    },

    setCurrentUserStatus(status) {
        try {
            localStorage.setItem('betterx-user-status', status.toString());
        } catch (error) {
            console.error('Error saving status to localStorage:', error);
        }
    },

    async updateUserStatus(status) {
        try {
            const username = this.getAppUsername();
            const token = this.AuthToken();
            
            if (!username || !token) return;

            this.setCurrentUserStatus(status);
            
            await window.api.fetch(`https://tpm28.com/betterx/users/${username}/status?token=${token}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ status })
            });
            
            this.updateProfileDot(status);

            if (status === 0) {
                if (heartbeatInterval) {
                    clearInterval(heartbeatInterval);
                    heartbeatInterval = null;
                }
            } 
        } catch (error) {
            console.error('Error updating status:', error);
        }
    },

    createStatusMenu() {
        const menu = document.createElement('div');
        menu.className = 'betterx-status-menu';
        menu.style.cssText = `
            position: fixed;
            background-color: rgb(0, 0, 0);
            border-radius: 12px;
            box-shadow: 0px 0px 8px rgba(255, 255, 255, 0.1),
                        0px 0px 4px rgba(255, 255, 255, 0.05);
            min-width: 240px;
            z-index: 10000;
            padding: 4px 0;
            margin-top: 4px;
            border: 1px solid rgb(47, 51, 54);
        `;

        const currentStatus = this.getCurrentUserStatus();

        Object.entries(STATUS_COLORS).forEach(([status, color]) => {
            const option = document.createElement('div');
            option.className = 'betterx-status-option';
            option.dataset.statusId = status;
            option.style.cssText = `
                padding: 12px 16px;
                color: rgb(247, 249, 249);
                font-size: 15px;
                line-height: 20px;
                font-family: TwitterChirp, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                cursor: pointer;
                display: flex;
                align-items: center;
                gap: 12px;
                transition: background-color 0.2s;
            `;

            const indicator = document.createElement('div');
            indicator.style.cssText = `
                width: 12px;
                height: 12px;
                border-radius: 50%;
                background-color: ${color};
                flex-shrink: 0;
            `;

            option.appendChild(indicator);
            option.appendChild(document.createTextNode(STATUS_LABELS[status]));

            if (parseInt(status) === currentStatus) {
                option.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
            }

            option.addEventListener('mouseenter', () => {
                option.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
            });
            option.addEventListener('mouseleave', () => {
                option.style.backgroundColor = 'transparent';
            });

            option.addEventListener('click', async () => {
                const statusId = parseInt(option.dataset.statusId);
                await this.updateUserStatus(statusId);
                menu.remove();
            });

            menu.appendChild(option);
        });

        return menu;
    },

    injectStatusButton() {
        const actionContainer = document.querySelector('div.css-175oi2r.r-obd0qt.r-18u37iz.r-1w6e6rj.r-1h0z5md.r-dnmrzs');
        if (!actionContainer || !actionContainer.closest('div.css-175oi2r.r-1habvwh.r-18u37iz.r-1w6e6rj.r-1wtj0ep')) return;

        if (actionContainer.querySelector('button[aria-label="Status"]')) return;

        const statusButton = document.createElement('button');
        statusButton.setAttribute('aria-label', 'Status');
        statusButton.setAttribute('role', 'button');
        statusButton.setAttribute('type', 'button');
        statusButton.className = 'css-175oi2r r-sdzlij r-1phboty r-rs99b7 r-lrvibr r-6gpygo r-1wron08 r-2yi16 r-1qi8awa r-1loqt21 r-o7ynqc r-6416eg r-1ny4l3l';
        statusButton.style.borderColor = 'rgb(83, 100, 113)';
        statusButton.style.backgroundColor = 'rgba(0, 0, 0, 0)';
        
        statusButton.addEventListener('mouseenter', () => {
            statusButton.className = 'css-175oi2r r-sdzlij r-1phboty r-rs99b7 r-lrvibr r-6gpygo r-1wron08 r-2yi16 r-1qi8awa r-1loqt21 r-o7ynqc r-6416eg r-pjtv4k r-1ny4l3l';
            statusButton.style.backgroundColor = 'rgba(239, 243, 244, 0.1)';
        });

        statusButton.addEventListener('mouseleave', () => {
            statusButton.className = 'css-175oi2r r-sdzlij r-1phboty r-rs99b7 r-lrvibr r-6gpygo r-1wron08 r-2yi16 r-1qi8awa r-1loqt21 r-o7ynqc r-6416eg r-1ny4l3l';
            statusButton.style.backgroundColor = 'rgba(0, 0, 0, 0)';
        });

        statusButton.innerHTML = `
            <div dir="ltr" class="css-146c3p1 r-bcqeeo r-qvutc0 r-37j5jr r-q4m81j r-a023e6 r-rjixqe r-b88u0q r-1awozwy r-6koalj r-18u37iz r-16y2uox r-1777fci" style="color: rgb(239, 243, 244);">
                <svg viewBox="0 0 24 24" aria-hidden="true" class="r-4qtqp9 r-yyyyoo r-dnmrzs r-bnwqim r-lrvibr r-m6rgpd r-z80fyv r-19wmn03" style="color: rgb(239, 243, 244);">
                    <g><path d="M5.651 19h12.698c-.337-1.8-1.023-3.21-1.945-4.19C15.318 13.65 13.838 13 12 13s-3.317.65-4.404 1.81c-.922.98-1.608 2.39-1.945 4.19zm.486-5.56C7.627 11.85 9.648 11 12 11s4.373.85 5.863 2.44c1.477 1.58 2.366 3.8 2.632 6.46l.11 1.1H3.395l.11-1.1c.266-2.66 1.155-4.88 2.632-6.46zM12 4c-1.105 0-2 .9-2 2s.895 2 2 2 2-.9 2-2-.895-2-2-2zM8 6c0-2.21 1.791-4 4-4s4 1.79 4 4-1.791 4-4 4-4-1.79-4-4z"></path></g>
                </svg>
                <span class="css-1jxf684 r-dnmrzs r-1udh08x r-1udbk01 r-3s2u2q r-bcqeeo r-1ttztb7 r-qvutc0 r-poiln3 r-a023e6 r-rjixqe"></span>
            </div>
        `;

        statusButton.addEventListener('click', (event) => {
            event.stopPropagation();
            
            document.querySelectorAll('.betterx-status-menu').forEach(m => m.remove());
            
            const menu = this.createStatusMenu();
            document.body.appendChild(menu);
            
            const buttonRect = statusButton.getBoundingClientRect();
            const menuLeft = Math.min(
                buttonRect.left,
                window.innerWidth - menu.offsetWidth - 10
            );
            
            menu.style.left = `${menuLeft}px`;
            menu.style.top = `${buttonRect.bottom + 4}px`;

            const closeMenu = (e) => {
                if (!menu.contains(e.target) && !statusButton.contains(e.target)) {
                    menu.remove();
                    document.removeEventListener('click', closeMenu);
                }
            };
            document.addEventListener('click', closeMenu);
        });

        actionContainer.insertBefore(statusButton, actionContainer.firstChild);
    },

    startSettingsObserver() {
        if (settingsObserver) settingsObserver.disconnect();

        const checkAndInject = () => {
            const settingsLink = document.querySelector('a[href="/settings/profile"][role="link"]');
            const statusButton = document.querySelector('button[aria-label="Status"]');
            
            if (settingsLink) {
                if (!statusButton) {
                    this.injectStatusButton();
                }
            } else {
                if (statusButton) {
                    statusButton.remove();
                }
            }
        };

        settingsObserver = new MutationObserver(checkAndInject);
        settingsObserver.observe(document.body, {
            childList: true,
            subtree: true
        });

        checkAndInject();
    },

    start() {
        let currentUsername = null;
        let lastPathname = null;

        const checkPathChange = () => {
            const currentPathname = window.location.pathname;
            const match = currentPathname.match(/^\/([^/]+)(?:\/.*)?$/);
            const newUsername = match ? match[1] : null;

            if (newUsername !== null) {
                if (newUsername !== currentUsername || currentPathname !== lastPathname) {
                    currentUsername = newUsername;
                    lastPathname = currentPathname;
                    this.retryCount = 0;
                    
                    if (currentUsername) {
                        if (currentPathname === `/${currentUsername}` || currentPathname.startsWith(`/${currentUsername}/`)) {
                            this.checkUserAndInjectIcon(currentUsername);
                        }
                    } else {
                        this.clearBetterXElements();
                    }
                }
            }
        };

        const observeDOM = () => {
            if (pageObserver) {
                pageObserver.disconnect();
            }

            pageObserver = new MutationObserver((mutations) => {
                for (const mutation of mutations) {
                    if (mutation.type === 'childList') {
                        const hasRelevantChanges = [...mutation.addedNodes].some(node => 
                            node.nodeType === 1 && (
                                node.querySelector('div[data-testid="UserName"]') ||
                                node.querySelector('a[href*="/photo"]')
                            )
                        );

                        if (hasRelevantChanges) {
                            checkPathChange();
                            break;
                        }
                    }
                }
            });

            pageObserver.observe(document.body, {
                childList: true,
                subtree: true
            });
        };

        window.addEventListener('popstate', checkPathChange);
        window.addEventListener('pushState', checkPathChange);
        window.addEventListener('replaceState', checkPathChange);

        const originalPushState = history.pushState;
        history.pushState = function() {
            originalPushState.apply(this, arguments);
            checkPathChange();
        };

        const originalReplaceState = history.replaceState;
        history.replaceState = function() {
            originalReplaceState.apply(this, arguments);
            checkPathChange();
        };

        observeDOM();
        this.startSettingsObserver();
        this.startJoinDateObserver();

        checkPathChange();

        const initialStatus = this.getCurrentUserStatus();
        if (initialStatus === 1 || initialStatus === 2) {
            this.updateUserStatus(initialStatus).then(() => {
                if (initialStatus !== 0) {
                    this.startHeartbeat();
                }
            });
        }
    },

    stop() {
        if (observer) {
            observer.disconnect();
        }
        if (pageObserver) {
            pageObserver.disconnect();
        }
        window.removeEventListener('popstate', this.checkCurrentPage);
        this.clearBetterXElements();

        if (settingsObserver) {
            settingsObserver.disconnect();
        }

        const statusButton = document.querySelector('button[aria-label="Status"]');
        if (statusButton) {
            statusButton.remove();
        }

        if (heartbeatInterval) {
            clearInterval(heartbeatInterval);
            heartbeatInterval = null;
        }

        if (history.pushState._original) {
            history.pushState = history.pushState._original;
        }
        if (history.replaceState._original) {
            history.replaceState = history.replaceState._original;
        }
    }
});
