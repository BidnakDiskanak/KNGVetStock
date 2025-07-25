import admin from 'firebase-admin';
import { App, getApp, getApps, initializeApp } from 'firebase-admin/app';
import { serviceAccountKey } from './firebase-service-account-key';

const getFirebaseAdminApp = (): App => {
    if (getApps().length > 0) {
        return getApp();
    }
    return initializeApp({
        credential: admin.credential.cert(serviceAccountKey),
    });
}

export { getFirebaseAdminApp };
