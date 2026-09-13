import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import Logo from "@/components/common/Logo";
import { ArrowLeft, Shield } from "@/lib/icons";

const EFFECTIVE_DATE = "1 March 2025";
const COMPANY = "BGO Shine Hub";
const CONTACT_EMAIL = "bgoshinehubltd@gmail.com";
const CONTACT_PHONE = "+254 757 234 111";
const WEBSITE = "carwashmanage.com";

const Section = ({ title, children }) => (
  <section className="mb-8">
    <h2 className="text-lg font-semibold text-slate-800 mb-3 pb-2 border-b border-slate-200">{title}</h2>
    <div className="space-y-3 text-slate-600 text-sm leading-relaxed">{children}</div>
  </section>
);

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-brand-navy text-white py-12 px-4">
        <div className="max-w-3xl mx-auto">
          <Link to={createPageUrl("Landing")} className="inline-flex items-center gap-2 text-brand-blue-pale hover:text-white text-sm mb-6 transition-colors">
            <ArrowLeft className="h-4 w-4" /> Back to Home
          </Link>
          <div className="flex items-center gap-3 mb-3">
            <div className="h-10 w-10 rounded-xl bg-brand-orange/20 flex items-center justify-center">
              <Shield className="h-5 w-5 text-brand-orange" />
            </div>
            <Logo size="default" />
          </div>
          <h1 className="text-3xl font-bold mt-4">Privacy Policy</h1>
          <p className="text-brand-blue-pale mt-2 text-sm">Effective date: {EFFECTIVE_DATE}</p>
        </div>
      </header>

      {/* Body */}
      <main className="max-w-3xl mx-auto px-4 py-10">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8">

          <p className="text-slate-600 text-sm leading-relaxed mb-8">
            This Privacy Policy explains how <strong>{COMPANY}</strong> ("we", "us", or "our"), operated at <strong>{WEBSITE}</strong>, collects, uses, stores, and protects your personal information when you use our car wash management platform. By using our services you agree to the practices described in this policy.
          </p>

          <Section title="1. Information We Collect">
            <p><strong>Account information:</strong> When you register, we collect your name, email address, and password (stored securely via Firebase Authentication).</p>
            <p><strong>Business information:</strong> Business name, location, contact details, and other details you provide when setting up your car wash profile.</p>
            <p><strong>Operational data:</strong> Wash records, job orders, payment transactions, customer loyalty data, staff profiles, inventory, and service catalogue entries that you create within the platform.</p>
            <p><strong>Usage data:</strong> Log data including pages visited, features used, and actions taken within the platform to help us improve the service.</p>
            <p><strong>Device information:</strong> Browser type, operating system, and IP address for security and analytics purposes.</p>
          </Section>

          <Section title="2. How We Use Your Information">
            <p>We use your information to:</p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>Provide, maintain, and improve the {COMPANY} platform.</li>
              <li>Process and display your car wash transactions and business records.</li>
              <li>Send service-related communications such as invitations, account confirmations, and system notifications.</li>
              <li>Respond to support requests and enquiries.</li>
              <li>Analyse platform usage to improve features and user experience.</li>
              <li>Comply with legal obligations under Kenyan law.</li>
            </ul>
          </Section>

          <Section title="3. Data Storage and Security">
            <p>Your data is stored securely on <strong>Google Firebase</strong> (Firestore, Authentication, and Storage), hosted on Google Cloud infrastructure with data centres in the United States and Europe. Google Cloud is certified to ISO 27001, SOC 2 Type II, and other leading security standards.</p>
            <p>We implement industry-standard security measures including encrypted connections (HTTPS/TLS), role-based access controls, and Firestore security rules that ensure each business only accesses its own data.</p>
            <p>No method of electronic transmission or storage is 100% secure. While we strive to protect your personal information, we cannot guarantee absolute security.</p>
          </Section>

          <Section title="4. Data Sharing">
            <p>We do <strong>not sell, rent, or trade</strong> your personal information to third parties.</p>
            <p>We may share information with:</p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li><strong>Service providers:</strong> Google Firebase (cloud infrastructure), Resend (transactional email delivery), and payment processors (Safaricom M-Pesa Daraja API, Stripe) as required to operate the platform.</li>
              <li><strong>Business team members:</strong> Data you create is accessible to other staff members you invite to your business account.</li>
              <li><strong>Legal authorities:</strong> Where required by law or in response to lawful requests from Kenyan government or law enforcement authorities.</li>
            </ul>
          </Section>

          <Section title="5. Your Rights (Kenya Data Protection Act 2019)">
            <p>Under the Kenya Data Protection Act, 2019, you have the right to:</p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li><strong>Access:</strong> Request a copy of the personal data we hold about you.</li>
              <li><strong>Correction:</strong> Request correction of inaccurate or incomplete data.</li>
              <li><strong>Deletion:</strong> Request deletion of your account and associated data. To delete your account, contact us at {CONTACT_EMAIL}.</li>
              <li><strong>Portability:</strong> Request your data in a machine-readable format.</li>
              <li><strong>Object:</strong> Object to processing of your personal data for certain purposes.</li>
            </ul>
            <p>To exercise any of these rights, contact us using the details in Section 9.</p>
          </Section>

          <Section title="6. Cookies and Tracking">
            <p>We use browser local storage to remember your preferences (e.g., selected business, dark mode). We do not use tracking cookies for advertising purposes.</p>
            <p>Our landing page may use Google Analytics to measure traffic patterns. Google Analytics data is aggregated and anonymised.</p>
          </Section>

          <Section title="7. Data Retention">
            <p>We retain your personal data for as long as your account is active. If you close your account, we will delete your data within <strong>30 days</strong>, except where we are required by law to retain it longer.</p>
            <p>Business operational records (wash records, payments, etc.) may be retained for up to <strong>7 years</strong> for tax and audit compliance purposes under Kenyan law.</p>
          </Section>

          <Section title="8. Children's Privacy">
            <p>{COMPANY} is a business management platform intended for use by adults operating car wash businesses. We do not knowingly collect personal information from individuals under the age of 18. If you believe a minor has provided us with personal information, please contact us immediately.</p>
          </Section>

          <Section title="9. Contact Us">
            <p>If you have questions, concerns, or requests regarding this Privacy Policy, please contact us:</p>
            <div className="bg-slate-50 rounded-xl p-4 mt-3 space-y-1">
              <p><strong>{COMPANY}</strong></p>
              <p>Email: <a href={`mailto:${CONTACT_EMAIL}`} className="text-brand-blue-mid hover:underline">{CONTACT_EMAIL}</a></p>
              <p>Phone: <a href={`tel:${CONTACT_PHONE.replace(/\s/g,'')}`} className="text-brand-blue-mid hover:underline">{CONTACT_PHONE}</a></p>
              <p>Location: Nairobi, Kenya</p>
            </div>
          </Section>

          <Section title="10. Changes to This Policy">
            <p>We may update this Privacy Policy from time to time. We will notify registered users of material changes via email or an in-app notification. The effective date at the top of this page reflects the date of the latest revision. Continued use of the platform after changes constitutes acceptance of the updated policy.</p>
          </Section>

        </div>
      </main>

      <footer className="text-center py-6 text-slate-400 text-xs">
        © {new Date().getFullYear()} {COMPANY} · <Link to={createPageUrl("TermsOfService")} className="hover:text-slate-600">Terms of Service</Link>
      </footer>
    </div>
  );
}
