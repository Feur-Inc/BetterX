// Adapted from the desktop notification patch; runs in the page main world.
export const PUSH_NOTIFICATIONS_PATCH = `(function () {
  var host = window.location.hostname.toLowerCase();
  var isPushTargetHost =
    host === 'x.com' ||
    host === 'twitter.com' ||
    host.endsWith('.x.com') ||
    host.endsWith('.twitter.com');

  if (!isPushTargetHost) return;

  var PUSH_DIAG_TAG = '[BetterXDesktop][push-diag]';
  var PUSH_DIAG_FLAG = '__betterxDesktopPushDiagInstalled';
  var PUSH_URL_HINTS = [
    'notifications/settings/login.json',
    'notifications/settings/checkin.json',
    'notifications/settings/logout.json',
    'push_notifications',
    'web_push',
    'service_worker',
    'push/register',
    'i/api/1.1/notifications/settings'
  ];

  function hasDesktopPushBridge() {
    return Boolean(
      window.betterxDesktopPush &&
      typeof window.betterxDesktopPush.getSubscription === 'function' &&
      typeof window.betterxDesktopPush.subscribe === 'function' &&
      typeof window.betterxDesktopPush.unsubscribe === 'function'
    );
  }

  function normalizeBase64Url(value) {
    return String(value || '').replace(/\\+/g, '-').replace(/\\//g, '_').replace(/=+$/g, '');
  }

  function padBase64Url(value) {
    var normalized = normalizeBase64Url(value);
    var missing = normalized.length % 4;
    if (missing === 0) return normalized;
    return normalized + '='.repeat(4 - missing);
  }

  function appServerKeyToBase64Url(value) {
    if (!value) return '';
    var bytes;
    if (value instanceof ArrayBuffer) {
      bytes = new Uint8Array(value);
    } else if (typeof ArrayBuffer !== 'undefined' && typeof ArrayBuffer.isView === 'function' && ArrayBuffer.isView(value)) {
      bytes = new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
    } else {
      return normalizeBase64Url(String(value));
    }

    var binary = '';
    for (var i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }

    return normalizeBase64Url(btoa(binary));
  }

  function base64UrlToBytes(value) {
    if (!value) return new Uint8Array(0);
    var padded = padBase64Url(value);
    var standard = padded.replace(/-/g, '+').replace(/_/g, '/');
    var binary = atob(standard);
    var bytes = new Uint8Array(binary.length);
    for (var i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }

  function bytesToArrayBuffer(bytes) {
    return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
  }

  function resolvePushScope() {
    if (!('serviceWorker' in navigator)) {
      return Promise.resolve(window.location.origin + '/');
    }

    return navigator.serviceWorker.getRegistration().then(function (registration) {
      if (registration && registration.scope) {
        return registration.scope;
      }
      return window.location.origin + '/';
    }).catch(function () {
      return window.location.origin + '/';
    });
  }

  function createSyntheticSubscription(data) {
    var payload = data || {};
    var endpoint = String(payload.endpoint || '');
    var p256dh = normalizeBase64Url(payload.p256dh || '');
    var auth = normalizeBase64Url(payload.auth || '');
    var scope = String(payload.scope || window.location.origin + '/');
    var appServerKey = normalizeBase64Url(payload.appServerKey || '');

    var toJSON = function () {
      return {
        endpoint: endpoint,
        expirationTime: null,
        keys: {
          p256dh: p256dh,
          auth: auth
        }
      };
    };

    if (typeof PushSubscription === 'undefined') {
      return {
        endpoint: endpoint,
        expirationTime: null,
        options: {
          userVisibleOnly: true,
          applicationServerKey: bytesToArrayBuffer(base64UrlToBytes(appServerKey))
        },
        getKey: function (name) {
          if (name === 'p256dh') return bytesToArrayBuffer(base64UrlToBytes(p256dh));
          if (name === 'auth') return bytesToArrayBuffer(base64UrlToBytes(auth));
          return null;
        },
        toJSON: toJSON,
        unsubscribe: function () {
          return window.betterxDesktopPush.unsubscribe(scope);
        }
      };
    }

    var subscription = Object.create(PushSubscription.prototype);
    Object.defineProperty(subscription, 'endpoint', { enumerable: true, configurable: true, value: endpoint });
    Object.defineProperty(subscription, 'expirationTime', { enumerable: true, configurable: true, value: null });
    Object.defineProperty(subscription, 'options', {
      enumerable: true,
      configurable: true,
      value: {
        userVisibleOnly: true,
        applicationServerKey: bytesToArrayBuffer(base64UrlToBytes(appServerKey))
      }
    });

    subscription.getKey = function (name) {
      if (name === 'p256dh') return bytesToArrayBuffer(base64UrlToBytes(p256dh));
      if (name === 'auth') return bytesToArrayBuffer(base64UrlToBytes(auth));
      return null;
    };
    subscription.toJSON = toJSON;
    subscription.unsubscribe = function () {
      return window.betterxDesktopPush.unsubscribe(scope);
    };

    return subscription;
  }

  function getNotificationTrigger(target) {
    if (!(target instanceof Element)) return null;

    var trigger = target.closest('button, [role="button"], a');
    if (!trigger) return null;

    var text = (trigger.innerText || trigger.textContent || '')
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim();

    if (!text) return null;

    var phrases = [
      'turn on notifications',
      'allow notifications',
      'enable notifications',
      'activer les notifications',
      'autoriser les notifications',
      'enable push notifications'
    ];

    for (var i = 0; i < phrases.length; i++) {
      if (text.indexOf(phrases[i]) !== -1) {
        return trigger;
      }
    }

    return null;
  }

  function installRealNotificationPermissionBridge() {
    var replaying = false;

    document.addEventListener('click', function (event) {
      if (replaying || typeof Notification === 'undefined') return;
      if (Notification.permission === 'granted') return;

      var trigger = getNotificationTrigger(event.target);
      if (!trigger) return;

      event.preventDefault();
      event.stopImmediatePropagation();

      Promise.resolve(Notification.requestPermission())
        .then(function (permission) {
          if (permission !== 'granted') return;

          replaying = true;
          try {
            trigger.dispatchEvent(new MouseEvent('click', {
              bubbles: true,
              cancelable: true,
              composed: true
            }));
          } finally {
            replaying = false;
          }
        })
        .catch(function () {
          // Keep default X behavior if Chromium rejects the request.
        });
    }, true);
  }

  function requestUrlToString(input) {
    if (typeof input === 'string') return input;
    if (input instanceof URL) return input.toString();
    if (typeof Request !== 'undefined' && input instanceof Request) return input.url;
    return String(input || '');
  }

  function shouldLogPushUrl(url) {
    var lower = url.toLowerCase();
    for (var i = 0; i < PUSH_URL_HINTS.length; i++) {
      if (lower.indexOf(PUSH_URL_HINTS[i]) !== -1) {
        return true;
      }
    }
    return false;
  }

  function shouldInspectPushSettingsResponse(url) {
    var lower = url.toLowerCase();
    return (
      lower.indexOf('notifications/settings/login.json') !== -1 ||
      lower.indexOf('notifications/settings/checkin.json') !== -1
    );
  }

  function summarizePushSettingsPayload(json) {
    if (!json || typeof json !== 'object') return null;

    var settings = json.push_settings;
    if (!settings || typeof settings !== 'object') return null;

    var pick = function (key) {
      var value = settings[key];
      return typeof value === 'string' ? value : undefined;
    };

    var summary = {
      TweetsSetting: pick('TweetsSetting'),
      MentionsSetting: pick('MentionsSetting'),
      RetweetsSetting: pick('RetweetsSetting'),
      LikesVitSetting: pick('LikesVitSetting'),
      LikesNonVitSetting: pick('LikesNonVitSetting'),
      FollowersVitSetting: pick('FollowersVitSetting'),
      FollowersNonVitSetting: pick('FollowersNonVitSetting'),
      DirectMessagesSetting: pick('DirectMessagesSetting'),
      DmReactionSetting: pick('DmReactionSetting'),
      PhotoTagsSetting: pick('PhotoTagsSetting')
    };

    return summary;
  }

  function installPushDiagnostics() {
    if (window[PUSH_DIAG_FLAG]) return;
    window[PUSH_DIAG_FLAG] = true;

    var originalFetch = window.fetch.bind(window);
    window.fetch = function () {
      var args = Array.prototype.slice.call(arguments);
      var url = requestUrlToString(args[0]);
      var track = shouldLogPushUrl(url);
      if (track) {
        console.info(PUSH_DIAG_TAG, 'fetch:start ' + url);
      }
      return originalFetch.apply(window, args).then(function (response) {
        if (track) {
          console.info(PUSH_DIAG_TAG, 'fetch:done status=' + response.status + ' url=' + url);
        }

        if (shouldInspectPushSettingsResponse(url)) {
          response.clone().json().then(function (json) {
            var summary = summarizePushSettingsPayload(json);
            if (summary) {
              console.info(PUSH_DIAG_TAG, 'push-settings ' + JSON.stringify(summary));
            }
          }).catch(function () {
            // Ignore parse failures for non-JSON responses.
          });
        }

        return response;
      }, function (error) {
        if (track) {
          console.warn(PUSH_DIAG_TAG, 'fetch:failed url=' + url, error);
        }
        throw error;
      });
    };

    var xhrProto = XMLHttpRequest.prototype;
    if (!xhrProto.__betterxPushDiagPatched) {
      xhrProto.__betterxPushDiagPatched = true;
      var originalOpen = xhrProto.open;
      var originalSend = xhrProto.send;

      xhrProto.open = function (method, url) {
        this.__betterxPushDiagMethod = method;
        this.__betterxPushDiagUrl = requestUrlToString(url);
        return originalOpen.apply(this, arguments);
      };

      xhrProto.send = function (body) {
        var url = this.__betterxPushDiagUrl || '';
        var track = shouldLogPushUrl(url);
        var inspectPushSettings = shouldInspectPushSettingsResponse(url);
        if (track) {
          var method = this.__betterxPushDiagMethod || 'GET';
          console.info(PUSH_DIAG_TAG, 'xhr:start method=' + method + ' url=' + url);
          this.addEventListener('loadend', function () {
            console.info(PUSH_DIAG_TAG, 'xhr:done status=' + this.status + ' url=' + url);
          }, { once: true });
        }

        if (inspectPushSettings) {
          this.addEventListener('loadend', function () {
            if (this.status < 200 || this.status >= 300) return;
            try {
              var json = JSON.parse(this.responseText || '{}');
              var summary = summarizePushSettingsPayload(json);
              if (summary) {
                console.info(PUSH_DIAG_TAG, 'push-settings ' + JSON.stringify(summary));
              }
            } catch {
              // Ignore parse failures.
            }
          }, { once: true });
        }

        return originalSend.call(this, body || null);
      };
    }

    if (typeof Notification !== 'undefined' && !Notification.__betterxPushDiagPatched) {
      Notification.__betterxPushDiagPatched = true;
      var originalRequestPermission = Notification.requestPermission.bind(Notification);
      Notification.requestPermission = function () {
        console.info(PUSH_DIAG_TAG, 'Notification.requestPermission:start');
        var maybePromise = originalRequestPermission.apply(Notification, arguments);
        return Promise.resolve(maybePromise).then(function (permission) {
          console.info(PUSH_DIAG_TAG, 'Notification.requestPermission:done permission=' + permission);
          return permission;
        });
      };
    }

    if (typeof PushManager !== 'undefined' && !PushManager.prototype.__betterxPushDiagPatched) {
      PushManager.prototype.__betterxPushDiagPatched = true;
      var originalSubscribe = PushManager.prototype.subscribe;
      var originalGetSubscription = PushManager.prototype.getSubscription;

      PushManager.prototype.subscribe = function (options) {
        var key = options && options.applicationServerKey;
        var keyType = key ? Object.prototype.toString.call(key) : 'none';
        var keyLength = 0;
        if (key && typeof ArrayBuffer !== 'undefined') {
          if (key instanceof ArrayBuffer) {
            keyLength = key.byteLength;
          } else if (typeof ArrayBuffer.isView === 'function' && ArrayBuffer.isView(key)) {
            keyLength = key.byteLength;
          }
        }

        console.info(
          PUSH_DIAG_TAG,
          'pushManager.subscribe:start userVisibleOnly=' + String(options && options.userVisibleOnly) +
            ' appServerKey=' + String(Boolean(key)) +
            ' keyType=' + keyType +
            ' keyLength=' + String(keyLength)
        );

        var settled = false;
        var pendingTimer = window.setTimeout(function () {
          if (!settled) {
            console.warn(PUSH_DIAG_TAG, 'pushManager.subscribe:pending-more-than-12s');
          }
        }, 12000);

        var nativeBridgePromise = Promise.resolve().then(function () {
          if (!hasDesktopPushBridge()) {
            return null;
          }

          var appServerKey = appServerKeyToBase64Url(options && options.applicationServerKey);
          if (!appServerKey) {
            return null;
          }

          return resolvePushScope().then(function (scope) {
            return window.betterxDesktopPush.subscribe(scope, appServerKey).then(function (nativeSub) {
              return createSyntheticSubscription(nativeSub);
            });
          });
        });

        return nativeBridgePromise.then(function (nativeSub) {
          if (nativeSub) {
            settled = true;
            window.clearTimeout(pendingTimer);
            console.info(
              PUSH_DIAG_TAG,
              'pushManager.subscribe:done(native) endpoint=' + ((nativeSub && nativeSub.endpoint) || '(none)')
            );
            return nativeSub;
          }

          return originalSubscribe.call(this, options).then(function (subscription) {
            settled = true;
            window.clearTimeout(pendingTimer);
            console.info(
              PUSH_DIAG_TAG,
              'pushManager.subscribe:done(chromium) endpoint=' + ((subscription && subscription.endpoint) || '(none)')
            );
            return subscription;
          }, function (error) {
            settled = true;
            window.clearTimeout(pendingTimer);
            console.warn(PUSH_DIAG_TAG, 'pushManager.subscribe:failed(chromium)', error);
            throw error;
          });
        }.bind(this), function (error) {
          settled = true;
          window.clearTimeout(pendingTimer);
          console.warn(PUSH_DIAG_TAG, 'pushManager.subscribe:failed(native)', error);
          throw error;
        });
      };

      PushManager.prototype.getSubscription = function () {
        console.info(PUSH_DIAG_TAG, 'pushManager.getSubscription:start');

        var nativeBridgePromise = Promise.resolve().then(function () {
          if (!hasDesktopPushBridge()) {
            return null;
          }

          return resolvePushScope().then(function (scope) {
            return window.betterxDesktopPush.getSubscription(scope).then(function (nativeSub) {
              if (!nativeSub) {
                return null;
              }
              return createSyntheticSubscription(nativeSub);
            });
          });
        });

        return nativeBridgePromise.then(function (nativeSub) {
          if (nativeSub) {
            console.info(PUSH_DIAG_TAG, 'pushManager.getSubscription:done(native) hasSubscription=true');
            return nativeSub;
          }

          return originalGetSubscription.call(this).then(function (subscription) {
            console.info(
              PUSH_DIAG_TAG,
              'pushManager.getSubscription:done(chromium) hasSubscription=' + String(Boolean(subscription))
            );
            return subscription;
          }, function (error) {
            console.warn(PUSH_DIAG_TAG, 'pushManager.getSubscription:failed(chromium)', error);
            throw error;
          });
        }.bind(this), function (error) {
          console.warn(PUSH_DIAG_TAG, 'pushManager.getSubscription:failed(native)', error);
          throw error;
        });
      };
    }
  }

  async function reportPushDiagnostics() {
    var data = {
      href: window.location.href,
      origin: window.location.origin,
      secureContext: window.isSecureContext,
      userAgent: navigator.userAgent,
      notificationDefined: typeof Notification !== 'undefined',
      notificationPermission: typeof Notification !== 'undefined' ? Notification.permission : 'unavailable',
      serviceWorkerDefined: 'serviceWorker' in navigator,
      pushManagerDefined: typeof PushManager !== 'undefined',
      desktopPushBridgeDefined: hasDesktopPushBridge(),
      userActivationIsActive: typeof navigator.userActivation !== 'undefined' ? navigator.userActivation.isActive : undefined,
      userActivationHasBeenActive: typeof navigator.userActivation !== 'undefined' ? navigator.userActivation.hasBeenActive : undefined,
      supportedContentEncodings:
        typeof PushManager !== 'undefined' && PushManager.supportedContentEncodings
          ? PushManager.supportedContentEncodings.slice()
          : undefined
    };

    if ('permissions' in navigator) {
      try {
        var status = await navigator.permissions.query({ name: 'notifications' });
        data.permissionState = status.state;
      } catch (error) {
        data.permissionStateError = String(error);
      }
    }

    if ('serviceWorker' in navigator) {
      try {
        var registrations = await navigator.serviceWorker.getRegistrations();
        data.serviceWorkerRegistrations = registrations.length;

        var registration =
          registrations[0] ||
          await navigator.serviceWorker.getRegistration().catch(function () { return undefined; }) ||
          await navigator.serviceWorker.ready.catch(function () { return undefined; });

        data.serviceWorkerReady = Boolean(registration);
        if (registration) {
          data.serviceWorkerScope = registration.scope;
          try {
            var subscription = await registration.pushManager.getSubscription();
            data.pushSubscriptionPresent = subscription != null;
            data.pushSubscriptionEndpoint = subscription ? subscription.endpoint : null;
          } catch (error) {
            data.pushGetSubscriptionError = String(error);
          }
        }
      } catch (error) {
        data.serviceWorkerError = String(error);
      }
    }

    console.info('[BetterXDesktop] push-capabilities', JSON.stringify(data));
  }

  installRealNotificationPermissionBridge();
  installPushDiagnostics();
  window.setTimeout(function () {
    reportPushDiagnostics().catch(function (error) {
      console.warn(PUSH_DIAG_TAG, 'push-capabilities failed', error);
    });
  }, 12000);
})();`;
