self.addEventListener('push', event => {
    if (!event.data) return;
    let data = {};
    try { data = event.data.json(); } catch (e) { data = { title: 'Ten&See', body: event.data.text() }; }

    event.waitUntil(
        self.registration.showNotification(data.title || 'Ten&See Live Chat', {
            body: data.body || 'New chat notification',
            icon: '/assets/logo.png',
            badge: '/assets/logo.png',
            tag: data.tag || 'chat',
            requireInteraction: true,
            vibrate: [200, 100, 200],
            data: { url: data.url || '/admin', sessionId: data.sessionId },
            actions: [
                { action: 'open', title: 'Open Chat' },
                { action: 'dismiss', title: 'Dismiss' }
            ]
        })
    );
});

self.addEventListener('notificationclick', event => {
    event.notification.close();
    if (event.action === 'dismiss') return;

    const url = event.notification.data?.url || '/admin';
    const sessionId = event.notification.data?.sessionId;
    const target = sessionId ? `${url}?session=${sessionId}` : url;

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
            for (const client of clientList) {
                if (client.url.includes('/admin') && 'focus' in client) {
                    client.postMessage({ type: 'OPEN_SESSION', sessionId });
                    return client.focus();
                }
            }
            return clients.openWindow(target);
        })
    );
});

self.addEventListener('notificationclose', () => {});
