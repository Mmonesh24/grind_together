/* eslint-disable no-undef */
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  console.log('Push Received:', data);

  const title = data.title || 'GrindTogether';
  const options = {
    body: data.body || 'You have a new notification',
    icon: data.icon || '/favicon.svg',
    badge: '/favicon.svg',
    data: {
      url: data.url || '/',
      actions: data.actions || []
    },
    actions: (data.actions || []).map(a => ({
      action: a.action,
      title: a.title
    }))
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const action = event.action;
  const notificationData = event.notification.data;

  if (action && action !== '') {
    // Handle the button click
    console.log('Action clicked:', action);
    
    // Find the specific action payload if any
    const actionObj = (notificationData.actions || []).find(a => a.action === action);
    const payload = actionObj ? actionObj.payload : {};

    event.waitUntil(
      self.registration.pushManager.getSubscription().then(sub => {
        const endpoint = sub ? sub.endpoint : null;
        return fetch('/api/notifications/action', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            action, 
            payload,
            endpoint
          }),
        });
      }).then(response => {
        if (!response.ok) {
          console.error('Failed to update action via fetch');
        }
      }).catch(err => {
        console.error('Network error during action fetch', err);
      })
    );
  } else {
    // Just click on the notification itself
    event.waitUntil(
      clients.matchAll({ type: 'window' }).then((clientList) => {
        for (const client of clientList) {
          if (client.url === notificationData.url && 'focus' in client) {
            return client.focus();
          }
        }
        if (clients.openWindow) {
          return clients.openWindow(notificationData.url);
        }
      })
    );
  }
});
