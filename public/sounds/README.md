# Notification Sound

This folder should contain a notification sound file.

## Required File

- `notification.mp3` - Plays when new orders/deliveries arrive

## Recommended Specifications

- Format: MP3 (most compatible)
- Duration: 1-3 seconds
- Size: < 100KB

## Free Sound Resources

You can download free notification sounds from:
- https://notificationsounds.com/
- https://mixkit.co/free-sound-effects/notification/
- https://freesound.org/

## Example Download (Terminal)

```bash
# Download a sample notification sound
curl -o public/sounds/notification.mp3 "https://notificationsounds.com/storage/sounds/file-sounds-1150-pristine.mp3"
```

Or create a simple beep tone programmatically using the Web Audio API (fallback is built into the notification system).
