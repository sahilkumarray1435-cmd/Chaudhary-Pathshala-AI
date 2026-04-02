// ═══════════════════════════════════════════════
// Chaudhary Pathshala AI v4 — Service Worker
// FCM + Push Notifications + Offline Cache
// ═══════════════════════════════════════════════
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

const CACHE = 'cpai-v4';
const APP_URL = 'https://energetic-blush-qwcnr8iwmk.edgeone.app';
const FIREBASE_URL = 'https://chaudhary-pathshala-ai-50db0-default-rtdb.asia-southeast1.firebasedatabase.app';

firebase.initializeApp({
  apiKey:"AIzaSyD6mkh9VmhXuHdDuuOA_WiU7a6_M-_1J2k",
  authDomain:"chaudhary-pathshala-ai-50db0.firebaseapp.com",
  databaseURL:FIREBASE_URL,
  projectId:"chaudhary-pathshala-ai-50db0",
  storageBucket:"chaudhary-pathshala-ai-50db0.firebasestorage.app",
  messagingSenderId:"777737644105",
  appId:"1:777737644105:web:b02eaf50332827001ab798"
});

const messaging = firebase.messaging();

// ── Install ──
self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(['/'])).catch(()=>{}));
});

// ── Activate ──
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))
  ));
  self.clients.claim();
});

// ── Fetch (Cache + Network) ──
self.addEventListener('fetch', e => {
  if(e.request.method!=='GET') return;
  e.respondWith(
    fetch(e.request)
      .then(r=>{ if(r&&r.status===200){ const c=r.clone(); caches.open(CACHE).then(ca=>ca.put(e.request,c)); } return r; })
      .catch(()=>caches.match(e.request))
  );
});

// ── FCM Background Messages ──
messaging.onBackgroundMessage(payload => {
  console.log('SW: Background FCM received', payload);
  const title = payload.notification?.title || 'Chaudhary Pathshala AI';
  const body  = payload.notification?.body  || payload.data?.body || '';
  const icon  = payload.notification?.icon  || '/icon.png';
  
  return self.registration.showNotification(title, {
    body,
    icon,
    badge: icon,
    tag: 'cpai-' + Date.now(),
    renotify: true,
    vibrate: [200,100,200],
    data: { url: payload.data?.url || APP_URL },
    actions: [
      { action:'open', title:'App Kholo 🏫' },
      { action:'close', title:'Baad Mein' }
    ]
  });
});

// ── Native Push (non-FCM) ──
self.addEventListener('push', e => {
  let data = { title:'Chaudhary Pathshala AI', body:'Naya update!' };
  try{ if(e.data) data = e.data.json(); }catch(_){}
  e.waitUntil(self.registration.showNotification(data.title, {
    body: data.body,
    icon: '/icon.png',
    vibrate: [200,100,200],
    data: { url: APP_URL },
    tag: 'cpai-push'
  }));
});

// ── Notification Click ──
self.addEventListener('notificationclick', e => {
  e.notification.close();
  if(e.action==='close') return;
  const url = e.notification.data?.url || APP_URL;
  e.waitUntil(
    clients.matchAll({type:'window',includeUncontrolled:true}).then(list=>{
      for(const c of list){
        if(c.url.includes('edgeone.app') && 'focus' in c) return c.focus();
      }
      return clients.openWindow(url);
    })
  );
});

// ── Firebase Polling (Background Sync Fallback) ──
let lastTs = Date.now();
self.addEventListener('sync', e => {
  if(e.tag==='cpai-notif-check') e.waitUntil(pollFirebaseNotifs());
});

async function pollFirebaseNotifs(){
  try{
    const r = await fetch(FIREBASE_URL+'/notifications.json?orderBy="ts"&startAt='+lastTs+'&limitToLast=3');
    if(!r.ok) return;
    const data = await r.json();
    if(!data) return;
    for(const n of Object.values(data)){
      if(n.ts > lastTs){
        await self.registration.showNotification(n.title||'CP AI',{
          body:n.body, icon:'/icon.png', vibrate:[200,100,200], tag:'fb-'+n.ts
        });
        lastTs = n.ts + 1;
      }
    }
  }catch(e){}
}
