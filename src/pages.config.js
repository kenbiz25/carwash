/**
 * pages.config.js - Page routing configuration
 * 
 * This file is AUTO-GENERATED. Do not add imports or modify PAGES manually.
 * Pages are auto-registered when you create files in the ./pages/ folder.
 * 
 * THE ONLY EDITABLE VALUE: mainPage
 * This controls which page is the landing page (shown when users visit the app).
 * 
 * Example file structure:
 * 
 *   import HomePage from './pages/HomePage';
 *   import Dashboard from './pages/Dashboard';
 *   import Settings from './pages/Settings';
 *   
 *   export const PAGES = {
 *       "HomePage": HomePage,
 *       "Dashboard": Dashboard,
 *       "Settings": Settings,
 *   }
 *   
 *   export const pagesConfig = {
 *       mainPage: "HomePage",
 *       Pages: PAGES,
 *   };
 * 
 * Example with Layout (wraps all pages):
 *
 *   import Home from './pages/Home';
 *   import Settings from './pages/Settings';
 *   import __Layout from './Layout.jsx';
 *
 *   export const PAGES = {
 *       "Home": Home,
 *       "Settings": Settings,
 *   }
 *
 *   export const pagesConfig = {
 *       mainPage: "Home",
 *       Pages: PAGES,
 *       Layout: __Layout,
 *   };
 *
 * To change the main page from HomePage to Dashboard, use find_replace:
 *   Old: mainPage: "HomePage",
 *   New: mainPage: "Dashboard",
 *
 * The mainPage value must match a key in the PAGES object exactly.
 */
import CCTV from './pages/CCTV';
import Commissions from './pages/Commissions';
import Login from './pages/Login';
import CustomerPortal from './pages/CustomerPortal';
import Dashboard from './pages/Dashboard';
import Expenses from './pages/Expenses';
import Help from './pages/Help';
import Inventory from './pages/Inventory';
import Landing from './pages/Landing';
import Loyalty from './pages/Loyalty';
import Memberships from './pages/Memberships';
import Payments from './pages/Payments';
import Profile from './pages/Profile';
import Reports from './pages/Reports';
import Services from './pages/Services';
import Staff from './pages/Staff';
import WashDetails from './pages/WashDetails';
import Washes from './pages/Washes';
import SuperAdminDashboard from './pages/SuperAdminDashboard';
import ProductCatalogue from './pages/ProductCatalogue';
import BusinessManager from './pages/BusinessManager';
import SuperAdminBusinessView from './pages/SuperAdminBusinessView';
import JoinBusiness from './pages/JoinBusiness';
import CustomerHistory from './pages/CustomerHistory';
import PrivacyPolicy from './pages/PrivacyPolicy';
import TermsOfService from './pages/TermsOfService';
import CreateBusiness from './pages/CreateBusiness';
import TrackCar from './pages/TrackCar';
import __Layout from './Layout.jsx';


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