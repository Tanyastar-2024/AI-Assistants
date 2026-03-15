// src/contexts/AuthContext.jsx
import { createContext, useContext, useEffect, useState } from 'react';
import { auth, db } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, updateDoc, setDoc, serverTimestamp } from 'firebase/firestore';

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
  const [streak, setStreak] = useState(0);
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
          let currentStreak = 0;
          let newStreak = 0;
          const today = new Date().setHours(0, 0, 0, 0); // start of today

          if (docSnap.exists()) {
            const data = docSnap.data();
            if (data.name) displayName = data.name;
            currentStreak = data.streak || 0;
            
            // Check streak logic
            if (data.lastLoginDate) {
              const lastLogin = data.lastLoginDate.toDate().setHours(0, 0, 0, 0);
              const diffDays = Math.round((today - lastLogin) / (1000 * 60 * 60 * 24));
              
              if (diffDays === 1) { // Logged in yesterday
                newStreak = currentStreak + 1;
              } else if (diffDays === 0) { // Already logged in today
                newStreak = Math.max(1, currentStreak);
              } else { // Missed a day
                newStreak = 1;
              }
            } else { // First login
              newStreak = 1;
            }

            // Update user document if streak changed or it's a new day
            const lastLoginDay = data.lastLoginDate ? data.lastLoginDate.toDate().setHours(0, 0, 0, 0) : null;
            if (lastLoginDay !== today || currentStreak !== newStreak) {
              await updateDoc(docRef, {
                streak: newStreak,
                lastLoginDate: serverTimestamp()
              });
            }
          } else {
             // Create new user document if they don't have one (e.g. newly signed up)
             if (firebaseUser.displayName) displayName = firebaseUser.displayName;
             newStreak = 1;
             await setDoc(docRef, {
                name: displayName,
                email: firebaseUser.email,
                xp: 0,
                streak: 1,
                lectureCount: 0,
                lastLoginDate: serverTimestamp(),
                createdAt: serverTimestamp()
             });
          }

          setUser(firebaseUser);
          setUserName(displayName);
          setStreak(newStreak);
          console.log('User authenticated:', firebaseUser.uid, displayName, 'Streak:', newStreak);
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
    streak,
    loading,
    isAuthenticated: !!user
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};