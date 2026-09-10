import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import Logo from "@/components/common/Logo";
import { 
  Search, 
  Smartphone, 
  Video, 
  Users, 
  CreditCard,
  HelpCircle,
  MessageCircle,
  Mail,
  Phone,
  ArrowLeft,
  ChevronRight
} from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

const faqCategories = [
  {
    title: "Getting Started",
    icon: HelpCircle,
    faqs: [
      {
        question: "How do I set up my car wash business?",
        answer: "Go to Settings > Business to enter your car wash name, location, and number of bays. Then add your services with pricing in the Services page, and add your staff members in the Staff page."
      },
      {
        question: "How do I add a new wash/check-in a vehicle?",
        answer: "Click the 'Quick Check-In' button on the Dashboard or Washes page. Enter the plate number, select services, assign a staff member, and optionally take a before photo. The wash will appear in your queue."
      },
      {
        question: "What's the workflow for a typical wash?",
        answer: "1. Check-in vehicle (enters 'Waiting' status), 2. Start washing (click 'Start Washing'), 3. Complete wash (click 'Mark Done'), 4. Process payment (M-Pesa, Cash, or Card), 5. Vehicle marked as 'Paid' and exits."
      }
    ]
  },
  {
    title: "M-Pesa Payments",
    icon: Smartphone,
    faqs: [
      {
        question: "How does M-Pesa payment work?",
        answer: "When processing payment, select M-Pesa and enter the customer's phone number. An STK Push prompt will be sent to their phone. Once they enter their PIN, the payment is confirmed automatically and the wash is marked as paid."
      },
      {
        question: "How do I set up M-Pesa integration?",
        answer: "Go to Settings > M-Pesa and enter your Till Number or Paybill. For full STK Push integration (automatic confirmation), you'll need to configure Safaricom Daraja API credentials. Contact support for enterprise setup."
      },
      {
        question: "What if M-Pesa payment fails?",
        answer: "If the customer cancels or enters wrong PIN, the payment will show as 'Failed'. You can retry by sending another STK Push, or switch to cash/card payment."
      },
      {
        question: "How do I reconcile M-Pesa payments?",
        answer: "Check the Payments page to see all M-Pesa transactions with receipt numbers. You can filter by date and payment method. Compare with your M-Pesa statement for reconciliation."
      }
    ]
  },
  {
    title: "Live CCTV",
    icon: Video,
    faqs: [
      {
        question: "How do I add CCTV cameras?",
        answer: "Go to Live CCTV > Add Camera. Enter a name (e.g., 'Bay 1'), the stream URL from your camera, and select the stream type (MJPEG, HTTP, YouTube Live, or iframe embed)."
      },
      {
        question: "What camera types are supported?",
        answer: "We support MJPEG streams (most IP cameras), HTTP snapshot URLs, YouTube Live embeds, and iframe embeds (for cloud cameras like Hikvision Cloud, Dahua DMSS). RTSP streams require server-side transcoding."
      },
      {
        question: "Where do I find my camera's stream URL?",
        answer: "For IP cameras: Check your camera's web interface or manual for MJPEG/snapshot URL (usually like http://camera-ip/mjpg/video.mjpg). For cloud cameras: Use the embed/share URL from your camera app."
      }
    ]
  },
  {
    title: "Staff Management",
    icon: Users,
    faqs: [
      {
        question: "How do commissions work?",
        answer: "Each staff member has a commission rate (e.g., 10%). When they complete a wash, they earn that percentage of the service total. Track commissions in the Staff page and Reports."
      },
      {
        question: "Can staff have different roles?",
        answer: "Yes! Staff can be Washers (do the washing), Cashiers (handle payments), Supervisors (oversee operations), or Managers (full access). Each role can have different commission rates."
      },
      {
        question: "How do I track staff performance?",
        answer: "The Dashboard shows top performers today. For detailed reports, go to Reports to see each staff member's washes completed, revenue generated, and commissions earned."
      }
    ]
  },
  {
    title: "Inventory & Operations",
    icon: CreditCard,
    faqs: [
      {
        question: "How do I track inventory?",
        answer: "Go to Inventory to add items like shampoo, polish, towels. Set quantities, unit costs, and low-stock thresholds. Get alerts when stock runs low."
      },
      {
        question: "Can I auto-deduct inventory per wash?",
        answer: "Set 'Usage Per Wash' for each inventory item. The system will show estimated usage based on washes. Manual stock adjustments can be done with the +/- buttons."
      },
      {
        question: "How does the loyalty program work?",
        answer: "Add customers by phone number to the Loyalty program. Track their visits, award points, and see their spending history. Customers earn tiers (Bronze, Silver, Gold, VIP) based on visits."
      }
    ]
  }
];

export default function Help() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState(null);

  const filteredFaqs = searchQuery
    ? faqCategories.flatMap(cat => 
        cat.faqs.filter(faq => 
          faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
          faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
        ).map(faq => ({ ...faq, category: cat.title }))
      )
    : [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-emerald-50 dark:from-slate-900 dark:to-slate-800">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-600 to-cyan-600 text-white py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <Link to={createPageUrl("Landing")} className="inline-block mb-6">
            <Logo size="lg" />
          </Link>
          <h1 className="text-3xl md:text-4xl font-bold mb-4">
            How can we help you?
          </h1>
          <p className="text-emerald-100 mb-8">
            Find answers to common questions about BGO Shine Hub
          </p>
          
          {/* Search */}
          <div className="relative max-w-xl mx-auto">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
            <Input
              placeholder="Search for help..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 h-14 text-lg bg-white text-slate-900 border-0 shadow-lg"
            />
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Search Results */}
        {searchQuery && (
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
              Search Results ({filteredFaqs.length})
            </h2>
            {filteredFaqs.length === 0 ? (
              <Card className="p-6 text-center bg-white dark:bg-slate-800 border-0">
                <p className="text-slate-500">No results found for "{searchQuery}"</p>
              </Card>
            ) : (
              <Card className="bg-white dark:bg-slate-800 border-0 shadow-sm">
                <Accordion type="single" collapsible>
                  {filteredFaqs.map((faq, index) => (
                    <AccordionItem key={index} value={`search-${index}`}>
                      <AccordionTrigger className="px-6 hover:no-underline">
                        <div className="text-left">
                          <p className="font-medium">{faq.question}</p>
                          <p className="text-xs text-slate-500 mt-1">{faq.category}</p>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="px-6 pb-4 text-slate-600 dark:text-slate-400">
                        {faq.answer}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </Card>
            )}
          </div>
        )}

        {/* Categories Grid */}
        {!searchQuery && !selectedCategory && (
          <div className="grid md:grid-cols-2 gap-4 mb-12">
            {faqCategories.map((category) => (
              <Card 
                key={category.title}
                className="p-6 bg-white dark:bg-slate-800 border-0 shadow-sm hover:shadow-md cursor-pointer transition-all"
                onClick={() => setSelectedCategory(category)}
              >
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-emerald-100 to-cyan-100 dark:from-emerald-900/30 dark:to-cyan-900/30 flex items-center justify-center">
                    <category.icon className="h-6 w-6 text-emerald-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-slate-900 dark:text-white">
                      {category.title}
                    </h3>
                    <p className="text-sm text-slate-500">
                      {category.faqs.length} articles
                    </p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-slate-400" />
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Selected Category */}
        {!searchQuery && selectedCategory && (
          <div>
            <Button 
              variant="ghost" 
              className="mb-4"
              onClick={() => setSelectedCategory(null)}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to all topics
            </Button>
            
            <div className="flex items-center gap-4 mb-6">
              <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-emerald-100 to-cyan-100 flex items-center justify-center">
                <selectedCategory.icon className="h-6 w-6 text-emerald-600" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                {selectedCategory.title}
              </h2>
            </div>

            <Card className="bg-white dark:bg-slate-800 border-0 shadow-sm">
              <Accordion type="single" collapsible className="w-full">
                {selectedCategory.faqs.map((faq, index) => (
                  <AccordionItem key={index} value={`item-${index}`}>
                    <AccordionTrigger className="px-6 hover:no-underline text-left">
                      {faq.question}
                    </AccordionTrigger>
                    <AccordionContent className="px-6 pb-4 text-slate-600 dark:text-slate-400">
                      {faq.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </Card>
          </div>
        )}

        {/* Contact Section */}
        <Card className="mt-12 p-8 bg-gradient-to-r from-emerald-500 to-cyan-500 border-0 text-white">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-2">Still need help?</h2>
            <p className="text-emerald-100 mb-6">
              Our support team is here to assist you
            </p>
            <div className="flex flex-col md:flex-row justify-center gap-4">
              <a href="https://wa.me/254757234111" target="_blank" rel="noopener noreferrer">
                <Button variant="secondary" className="bg-white text-emerald-600 hover:bg-emerald-50 w-full">
                  <MessageCircle className="h-4 w-4 mr-2" />
                  WhatsApp: 0757 234 111
                </Button>
              </a>
              <a href="mailto:bgoshinehubltd@gmail.com">
                <Button variant="secondary" className="bg-white text-emerald-600 hover:bg-emerald-50 w-full">
                  <Mail className="h-4 w-4 mr-2" />
                  bgoshinehubltd@gmail.com
                </Button>
              </a>
              <a href="tel:+254757234111">
                <Button variant="secondary" className="bg-white text-emerald-600 hover:bg-emerald-50 w-full">
                  <Phone className="h-4 w-4 mr-2" />
                  Call +254 757 234 111
                </Button>
              </a>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}