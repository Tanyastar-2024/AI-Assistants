import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDkE0EiGW0YTkOIPVtTQwqeKvkVJtW2O5c",
  authDomain: "ai-assist-f94fc.firebaseapp.com",
  projectId: "ai-assist-f94fc",
  storageBucket: "ai-assist-f94fc.firebasestorage.app",
  messagingSenderId: "859561671054",
  appId: "1:859561671054:web:ea88f2374363e597270cdf"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);


export const googleProvider = new GoogleAuthProvider();

// THIS IS THE MAGIC LINE:
googleProvider.setCustomParameters({
  prompt: 'select_account'
});