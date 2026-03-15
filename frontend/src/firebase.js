import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
// import { getAuth, GoogleAuthProvider } from "firebase/auth";

// TODO: Replace this object with YOUR exact keys from the Firebase Console!
const firebaseConfig = {
  apiKey: "AIzaSyDkE0EiGW0YTkOIPVtTQwqeKvkVJtW2O5c",
  authDomain: "ai-assist-f94fc.firebaseapp.com",
  projectId: "ai-assist-f94fc",
  storageBucket: "ai-assist-f94fc.firebasestorage.app",
  messagingSenderId: "859561671054",
  appId: "1:859561671054:web:ea88f2374363e597270cdf",
  measurementId: "G-C1D9DJLEXK"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Authentication and get a reference to the service
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Initialize Cloud Firestore and get a reference to the service
export const db = getFirestore(app);

