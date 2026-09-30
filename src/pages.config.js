/**
 * pages.config.js - Page routing configuration
 *
 * Every page is lazy-loaded (React.lazy) so a visitor only downloads the
 * code for the page they open - the landing page no longer pulls in the
 * dashboard, charts, maps, PDF/Excel export and so on. App.jsx wraps routes
 * in <Suspense>. To add a page, add a lazy() line and a PAGES entry below.
 *
 * mainPage controls which page is shown at "/". It must match a PAGES key.
 */
import { lazy } from 'react';
import __Layout from './Layout.jsx';

const CCTV = lazy(() => import('./pages/CCTV'));
const Commissions = lazy(() => import('./pages/Commissions'));
const Login = lazy(() => import('./pages/Login'));
const CustomerPortal = lazy(() => import('./pages/CustomerPortal'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Expenses = lazy(() => import('./pages/Expenses'));
const Help = lazy(() => import('./pages/Help'));
const Inventory = lazy(() => import('./pages/Inventory'));
const Landing = lazy(() => import('./pages/Landing'));
const Loyalty = lazy(() => import('./pages/Loyalty'));
const Memberships = lazy(() => import('./pages/Memberships'));
const Payments = lazy(() => import('./pages/Payments'));
const Profile = lazy(() => import('./pages/Profile'));
const Reports = lazy(() => import('./pages/Reports'));
const Services = lazy(() => import('./pages/Services'));
const Staff = lazy(() => import('./pages/Staff'));
const WashDetails = lazy(() => import('./pages/WashDetails'));
const Washes = lazy(() => import('./pages/Washes'));
const SuperAdminDashboard = lazy(() => import('./pages/SuperAdminDashboard'));
const ProductCatalogue = lazy(() => import('./pages/ProductCatalogue'));
const BusinessManager = lazy(() => import('./pages/BusinessManager'));
const SuperAdminBusinessView = lazy(() => import('./pages/SuperAdminBusinessView'));
const JoinBusiness = lazy(() => import('./pages/JoinBusiness'));
const CustomerHistory = lazy(() => import('./pages/CustomerHistory'));
const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy'));
const TermsOfService = lazy(() => import('./pages/TermsOfService'));
const CreateBusiness = lazy(() => import('./pages/CreateBusiness'));
const TrackCar = lazy(() => import('./pages/TrackCar'));

export const PAGES = {
    "CCTV": CCTV,
    "Commissions": Commissions,
    "CustomerPortal": CustomerPortal,
    "Dashboard": Dashboard,
    "Expenses": Expenses,
    "Help": Help,
    "Inventory": Inventory,
    "Landing": Landing,
    "Loyalty": Loyalty,
    "Memberships": Memberships,
    "Payments": Payments,
    "Profile": Profile,
    "Reports": Reports,
    "Services": Services,
    "Staff": Staff,
    "WashDetails": WashDetails,
    "Washes": Washes,
    "SuperAdminDashboard": SuperAdminDashboard,
    "ProductCatalogue": ProductCatalogue,
    "BusinessManager": BusinessManager,
    "SuperAdminBusinessView": SuperAdminBusinessView,
    "JoinBusiness": JoinBusiness,
    "CustomerHistory": CustomerHistory,
    "PrivacyPolicy": PrivacyPolicy,
    "TermsOfService": TermsOfService,
    "CreateBusiness": CreateBusiness,
    "TrackCar": TrackCar,
    "Login": Login,
}

export const pagesConfig = {
    mainPage: "Landing",
    Pages: PAGES,
    Layout: __Layout,
};