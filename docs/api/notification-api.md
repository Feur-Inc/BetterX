# BetterX Notification API

The Notification API allows plugins to display notifications to users in a consistent and user-friendly way. These notifications can be used to provide feedback, alerts, or information about your plugin's actions.

## Basic Usage

```javascript
import { notifications } from "@api";

// Show a simple notification
notifications.showInfo("This is an informational message");

// Show a success notification that automatically dismisses after 3 seconds
notifications.showSuccess("Operation completed successfully", { duration: 3000 });

// Show a warning notification
notifications.showWarning("Something might need attention");

// Show an error notification that stays until dismissed
notifications.showError("An error occurred");
```

## Notification Methods

### Core Methods

| Method | Description |
|--------|-------------|
| `showNotification(options)` | Main method to create a notification with custom options |
| `showInfo(message, options)` | Display an information notification |
| `showSuccess(message, options)` | Display a success notification |
| `showWarning(message, options)` | Display a warning notification |
| `showError(message, options)` | Display an error notification (stays until dismissed by default) |
| `updateNotification(id, options)` | Update an existing notification |
| `removeNotification(id)` | Remove a specific notification |
| `clearAllNotifications()` | Remove all notifications |

## Options

The notification API accepts the following options:

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `title` | String | `''` | Title of the notification |
| `message` | String | `''` | Main message text |
| `type` | String | `'info'` | Notification type: `'info'`, `'success'`, `'warning'`, or `'error'` |
| `duration` | Number | `5000` | Duration in milliseconds before auto-dismiss (0 means permanent) |
| `progress` | Boolean | `false` | Show a progress bar that depletes as the notification times out |
| `actions` | Array | `[]` | Action buttons to add to the notification |
| `icon` | String | `null` | Optional custom icon class or URL |
| `plugin` | String | `null` | Plugin name to show as the notification source |
| `html` | Boolean | `false` | Whether to parse message as HTML (use cautiously) |

## Examples

### Basic Notifications

```javascript
// Simple information notification (auto-dismisses after 5 seconds)
notifications.showInfo("This is an informational message");

// Success notification with custom duration
notifications.showSuccess("Settings saved successfully", { 
  duration: 3000 // 3 seconds
});

// Warning notification with title
notifications.showWarning("You should check your settings", { 
  title: "Configuration Warning" 
});

// Error notification that stays until dismissed
notifications.showError("Failed to connect to server");
```

### Advanced Usage

```javascript
// Notification with action buttons
const notificationId = notifications.showNotification({
  title: "Friend Request",
  message: "User123 wants to follow you",
  type: "info",
  duration: 0, // Stay until dismissed
  actions: [
    {
      label: "Accept",
      callback: () => {
        acceptFriendRequest();
        // Will auto-close by default after callback
      }
    },
    {
      label: "Decline",
      callback: () => {
        declineFriendRequest();
        // Will auto-close by default after callback
      }
    },
    {
      label: "Ignore",
      callback: () => {
        // Do nothing special
      },
      autoClose: false // Don't auto-close after clicking
    }
  ],
  plugin: "FriendManager" // Show source plugin
});

// Notification with progress bar
notifications.showInfo("Downloading update...", {
  progress: true,
  duration: 10000 // 10 seconds
});

// Update an existing notification
setTimeout(() => {
  notifications.updateNotification(notificationId, {
    title: "Update Complete",
    message: "Friend request handled",
    type: "success",
    duration: 3000
  });
}, 5000);
```

### Notification with Custom Icon

```javascript
notifications.showNotification({
  title: "New Message",
  message: "You received a new message from User123",
  icon: "message-icon" // CSS class
});

// Or with an image URL
notifications.showNotification({
  title: "New Badge",
  message: "You earned the 'Early Adopter' badge!",
  icon: "https://example.com/badge-icon.png"
});
```

## Behavior Notes

1. Notifications appear in the top-right corner by default
2. Notifications stack vertically with the newest on top
3. Hovering over a notification pauses its timeout
4. Notifications have smooth entrance and exit animations
5. Error notifications remain visible until manually dismissed by default

## Best Practices

1. Use appropriate notification types for different messages:
   - `info` for neutral information
   - `success` for completion messages
   - `warning` for potential issues
   - `error` for actual errors

2. Keep notification messages concise

3. Use titles sparingly, only for important notifications

4. For complex interactions, consider using modal dialogs instead of notifications with many actions

5. Always include your plugin name in the `plugin` option to help users identify the source

6. Avoid showing too many notifications in rapid succession
