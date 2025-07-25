'use server';

import admin from 'firebase-admin';
import { App, getApp, getApps, initializeApp } from 'firebase-admin/app';
import serviceAccount from './firebase-service-account-key.json';

const getFirebaseAdminApp = (): App => {
    if (getApps().length > 0) {
        return getApp();
    }
    
    // Check if the essential properties exist in the service account object
    if (!serviceAccount.project_id || !serviceAccount.client_email || !serviceAccount.private_key) {
        // This provides a clearer error message if the JSON file is not filled out.
        throw new Error('Firebase service account key is incomplete. Please fill out firebase-service-account-key.json');
    }

    return initializeApp({
        credential: admin.credential.cert(serviceAccount as any),
    });
}

export { getFirebaseAdminApp };
