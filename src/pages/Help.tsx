import { useState } from "react";
import { 
  HelpCircle, 
  MessageSquare, 
  Mail, 
  ChevronRight,
  BookOpen,
  Shield,
  CreditCard,
  TrendingUp
} from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Header } from "@/components/layout/Header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    question: "How does the AI chart analysis work?",
    answer: "Upload a screenshot of your trading chart, select the trading pair, and our AI will analyze patterns, trends, and provide you with entry points, stop-loss, and take-profit recommendations."
  },
  {
    question: "How do I deposit funds?",
    answer: "Go to Finances from the menu, select your preferred payment method, and follow the instructions. Once you upload proof of payment, our team will verify and credit your account within 24 hours."
  },
  {
    question: "What is live trading?",
    answer: "Live trading allows you to execute trades directly on our platform. You can choose between demo mode to practice or real mode to trade with actual funds."
  },
  {
    question: "How do withdrawals work?",
    answer: "You can request withdrawals from your profile. Minimum withdrawal amount applies. Processing typically takes 24-48 hours on business days."
  },
  {
    question: "Is my money safe?",
    answer: "Yes, we use industry-standard security measures to protect your funds and personal information. All transactions are encrypted and monitored."
  },
  {
    question: "What trading pairs are available?",
    answer: "We support major forex pairs like XAU/USD (Gold), EUR/USD, GBP/USD, and various cryptocurrency pairs."
  },
];

const helpCategories = [
  { icon: TrendingUp, label: "Trading Help", path: "/patterns" },
  { icon: CreditCard, label: "Deposits & Withdrawals", path: "/deposit" },
  { icon: Shield, label: "Account Security", path: "/profile" },
  { icon: BookOpen, label: "Getting Started", path: "/screenshot-guide" },
];

const Help = () => {
  const handleContact = () => {
    window.open("mailto:support@felansfx.lovable.app", "_blank");
  };

  return (
    <AppLayout>
      <Header title="Help Center" showBack />
      <div className="px-4 py-6 space-y-6">
        {/* Header */}
        <div className="text-center py-4">
          <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-primary/10 flex items-center justify-center">
            <HelpCircle className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-xl font-bold">How can we help?</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Find answers to common questions or contact support
          </p>
        </div>

        {/* Quick Links */}
        <div className="grid grid-cols-2 gap-3">
          {helpCategories.map((cat) => (
            <Card key={cat.label} className="border-0 shadow-sm">
              <CardContent className="p-4 flex flex-col items-center text-center">
                <cat.icon className="w-6 h-6 text-primary mb-2" />
                <span className="text-sm font-medium">{cat.label}</span>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* FAQs */}
        <div>
          <h3 className="font-semibold mb-3">Frequently Asked Questions</h3>
          <Accordion type="single" collapsible className="space-y-2">
            {faqs.map((faq, index) => (
              <AccordionItem 
                key={index} 
                value={`faq-${index}`}
                className="bg-muted/50 rounded-lg border-0 px-4"
              >
                <AccordionTrigger className="text-sm font-medium text-left hover:no-underline">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>

        {/* Contact Support */}
        <Card className="border-0 shadow-md bg-primary/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-3 mb-3">
              <MessageSquare className="w-5 h-5 text-primary" />
              <span className="font-medium">Still need help?</span>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Our support team is available to assist you with any questions or issues.
            </p>
            <Button 
              onClick={handleContact}
              className="w-full gradient-primary"
            >
              <Mail className="w-4 h-4 mr-2" />
              Contact Support
            </Button>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default Help;
