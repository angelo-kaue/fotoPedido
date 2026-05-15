import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import {
  getMessaging,
  getToken,
  onMessage,
  isSupported,
  type Messaging,
  type MessagePayload,
} from 'firebase/messaging';

// Public Firebase web config (safe to ship to the browser)
export const firebaseConfig = {
  apiKey: 'AIzaSyCvjXxsi2TYqAHs4pVI1k6_-ZGO5g5gKm0',
  authDomain: 'fotopedido.firebaseapp.com',
  projectId: 'fotopedido',
  messagingSenderId: '734389979891',
  appId: '1:734389979891:web:dd12e50571b03418d04586',
};

export const VAPID_KEY =
  'BP0T6jy93Ioozr3rODznCl81WkNI98ZzWNhD409aLeYIcDzcjBwR6AB4nnFeSi-xqXP6p7EHplfFNY7lsxZYykw';

export const firebaseApp: FirebaseApp =
  getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

let messagingInstance: Messaging | null = null;

export async function getMessagingIfSupported(): Promise<Messaging | null> {
  try {
    if (!(await isSupported())) return null;
    if (!messagingInstance) messagingInstance = getMessaging(firebaseApp);
    return messagingInstance;
  } catch {
    return null;
  }
}

export async function ensureSwRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) return null;
  try {
    const existing = await navigator.serviceWorker.getRegistration('/firebase-messaging-sw.js');
    if (existing) return existing;
    return await navigator.serviceWorker.register('/firebase-messaging-sw.js', { scope: '/' });
  } catch {
    return null;
  }
}

export async function requestFcmToken(): Promise<string | null> {
  const messaging = await getMessagingIfSupported();
  if (!messaging) return null;
  const sw = await ensureSwRegistration();
  if (!sw) return null;
  try {
    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: sw,
    });
    return token || null;
  } catch (e) {
    console.warn('[fcm] getToken failed', e);
    return null;
  }
}

export async function onForegroundMessage(cb: (p: MessagePayload) => void) {
  const messaging = await getMessagingIfSupported();
  if (!messaging) return () => {};
  return onMessage(messaging, cb);
}

export function pushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'Notification' in window &&
    'PushManager' in window
  );
}