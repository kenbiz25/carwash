import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "sonner";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClientInstance } from "@/lib/query-client";
import NavigationTracker from "@/lib/NavigationTracker";
import { pagesConfig } from "./pages.config";
import { BrowserRouter as Router, Route, Routes, Navigate } from "react-router-dom";
import PageNotFound from "./lib/PageNotFound";
import { AuthProvider, useAuth } from "@/lib/AuthContext";
import { BusinessProvider } from "@/lib/BusinessContext";
import ErrorBoundary from "@/lib/ErrorBoundary";
import BranchPage from "@/pages/BranchPage";

const { Pages, Layout, mainPage } = pagesConfig;
const mainPageKey = mainPage ?? Object.keys(Pages)[0];
const MainPage = mainPageKey ? Pages[mainPageKey] : <></>;

// Pages that don't require authentication (must match keys in pages.config)
const PUBLIC_PAGES = new Set(["Landing", "Login", "CustomerPortal", "JoinBusiness", "PrivacyPolicy", "TermsOfService", "TrackCar"]);

// Pages that require super-admin (must match keys in pages.config)
const SUPER_ADMIN_PAGES = new Set(["SuperAdminDashboard", "SuperAdminBusinessView", "CreateBusiness"]);

const FullScreenLoader = () => (
  <div className="fixed inset-0 flex items-center justify-center">
    <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
  </div>
);

const LayoutWrapper = ({ children, currentPageName }) =>
  Layout ? <Layout currentPageName={currentPageName}>{children}</Layout> : <>{children}</>;

const ProtectedRoute = ({ children, pageName }) => {
  const { isAuthenticated, isLoadingAuth } = useAuth();

  if (isLoadingAuth) return <FullScreenLoader />;

  if (!isAuthenticated && !PUBLIC_PAGES.has(pageName)) {
    return <Navigate to="/Login" replace />;
  }

  return children;
};

// Super-admin guard (supports either user.role or user.user_role)
const SuperAdminRoute = ({ children }) => {
  const { user, isLoadingAuth } = useAuth();

  if (isLoadingAuth) return <FullScreenLoader />;

  const role = user?.role || user?.user_role;
  const isAdmin = role === "admin";

  if (!isAdmin) return <Navigate to="/Dashboard" replace />;

  return children;
};

const AuthenticatedApp = () => {
  const { isLoadingAuth } = useAuth();

  if (isLoadingAuth) return <FullScreenLoader />;

  return (
    <Routes>
      <Route
        path="/"
        element={
          <ProtectedRoute pageName={mainPageKey}>
            <LayoutWrapper currentPageName={mainPageKey}>
              <MainPage />
            </LayoutWrapper>
          </ProtectedRoute>
        }
      />

      {Object.entries(Pages).map(([path, Page]) => {
        const isAdminOnly = SUPER_ADMIN_PAGES.has(path);

        return (
          <Route
            key={path}
            path={`/${path}`}
            element={
              <ProtectedRoute pageName={path}>
                {isAdminOnly ? (
                  <SuperAdminRoute>
                    <LayoutWrapper currentPageName={path}>
                      <Page />
                    </LayoutWrapper>
                  </SuperAdminRoute>
                ) : (
                  <LayoutWrapper currentPageName={path}>
                    <Page />
                  </LayoutWrapper>
                )}
              </ProtectedRoute>
            }
          />
        );
      })}

      {/* Public per-branch page (e.g. /njiru) - a static path above (e.g. /Landing,
          /Login) always outranks this dynamic segment in React Router's matching,
          so it only catches slugs that aren't one of the named pages above. */}
      <Route path="/:slug" element={<BranchPage />} />

      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <QueryClientProvider client={queryClientInstance}>
          <BusinessProvider>
            <Router>
              <NavigationTracker />
              <AuthenticatedApp />
            </Router>

            <Toaster />
            <SonnerToaster richColors position="top-right" closeButton />
          </BusinessProvider>
        </QueryClientProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;