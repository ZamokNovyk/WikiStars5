import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from 'firebase/app-check';

// Configuration provided by the user
const firebaseConfig = {
  apiKey: "AIzaSyAbeWfXKXrC1I3BITns9gBjEH-kvZNpQFo",
  authDomain: "wikistars5-465e1.firebaseapp.com",
  projectId: "wikistars5-465e1",
  storageBucket: "wikistars5-465e1.firebasestorage.app",
  messagingSenderId: "860844799689",
  appId: "1:860844799689:web:7435a00e23796fa9053f18",
  measurementId: "G-EW8RPKXVBJ"
};

// Habilitar el token de depuración para entornos de desarrollo antes de inicializar App Check
if (typeof window !== 'undefined') {
  const isDev = import.meta.env?.DEV || process.env.NODE_ENV !== 'production';
  if (isDev) {
    // @ts-ignore
    self.FIREBASE_APPCHECK_DEBUG_TOKEN = true;
  }
}

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

// Inicializar App Check de forma segura en el navegador
if (typeof window !== 'undefined') {
  try {
    const siteKey = import.meta.env?.VITE_RECAPTCHA_SITE_KEY || '6Ld-9goqAAAAAI3b_N7s9gBjEH-kvZNpQFo';
    initializeAppCheck(app, {
      provider: new ReCaptchaEnterpriseProvider(siteKey),
      isTokenAutoRefreshEnabled: true
    });
  } catch (err) {
    console.warn("App Check initialization failed or skipped:", err);
  }
}

// Sign in anonymously for simple demo connectivity, ignoring error if analytics fails
try {
  signInAnonymously(auth).catch((err) => {
    console.warn("Auth anonymous sign in failed:", err);
  });
} catch (e) {
  console.warn("Auth initialization error ignored:", e);
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}
