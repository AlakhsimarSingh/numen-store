export interface FaqItem {
  question: string;
  answer: string;
}

export interface FaqCategory {
  key: string;
  title: string;
  items: FaqItem[];
}

export const faqCategories: FaqCategory[] = [
  {
    key: "orders-shipping",
    title: "Orders & Shipping",
    items: [
      {
        question: "How long does shipping take?",
        answer:
          "Standard delivery takes 4–6 business days across most locations. Once your order ships, you'll get a tracking link by email so you can follow it the whole way.",
      },
      {
        question: "How do I track my order?",
        answer:
          "Go to Account → Orders on our website and select your order to see live status — processing, shipped, or delivered. You'll also receive email updates at each stage.",
      },
      {
        question: "Do you offer free shipping?",
        answer:
          "Yes — orders above our free shipping threshold ship at no extra cost. Orders below that threshold have a small flat shipping fee, shown clearly at checkout before you pay.",
      },
      {
        question: "Can I cancel or change my order after placing it?",
        answer:
          "If your order hasn't shipped yet, contact us right away through the Contact Us page and we'll do our best to update or cancel it. Once it's out for delivery, a return after arrival is the way to go instead.",
      },
      {
        question: "Do you ship internationally?",
        answer:
          "Currently we ship within the countries listed at checkout. If your country isn't available at checkout, we don't yet deliver there — reach out to our support team and we'll let you know if that changes.",
      },
      {
        question: "What if my order arrives damaged or incomplete?",
        answer:
          "Contact us within 48 hours of delivery with a photo of the item and packaging, and we'll sort out a replacement or refund — no return shipping cost to you in that case.",
      },
    ],
  },
  {
    key: "returns-exchanges",
    title: "Returns & Exchanges",
    items: [
      {
        question: "What is your return policy?",
        answer:
          "You have 30 days from the delivery date to return or exchange any item, as long as it's unworn, unwashed, and has its original tags attached. Start a return anytime from Account → Orders.",
      },
      {
        question: "How do I exchange an item for a different size?",
        answer:
          "Request a return from your Orders page, choose 'exchange' as the reason, and specify the size you need. Once we receive the original item, we'll ship the replacement size.",
      },
      {
        question: "When will I get my refund?",
        answer:
          "Refunds are processed within 5–7 business days of us receiving your returned item, back to your original payment method. Cash on Delivery orders are refunded via bank transfer or store credit.",
      },
      {
        question: "Do I have to pay for return shipping?",
        answer:
          "Returns due to a genuine defect or wrong item shipped are free. Returns for reasons like sizing or change of mind may have a small return shipping deduction — this is always shown clearly before you confirm the return.",
      },
      {
        question: "Are sale or discounted items returnable?",
        answer:
          "Yes, items bought at a discount or with a promo code follow the same 30-day return policy as full-price items, unless the product page specifically states 'final sale.'",
      },
    ],
  },
  {
    key: "sizing-fit",
    title: "Sizing & Fit",
    items: [
      {
        question: "How do I find my correct size?",
        answer:
          "Every product page has a Size Chart tab with detailed measurements for that specific item — check it before ordering, since fit can vary between styles like jackets, tees, and joggers.",
      },
      {
        question: "Do NUMEN products run true to size?",
        answer:
          "Most of our fits run true to size. If you're between sizes, we generally recommend sizing up for jackets and pullovers, and staying true to size for t-shirts and pants — but always check the specific product's size chart for the most accurate fit.",
      },
      {
        question: "Can I save my sizes for faster checkout?",
        answer:
          "Yes — go to Account → Profile and save your top, bottom, and shoe sizes. Our ECHO assistant and product recommendations will use these automatically to help with fit questions.",
      },
      {
        question: "What if the size I ordered doesn't fit?",
        answer:
          "No problem — you're covered by our 30-day exchange policy. Request a size exchange from your Orders page and we'll send the correct size once we receive the original.",
      },
    ],
  },
  {
    key: "payments",
    title: "Payments & Pricing",
    items: [
      {
        question: "What payment methods do you accept?",
        answer:
          "We accept all major debit and credit cards (Visa, Mastercard, RuPay, and more), UPI (by ID or QR code), and Cash on Delivery (COD) for eligible orders.",
      },
      {
        question: "Is Cash on Delivery (COD) available?",
        answer:
          "Yes, COD is available on most orders and locations. A small COD handling fee applies, shown clearly at checkout before you confirm your order.",
      },
      {
        question: "Is it safe to pay online on this website?",
        answer:
          "Yes. All card and UPI payments are processed through Razorpay, a secure and RBI-regulated payment gateway. We never see or store your card number, CVC, or UPI PIN — that information goes directly to the payment provider, not our servers.",
      },
      {
        question: "Do you have any ongoing discounts or promo codes?",
        answer:
          "We regularly run promo codes for new customers and seasonal sales — check our homepage announcement bar or subscribe to our newsletter to get notified about active discounts.",
      },
      {
        question: "Why was my payment declined?",
        answer:
          "This is usually due to your bank declining the transaction (insufficient funds, daily limit reached, or a security flag) rather than an issue on our end. Try a different payment method, or contact your bank. If the issue continues, reach out to our support team with the approximate time of the attempt.",
      },
    ],
  },
  {
    key: "product-authenticity",
    title: "Products & Authenticity",
    items: [
      {
        question: "Are NUMEN products original and authentic?",
        answer:
          "Yes — every product sold on NUMEN is our own original design, manufactured to our specifications. We're not a reseller of other brands, so what you see is exactly what we make and stand behind.",
      },
      {
        question: "Is NUMEN a genuine, trustworthy website?",
        answer:
          "Yes. We're a real, operating store with verified customer support, secure payment processing through Razorpay, and a transparent 30-day return policy. You can reach our team anytime through the Contact Us page for any concern before or after ordering.",
      },
      {
        question: "Are your prices affordable, or is this a premium/luxury brand?",
        answer:
          "NUMEN sits in the premium-but-accessible space — quality materials and construction at prices well below traditional luxury streetwear, without the inflated markup. We publish honest pricing with no hidden fees.",
      },
      {
        question: "How do I know if an item is in stock?",
        answer:
          "Every product page shows real-time stock status. If an item shows low stock or is sold out, you can still browse similar recommendations, or check back — we restock popular items regularly.",
      },
    ],
  },
  {
    key: "account-security",
    title: "Account & Security",
    items: [
      {
        question: "Do I need an account to place an order?",
        answer:
          "Yes, a free account lets us keep your order history, saved addresses, and sizes in one place, and lets you track orders and manage returns easily. Signing up takes under a minute with just your email.",
      },
      {
        question: "I didn't receive my login link — what do I do?",
        answer:
          "Check your spam/promotions folder first — login links sometimes land there. Links expire after 15 minutes, so if it's been longer, just request a new one from the login page.",
      },
      {
        question: "Is my personal information safe with NUMEN?",
        answer:
          "Yes. We never sell your data, passwords are securely hashed (never stored in plain text), and payment details are handled entirely by our PCI-compliant payment processor, not stored on our servers.",
      },
      {
        question: "How do I delete my account or data?",
        answer:
          "Contact our support team through the Contact Us page with an account deletion request, and we'll process it and confirm once complete.",
      },
    ],
  },
];