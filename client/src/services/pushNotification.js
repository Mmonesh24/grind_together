import api from './api';

const VAPID_PUBLIC_KEY = 'BLcU9FYMO-RHMzvHtPS9lQszBcKXOHrCERftWRjSI_a97AhHgvVWxS97Y-Sofc7c2PREaj-xAg5Q4n3PAXeaPI0';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export const registerPushNotifications = async () => {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.warn('Push notifications are not supported by your browser');
    return;
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
    });
    console.log('Service Worker registered:', registration);

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.warn('Permission for notifications denied');
      return;
    }

    let subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });
    }

    // Send subscription to server
    await api.post('/notifications/subscribe', { subscription });
    console.log('Push subscription successful');
  } catch (error) {
    console.error('Error during push notification registration:', error);
  }
};

export const unsubscribePushNotifications = async () => {
  const registration = await navigator.serviceWorker.getRegistration();
  if (!registration) return;

  const subscription = await registration.pushManager.getSubscription();
  if (subscription) {
    await subscription.unsubscribe();
    await api.post('/notifications/unsubscribe', { endpoint: subscription.endpoint });
    console.log('Push unsubscription successful');
  }
};
