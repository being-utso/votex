import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState
} from "react";
import { onAuthStateChanged, signInWithPopup, signOut } from "firebase/auth";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  where
} from "firebase/firestore";
import { auth, db, googleProvider } from "../lib/firebase";
import { COLLECTIONS } from "../lib/constants";
import { getUserDocIdFromEmail, normalizeEmails } from "../lib/formatters";
import { useSettings } from "./SettingsContext";

const AuthContext = createContext(null);
const rollRegex = /^\d{2}-\d{2}-\d{3}$/;

const pickUserName = (firebaseAuthUser, userData) => {
  const rawName =
    userData?.name
    || userData?.displayName
    || firebaseAuthUser?.displayName
    || firebaseAuthUser?.email
    || "Anonymous Reviewer";

  const normalizedName = typeof rawName === "string" ? rawName.trim() : "";
  return normalizedName || "Anonymous Reviewer";
};

const normalizePhotoURL = (value) => {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
};

export function AuthProvider({ children }) {
  const { settings, loading: settingsLoading } = useSettings();
  const [firebaseUser, setFirebaseUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [needsProfileSetup, setNeedsProfileSetup] = useState(false);
  const [profileSubmitLoading, setProfileSubmitLoading] = useState(false);
  const [profileSubmitError, setProfileSubmitError] = useState(null);

  const adminEmails = useMemo(
    () => normalizeEmails(settings.adminEmails),
    [settings.adminEmails]
  );

  useEffect(() => {
    if (settingsLoading) {
      return undefined;
    }

    let isActive = true;
    let profileUnsubscribe = null;

    const stopProfileListener = () => {
      if (profileUnsubscribe) {
        profileUnsubscribe();
        profileUnsubscribe = null;
      }
    };

    setLoading(true);
    const unsubscribeAuth = onAuthStateChanged(auth, async (nextFirebaseUser) => {
      stopProfileListener();

      if (!isActive) {
        return;
      }

      if (import.meta.env.DEV) {
        // Useful for verifying Google profile image presence.
        console.debug("[auth] firebaseUser", {
          uid: nextFirebaseUser?.uid,
          email: nextFirebaseUser?.email,
          displayName: nextFirebaseUser?.displayName,
          photoURL: nextFirebaseUser?.photoURL
        });
      }

      setAuthError(null);
      setProfileSubmitError(null);
      setFirebaseUser(nextFirebaseUser);

      if (!nextFirebaseUser) {
        setProfile(null);
        setNeedsProfileSetup(false);
        setLoading(false);
        return;
      }

      const normalizedEmail = getUserDocIdFromEmail(nextFirebaseUser.email);
      if (!normalizedEmail) {
        setAuthError("This Google account does not have a usable email.");
        try {
          await signOut(auth);
        } catch {
          // Ignore sign-out failures here, we already surface the auth error.
        }
        if (isActive) {
          setProfile(null);
          setNeedsProfileSetup(false);
          setLoading(false);
        }
        return;
      }

      const userRef = doc(db, COLLECTIONS.USERS, normalizedEmail);

      try {
        const userSnapshot = await getDoc(userRef);

        if (!isActive) {
          return;
        }

        if (!userSnapshot.exists()) {
          const nextRole = adminEmails.includes(normalizedEmail) ? "admin" : "user";
          const resolvedName = pickUserName(nextFirebaseUser, null);
          const authPhotoURL = normalizePhotoURL(nextFirebaseUser.photoURL);

          await setDoc(userRef, {
            uid: nextFirebaseUser.uid,
            email: normalizedEmail,
            displayName: resolvedName,
            name: resolvedName,
            photoURL: authPhotoURL,
            role: nextRole,
            // Keep existing admin review system intact, but don't block app usage on it.
            isApproved: false,
            approved: false,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            lastLoginAt: serverTimestamp()
          });

          if (!isActive) {
            return;
          }

          setProfile(null);
          setNeedsProfileSetup(true);
          setLoading(false);
          return;
        }

        const userData = userSnapshot.data() ?? {};
        if (userData.uid && userData.uid !== nextFirebaseUser.uid) {
          setAuthError("This email is already registered with another account.");
          try {
            await signOut(auth);
          } catch {
            // ignore
          }
          setProfile(null);
          setNeedsProfileSetup(false);
          setLoading(false);
          return;
        }
        const roleFromDoc = userData.role === "admin" ? "admin" : "user";
        const nextRole = adminEmails.includes(normalizedEmail) ? "admin" : roleFromDoc;
        const resolvedName = pickUserName(nextFirebaseUser, userData);
        const authPhotoURL = normalizePhotoURL(nextFirebaseUser.photoURL);
        const docPhotoURL = normalizePhotoURL(userData.photoURL);
        const resolvedPhotoURL = authPhotoURL ?? docPhotoURL;

        await setDoc(
          userRef,
          {
            uid: nextFirebaseUser.uid,
            email: normalizedEmail,
            displayName: resolvedName,
            ...(resolvedPhotoURL ? { photoURL: resolvedPhotoURL } : {}),
            role: nextRole,
            approved: userData.approved === true ? true : false,
            ...(userData.createdAt ? {} : { createdAt: serverTimestamp() }),
            updatedAt: serverTimestamp(),
            lastLoginAt: serverTimestamp()
          },
          { merge: true }
        );

        if (!isActive) {
          return;
        }

        profileUnsubscribe = onSnapshot(
          userRef,
          (snapshot) => {
            if (!isActive) {
              return;
            }

            if (!snapshot.exists()) {
              setProfile(null);
              setNeedsProfileSetup(true);
              setLoading(false);
              return;
            }

            const profileData = snapshot.data() ?? {};
            const profileEmail = getUserDocIdFromEmail(profileData.email, normalizedEmail);
            const resolvedNameFromProfile = pickUserName(nextFirebaseUser, profileData);
            const resolvedRole =
              profileData.role === "admin" || adminEmails.includes(profileEmail)
                ? "admin"
                : "user";
            const authPhotoURL = normalizePhotoURL(nextFirebaseUser.photoURL);
            const profilePhotoURL = normalizePhotoURL(profileData.photoURL);

            setProfile({
              ...profileData,
              uid: nextFirebaseUser.uid,
              email: profileEmail,
              displayName: resolvedNameFromProfile,
              name: profileData.name || resolvedNameFromProfile,
              photoURL: authPhotoURL ?? profilePhotoURL,
              role: resolvedRole,
              votesUsedByRound: profileData.votesUsedByRound ?? {},
              votedDesignIdsByRound: profileData.votedDesignIdsByRound ?? {},
              submittedRounds: profileData.submittedRounds ?? {},
              submittedAtByRound: profileData.submittedAtByRound ?? {}
            });
            setNeedsProfileSetup(false);
            setLoading(false);
          },
          (profileError) => {
            if (!isActive) {
              return;
            }
            setAuthError(profileError.message ?? "Failed to load profile.");
            setProfile(null);
            setLoading(false);
          }
        );
      } catch (error) {
        if (!isActive) {
          return;
        }
        setAuthError(error.message ?? "Authentication failed.");
        setProfile(null);
        setLoading(false);
      }
    });

    return () => {
      isActive = false;
      stopProfileListener();
      unsubscribeAuth();
    };
  }, [settingsLoading, adminEmails]);

  const submitProfile = useCallback(
    async ({ name, roll, section, dept }) => {
      const userUid = firebaseUser?.uid;
      const email = firebaseUser?.email;

      if (!userUid || !email) {
        throw new Error("You must be signed in.");
      }

      const normalizedEmail = getUserDocIdFromEmail(email);
      if (!normalizedEmail) {
        throw new Error("A valid email is required.");
      }

      const normalizedName = name?.trim() ?? "";
      const normalizedRoll = roll?.trim() ?? "";
      const normalizedSection = section?.trim() ?? "";
      const normalizedDept = dept?.trim() ?? "";

      if (!normalizedName || !normalizedRoll || !normalizedSection || !normalizedDept) {
        throw new Error("All profile fields are required.");
      }

      if (!rollRegex.test(normalizedRoll)) {
        throw new Error("Invalid roll format (use 25-06-034)");
      }

      setProfileSubmitError(null);
      setProfileSubmitLoading(true);

      try {
        const userRef = doc(db, COLLECTIONS.USERS, normalizedEmail);
        const existingSnapshot = await getDoc(userRef);
        const existingData = existingSnapshot.exists() ? existingSnapshot.data() ?? {} : {};

        if (existingSnapshot.exists() && existingData.uid && existingData.uid !== userUid) {
          throw new Error("This email is already registered.");
        }

        try {
          const duplicateSnapshot = await getDocs(
            query(
              collection(db, COLLECTIONS.USERS),
              where("email", "==", normalizedEmail),
              limit(5)
            )
          );
          const duplicateUserDoc = duplicateSnapshot.docs.find(
            (snapshot) => snapshot.id !== normalizedEmail
          );
          if (duplicateUserDoc) {
            throw new Error("This email is already registered.");
          }
        } catch (error) {
          if (error?.code !== "permission-denied") {
            throw error;
          }
        }

        const roleFromDoc = existingData.role === "admin" ? "admin" : "user";
        const nextRole = adminEmails.includes(normalizedEmail) ? "admin" : roleFromDoc;
        const shouldKeepApproved = existingData.isApproved === true;
        const authPhotoURL = normalizePhotoURL(firebaseUser?.photoURL);

        await setDoc(
          userRef,
          {
            name: normalizedName,
            roll: normalizedRoll,
            section: normalizedSection,
            dept: normalizedDept,
            isGuest: normalizedRoll === "00-00-000",
            uid: userUid,
            email: normalizedEmail,
            displayName: normalizedName,
            ...(authPhotoURL ? { photoURL: authPhotoURL } : {}),
            role: nextRole,
            isApproved: shouldKeepApproved ? true : false,
            votesUsedByRound: existingData.votesUsedByRound ?? {},
            votedDesignIdsByRound: existingData.votedDesignIdsByRound ?? {},
            submittedRounds: existingData.submittedRounds ?? {},
            submittedAtByRound: existingData.submittedAtByRound ?? {},
            ...(existingData.createdAt ? {} : { createdAt: serverTimestamp() }),
            updatedAt: serverTimestamp(),
            lastLoginAt: serverTimestamp()
          },
          { merge: true }
        );

        setNeedsProfileSetup(false);
        setProfile({
          ...existingData,
          uid: userUid,
          email: normalizedEmail,
          displayName: normalizedName,
          name: normalizedName,
          roll: normalizedRoll,
          section: normalizedSection,
          dept: normalizedDept,
          isGuest: normalizedRoll === "00-00-000",
          isApproved: shouldKeepApproved ? true : false,
          role: nextRole,
          photoURL: authPhotoURL ?? normalizePhotoURL(existingData.photoURL),
          votesUsedByRound: existingData.votesUsedByRound ?? {},
          votedDesignIdsByRound: existingData.votedDesignIdsByRound ?? {},
          submittedRounds: existingData.submittedRounds ?? {},
          submittedAtByRound: existingData.submittedAtByRound ?? {}
        });
      } catch (error) {
        setProfileSubmitError(error.message ?? "Failed to save profile.");
        throw error;
      } finally {
        setProfileSubmitLoading(false);
      }
    },
    [firebaseUser, adminEmails]
  );

  const signInWithGoogle = useCallback(async () => {
    setAuthError(null);
    await signInWithPopup(auth, googleProvider);
  }, []);

  const logout = useCallback(async () => {
    await signOut(auth);
  }, []);

  const adminEmail = getUserDocIdFromEmail(profile?.email ?? firebaseUser?.email ?? "");
  const isAdmin = profile?.role === "admin" || adminEmails.includes(adminEmail);

  const value = useMemo(
    () => ({
      firebaseUser,
      profile,
      loading,
      authError,
      needsProfileSetup,
      profileSubmitLoading,
      profileSubmitError,
      submitProfile,
      signInWithGoogle,
      logout,
      isAdmin
    }),
    [
      firebaseUser,
      profile,
      loading,
      authError,
      needsProfileSetup,
      profileSubmitLoading,
      profileSubmitError,
      submitProfile,
      signInWithGoogle,
      logout,
      isAdmin
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
}
