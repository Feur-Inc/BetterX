(()=>{var e={117:(e,t,n)=>{"use strict";n.r(t),n.d(t,{default:()=>i});var r=n(775),o=n(467);const i=(0,o.A)({name:"AdBlocker",description:"Blocks ads and sponsored content on X (formerly Twitter)",authors:[r.n.Mopi],adsHidden:0,adSelector:"div[data-testid=placementTracking]",trendSelector:"div[data-testid=trend]",userSelector:"div[data-testid=UserCell]",articleSelector:"article[data-testid=tweet]",sponsoredSvgPath:"M20.75 2H3.25C2.007 2 1 3.007 1 4.25v15.5C1 20.993 2.007 22 3.25 22h17.5c1.243 0 2.25-1.007 2.25-2.25V4.25C23 3.007 21.993 2 20.75 2zM17.5 13.504c0 .483-.392.875-.875.875s-.875-.393-.875-.876V9.967l-7.547 7.546c-.17.17-.395.256-.62.256s-.447-.086-.618-.257c-.342-.342-.342-.896 0-1.237l7.547-7.547h-3.54c-.482 0-.874-.393-.874-.876s.392-.875.875-.875h5.65c.483 0 .875.39.875.874v5.65z",sponsoredBySvgPath:"M19.498 3h-15c-1.381 0-2.5 1.12-2.5 2.5v13c0 1.38 1.119 2.5 2.5 2.5h15c1.381 0 2.5-1.12 2.5-2.5v-13c0-1.38-1.119-2.5-2.5-2.5zm-3.502 12h-2v-3.59l-5.293 5.3-1.414-1.42L12.581 10H8.996V8h7v7z",youMightLikeSvgPath:"M12 1.75c-5.11 0-9.25 4.14-9.25 9.25 0 4.77 3.61 8.7 8.25 9.2v2.96l1.15-.17c1.88-.29 4.11-1.56 5.87-3.5 1.79-1.96 3.17-4.69 3.23-7.97.09-5.54-4.14-9.77-9.25-9.77zM13 14H9v-2h4v2zm2-4H9V8h6v2z",adsSvgPath:"M19.498 3h-15c-1.381 0-2.5 1.12-2.5 2.5v13c0 1.38 1.119 2.5 2.5 2.5h15c1.381 0 2.5-1.12 2.5-2.5v-13c0-1.38-1.119-2.5-2.5-2.5zm-3.502 12h-2v-3.59l-5.293 5.3-1.414-1.42L12.581 10H8.996V8h7v7z",peopleFollowSvgPath:"M17.863 13.44c1.477 1.58 2.366 3.8 2.632 6.46l.11 1.1H3.395l.11-1.1c.266-2.66 1.155-4.88 2.632-6.46C7.627 11.85 9.648 11 12 11s4.373.85 5.863 2.44zM12 2C9.791 2 8 3.79 8 6s1.791 4 4 4 4-1.79 4-4-1.791-4-4-4z",xAd:">Ad<",promotedTweetTextSet:new Set(["Promoted Tweet","プロモツイート"]),start(){this.attachEventListeners(),this.startIntervals()},stop(){this.removeEventListeners(),this.stopIntervals()},attachEventListeners(){window.addEventListener("load",this.getAndHideAds.bind(this)),document.addEventListener("scroll",this.getAndHideAds.bind(this)),new PerformanceObserver((()=>{this.getAndHideAds()})).observe({type:"largest-contentful-paint",buffered:!0})},removeEventListeners(){window.removeEventListener("load",this.getAndHideAds.bind(this)),document.removeEventListener("scroll",this.getAndHideAds.bind(this))},startIntervals(){this.sidebarInterval=setInterval(this.checkSidebar.bind(this),500),this.premiumInterval=setInterval(this.checkPremiumAds.bind(this),500)},stopIntervals(){clearInterval(this.sidebarInterval),clearInterval(this.premiumInterval)},getAds(){return Array.from(document.querySelectorAll("div")).filter((e=>e.innerHTML.includes(this.sponsoredSvgPath)||e.innerHTML.includes(this.sponsoredBySvgPath)||e.innerHTML.includes(this.youMightLikeSvgPath)||e.innerHTML.includes(this.adsSvgPath)||this.settings.removePeopleToFollow.value&&e.innerHTML.includes(this.peopleFollowSvgPath)||e.innerHTML.includes(this.xAd)||this.promotedTweetTextSet.has(e.innerText)))},hideAd(e){e.closest(this.adSelector)?(e.closest(this.adSelector).remove(),this.adsHidden++):e.closest(this.trendSelector)?(e.closest(this.trendSelector).remove(),this.adsHidden++):e.closest(this.userSelector)?(e.closest(this.userSelector).remove(),this.adsHidden++):e.closest(this.articleSelector)?(e.closest(this.articleSelector).remove(),this.adsHidden++):this.promotedTweetTextSet.has(e.innerText)&&(e.remove(),this.adsHidden++)},getAndHideAds(){this.getAds().forEach((e=>this.hideAd(e)))},checkSidebar(){const e=document.querySelectorAll("[aria-label='Timeline: Conversation']");2===e.length&&e[0].parentElement.parentElement.addEventListener("scroll",this.getAndHideAds.bind(this))},checkPremiumAds(){const e=document.querySelector("aside[aria-label='Subscribe to Premium']");e&&e.remove();const t=document.querySelector("aside[aria-label='Upgrade to Premium+']");t&&t.remove()},settings:{removePeopleToFollow:{type:o.C.BOOLEAN,default:!1,description:"Remove 'People to follow' suggestions (may also remove some tweet replies)"}}})},932:(e,t,n)=>{"use strict";n.r(t),n.d(t,{default:()=>o});var r=n(775);const o=(0,n(467).A)({name:"BringTwitterBack",description:"Reverts X branding back to Twitter",authors:[r.n.Mopi],start(){console.log("Bring Twitter Back extension has loaded.");const e="M23.643 4.937c-.835.37-1.732.62-2.675.733.962-.576 1.7-1.49 2.048-2.578-.9.534-1.897.922-2.958 1.13-.85-.904-2.06-1.47-3.4-1.47-2.572 0-4.658 2.086-4.658 4.66 0 .364.042.718.12 1.06-3.873-.195-7.304-2.05-9.602-4.868-.4.69-.63 1.49-.63 2.342 0 1.616.823 3.043 2.072 3.878-.764-.025-1.482-.234-2.11-.583v.06c0 2.257 1.605 4.14 3.737 4.568-.392.106-.803.162-1.227.162-.3 0-.593-.028-.877-.082.593 1.85 2.313 3.198 4.352 3.234-1.595 1.25-3.604 1.995-5.786 1.995-.376 0-.747-.022-1.112-.065 2.062 1.323 4.51 2.093 7.14 2.093 8.57 0 13.255-7.098 13.255-13.254 0-.2-.005-.402-.014-.602.91-.658 1.7-1.477 2.323-2.41z",t='a[href="/notifications"][role="link"]',n='svg[class="r-4qtqp9 r-yyyyoo r-dnmrzs r-lrvibr r-m6rgpd r-1p0dtai r-1nao33i r-wy61xf r-zchlnj r-1d2f490 r-ywje51 r-u8s1d r-ipm5af r-1blnp2b"] path';let r=!1,o=!1;const i="bringTwitterBack.loggingEnabled";function s(e){return new Promise((t=>setTimeout(t,e)))}function a(e){"true"==localStorage.getItem(i)&&console.log(e)}function l(e="icons/favicon.ico"){const t=document.getElementsByTagName("link");for(let e=0;e<t.length;e++)t[e].getAttribute("rel")&&"shortcut icon"==t[e].getAttribute("rel")&&t[e].remove();const n=document.querySelectorAll('div[dir="ltr"][aria-live="polite"]');if(0==n.length)return a("divElements not found");a("divElements found");const r=/^(\\d+)\\+?\\sunread\\sitems$/;for(let t=0;t<n.length;t++){const o=n[t].getAttribute("aria-label");n&&o&&r.test(o)&&(e="../icons/favicon-notification.ico")}const o="undefined"!=typeof chrome?chrome.runtime.getURL(e):browser.runtime.getURL(e),i=document.createElement("link");i.setAttribute("rel","shortcut icon"),i.setAttribute("href",o),document.head.appendChild(i)}function d(){let e=document.querySelector("title");if(!e)return a("titleElement not found");a("titleElement found");let t=e.textContent;t&&t.includes("X")&&(t.includes(" / X")?t=t.replace(" / X"," / Twitter"):"X"==t&&(t=t.replace("X","Twitter")),t.includes(" on X: ")&&(t=t.replace(" on X: "," on Twitter: ")),t.includes("X. It’s what’s happening")&&(t=t.replace("X. It’s what’s happening","Twitter. It’s what’s happening")),document.title=t)}function c(){const t=document.querySelector(n);t?(a("loadingLogo found"),t&&t.setAttribute("d",e)):a("loadingLogo not found")}localStorage.getItem(i)||localStorage.setItem(i,"false");const u=new MutationObserver(((i,s)=>{for(let s of i){const i=document.querySelector('path[d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"]');if(i&&i.parentElement&&i.parentElement.parentElement){const t=i.parentElement.parentElement;t.getElementsByTagName("path")[0].setAttribute("d",e),t.setAttribute("viewBox","0 0 24 24"),"rgb(255, 255, 255)"==document.body.style.backgroundColor&&t.setAttribute("style","color: #1D9BF0;")}document.querySelector(t)&&(r||(h.observe(document.querySelector(t),{childList:!0,subtree:!0}),r=!0)),document.querySelector(n)&&(o||(g.observe(document.querySelector(n),{childList:!0,subtree:!0}),o=!0,a("Started logo observer")));const s=document.querySelectorAll('a[href="/compose/post"]');if(s)for(const e of s){const e=document.getElementsByTagName("span");for(const t of e)"Post"==t.textContent&&(t.textContent="Tweet")}const l=document.querySelector('[data-testid="tweetButtonInline"]');if(l){const e=l.getElementsByTagName("span")[1];e&&"Post"==e.textContent&&(e.textContent="Tweet")}const d=document.querySelector('button[data-testid="tweetButton"]');if(d){const e=d.getElementsByTagName("span")[1];e&&e&&"Post"==e.textContent&&(e.textContent="Tweet")}const c=document.querySelector('div[data-testid="retweetConfirm"]');if(c){const e=c.getElementsByTagName("span")[0];e&&"Repost"==e.textContent&&(e.textContent="Retweet")}const u=document.querySelector('div[data-viewportview="true"]'),p=document.querySelector('div[role="group"]');if(!u&&p){const e=p.getElementsByTagName("span")[3];e&&"Reposts"==e.textContent&&(e.textContent="Retweets")}const m=document.querySelector('a[role="tab"]');if(m){const e=m.querySelector("span");e&&"Posts"==e.textContent&&(e.textContent="Tweets")}const b=document.querySelectorAll('h2[dir="ltr"][aria-level="2"][role="heading"]');if(b&&b[1]){const e=b[1].getElementsByTagName("span")[0];e&&"Post"==e.textContent&&(e.textContent="Tweet")}const v=document.querySelectorAll('[class="css-146c3p1 r-bcqeeo r-1ttztb7 r-qvutc0 r-1qd0xha r-a023e6 r-rjixqe r-b88u0q"]');if(v)for(const e of v){const t=e.childNodes[0];switch(t.textContent){case"Repost":t.textContent="Retweet";break;case"Quote":t.textContent="Quote Tweet";break;case"View Quotes":t.textContent=t.textContent.replace("View Quotes","View Retweets")}}const f=document.querySelector('nav[class="css-175oi2r r-18u37iz r-1w6e6rj r-3pj75a r-1777fci r-1mmae3n"]');if(f)for(const e of f.childNodes)e.textContent&&e.textContent.includes("X")&&(e.textContent=e.textContent.replace("X","Twitter"));const y=document.querySelector('div[class="css-146c3p1 r-bcqeeo r-1ttztb7 r-qvutc0 r-1qd0xha r-n6v787 r-1cwl3u0 r-16dba41 r-5oul0u r-knv0ih"]');y&&y.textContent&&y.textContent.includes("X")&&(y.textContent=y.textContent.replaceAll("X","Twitter"));const x=document.querySelector('div[role="alert"][data-testid="toast"]');if(x){const e=x.getElementsByTagName("span")[0];if(!e||!e.textContent)continue;e.textContent.includes("post")&&(e.textContent=e.textContent.replace("post","tweet"))}const w=document.querySelector('div[aria-label="Timeline: Your Home Timeline"]');if(w){console.log("ayo");const e=w.getElementsByTagName("span");0==e.length?a("No timeline buttons"):(console.log("hi"),e[0].textContent&&e[0].textContent.includes("posts")&&(e[0].textContent=e[0].textContent.replace("posts","tweets")))}}})),h=new MutationObserver(((e,t)=>{for(let t of e)l()}));const p=new MutationObserver(((e,t)=>{for(let t of e)document.querySelector("title")&&(m.observe(document.querySelector("title"),{childList:!0}),p.disconnect())})),m=new MutationObserver(((e,t)=>{for(let t of e)m.disconnect(),d(),m.observe(document.querySelector("title"),{childList:!0})})),g=new MutationObserver(((t,r)=>{for(let r of t){c();const t=document.querySelector(n);t?t&&t.getAttribute("d")==e?(a("Logo is Twitter logo"),g.disconnect()):a("Logo has no path"):a("Logo is not Twitter logo")}}));(async()=>{for(;;){if(document.body){a("Document body found"),u.observe(document.body,{childList:!0,subtree:!0}),p.observe(document.head,{childList:!0,subtree:!0}),a("Observers started");break}await s(100)}})(),l(),d(),c()},stop(){console.log("Bring Twitter Back extension has been stopped."),this.bodyObserver&&this.bodyObserver.disconnect(),this.notificationObserver&&this.notificationObserver.disconnect(),this.metaObserver&&this.metaObserver.disconnect(),this.titleObserver&&this.titleObserver.disconnect(),this.loadingLogoObserver&&this.loadingLogoObserver.disconnect()}})},580:(e,t,n)=>{"use strict";n.r(t),n.d(t,{default:()=>a});var r=n(775);let o;function i(e,t){e.classList&&e.classList.contains(t)&&e.classList.remove(t);for(let n of e.children)i(n,t)}function s(){const e=document.querySelector('[data-testid="DMDrawer"]');if(e){e.classList.remove("r-hvns9x"),i(e,"r-1ye8kvj");const t=e.querySelector("div");t&&!e.hasResizers&&(function(e,t){function n(t){const n=document.createElement("div");return n.style.position="absolute","horizontal"===t?(n.style.width="10px",n.style.height="100%",n.style.left="-5px",n.style.top="0",n.style.cursor="col-resize"):(n.style.width="100%",n.style.height="10px",n.style.left="0",n.style.top="-5px",n.style.cursor="row-resize"),e.appendChild(n),n}const r=n("horizontal"),o=n("vertical");let i,s,a,l;function d(n,r){n.stopPropagation(),n.preventDefault(),r?(i=n.clientX,a=parseInt(getComputedStyle(e).width,10),document.addEventListener("mousemove",c,!1)):(s=n.clientY,l=parseInt(getComputedStyle(t).maxHeight,10),document.addEventListener("mousemove",u,!1)),document.addEventListener("mouseup",h,!1)}function c(t){const n=i-t.clientX,r=a+n;e.style.minHeight="53px",r<=900&&(e.style.width=`${r}px`,localStorage.setItem("dmDrawerWidth",r))}function u(e){const n=s-e.clientY,r=l+n;r<=740&&(t.style.maxHeight=`${r}px`,localStorage.setItem("dmDrawerHeight",r)),t.style.minHeight="53px"}function h(){document.removeEventListener("mousemove",c,!1),document.removeEventListener("mousemove",u,!1),document.removeEventListener("mouseup",h,!1)}r.addEventListener("mousedown",(e=>d(e,!0)),!1),o.addEventListener("mousedown",(e=>d(e,!1)),!1);const p=localStorage.getItem("dmDrawerWidth"),m=localStorage.getItem("dmDrawerHeight");p&&(e.style.width=`${p}px`),m&&(t.style.maxHeight=`${m}px`)}(e,t),e.hasResizers=!0)}}const a=(0,n(467).A)({name:"DMDrawerResizer",description:"Makes the DM drawer resizable and persistent across sessions.",authors:[r.n.Mopi,r.n.TPM28],start(){!function(){const e=document.querySelector('button[aria-label="Collapse"]');e&&e.click()}(),s(),o=new MutationObserver((e=>{for(let t of e)if("childList"===t.type||"subtree"===t.type){s();break}})),o.observe(document.body,{childList:!0,subtree:!0})},stop(){o&&o.disconnect()}})},779:(e,t,n)=>{"use strict";n.r(t),n.d(t,{default:()=>d});var r=n(775);let o,i;function s(e){if(!e.parentNode.querySelector("#tweet-timer")){const t=document.createElement("div");t.id="tweet-timer",t.style.color="rgb(29, 155, 240)",t.style.fontSize="14px",t.style.fontWeight="700",t.style.fontFamily="TwitterChirp, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica, Arial, sans-serif",t.style.marginTop="10px",e.parentNode.insertBefore(t,e.nextSibling),function(e){let t;i=setInterval((function(){const n=document.querySelector('[data-testid="tweetButton"], [data-testid="tweetButtonInline"]');n&&!n.disabled?t||function(){let n=10;e.textContent=`Time remaining: ${n} seconds`,t=setInterval((()=>{if(n--,e.textContent=`Time remaining: ${n} seconds`,n<0){clearInterval(t),t=null,e.textContent="Time's up!";const n=document.querySelector('[data-testid="tweetButton"], [data-testid="tweetButtonInline"]');n&&n.click()}}),1e3)}():t&&(clearInterval(t),t=null,e.textContent="")}),500)}(t)}}function a(){let e=document.querySelector('[data-testid="tweetTextarea_0"]');e&&!e.parentNode.querySelector("#tweet-timer")&&s(e)}function l(){document.body?(o=new MutationObserver((e=>{for(let t of e)"childList"===t.type&&a()})),o.observe(document.body,{childList:!0,subtree:!0}),a()):window.addEventListener("DOMContentLoaded",l)}const d=(0,n(467).A)({name:"DontOverthink",description:"Adds a timer to automatically send tweets after 10 seconds",authors:[r.n.Mopi,r.n.TPM28],start(){l()},stop(){o&&o.disconnect(),i&&clearInterval(i);const e=document.querySelector("#tweet-timer");e&&e.remove(),window.removeEventListener("DOMContentLoaded",l)}})},911:(e,t,n)=>{"use strict";n.r(t),n.d(t,{default:()=>o});var r=n(775);const o=(0,n(467).A)({name:"GifFavorites",description:"Add favorites like on discord",authors:[r.n.Mopi,r.n.TPM28],start(){let e,t={};const n={display_name:"★ Favorites",id:"_favorites_",thumbnail_images:[{url:"",width:0,height:0,byte_count:0,still_image_url:""}],original_image:{url:"",width:0,height:0,byte_count:0,still_image_url:""},object_type:"group"};function r(){const e=JSON.parse(localStorage.getItem("xcomGifFavorites")||"{}");document.querySelectorAll('div[data-testid="gifSearchGifImage"]').forEach((t=>{if(t.querySelector(".gif-favorite-star"))return;const n=t.querySelector("img");if(!n)return;const r=n.src;let o=!1;if(r.startsWith("https://media.tenor.com/")){const t=r.match(/^(https:\/\/media\.tenor\.com\/[^/]+AAAA)/);t&&(o=Object.values(e).some((e=>e.startsWith(t[1]))))}else if(r.match(/^https:\/\/media\d+\.giphy\.com\//)){const t=r.match(/^(https:\/\/media\d+\.giphy\.com\/media\/[^/]+)/);t&&(o=Object.values(e).some((e=>e.startsWith(t[1]))))}const i=function(e){const t=document.createElement("div");t.style.cssText="\n                position: absolute;\n                top: 5px;\n                right: 5px;\n                width: 40px;\n                height: 40px;\n                background-color: rgba(0, 0, 0, 0.3);\n                border-radius: 50%;\n                display: flex;\n                justify-content: center;\n                align-items: center;\n                cursor: pointer;\n                z-index: 10;\n                user-select: none;\n                -webkit-user-select: none;\n            ";const n=document.createElement("div");return n.innerHTML="★",n.style.cssText=`\n                font-size: 30px;\n                color: ${e?"gold":"white"};\n            `,t.appendChild(n),t}(o);i.classList.add("gif-favorite-star"),i.addEventListener("click",(e=>{e.stopPropagation(),e.preventDefault();const t=JSON.parse(localStorage.getItem("xcomGifFavorites")||"{}"),o=i.querySelector("div");let s;if(r.startsWith("https://media.tenor.com/")){const e=r.match(/^(https:\/\/media\.tenor\.com\/[^/]+AAAA)/)[1];s=Object.keys(t).find((n=>t[n].startsWith(e)))}else if(r.match(/^https:\/\/media\d+\.giphy\.com\//)){const e=r.match(/^(https:\/\/media\d+\.giphy\.com\/media\/[^/]+)/)[1];s=Object.keys(t).find((n=>t[n].startsWith(e)))}if(s)delete t[s],o.style.color="white";else{const e=n.alt||"Untitled GIF";t[e]=r,o.style.color="gold"}localStorage.setItem("xcomGifFavorites",JSON.stringify(t))})),t.style.position="relative",t.appendChild(i)}))}var o;o=XMLHttpRequest.prototype,t.open=o.open,t.send=o.send,o.open=function(e,n){return this._method=e,this._url=n,t.open.apply(this,arguments)},o.send=function(){this._startTime=(new Date).getTime();var e=this,r=this.onreadystatechange;return this.onreadystatechange=function(){if(4===e.readyState)if(e._url.includes("/foundmedia/categories.json"))try{var t=JSON.parse(e.responseText);t.data&&Array.isArray(t.data.groups)&&(t.data.groups.unshift(n),Object.defineProperty(e,"responseText",{writable:!0,value:JSON.stringify(t)}))}catch(e){console.error("Error modifying categories response:",e)}else if(e._url.includes("/foundmedia/categories/_favorites_.json"))try{var o=function(){const e=JSON.parse(localStorage.getItem("xcomGifFavorites")||"{}"),t=Object.entries(e).map((([e,t])=>{let n={name:"unknown",display_name:"Unknown",icon_images:[]},r=`unknown_${Math.random().toString(36).substr(2,9)}`;return t.includes("giphy.com")?(n={name:"giphy",display_name:"GIPHY",icon_images:[]},r=`giphy_${Math.random().toString(36).substr(2,9)}`,t=t.replace(/\/200_.+$/,"/giphy.gif")):t.includes("tenor.com")&&(n={name:"riffsy",display_name:"Tenor",icon_images:[]},r=`riffsy_${Math.random().toString(36).substr(2,9)}`,t=t.replace(/AAAA.{1}\/[^\/]*/,"AAAAC/")),{provider:n,item_type:"gif",id:r,found_media_origin:{provider:n.name,id:r.split("_")[1]},url:t,thumbnail_images:[{url:t,width:200,height:200,byte_count:0,still_image_url:t}],original_image:{url:t,width:480,height:480,byte_count:0,still_image_url:t},preview_image:{url:t,width:480,height:480,byte_count:0,still_image_url:t},alt_text:e,object_type:"item"}}));return console.log(t),{data:{items:t}}}();Object.defineProperty(e,"responseText",{writable:!0,value:JSON.stringify(o)})}catch(e){console.error("Error creating favorites response:",e)}if(r)return r.apply(this,arguments)},t.send.apply(this,arguments)},e=new MutationObserver((e=>{for(const t of e)"childList"===t.type&&r()})),e.observe(document.body,{childList:!0,subtree:!0}),r()},stop(){originalXHR.open&&originalXHR.send&&(XMLHttpRequest.prototype.open=originalXHR.open,XMLHttpRequest.prototype.send=originalXHR.send),observer&&observer.disconnect(),document.querySelectorAll(".gif-favorite-star").forEach((e=>e.remove()))}})},682:(e,t,n)=>{"use strict";n.r(t),n.d(t,{default:()=>i});var r=n(775),o=n(467);const i=(0,o.A)({name:"MenuReorder",description:"Allows reordering of menu items in the navigation bar",authors:[r.n.TPM28],draggedElement:null,menuItems:[],nav:null,dropIndicator:null,STORAGE_KEY:"customMenuOrder",observer:null,start(){this.initPlugin(),this.addPageChangeListener()},stop(){this.cleanUp()},initPlugin(){this.observer=new MutationObserver((e=>{for(let t of e)if("childList"===t.type){const e=document.querySelector('nav[role="navigation"][class*="r-eqz5dr"]');if(e){this.observer.disconnect(),this.initializePlugin(e);break}}})),this.observer.observe(document.body,{childList:!0,subtree:!0})},addPageChangeListener(){window.addEventListener("popstate",this.handlePageChange.bind(this));const e=history.pushState;history.pushState=function(){e.apply(history,arguments),dispatchEvent(new Event("pushstate"))},window.addEventListener("pushstate",this.handlePageChange.bind(this))},handlePageChange(){this.cleanUp(),this.initPlugin()},initializePlugin(e){this.nav=e,this.createDropIndicator(),this.updateMenuItems(),this.restoreOrder(),window.addEventListener("resize",this.updateMenuItems.bind(this)),this.nav.addEventListener("dragover",this.dragOver.bind(this)),this.nav.addEventListener("drop",this.drop.bind(this))},cleanUp(){this.observer&&this.observer.disconnect(),this.dropIndicator?.remove(),window.removeEventListener("resize",this.updateMenuItems.bind(this)),this.nav?.removeEventListener("dragover",this.dragOver.bind(this)),this.nav?.removeEventListener("drop",this.drop.bind(this)),this.menuItems.forEach((e=>{e.removeEventListener("dragstart",this.dragStart.bind(this)),e.removeEventListener("dragend",this.dragEnd.bind(this)),e.removeAttribute("draggable")}))},createDropIndicator(){this.dropIndicator=document.createElement("div"),this.dropIndicator.style.position="absolute",this.dropIndicator.style.height="2px",this.dropIndicator.style.backgroundColor="#1DA1F2",this.dropIndicator.style.display="none",this.dropIndicator.style.zIndex="9999",this.dropIndicator.style.pointerEvents="none",document.body.appendChild(this.dropIndicator)},updateMenuItems(){this.menuItems=Array.from(this.nav.querySelectorAll("a, button")),this.menuItems.forEach(((e,t)=>{e.setAttribute("draggable","true"),e.id=`menu-item-${t}`,e.classList.add("menu-item"),e.removeEventListener("dragstart",this.dragStart.bind(this)),e.removeEventListener("dragend",this.dragEnd.bind(this)),e.addEventListener("dragstart",this.dragStart.bind(this)),e.addEventListener("dragend",this.dragEnd.bind(this))}))},getLastPathSegment(e){const t=new URL(e).pathname;return t.substring(t.lastIndexOf("/"))},saveOrder(){const e=this.menuItems.map((e=>{const t=e.getAttribute("data-testid"),n=e.href?this.getLastPathSegment(e.href):null;return t||n}));localStorage.setItem(this.STORAGE_KEY,JSON.stringify(e))},restoreOrder(){const e=JSON.parse(localStorage.getItem(this.STORAGE_KEY));e&&e.forEach((e=>{const t=this.menuItems.find((t=>{const n=t.getAttribute("data-testid"),r=t.href?this.getLastPathSegment(t.href):null;return n===e||r===e}));t&&this.nav.appendChild(t)}))},dragStart(e){this.draggedElement=e.target,e.dataTransfer.effectAllowed="move",e.dataTransfer.setData("text/plain",e.target.id),setTimeout((()=>{this.draggedElement.style.opacity="0.5"}),0)},dragOver(e){e.preventDefault();const t=this.getClosestMenuItem(e.clientY);if(t&&t!==this.draggedElement){const n=t.getBoundingClientRect(),r=n.top+n.height/2;e.clientY<r?this.dropIndicator.style.top=n.top-1+"px":this.dropIndicator.style.top=n.bottom-1+"px",this.dropIndicator.style.left=`${n.left}px`,this.dropIndicator.style.width=`${n.width}px`,this.dropIndicator.style.display="block"}else this.dropIndicator.style.display="none"},drop(e){e.preventDefault(),this.dropIndicator.style.display="none";const t=this.getClosestMenuItem(e.clientY);if(t&&t!==this.draggedElement){const n=t.getBoundingClientRect(),r=n.top+n.height/2;e.clientY<r?this.nav.insertBefore(this.draggedElement,t):this.nav.insertBefore(this.draggedElement,t.nextSibling),this.updateMenuItems(),this.saveOrder()}},dragEnd(e){this.draggedElement.style.opacity="1",this.dropIndicator.style.display="none",this.draggedElement=null},getClosestMenuItem(e){return this.menuItems.reduce(((t,n)=>{const r=n.getBoundingClientRect(),o=Math.abs(e-(r.top+r.height/2));return o<t.offset?{offset:o,element:n}:t}),{offset:Number.POSITIVE_INFINITY}).element},settings:{enabled:{type:o.C.BOOLEAN,default:!0,description:"Enable menu reordering"}}})},590:(e,t,n)=>{"use strict";n.r(t),n.d(t,{default:()=>o});var r=n(775);const o=(0,n(467).A)({name:"NoTrending",description:"Removes the trending sections",authors:[r.n.Mopi],removedElements:[],observer:null,start(){const e=()=>{document.querySelectorAll('div[data-testid="sidebarColumn"] section[aria-labelledby]').forEach((e=>{if(e.querySelector('h1[dir="auto"][role="heading"]')){const t=e.parentNode,n=e.nextSibling;t.removeChild(e),this.removedElements.push({element:e,parent:t,nextSibling:n})}}));const e=document.querySelector('div[aria-label^="Timeline:"][role="region"]');if(e){const t=e.parentNode,n=e.nextSibling;t.removeChild(e),this.removedElements.push({element:e,parent:t,nextSibling:n})}const t=document.querySelector('div[aria-label][role="region"]');if(t){const e=t.parentNode,n=t.nextSibling;e.removeChild(t),this.removedElements.push({element:t,parent:e,nextSibling:n})}};e(),this.observer=new MutationObserver((t=>{for(let n of t)"childList"===n.type&&e()})),this.observer.observe(document.body,{childList:!0,subtree:!0})},stop(){this.observer&&this.observer.disconnect(),this.removedElements.forEach((({element:e,parent:t,nextSibling:n})=>{n?t.insertBefore(e,n):t.appendChild(e)})),this.removedElements=[]}})},692:(e,t,n)=>{var r={"./AdBlocker/index.js":117,"./BringTwitterBack/index.js":932,"./DMDrawerResizer/index.js":580,"./DontOverthink/index.js":779,"./GifFavorites/index.js":911,"./MenuReorder/index.js":682,"./NoTrending/index.js":590};function o(e){var t=i(e);return n(t)}function i(e){if(!n.o(r,e)){var t=new Error("Cannot find module '"+e+"'");throw t.code="MODULE_NOT_FOUND",t}return r[e]}o.keys=function(){return Object.keys(r)},o.resolve=i,e.exports=o,o.id=692},775:(e,t,n)=>{"use strict";n.d(t,{n:()=>r});const r={Mopi:{name:"Mopi",handle:"MopigamesYT"},TPM28:{name:"TPM28",handle:"tpm_28"}}},467:(e,t,n)=>{"use strict";n.d(t,{A:()=>o,C:()=>r});const r={BOOLEAN:"BOOLEAN",SELECT:"SELECT",STRING:"STRING"};function o(e){return{...e,settings:e.settings||{}}}}},t={};function n(r){var o=t[r];if(void 0!==o)return o.exports;var i=t[r]={exports:{}};return e[r](i,i.exports,n),i.exports}n.d=(e,t)=>{for(var r in t)n.o(t,r)&&!n.o(e,r)&&Object.defineProperty(e,r,{enumerable:!0,get:t[r]})},n.o=(e,t)=>Object.prototype.hasOwnProperty.call(e,t),n.r=e=>{"undefined"!=typeof Symbol&&Symbol.toStringTag&&Object.defineProperty(e,Symbol.toStringTag,{value:"Module"}),Object.defineProperty(e,"__esModule",{value:!0})},(()=>{"use strict";class e{constructor(){this.plugins=[],this.uiElements={}}async loadPlugins(){const e=n(692);for(const t of e.keys()){const n=await e(t);n.default&&"object"==typeof n.default&&(this.plugins.push(n.default),console.log(n.default.name,"loaded"))}this.loadPluginStates()}loadPluginStates(){const e=JSON.parse(localStorage.getItem("betterXPluginStates"))||{};this.plugins.forEach((t=>{e.hasOwnProperty(t.name)&&(t.enabled=e[t.name])}))}savePluginStates(){const e={};this.plugins.forEach((t=>{e[t.name]=t.enabled})),localStorage.setItem("betterXPluginStates",JSON.stringify(e))}togglePlugin(e){const t=this.plugins.find((t=>t.name===e));t&&(t.enabled=!t.enabled,t.enabled&&"function"==typeof t.start?t.start():t.enabled||"function"!=typeof t.stop||t.stop(),this.savePluginStates())}applyPatches(e){console.log("Applying patches:",e)}}class t{constructor(e){this.pluginManager=e,this.observer=null}createUIElement(e,t){const n=document.createElement(e);return Object.assign(n,t),n}createSettingsModal(){const e=this.createUIElement("div",{id:"betterx-settings-modal",className:"betterx-modal",innerHTML:'\n          <div class="betterx-modal-content">\n            <div class="betterx-modal-header">\n              <h2>BetterX Settings</h2>\n              <span class="betterx-close">&times;</span>\n            </div>\n            <div class="betterx-modal-body">\n              <div id="betterx-plugin-list"></div>\n            </div>\n          </div>\n        '});return e.querySelector(".betterx-close").onclick=()=>{e.style.display="none"},window.onclick=t=>{t.target==e&&(e.style.display="none")},this.populatePluginList(e.querySelector("#betterx-plugin-list")),e}getAuthorNames(e){return e&&0!==e.length?e.map((e=>"string"==typeof e?this.pluginManager.Devs[e]?.name||e:e.name||"Unknown")).join(", "):"Unknown"}populatePluginList(e){this.pluginManager.plugins.forEach((t=>{const n=this.getAuthorNames(t.authors),r=this.createUIElement("div",{className:"betterx-plugin-item",innerHTML:`\n              <div class="betterx-plugin-header">\n                <div class="betterx-plugin-info">\n                  <h3>${t.name}</h3>\n                  <p>${t.description||"No description available."}</p>\n                </div>\n                <div class="betterx-plugin-controls">\n                  <label class="betterx-switch">\n                    <input type="checkbox" ${t.enabled?"checked":""}>\n                    <span class="betterx-slider"></span>\n                  </label>\n                  <button class="betterx-details-toggle">\n                    <svg viewBox="0 0 24 24" class="betterx-arrow-icon">\n                      <path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"></path>\n                    </svg>\n                  </button>\n                </div>\n              </div>\n              <div class="betterx-plugin-details" style="display: none;">\n                <p>Author${t.authors.length>1?"s":""}: ${n}</p>\n              </div>\n            `});r.querySelector('input[type="checkbox"]').addEventListener("change",(()=>{this.pluginManager.togglePlugin(t.name)}));const o=r.querySelector(".betterx-details-toggle"),i=r.querySelector(".betterx-plugin-details");o.addEventListener("click",(()=>{i.style.display="none"===i.style.display?"block":"none",o.classList.toggle("rotated")})),e.appendChild(r)}))}createBetterXTab(){const e=document.createElement("div");e.setAttribute("class","css-175oi2r"),e.setAttribute("data-testid","BetterX");const t=document.createElement("a");t.setAttribute("href","#"),t.setAttribute("role","tab"),t.setAttribute("aria-selected","false"),t.setAttribute("class","css-175oi2r r-1wtj0ep r-16x9es5 r-1mmae3n r-o7ynqc r-6416eg r-1ny4l3l r-1loqt21"),t.style.paddingRight="16px",t.style.paddingLeft="16px";const n=document.createElement("div");n.setAttribute("class","css-175oi2r r-1awozwy r-18u37iz r-16y2uox");const r=document.createElement("div");r.setAttribute("class","css-175oi2r r-16y2uox r-1wbh5a2");const o=document.createElement("div");o.setAttribute("dir","ltr"),o.setAttribute("class","css-146c3p1 r-bcqeeo r-1ttztb7 r-qvutc0 r-37j5jr r-a023e6 r-rjixqe r-16dba41"),o.style.textOverflow="unset",o.style.color="rgb(231, 233, 234)";const i=document.createElement("span");i.setAttribute("class","css-1jxf684 r-bcqeeo r-1ttztb7 r-qvutc0 r-poiln3"),i.style.textOverflow="unset",i.textContent="BetterX";const s=document.createElementNS("http://www.w3.org/2000/svg","svg");s.setAttribute("viewBox","0 0 24 24"),s.setAttribute("aria-hidden","true"),s.setAttribute("class","r-4qtqp9 r-yyyyoo r-1xvli5t r-dnmrzs r-bnwqim r-lrvibr r-m6rgpd r-1bwzh9t r-1q142lx r-2dysd3");const a=document.createElementNS("http://www.w3.org/2000/svg","path");return a.setAttribute("d","M14.586 12L7.543 4.96l1.414-1.42L17.414 12l-8.457 8.46-1.414-1.42L14.586 12z"),s.appendChild(a),o.appendChild(i),r.appendChild(o),n.appendChild(r),n.appendChild(s),t.appendChild(n),e.appendChild(t),e}addBetterXTab(){const e=document.querySelector('div[class="css-175oi2r"][role="tablist"]');if(e&&!document.querySelector('[data-testid="BetterX"]')){const t=this.createBetterXTab();e.appendChild(t),t.querySelector("a").addEventListener("click",(e=>{e.preventDefault(),this.settingsModal.style.display="block"}))}}injectBetterXUI(){this.settingsModal=this.createSettingsModal(),document.body.appendChild(this.settingsModal),this.addBetterXTab(),setInterval((()=>this.addBetterXTab()),1e3),this.observer=new MutationObserver((e=>{e.forEach((e=>{"childList"===e.type&&this.addBetterXTab()}))})),this.observer.observe(document.body,{childList:!0,subtree:!0});const e=this.createUIElement("style",{textContent:'\n          .betterx-modal {\n            display: none;\n            position: fixed;\n            z-index: 10000;\n            left: 0;\n            top: 0;\n            width: 100%;\n            height: 100%;\n            background-color: rgba(91, 112, 131, 0.4);\n            font-family: "Segoe UI", Arial, sans-serif;\n            overflow-y: auto;\n          }\n          .betterx-modal-content {\n            background-color: #15202b;\n            margin: 5vh auto;\n            padding: 20px;\n            border: 1px solid #38444d;\n            border-radius: 16px;\n            width: 90%;\n            max-width: 600px;\n            max-height: 90vh;\n            overflow-y: auto;\n            color: #ffffff;\n          }\n          .betterx-modal-header {\n            display: flex;\n            justify-content: space-between;\n            align-items: center;\n            margin-bottom: 20px;\n            position: sticky;\n            top: 0;\n            background-color: #15202b;\n            padding: 10px 0;\n            z-index: 1;\n          }\n          .betterx-modal-header h2 {\n            margin: 0;\n            font-size: 20px;\n            font-weight: bold;\n          }\n          .betterx-close {\n            color: #8899a6;\n            font-size: 28px;\n            font-weight: bold;\n            cursor: pointer;\n          }\n          .betterx-close:hover {\n            color: #ffffff;\n          }\n          .betterx-plugin-item {\n            border-bottom: 1px solid #38444d;\n            padding: 15px 0;\n          }\n          .betterx-plugin-header {\n            display: flex;\n            justify-content: space-between;\n            align-items: center;\n          }\n          .betterx-plugin-info {\n            flex-grow: 1;\n          }\n          .betterx-plugin-info h3 {\n            margin: 0 0 5px 0;\n            font-size: 16px;\n          }\n          .betterx-plugin-info p {\n            margin: 0;\n            font-size: 14px;\n            color: #8899a6;\n          }\n          .betterx-plugin-controls {\n            display: flex;\n            align-items: center;\n          }\n          .betterx-switch {\n            position: relative;\n            display: inline-block;\n            width: 48px;\n            height: 24px;\n            flex-shrink: 0;\n            margin-right: 10px;\n          }\n          .betterx-switch input {\n            opacity: 0;\n            width: 0;\n            height: 0;\n          }\n          .betterx-slider {\n            position: absolute;\n            cursor: pointer;\n            top: 0;\n            left: 0;\n            right: 0;\n            bottom: 0;\n            background-color: #38444d;\n            transition: .4s;\n            border-radius: 24px;\n          }\n          .betterx-slider:before {\n            position: absolute;\n            content: "";\n            height: 18px;\n            width: 18px;\n            left: 3px;\n            bottom: 3px;\n            background-color: #15202b;\n            transition: .4s;\n            border-radius: 50%;\n          }\n          input:checked + .betterx-slider {\n            background-color: #1da1f2;\n          }\n          input:checked + .betterx-slider:before {\n            transform: translateX(24px);\n          }\n          .betterx-details-toggle {\n            background: none;\n            border: none;\n            cursor: pointer;\n            padding: 5px;\n          }\n          .betterx-arrow-icon {\n            width: 24px;\n            height: 24px;\n            fill: #8899a6;\n            transition: transform 0.3s ease;\n          }\n          .betterx-details-toggle.rotated .betterx-arrow-icon {\n            transform: rotate(180deg);\n          }\n          .betterx-plugin-details {\n            margin-top: 10px;\n            padding: 10px;\n            background-color: #192734;\n            border-radius: 8px;\n          }\n          .betterx-plugin-details p {\n            margin: 5px 0;\n            font-size: 14px;\n          }\n  \n          @media screen and (max-width: 480px) {\n            .betterx-modal-content {\n              width: 95%;\n              margin: 2vh auto;\n              padding: 15px;\n            }\n            .betterx-modal-header h2 {\n              font-size: 18px;\n            }\n            .betterx-plugin-info h3 {\n              font-size: 14px;\n            }\n            .betterx-plugin-info p {\n              font-size: 12px;\n            }\n          }\n  \n          @media screen and (max-height: 600px) {\n            .betterx-modal-content {\n              margin: 2vh auto;\n              max-height: 96vh;\n            }\n          }\n        '});document.head.appendChild(e)}}!async function(){const n=new e;await n.loadPlugins(),n.plugins.forEach((e=>{e.enabled&&"function"==typeof e.start&&e.start(),e.enabled&&Array.isArray(e.patches)&&n.applyPatches(e.patches)})),new t(n).injectBetterXUI(),window.BetterX={plugins:n.plugins,togglePlugin:e=>n.togglePlugin(e)},console.log("BetterX loaded with plugins:",n.plugins.map((e=>`${e.name} (${e.enabled?"enabled":"disabled"})`)))}()})()})();