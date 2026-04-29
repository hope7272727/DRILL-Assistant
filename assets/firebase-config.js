/* Firebase initialization for drill-assistant.
 * Loaded after the official Firebase compat scripts (gstatic CDN). */
(function () {
  if (typeof firebase === 'undefined') {
    console.warn('[firebase-config] Firebase SDK not loaded yet.');
    return;
  }
  const config = {
    apiKey: 'AIzaSyB-cmDCqVFxJVXgYDNRDEh7a24fSpepRig',
    authDomain: 'drill-assistant.firebaseapp.com',
    projectId: 'drill-assistant',
    storageBucket: 'drill-assistant.firebasestorage.app',
    messagingSenderId: '350272798278',
    appId: '1:350272798278:web:b842696cea227c0a551447',
  };
  if (!firebase.apps.length) firebase.initializeApp(config);
  window.DrillFirestore = firebase.firestore();
})();
