import { getApp, getApps, initializeApp } from 'firebase/app';

const config = {
  apiKey: 'AIzaSyAhuoL67FZwSNdNqbuQrY2JXPplAfRccik',
  authDomain: 'hidaka-music.firebaseapp.com',
  projectId: 'hidaka-music',
  storageBucket: 'hidaka-music.firebasestorage.app',
  messagingSenderId: '276288771048',
  appId: '1:276288771048:web:f62a28653051f4e889ca5d'
};

export function fbApp() {
  return getApps().length ? getApp() : initializeApp(config);
}
