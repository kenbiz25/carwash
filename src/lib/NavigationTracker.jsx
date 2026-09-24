import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { api } from '@/api/firebaseClient';
import { pagesConfig } from '@/pages.config';
import { PUBLIC_PAGES } from '@/lib/publicPages';
import { loadGoogleTags, trackPageview } from '@/lib/googleTags';

export default function NavigationTracker() {
    const location = useLocation();
    const { isAuthenticated } = useAuth();
    const { Pages, mainPage } = pagesConfig;
    const mainPageKey = mainPage ?? Object.keys(Pages)[0];

    // Log user activity when navigating to a page
    useEffect(() => {
        // Extract page name from pathname
        const pathname = location.pathname;
        let pageName;

        if (pathname === '/' || pathname === '') {
            pageName = mainPageKey;
        } else {
            // Remove leading slash and get the first segment
            const pathSegment = pathname.replace(/^\//, '').split('/')[0];

            // Try case-insensitive lookup in Pages config
            const pageKeys = Object.keys(Pages);
            const matchedKey = pageKeys.find(
                key => key.toLowerCase() === pathSegment.toLowerCase()
            );

            pageName = matchedKey || null;
        }

        if (isAuthenticated && pageName) {
            api.appLogs.logUserInApp(pageName).catch(() => {
                // Silently fail - logging shouldn't break the app
            });
        }

        // GA4 + AdSense only load for public-facing pages (the marketing
        // site, branch pages, customer portal) - never for the authenticated
        // staff/manager dashboard. A null pageName means the route didn't
        // match any known internal page key, which is either a public
        // per-branch page (/njiru, /kayole, ...) or a 404 - both public, in
        // the sense that neither is gated by ProtectedRoute.
        const isPublicPage = !pageName || PUBLIC_PAGES.has(pageName);
        if (isPublicPage) {
            loadGoogleTags();
            trackPageview({ path: location.pathname + location.search, title: pageName || document.title });
        }
    }, [location, isAuthenticated, Pages, mainPageKey]);

    return null;
}