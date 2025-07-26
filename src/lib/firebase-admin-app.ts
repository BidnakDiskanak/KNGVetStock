'use server';

import admin from 'firebase-admin';
import { App, getApp, getApps, initializeApp } from 'firebase-admin/app';
import serviceAccount from './firebase-service-account-key.json';

const getFirebaseAdminApp = (): App => {
    if (getApps().length > 0) {
        return getApp();
    }
    
    // Check if the placeholder values are still there.
    if (serviceAccount.project_id === 'PASTE_YOUR_project_id_HERE') {
        throw new Error('Firebase service account key is not configured. Please fill out src/lib/firebase-service-account-key.json');
    }
    
    const privateKey = serviceAccount.private_key.replace(/\\n/g, '\n');

    return initializeApp({
        credential: admin.credential.cert({
            ...serviceAccount,
            private_key: privateKey,
        }),
    });
}

export { getFirebaseAdminApp };
