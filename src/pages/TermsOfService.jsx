import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import Logo from "@/components/common/Logo";
import { ArrowLeft, FileText } from "lucide-react";

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

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-brand-navy text-white py-12 px-4">
        <div className="max-w-3xl mx-auto">
          <Link to={createPageUrl("Landing")} className="inline-flex items-center gap-2 text-brand-blue-pale hover:text-white text-sm mb-6 transition-colors">
            <ArrowLeft className="h-4 w-4" /> Back to Home
          </Link>
          <div className="flex items-center gap-3 mb-3">
            <div className="h-10 w-10 rounded-xl bg-brand-blue-light/20 flex items-center justify-center">
              <FileText className="h-5 w-5 text-brand-blue-light" />
            </div>
            <Logo size="default" />
          </div>
          <h1 className="text-3xl font-bold mt-4">Terms of Service</h1>
          <p className="text-brand-blue-pale mt-2 text-sm">Effective date: {EFFECTIVE_DATE}</p>
        </div>
      </header>

      {/* Body */}
      <main className="max-w-3xl mx-auto px-4 py-10">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8">

          <p className="text-slate-600 text-sm leading-relaxed mb-8">
            Welcome to <strong>{COMPANY}</strong>. These Terms of Service ("Terms") govern your use of our car wash management platform accessible at <strong>{WEBSITE}</strong>. By creating an account or using our services, you agree to be bound by these Terms. Please read them carefully.
          </p>

          <Section title="1. Acceptance of Terms">
            <p>By registering for or using {COMPANY}, you confirm that you are at least 18 years old, have the legal capacity to enter into a binding agreement, and agree to these Terms and our <Link to={createPageUrl("PrivacyPolicy")} className="text-brand-blue-mid hover:underline">Privacy Policy</Link>.</p>
            <p>If you are using the platform on behalf of a business, you represent that you have the authority to bind that business to these Terms.</p>
          </Section>

          <Section title="2. Description of Service">
            <p>{COMPANY} is a cloud-based software-as-a-service (SaaS) platform designed for car wash businesses in Kenya. The platform provides tools for:</p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>Vehicle check-in and wash tracking</li>
              <li>Staff management and commission tracking</li>
              <li>Payment recording and M-Pesa integration</li>
              <li>Customer loyalty programmes</li>
              <li>Inventory and service catalogue management</li>
              <li>Business analytics and reporting</li>
              <li>Multi-branch management</li>
            </ul>
          </Section>

          <Section title="3. Account Registration">
            <p>You must provide accurate, current, and complete information when creating your account. You are responsible for maintaining the confidentiality of your login credentials and for all activities that occur under your account.</p>
            <p>You must notify us immediately at {CONTACT_EMAIL} if you suspect any unauthorised use of your account.</p>
            <p>We reserve the right to suspend or terminate accounts that provide false information or violate these Terms.</p>
          </Section>

          <Section title="4. Subscription Plans and Billing">
            <p>{COMPANY} offers both free and paid subscription plans. Paid plans unlock additional features such as multi-branch management, advanced analytics, and priority support.</p>
            <p><strong>Free plan:</strong> Access to core features with usage limits as described on our pricing page. No credit card required.</p>
            <p><strong>Paid plans:</strong> Billed monthly or annually. Fees are stated in Kenyan Shillings (KES) inclusive of applicable taxes. Payment is accepted via M-Pesa, Stripe, or other payment methods available at checkout.</p>
            <p><strong>Renewals:</strong> Paid subscriptions renew automatically at the end of each billing period unless cancelled before the renewal date.</p>
            <p><strong>Refunds:</strong> Payments are non-refundable except where required by law. If you believe you have been incorrectly charged, contact us within 14 days of the charge.</p>
          </Section>

          <Section title="5. Acceptable Use">
            <p>You agree to use {COMPANY} only for lawful purposes and in accordance with these Terms. You must not:</p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>Use the platform to process fraudulent transactions or misrepresent business information.</li>
              <li>Attempt to gain unauthorised access to other users' accounts or business data.</li>
              <li>Reverse-engineer, copy, or distribute any part of the platform's software.</li>
              <li>Use the platform to store or transmit malicious code or content.</li>
              <li>Violate any applicable Kenyan laws or regulations including the Kenya Data Protection Act, 2019.</li>
              <li>Resell or sublicense access to the platform without our prior written consent.</li>
            </ul>
          </Section>

          <Section title="6. Data Ownership">
            <p>You retain full ownership of all data you enter into {COMPANY} (wash records, customer data, business information, etc.). By using our platform, you grant us a limited licence to store and process your data solely for the purpose of providing the service.</p>
            <p>You can export your data at any time from within the platform. Upon account termination, you may request a data export within 30 days before your data is deleted.</p>
          </Section>

          <Section title="7. Intellectual Property">
            <p>All software, design, trademarks, logos, and content of {COMPANY} are the exclusive property of {COMPANY} or its licensors and are protected by Kenyan and international intellectual property laws.</p>
            <p>Nothing in these Terms grants you any right to use our trademarks, logos, or brand elements without prior written permission.</p>
          </Section>

          <Section title="8. Uptime and Service Availability">
            <p>We aim to maintain a platform uptime of 99.5% per calendar month, excluding scheduled maintenance. Scheduled maintenance will be communicated at least 24 hours in advance where possible.</p>
            <p>We are not liable for downtime caused by third-party service providers (e.g., Google Firebase, M-Pesa API, Stripe), internet service disruptions, or events beyond our reasonable control.</p>
          </Section>

          <Section title="9. Limitation of Liability">
            <p>To the maximum extent permitted by Kenyan law, {COMPANY} shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including loss of profits, data loss, or business interruption, arising from your use of or inability to use the platform.</p>
            <p>Our total cumulative liability to you for any claim arising from these Terms or your use of the platform shall not exceed the total fees you paid to us in the 12 months preceding the claim.</p>
          </Section>

          <Section title="10. Termination">
            <p><strong>By you:</strong> You may cancel your subscription and close your account at any time from the Settings page or by contacting us at {CONTACT_EMAIL}.</p>
            <p><strong>By us:</strong> We may suspend or terminate your account immediately if you violate these Terms, engage in fraudulent activity, or if we discontinue the service. We will provide reasonable notice where possible.</p>
            <p>Upon termination, your right to access the platform ceases. Data will be retained for 30 days following termination to allow for export, then permanently deleted.</p>
          </Section>

          <Section title="11. Governing Law and Disputes">
            <p>These Terms are governed by the laws of <strong>Kenya</strong>. Any dispute arising from or relating to these Terms shall first be resolved through good-faith negotiation. If unresolved within 30 days, disputes shall be referred to the courts of competent jurisdiction in <strong>Nairobi, Kenya</strong>.</p>
          </Section>

          <Section title="12. Changes to These Terms">
            <p>We may update these Terms from time to time to reflect changes in the law, our services, or business practices. We will notify registered users of material changes via email at least 14 days before the changes take effect. Continued use of the platform after the effective date constitutes acceptance of the revised Terms.</p>
          </Section>

          <Section title="13. Contact Us">
            <p>If you have questions about these Terms, please contact us:</p>
            <div className="bg-slate-50 rounded-xl p-4 mt-3 space-y-1">
              <p><strong>{COMPANY}</strong></p>
              <p>Email: <a href={`mailto:${CONTACT_EMAIL}`} className="text-brand-blue-mid hover:underline">{CONTACT_EMAIL}</a></p>
              <p>Phone: <a href={`tel:${CONTACT_PHONE.replace(/\s/g,'')}`} className="text-brand-blue-mid hover:underline">{CONTACT_PHONE}</a></p>
              <p>Location: Nairobi, Kenya</p>
            </div>
          </Section>

        </div>
      </main>

      <footer className="text-center py-6 text-slate-400 text-xs">
        © {new Date().getFullYear()} {COMPANY} · <Link to={createPageUrl("PrivacyPolicy")} className="hover:text-slate-600">Privacy Policy</Link>
      </footer>
    </div>
  );
}
