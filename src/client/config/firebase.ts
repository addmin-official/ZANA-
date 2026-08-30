import { getFirebaseAuth } from '../../services/firebase.ts';

export const auth = {
  get currentUser() {
    const authInstance = getFirebaseAuth();
    if (authInstance?.currentUser) {
      return authInstance.currentUser;
    }
    // Safe client fallback for offline/guest development mode
    return {
      uid: 'guest_student_pilot',
      getIdToken: async () => 'dev_token_guest_client',
    };
  },
};
