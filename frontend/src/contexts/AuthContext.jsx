// src/contexts/AuthContext.jsx
import { createContext, useContext, useEffect, useState } from 'react';
import { auth, db } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userName, setUserName] = useState('Scholar');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      console.log('Auth state changed:', firebaseUser ? 'logged in' : 'logged out');

      if (firebaseUser) {
        // User is logged in
        try {
          // Get user profile from Firestore
          const docRef = doc(db, "users", firebaseUser.uid);
          const docSnap = await getDoc(docRef);

          let displayName = 'Scholar';
          if (docSnap.exists() && docSnap.data().name) {
            displayName = docSnap.data().name;
          } else if (firebaseUser.displayName) {
            displayName = firebaseUser.displayName;
          }

          setUser(firebaseUser);
          setUserName(displayName);
          console.log('User authenticated:', firebaseUser.uid, displayName);
        } catch (error) {
          console.error('Error fetching user profile:', error);
          setUser(firebaseUser);
          setUserName(firebaseUser.displayName || 'Scholar');
        }
      } else {
        // User is logged out
        setUser(null);
        setUserName('Scholar');
        console.log('User logged out');
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const value = {
    user,
    userName,
    loading,
    isAuthenticated: !!user
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};