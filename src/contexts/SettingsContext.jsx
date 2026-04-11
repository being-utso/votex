import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState
} from "react";
import { doc, onSnapshot, runTransaction, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import {
  COLLECTIONS,
  DEFAULT_SETTINGS,
  SETTINGS_DOC_ID
} from "../lib/constants";
import { normalizeEmails } from "../lib/formatters";

const SettingsContext = createContext(null);

const normalizeSettings = (data = {}) => {
  const hasAdminEmails = Object.prototype.hasOwnProperty.call(data, "adminEmails");
  const showResults =
    typeof data.showResults === "boolean"
      ? data.showResults
      : Boolean(data.resultsPublished);

  const adminRaw =
    hasAdminEmails && Array.isArray(data.adminEmails)
      ? data.adminEmails
      : DEFAULT_SETTINGS.adminEmails;

  return {
    ...DEFAULT_SETTINGS,
    ...data,
    showResults,
    resultsPublished: showResults,
    adminEmails: normalizeEmails(adminRaw)
  };
};

const normalizeEmailInput = (value) => {
  if (Array.isArray(value)) {
    return normalizeEmails(value);
  }

  if (typeof value === "string") {
    return normalizeEmails(value.split(","));
  }

  return [];
};

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const settingsRef = doc(db, COLLECTIONS.SETTINGS, SETTINGS_DOC_ID);

    const unsubscribe = onSnapshot(
      settingsRef,
      (snapshot) => {
        const data = snapshot.exists() ? snapshot.data() : {};
        setSettings(normalizeSettings(data));
        setLoading(false);
        setError(null);
      },
      (snapshotError) => {
        setError(snapshotError.message ?? "Unable to load app settings.");
        setLoading(false);
      }
    );

    return unsubscribe;
  }, []);

  const updateSettings = useCallback(async (partialSettings) => {
    const settingsRef = doc(db, COLLECTIONS.SETTINGS, SETTINGS_DOC_ID);
    const payload = {
      ...partialSettings,
      updatedAt: serverTimestamp()
    };

    if ("adminEmails" in partialSettings) {
      payload.adminEmails = normalizeEmailInput(partialSettings.adminEmails);
    }

    if ("showResults" in partialSettings && !("resultsPublished" in partialSettings)) {
      payload.resultsPublished = Boolean(partialSettings.showResults);
    }

    if ("resultsPublished" in partialSettings && !("showResults" in partialSettings)) {
      payload.showResults = Boolean(partialSettings.resultsPublished);
    }

    await setDoc(settingsRef, payload, { merge: true });
  }, []);

  const moveToNextRound = useCallback(async () => {
    const settingsRef = doc(db, COLLECTIONS.SETTINGS, SETTINGS_DOC_ID);

    await runTransaction(db, async (transaction) => {
      const snapshot = await transaction.get(settingsRef);
      const current = snapshot.exists() ? normalizeSettings(snapshot.data()) : DEFAULT_SETTINGS;
      const nextRound = Number(current.currentRound || 1) + 1;

      transaction.set(
        settingsRef,
        {
          currentRound: nextRound,
          votingOpen: true,
          showResults: false,
          resultsPublished: false,
          updatedAt: serverTimestamp()
        },
        { merge: true }
      );
    });
  }, []);

  const value = useMemo(
    () => ({
      settings,
      loading,
      error,
      updateSettings,
      moveToNextRound
    }),
    [settings, loading, error, updateSettings, moveToNextRound]
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error("useSettings must be used inside SettingsProvider");
  }

  return context;
}
