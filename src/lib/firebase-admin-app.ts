'use server';

import admin from 'firebase-admin';
import { App, getApp, getApps, initializeApp } from 'firebase-admin/app';

// --- Perubahan Dimulai di Sini ---

// Fungsi untuk membuat objek kredensial
const createCredentials = () => {
  // 1. Coba baca dari Environment Variable (untuk produksi di Netlify/Vercel)
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
    return serviceAccount;
  }

  // 2. Jika gagal, fallback ke file lokal (untuk development di komputer Anda)
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const serviceAccount = require('./firebase-service-account-key.json');
    return serviceAccount;
  } catch (error) {
    throw new Error('Firebase service account key is not found. Please set FIREBASE_SERVICE_ACCOUNT_JSON environment variable or create src/lib/firebase-service-account-key.json');
  }
};

const getFirebaseAdminApp = (): App => {
    if (getApps().length > 0) {
        return getApp();
    }
    
    const serviceAccount = createCredentials();

    // Pastikan private_key diformat dengan benar
    // Ini akan memperbaiki error "Invalid PEM"
    const privateKey = serviceAccount.private_key.replace(/\\n/g, '\n');

    return initializeApp({
        credential: admin.credential.cert({
            ...serviceAccount,
            private_key: privateKey, // Gunakan private key yang sudah diformat
        }),
    });
}

export { getFirebaseAdminApp };