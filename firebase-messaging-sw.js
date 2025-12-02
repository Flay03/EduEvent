/* eslint-disable no-undef */
importScripts('https://www.gstatic.com/firebasejs/8.10.1/firebase-app.js');
importScripts('https://www.gstatic.com/firebasejs/8.10.1/firebase-messaging.js');

// Parse query parameters to get config from the registration URL
const params = new URLSearchParams(self.location.search);
const apiKey = params.get('apiKey');
const projectId = params.get('projectId');
const messagingSenderId = params.get('messagingSenderId');
const appId = params.get('appId');

if (apiKey && projectId && messagingSenderId && appId) {
  firebase.initializeApp({
    apiKey: apiKey,
    projectId: projectId,
    messagingSenderId: messagingSenderId,
    appId: appId
  });

  const messaging = firebase.messaging();

  messaging.onBackgroundMessage((payload) => {
    console.log('[firebase-messaging-sw.js] Received background message ', payload);
    const notificationTitle = payload.notification.title;
    const notificationOptions = {
      body: payload.notification.body,
      icon: payload.notification.icon || '/icon-192x192.png'
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
  });
} else {
  console.log('[firebase-messaging-sw.js] Firebase config missing in URL params. Skipping init.');
}