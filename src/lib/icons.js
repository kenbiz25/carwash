// Central icon module - re-exports Phosphor Icons under the same names the
// app already used from lucide-react, so every call site (`import { X } from
// "@/lib/icons"`) keeps working unchanged. Phosphor doesn't name every icon
// identically to Lucide, so names without a 1:1 match are aliased to the
// closest equivalent (documented inline below). Swapped in for a more
// distinctive, premium look than Lucide's generic outline set - see
// IconContext default weight at the bottom for the app-wide style.
export { IconContext } from "@phosphor-icons/react";

// ── Exact name matches ──────────────────────────────────────────────────────
export {
  ArrowLeft, ArrowRight, Bell, BookOpen, Bus, Calendar, Camera, Car, Check,
  CheckCircle, Circle, Clock, CreditCard, Crown, Download, Eye, FileText,
  Gift, Heart, Image, Infinity, Key, Lock, MapPin, Minus, Moon, Package,
  Pause, Phone, Play, Plus, Printer, Receipt, Repeat, Shield, ShieldCheck,
  Star, Sun, Truck, Upload, User, UserCheck, UserCircle, UserPlus, Users,
  Video, Wallet, Wrench, X,
} from "@phosphor-icons/react";

// ── Aliased equivalents (no identically-named Phosphor icon) ───────────────
export {
  Pulse as Activity,
  WarningCircle as AlertCircle,
  Warning as AlertTriangle,
  Medal as Award,
  SealCheck as BadgeCheck,
  Money as Banknote,
  ChartBar as BarChart3,
  Bicycle as Bike,
  Buildings as Building2,
  CalendarDots as CalendarDays,
  Checks as CheckCheck,
  CheckCircle as CheckCircle2,
  CaretDown as ChevronDown,
  CaretLeft as ChevronLeft,
  CaretRight as ChevronRight,
  CaretUp as ChevronUp,
  ClipboardText as ClipboardCheck,
  ClipboardText as ClipboardEdit,
  ClipboardText as ClipboardList,
  Clock as Clock3,
  CurrencyDollar as DollarSign,
  Drop as Droplets,
  PencilSimple as Edit,
  PencilSimple as Edit2,
  EyeSlash as EyeOff,
  GridFour as Grid3X3,
  DotsSixVertical as GripVertical,
  Question as HelpCircle,
  ClockCounterClockwise as History,
  House as Home,
  Key as KeyRound,
  Stack as Layers,
  SquaresFour as LayoutDashboard,
  Link as Link2,
  CircleNotch as Loader2,
  SignOut as LogOut,
  Envelope as Mail,
  EnvelopeSimpleOpen as MailCheck,
  ArrowsOut as Maximize2,
  List as Menu,
  Chat as MessageCircle,
  DotsThree as MoreHorizontal,
  DotsThreeVertical as MoreVertical,
  NavigationArrow as Navigation,
  Sidebar as PanelLeft,
  ArrowsClockwise as RefreshCw,
  FloppyDisk as Save,
  MagnifyingGlass as Search,
  Gear as Settings,
  DeviceMobile as Smartphone,
  Sparkle as Sparkles,
  Sun as Sunrise,
  SunHorizon as Sunset,
  Trash as Trash2,
  TrendUp as TrendingUp,
  WifiSlash as WifiOff,
} from "@phosphor-icons/react";
