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

export function AuthProvider({ children }) {
  const { settings, loading: settingsLoading } = useSettings();
  const [firebaseUser, setFirebaseUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [needsProfileSetup, setNeedsProfileSetup] = useState(false);
  const [profileSubmitLoading, setProfileSubmitLoading] = useState(false);
  const [profileSubmitError, setProfileSubmitError] = useState(null);
  const getDocIfReadable = useCallback(async (ref) => {
    try {
      return await getDoc(ref);
    } catch (error) {
      if (error?.code === "permission-denied") {
        return null;
      }
      throw error;
    }
  }, []);

  const findUsersByEmail = useCallback(async (emailValue) => {
    const trimmedEmail = emailValue?.trim() ?? "";
    const normalizedEmail = trimmedEmail.toLowerCase();
    if (!normalizedEmail) {
      return [];
    }

    const usersRef = collection(db, COLLECTIONS.USERS);
    const lookupValues = [normalizedEmail];
    if (trimmedEmail && trimmedEmail !== normalizedEmail) {
      lookupValues.push(trimmedEmail);
    }

    const userDocById = new Map();
    for (const lookupValue of lookupValues) {
      try {
        const snapshot = await getDocs(
          query(usersRef, where("email", "==", lookupValue), limit(2))
        );
        snapshot.docs.forEach((userDoc) => {
          userDocById.set(userDoc.id, userDoc);
        });
      } catch (error) {
        if (error?.code !== "permission-denied") {
          throw error;
        }
      }
    }

    return Array.from(userDocById.values());
  }, []);

  const findDuplicateUserByEmail = useCallback(async (emailValue, excludedDocIds = []) => {
    const emailUsers = await findUsersByEmail(emailValue);
    const excludedIds = new Set(excludedDocIds.filter(Boolean));
    return emailUsers.find((userDoc) => !excludedIds.has(userDoc.id)) ?? null;
  }, [findUsersByEmail]);

  useEffect(() => {
    if (settingsLoading) {
      return undefined;
    }

    const adminEmails = normalizeEmails(settings.adminEmails);
    let profileUnsubscribe = null;

    const stopProfileListener = () => {
      if (profileUnsubscribe) {
        profileUnsubscribe();
        profileUnsubscribe = null;
      }
    };

    setLoading(true);
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      stopProfileListener();

      if (!user) {
        setFirebaseUser(null);
        setProfile(null);
        setNeedsProfileSetup(false);
        setProfileSubmitError(null);
        setLoading(false);
        return;
      }

      const normalizedEmail = getUserDocIdFromEmail(user.email);
      if (!normalizedEmail) {
        setAuthError("This Google account does not have a usable email.");
        await signOut(auth);
        setLoading(false);
        return;
      }

      try {
        setAuthError(null);
        setProfileSubmitError(null);
        setFirebaseUser(user);

        const userDocId = normalizedEmail;
        const userRef = doc(db, COLLECTIONS.USERS, userDocId);
        const legacyUidRef = doc(db, COLLECTIONS.USERS, user.uid);
        const emailIsAdmin = adminEmails.includes(normalizedEmail);

        const userDocByEmail = await getDocIfReadable(userRef);
        const emailUsers = [];
        if (userDocByEmail?.exists()) {
          emailUsers.push(userDocByEmail);
        }

        if (!emailUsers.length) {
          const foundUsers = await findUsersByEmail(normalizedEmail);
          emailUsers.push(...foundUsers);
        }

        if (!emailUsers.length) {
          const legacyUidSnapshot = await getDocIfReadable(legacyUidRef);
          if (legacyUidSnapshot?.exists()) {
            emailUsers.push(legacyUidSnapshot);
          }
        }

        const matchedUserDoc =
          emailUsers.find((userDoc) => userDoc.id === userDocId)
          ?? emailUsers.find((userDoc) => userDoc.id === user.uid)
          ?? emailUsers[0]
          ?? null;

        if (!matchedUserDoc) {
          setNeedsProfileSetup(true);
          setProfile(null);
          setLoading(false);
          return;
        }

        const matchedUserData = matchedUserDoc.data();
        const currentRole = matchedUserData.role ?? "user";
        const nextRole = currentRole === "admin" || emailIsAdmin ? "admin" : "user";

        await setDoc(
          userRef,
          {
            ...matchedUserData,
            email: normalizedEmail || matchedUserData.email || "",
            uid: user.uid,
            displayName:
              matchedUserData.displayName
              ?? matchedUserData.name
              ?? user.displayName
              ?? "Anonymous Reviewer",
            photoURL: user.photoURL ?? matchedUserData.photoURL ?? "",
            role: nextRole,
            ...(matchedUserData.createdAt ? {} : { createdAt: serverTimestamp() }),
            updatedAt: serverTimestamp(),
            lastLoginAt: serverTimestamp()
          },
          { merge: true }
        );

        profileUnsubscribe = onSnapshot(
          userRef,
          (snapshot) => {
            if (!snapshot.exists()) {
              setProfile(null);
              setNeedsProfileSetup(true);
              setLoading(false);
              return;
            }

            const profileData = snapshot.data();
            const resolvedName =
              profileData.name
              ?? profileData.displayName
              ?? user.displayName
              ?? "Anonymous Reviewer";
            setNeedsProfileSetup(false);
            setProfile({
              uid: user.uid,
              email: profileData.email ?? normalizedEmail,
              displayName: resolvedName,
              photoURL: user.photoURL ?? profileData.photoURL ?? "",
              ...profileData,
              name: profileData.name ?? resolvedName
            });
            setLoading(false);
          },
          (profileError) => {
            setAuthError(profileError.message ?? "Failed to load profile.");
            setLoading(false);
          }
        );
      } catch (error) {
        setAuthError(error.message ?? "Authentication failed.");
        setLoading(false);
      }
    });

    return () => {
      stopProfileListener();
      unsubscribeAuth();
    };
  }, [settingsLoading, settings.adminEmails, findUsersByEmail, getDocIfReadable]);

  const submitProfile = useCallback(
    async ({ name, roll, section, dept }) => {
      const userId = firebaseUser?.uid;
      const email = firebaseUser?.email ?? "";

      if (!userId || !email) {
        throw new Error("You must be signed in.");
      }

      const normalizedName = name?.trim();
      const normalizedRoll = roll?.trim();
      const normalizedSection = section?.trim();
      const normalizedDept = dept?.trim();

      if (!normalizedName || !normalizedRoll || !normalizedSection || !normalizedDept) {
        throw new Error("All profile fields are required.");
      }

      if (!rollRegex.test(normalizedRoll)) {
        throw new Error("Invalid roll format (use 25-06-034)");
      }

      setProfileSubmitError(null);
      setProfileSubmitLoading(true);

      try {
        const normalizedEmail = getUserDocIdFromEmail(email);
        if (!normalizedEmail) {
          throw new Error("A valid email is required.");
        }
        const userDocId = normalizedEmail;
        const duplicateEmailDoc = await findDuplicateUserByEmail(normalizedEmail, [
          userDocId,
          userId
        ]);
        if (duplicateEmailDoc) {
          throw new Error("This email is already registered.");
        }

        const emailIsAdmin = normalizeEmails(settings.adminEmails).includes(normalizedEmail);

        await setDoc(
          doc(db, COLLECTIONS.USERS, userDocId),
          {
            name: normalizedName,
            roll: normalizedRoll,
            section: normalizedSection,
            dept: normalizedDept,
            isGuest: normalizedRoll === "00-00-000",
            uid: userId,
            email: normalizedEmail,
            displayName: normalizedName,
            photoURL: firebaseUser.photoURL ?? "",
            role: emailIsAdmin ? "admin" : "user",
            isApproved: false,
            votesUsedByRound: {},
            votedDesignIdsByRound: {},
            submittedRounds: {},
            submittedAtByRound: {},
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            lastLoginAt: serverTimestamp(),
          },
          { merge: true }
        );

        
        setNeedsProfileSetup(false);

          setProfile({
            uid: userId,
            email: normalizedEmail,
            displayName: normalizedName,
            name: normalizedName,
            roll: normalizedRoll,
            section: normalizedSection,
            dept: normalizedDept,
            isGuest: normalizedRoll === "00-00-000",
            isApproved: false,
            role: emailIsAdmin ? "admin" : "user",
            photoURL: firebaseUser.photoURL ?? ""
          });
          
      } catch (error) {
        setProfileSubmitError(error.message ?? "Failed to save profile.");
        throw error;
      } finally {
        setProfileSubmitLoading(false);
      }

    },
    [firebaseUser, settings.adminEmails, findDuplicateUserByEmail]
  );

  const signInWithGoogle = useCallback(async () => {
    setAuthError(null);
    await signInWithPopup(auth, googleProvider);
  }, []);

  const logout = useCallback(async () => {
    await signOut(auth);
  }, []);

  const isAdmin =
    profile?.role === "admin" ||
    normalizeEmails(settings.adminEmails).includes(firebaseUser?.email?.toLowerCase() ?? "");

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
