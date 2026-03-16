import { getAuth, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { initializeFirebase } from './index';

// Ensures firebase is initialized
initializeFirebase();

export async function loginWithEmailFlow(email: string, password: string) {
    const auth = getAuth();
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const idToken = await userCredential.user.getIdToken();

    // Call our server route to establish the session cookie
    const res = await fetch('/api/auth/session', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ idToken }),
    });

    if (!res.ok) {
        throw new Error('Failed to create session');
    }

    return userCredential.user;
}

export async function logoutFlow() {
    const auth = getAuth();
    await signOut(auth);
    
    // Clear session cookie
    await fetch('/api/auth/session', {
        method: 'DELETE',
    });
}
