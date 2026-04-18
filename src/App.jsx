import { Navigate, Route, Routes } from "react-router-dom";
import Navbar from "./components/Navbar";
import AuthScreen from "./components/AuthScreen";
import ProfileSetupScreen from "./components/ProfileSetupScreen";
import ApprovalPendingScreen from "./components/ApprovalPendingScreen";
import { useAuth } from "./contexts/AuthContext";
import { useSettings } from "./contexts/SettingsContext";
import GalleryPage from "./pages/GalleryPage";
import AdminPage from "./pages/AdminPage";
import AdminRoute from "./routes/AdminRoute";
import Footer from "./components/Footer";

function FullPageLoader() {
  return (
    <div className="app-screen">
      <div className="panel-surface w-full max-w-md text-center">
        <div className="mx-auto h-12 w-12 animate-spin rounded-full border-2 border-accent/30 border-t-accent" />
        <p className="mt-4 text-sm text-textMuted">Syncing secure voting workspace...</p>
      </div>
    </div>
  );
}

export default function App() {
  const {
    firebaseUser,
    profile,
    loading: authLoading,
    authError,
    logout,
    needsProfileSetup,
    profileSubmitLoading,
    profileSubmitError,
    submitProfile
  } = useAuth();
  const { loading: settingsLoading, error: settingsError } = useSettings();

  if (authLoading || settingsLoading) {
    return <FullPageLoader />;
  }

  if (!firebaseUser) {
    return <AuthScreen error={authError ?? settingsError} />;
  }

  if (needsProfileSetup) {
    return (
      <ProfileSetupScreen
        email={firebaseUser.email ?? ""}
        initialName={firebaseUser.displayName ?? ""}
        onSubmit={submitProfile}
        submitting={profileSubmitLoading}
        error={profileSubmitError ?? authError}
      />
    );
  }

  const approvalPending = profile?.isApproved !== true;
  if (approvalPending) {
    return <ApprovalPendingScreen onSignOut={logout} />;
  }

  return (
    <div className="app-shell">
      <Navbar />
      <main className="app-main">
        <div className="layout-stack">
          {settingsError ? (
            <div className="rounded-xl border border-danger/50 bg-danger/10 px-4 py-3 text-sm text-red-100">
              {settingsError}
            </div>
          ) : null}
          <Routes>
            <Route path="/" element={<GalleryPage />} />
            <Route
              path="/admin"
              element={
                <AdminRoute>
                  <AdminPage />
                </AdminRoute>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          <Footer />
        </div>
      </main>
    </div>
  );
}
