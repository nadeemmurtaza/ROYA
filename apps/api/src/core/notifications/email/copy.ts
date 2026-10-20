import { BRAND, DEFAULT_LOCALE } from '@newax/shared';
import type { Locale } from '@newax/shared';

/**
 * Email wording, in both languages the storefront ships.
 *
 * One interface, two implementations, so a string added to English fails the
 * build until Arabic has it too. Translations drift the moment that stops being
 * enforced, and a half-Arabic order confirmation reads worse than an English one.
 *
 * Anything with a value in it is a function rather than a string, so word order
 * stays the translator's decision — Arabic does not put the number where
 * English does.
 */
export interface EmailCopy {
  orderConfirmed: {
    subject: (orderNumber: string) => string;
    heading: string;
    intro: string;
    cta: string;
    summary: string;
    stitchingNote: string;
  };
  awaitingPayment: {
    title: string;
    intro: (amount: string) => string;
    sendScreenshot: (whatsapp: string) => string;
    afterVerification: string;
  };
  paymentReceived: {
    subject: (orderNumber: string) => string;
    heading: string;
    intro: (amount: string) => string;
  };
  paymentFailed: {
    subject: (orderNumber: string) => string;
    heading: string;
    intro: (orderNumber: string) => string;
    cta: string;
  };
  welcome: {
    subject: string;
    heading: string;
    intro: (name: string) => string;
    cta: string;
  };
  status: {
    subject: (orderNumber: string, status: string) => string;
    heading: (status: string) => string;
    intro: (orderNumber: string, status: string) => string;
    words: Record<string, string>;
  };
  orderShipped: {
    subject: (orderNumber: string) => string;
    heading: string;
    intro: (orderNumber: string) => string;
  };
  orderDelivered: {
    subject: (orderNumber: string) => string;
    heading: string;
    intro: (orderNumber: string) => string;
    note: string;
  };
  orderCancelled: {
    subject: (orderNumber: string) => string;
    heading: string;
    intro: (orderNumber: string) => string;
    refundNote: string;
  };
  paymentRefunded: {
    subject: (orderNumber: string) => string;
    heading: string;
    intro: (orderNumber: string, amount: string) => string;
  };
  passwordChanged: {
    subject: string;
    heading: string;
    intro: string;
  };
  /** A personal API key's secret was issued — at create or at rotate (163-personal-api-keys.md). */
  apiKeyIssued: {
    subject: string;
    heading: string;
    /** `lastFour` identifies the key; the key's own name is deliberately never in this mail. */
    created: (lastFour: string, surface: 'ADMIN' | 'STOREFRONT') => string;
    rotated: (lastFour: string, surface: 'ADMIN' | 'STOREFRONT') => string;
    notYou: string;
    cta: string;
  };
  /**
   * An existing account was linked to a single sign-on identity at its first
   * sign-in that way (161-sso-identity-federation.md). Names no identity
   * provider and no credential — only that a new way in exists, and what to
   * do if it was not them.
   */
  ssoAccountLinked: {
    subject: string;
    heading: string;
    intro: string;
    notYou: string;
  };
  passwordReset: {
    subject: string;
    heading: string;
    intro: string;
    cta: string;
    expiry: string;
  };
  emailVerification: {
    subject: string;
    heading: string;
    intro: string;
    cta: string;
  };
  /** Default call-to-action for marketing mail with no order or reset link to point at. */
  shopNow: string;
  marketing: {
    abandonedCartFirstTouch: { subject: string; heading: string; intro: string; cta: string };
    abandonedCartReminder: { subject: string; heading: string; intro: string; cta: string };
    abandonedCartIncentive: {
      subject: string;
      heading: string;
      intro: string;
      cta: string;
      discountTitle: string;
      discountBody: (label: string) => string;
    };
    abandonedBrowse: { subject: string; heading: string; intro: string; cta: string };
    reviewRequest: {
      subject: string;
      heading: string;
      intro: (orderNumber: string) => string;
      cta: string;
    };
    crossSell: {
      subject: string;
      heading: string;
      intro: string;
      introBasedOn: (basedOn: string) => string;
      cta: string;
    };
    replenishment: {
      subject: (productName: string) => string;
      heading: string;
      intro: (productName: string) => string;
      cta: string;
    };
    campaign: {
      holidayBadge: string;
      launchBadge: string;
      flashSaleBadge: string;
      expiresNote: (expiresAt: string) => string;
    };
    /**
     * Footer line every automated marketing send carries — the
     * CAN-SPAM/consent-law minimum. Two plain strings, not a template with
     * an embedded link: the link itself is built by html.ts's footerLink(),
     * which escapes the URL and label separately rather than through
     * paragraph()'s esc(), which would turn a raw <a> into visible markup.
     */
    unsubscribeLine: string;
    unsubscribeCta: string;
  };
  stitching: {
    readySubject: (garment: string) => string;
    stageSubject: (garment: string, stage: string) => string;
    heading: string;
    stages: Record<string, string>;
  };
  /** The bespoke commission's progress: ROYA's own stages, not the workshop's. */
  commission: {
    subject: (title: string, stage: string) => string;
    heading: string;
    stages: Record<string, string>;
  };
  totals: {
    subtotal: string;
    stitching: string;
    discount: string;
    shipping: string;
    codFee: string;
    total: string;
  };
  details: {
    customerInformation: string;
    shippingAddress: string;
    billingAddress: string;
    payment: string;
    shippingMethod: string;
    orderNumber: string;
  };
  /** Keyed by Payment.provider. */
  paymentMethods: Record<string, string>;
  shippingFeeLabel: string;
  footer: (storeName: string, contact: string) => string;
  /** Inbox preview line. Kept short — most clients cut it around 90 characters. */
  viewOrder: string;
}

const en: EmailCopy = {
  orderConfirmed: {
    subject: (orderNumber) => `Order ${orderNumber} confirmed`,
    heading: 'Thank you for your order!',
    intro:
      'We are getting your order ready. We will let you know as soon as it is on its way.',
    cta: 'View your order',
    summary: 'Order summary',
    stitchingNote: 'Stitched to your measurements',
  },
  awaitingPayment: {
    title: 'Payment pending',
    intro: (amount) =>
      `Please transfer ${amount} to the account below. Your order is confirmed once we verify the payment.`,
    sendScreenshot: (whatsapp) =>
      `After paying, send the screenshot on WhatsApp: ${whatsapp}`,
    afterVerification: 'Work on your order begins as soon as the transfer clears.',
  },
  paymentReceived: {
    subject: (orderNumber) => `Payment received for ${orderNumber}`,
    heading: 'Payment received',
    intro: (amount) =>
      `We have received your payment of ${amount}. Your order is confirmed and we are preparing it now.`,
  },
  paymentFailed: {
    subject: (orderNumber) => `Payment did not go through — ${orderNumber}`,
    heading: 'Payment did not go through',
    intro: (orderNumber) =>
      `Your payment for order ${orderNumber} could not be completed. Please try again, or reply to this email and we will help sort it out.`,
    cta: 'Try again',
  },
  welcome: {
    subject: `Welcome to ${BRAND.identity.shortName}`,
    heading: 'Your account is ready',
    intro: (name) =>
      `Hi ${name}, your account is ready. You can now save your measurements, track orders and check out faster next time.`,
    cta: 'Start shopping',
  },
  status: {
    subject: (orderNumber, status) => `${orderNumber} — ${status}`,
    heading: (status) => `Your order is ${status}`,
    intro: (orderNumber, status) => `Order ${orderNumber} is now ${status}.`,
    words: {
      PENDING: 'pending',
      CONFIRMED: 'confirmed',
      PROCESSING: 'being prepared',
      SHIPPED: 'on its way',
      DELIVERED: 'delivered',
      CANCELLED: 'cancelled',
      RETURNED: 'returned',
    },
  },
  stitching: {
    readySubject: (garment) => `Your ${garment} is ready`,
    stageSubject: (garment, stage) => `Your ${garment}: ${stage}`,
    heading: 'An update from the atelier',
    stages: {
      RECEIVED: 'received by the atelier',
      CUTTING: 'being cut',
      STITCHING: 'being stitched',
      QC: 'being checked',
      READY: 'ready',
      DISPATCHED: 'on its way',
    },
  },
  commission: {
    subject: (title, stage) => `${title}: ${stage}`,
    heading: 'Your gown has moved on',
    stages: {
      CONSULTATION: 'in consultation',
      DESIGN: 'being designed',
      CORSET: 'in the corset stage',
      FLORALS: 'having its florals sculpted',
      FITTING: 'ready for its final fitting',
    },
  },
  orderShipped: {
    subject: (orderNumber) => `${orderNumber} is on its way`,
    heading: 'Your order is on its way',
    intro: (orderNumber) =>
      `Order ${orderNumber} has left our atelier and is with the courier. It may take a day or two to reach you, and the courier may call to confirm delivery before it arrives.`,
  },
  orderDelivered: {
    subject: (orderNumber) => `${orderNumber} has been delivered`,
    heading: 'Delivered!',
    intro: (orderNumber) => `Order ${orderNumber} has been delivered.`,
    note: 'We hope you love it. If anything is not right, just reply to this email and we will sort it out.',
  },
  orderCancelled: {
    subject: (orderNumber) => `${orderNumber} has been cancelled`,
    heading: 'Your order was cancelled',
    intro: (orderNumber) => `Order ${orderNumber} has been cancelled.`,
    refundNote:
      'Your payment for this order will be refunded. Our team will process it manually to your original payment method — you will get a separate email once it is done.',
  },
  paymentRefunded: {
    subject: (orderNumber) => `Refund processed for ${orderNumber}`,
    heading: 'Your refund has been processed',
    intro: (orderNumber, amount) =>
      `We have processed a refund of ${amount} for order ${orderNumber}. Depending on your bank, it can take a few business days to appear.`,
  },
  passwordChanged: {
    subject: 'Your password was changed',
    heading: 'Your password was changed',
    intro:
      'Your password was just changed. If this was you, no action is needed. If it was not, contact us right away — reply to this email.',
  },
  apiKeyIssued: {
    subject: 'A new API key was issued for your account',
    heading: 'A new API key was issued for your account',
    created: (lastFour, surface) =>
      `A new ${surface === 'ADMIN' ? 'admin' : 'store'} API key ending in ${lastFour} was just created on your account. Whoever holds it can act as you, within the access it was given.`,
    rotated: (lastFour, surface) =>
      `Your ${surface === 'ADMIN' ? 'admin' : 'store'} API key was just given a new secret, ending in ${lastFour}. The old secret no longer works.`,
    notYou:
      'If this was you, no action is needed. If it was not, revoke the key now, change your password, and reply to this email.',
    cta: 'Review your API keys',
  },
  ssoAccountLinked: {
    subject: `Single sign-on was linked to your ${BRAND.identity.shortName} account`,
    heading: 'A new way to sign in was added to your account',
    intro: `Your ${BRAND.identity.shortName} account can now be signed in to through your organization's single sign-on. It was linked the first time this email address signed in that way.`,
    notYou:
      'If this was you, no action is needed. If it was not, reply to this email right away — we will remove it and sign you out everywhere.',
  },
  passwordReset: {
    subject: 'Reset your password',
    heading: 'Reset your password',
    intro:
      'We received a request to reset your password. Click the button below to choose a new one. If you did not request this, you can ignore this email.',
    cta: 'Reset password',
    expiry: 'This link expires in one hour.',
  },
  emailVerification: {
    subject: 'Confirm your email address',
    heading: 'Confirm your email address',
    intro: 'Click the button below to confirm this is your email address.',
    cta: 'Confirm email',
  },
  shopNow: 'Shop now',
  marketing: {
    abandonedCartFirstTouch: {
      subject: 'Still in your cart',
      heading: 'You left this behind',
      intro: 'Just a quick nudge — these items are still saved in your cart.',
      cta: 'View your cart',
    },
    abandonedCartReminder: {
      subject: 'You left something in your cart',
      heading: 'Still thinking it over?',
      intro: 'You left these items in your cart. They are still here whenever you are ready.',
      cta: 'Return to your cart',
    },
    abandonedCartIncentive: {
      subject: 'A little something to complete your order',
      heading: 'Your cart, with a discount',
      intro:
        'Your items are still waiting. Here is a discount to help you complete your order.',
      cta: 'Complete your order',
      discountTitle: 'Your discount',
      discountBody: (label) => `Use this code at checkout: ${label}`,
    },
    abandonedBrowse: {
      subject: 'Still interested in these?',
      heading: 'Pick up where you left off',
      intro: 'You looked at these recently. They are still available.',
      cta: 'Continue browsing',
    },
    reviewRequest: {
      subject: 'How was your order?',
      heading: "We'd love your feedback",
      intro: (orderNumber) =>
        `Your order ${orderNumber} was delivered a little while ago. We'd love to hear how it went — just reply to this email and let us know.`,
      cta: 'View your order',
    },
    crossSell: {
      subject: 'You might also like these',
      heading: 'Picked for you',
      intro: 'Based on what you have shopped for, these might be worth a look.',
      introBasedOn: (basedOn) => `Since you bought ${basedOn}, these might be worth a look.`,
      cta: 'Shop the picks',
    },
    replenishment: {
      subject: (productName) => `Running low on ${productName}?`,
      heading: 'Time for a restock?',
      intro: (productName) =>
        `It has been a while since you ordered ${productName}. If you are running low, it is one click away.`,
      cta: 'Order again',
    },
    campaign: {
      holidayBadge: 'Sale',
      launchBadge: 'New arrival',
      flashSaleBadge: 'Limited time',
      expiresNote: (expiresAt) => `Offer ends ${expiresAt}.`,
    },
    unsubscribeLine: "Don't want emails like this?",
    unsubscribeCta: 'Unsubscribe',
  },
  totals: {
    subtotal: 'Subtotal',
    stitching: 'Stitching',
    discount: 'Discount',
    shipping: 'Shipping',
    codFee: 'Cash on delivery fee',
    total: 'Total',
  },
  details: {
    customerInformation: 'Customer information',
    shippingAddress: 'Shipping address',
    billingAddress: 'Billing address',
    payment: 'Payment',
    shippingMethod: 'Shipping method',
    orderNumber: 'Order number',
  },
  paymentMethods: {
    cod: 'Cash on delivery',
    bank_transfer: 'Bank deposit',
    jazzcash: 'JazzCash',
    easypaisa: 'Easypaisa',
  },
  shippingFeeLabel: 'Shipping fee',
  footer: (storeName, contact) =>
    `If you have any questions, reply to this email or contact us at ${contact}. — ${storeName}`,
  viewOrder: 'View your order',
};

/**
 * Arabic wording. DRAFT: written for ROYA and not yet read by a native
 * speaker (docs/OPEN-QUESTIONS.md). It addresses the customer in the formal
 * plural ("طلبكم"), which is the register luxury houses use and avoids
 * gendered second-person forms. Brand names are never typed here: they come
 * from BRAND.
 */
const ar: EmailCopy = {
  orderConfirmed: {
    subject: (orderNumber) => `تم تأكيد الطلب ${orderNumber}`,
    heading: 'شكرًا لطلبكم!',
    intro: 'نقوم بتجهيز طلبكم الآن، وسنوافيكم بالتحديثات فور انطلاقه.',
    cta: 'عرض طلبكم',
    summary: 'ملخص الطلب',
    stitchingNote: 'مُفصَّل وفق قياساتكم',
  },
  awaitingPayment: {
    title: 'بانتظار الدفع',
    intro: (amount) =>
      `يرجى تحويل ${amount} إلى الحساب أدناه. يتم تأكيد طلبكم بعد التحقق من الدفعة.`,
    sendScreenshot: (whatsapp) => `بعد التحويل، أرسلوا لقطة الشاشة عبر واتساب: ${whatsapp}`,
    afterVerification: 'يبدأ العمل على طلبكم فور وصول التحويل.',
  },
  paymentReceived: {
    subject: (orderNumber) => `تم استلام الدفعة للطلب ${orderNumber}`,
    heading: 'تم استلام الدفعة',
    intro: (amount) =>
      `استلمنا دفعتكم بمبلغ ${amount}. تم تأكيد طلبكم ونعمل على تجهيزه الآن.`,
  },
  paymentFailed: {
    subject: (orderNumber) => `لم تكتمل عملية الدفع — ${orderNumber}`,
    heading: 'لم تكتمل عملية الدفع',
    intro: (orderNumber) =>
      `تعذّر إتمام الدفع للطلب ${orderNumber}. يرجى المحاولة مرة أخرى، أو الرد على هذا البريد وسنساعدكم.`,
    cta: 'حاولوا مرة أخرى',
  },
  welcome: {
    subject: `مرحبًا بكم في ${BRAND.identity.nameUr}`,
    heading: 'حسابكم جاهز',
    intro: (name) =>
      `مرحبًا ${name}، حسابكم جاهز. يمكنكم الآن حفظ قياساتكم وتتبّع طلباتكم وإتمام الشراء بسرعة أكبر في المرة القادمة.`,
    cta: 'ابدؤوا التسوّق',
  },
  status: {
    subject: (orderNumber, status) => `${orderNumber} — ${status}`,
    heading: (status) => `طلبكم ${status}`,
    intro: (orderNumber, status) => `الطلب ${orderNumber} الآن ${status}.`,
    words: {
      PENDING: 'قيد الانتظار',
      CONFIRMED: 'مؤكَّد',
      PROCESSING: 'قيد التجهيز',
      SHIPPED: 'في الطريق إليكم',
      DELIVERED: 'تم تسليمه',
      CANCELLED: 'ملغى',
      RETURNED: 'تم إرجاعه',
    },
  },
  stitching: {
    // Gender-neutral on purpose: `garment` is a noun of either gender.
    readySubject: (garment) => `اكتمل تجهيز ${garment}`,
    stageSubject: (garment, stage) => `${garment}: ${stage}`,
    heading: 'تحديث من الأتيليه',
    stages: {
      RECEIVED: 'وصل إلى الأتيليه',
      CUTTING: 'قيد القصّ',
      STITCHING: 'قيد الخياطة',
      QC: 'قيد الفحص',
      READY: 'جاهز',
      DISPATCHED: 'في الطريق إليكم',
    },
  },
  commission: {
    subject: (title, stage) => `${title}: ${stage}`,
    heading: 'تقدّم العمل على فستانكِ',
    stages: {
      CONSULTATION: 'في مرحلة الاستشارة',
      DESIGN: 'قيد التصميم',
      CORSET: 'في مرحلة الكورسيه',
      FLORALS: 'تُنحَت زهوره الآن',
      FITTING: 'جاهز للبروفة الأخيرة',
    },
  },
  orderShipped: {
    subject: (orderNumber) => `${orderNumber} في الطريق إليكم`,
    heading: 'طلبكم في الطريق إليكم',
    intro: (orderNumber) =>
      `غادر الطلب ${orderNumber} الأتيليه وهو الآن مع شركة التوصيل. قد يستغرق وصوله يومًا أو يومين، وقد يتصل بكم المندوب لتأكيد التسليم قبل وصوله.`,
  },
  orderDelivered: {
    subject: (orderNumber) => `تم تسليم ${orderNumber}`,
    heading: 'تم التسليم!',
    intro: (orderNumber) => `تم تسليم الطلب ${orderNumber}.`,
    note: 'نأمل أن ينال إعجابكم. وإن كانت لديكم أي ملاحظة، يكفي أن تردّوا على هذا البريد وسنتولى الأمر.',
  },
  orderCancelled: {
    subject: (orderNumber) => `تم إلغاء ${orderNumber}`,
    heading: 'تم إلغاء طلبكم',
    intro: (orderNumber) => `تم إلغاء الطلب ${orderNumber}.`,
    refundNote:
      'سيتم رد قيمة هذا الطلب. سيعالج فريقنا الاسترداد يدويًا إلى وسيلة الدفع الأصلية، وستصلكم رسالة منفصلة عند اكتماله.',
  },
  paymentRefunded: {
    subject: (orderNumber) => `تمت معالجة استرداد ${orderNumber}`,
    heading: 'تمت معالجة استرداد المبلغ',
    intro: (orderNumber, amount) =>
      `عالجنا استرداد مبلغ ${amount} للطلب ${orderNumber}. وبحسب مصرفكم، قد يستغرق ظهوره بضعة أيام عمل.`,
  },
  passwordChanged: {
    subject: 'تم تغيير كلمة المرور',
    heading: 'تم تغيير كلمة المرور',
    intro:
      'تم تغيير كلمة مرور حسابكم للتو. إن كنتم أنتم من قام بذلك فلا حاجة لأي إجراء، وإن لم تكونوا فتواصلوا معنا فورًا بالرد على هذا البريد.',
  },
  apiKeyIssued: {
    subject: 'تم إصدار مفتاح API جديد لحسابكم',
    heading: 'تم إصدار مفتاح API جديد لحسابكم',
    created: (lastFour, surface) =>
      `تم للتو إنشاء مفتاح API ${surface === 'ADMIN' ? 'للإدارة' : 'للمتجر'} جديد ينتهي بالرقم ${lastFour} في حسابكم. يستطيع من يملكه التصرف باسمكم ضمن الصلاحيات الممنوحة له.`,
    rotated: (lastFour, surface) =>
      `تم للتو إصدار سرّ جديد لمفتاح API ${surface === 'ADMIN' ? 'للإدارة' : 'للمتجر'} الخاص بكم، وهو ينتهي بالرقم ${lastFour}. لم يعد السر القديم صالحًا.`,
    notYou:
      'إن كنتم أنتم من قام بذلك فلا حاجة لأي إجراء. وإن لم تكونوا، فألغوا المفتاح الآن وغيّروا كلمة المرور وردّوا على هذا البريد.',
    cta: 'مراجعة مفاتيح API',
  },
  ssoAccountLinked: {
    subject: `تم ربط تسجيل الدخول الموحّد بحسابكم في ${BRAND.identity.nameUr}`,
    heading: 'تمت إضافة طريقة جديدة لتسجيل الدخول إلى حسابكم',
    intro: `يمكنكم الآن الدخول إلى حسابكم في ${BRAND.identity.nameUr} عبر تسجيل الدخول الموحّد الخاص بمؤسستكم. تم الربط عند أول دخول بهذه الطريقة باستخدام عنوان البريد الإلكتروني هذا.`,
    notYou:
      'إن كنتم أنتم من قام بذلك فلا حاجة لأي إجراء. وإن لم تكونوا، فردّوا على هذا البريد فورًا — سنزيل الربط ونُنهي جميع جلساتكم.',
  },
  passwordReset: {
    subject: 'إعادة تعيين كلمة المرور',
    heading: 'إعادة تعيين كلمة المرور',
    intro:
      'وصلنا طلب لإعادة تعيين كلمة المرور. اضغطوا على الزر أدناه لاختيار كلمة مرور جديدة. وإن لم تقدّموا هذا الطلب فتجاهلوا هذا البريد.',
    cta: 'إعادة تعيين كلمة المرور',
    expiry: 'تنتهي صلاحية هذا الرابط خلال ساعة واحدة.',
  },
  emailVerification: {
    subject: 'تأكيد عنوان بريدكم الإلكتروني',
    heading: 'تأكيد عنوان بريدكم الإلكتروني',
    intro: 'اضغطوا على الزر أدناه لتأكيد أن هذا هو عنوان بريدكم الإلكتروني.',
    cta: 'تأكيد البريد الإلكتروني',
  },
  shopNow: 'تسوّقوا الآن',
  marketing: {
    abandonedCartFirstTouch: {
      subject: 'ما زالت في حقيبتكم',
      heading: 'تركتم هذه القطع',
      intro: 'تذكير لطيف: هذه القطع ما زالت محفوظة في حقيبتكم.',
      cta: 'عرض حقيبتكم',
    },
    abandonedCartReminder: {
      subject: 'تركتم شيئًا في حقيبتكم',
      heading: 'ما زلتم تفكّرون؟',
      intro: 'تركتم هذه القطع في حقيبتكم، وستبقى هنا متى كنتم جاهزين.',
      cta: 'العودة إلى حقيبتكم',
    },
    abandonedCartIncentive: {
      subject: 'لفتة صغيرة لإتمام طلبكم',
      heading: 'حقيبتكم، مع خصم',
      intro: 'قطعكم في انتظاركم. إليكم خصمًا يساعدكم على إتمام الطلب.',
      cta: 'أتمّوا طلبكم',
      discountTitle: 'خصمكم',
      discountBody: (label) => `استخدموا هذا الرمز عند الدفع: ${label}`,
    },
    abandonedBrowse: {
      subject: 'هل ما زلتم مهتمين بهذه القطع؟',
      heading: 'تابعوا من حيث توقفتم',
      intro: 'تصفّحتم هذه القطع مؤخرًا، وهي ما زالت متاحة.',
      cta: 'متابعة التصفّح',
    },
    reviewRequest: {
      subject: 'كيف كانت تجربتكم؟',
      heading: 'يسعدنا سماع رأيكم',
      intro: (orderNumber) =>
        `تم تسليم طلبكم ${orderNumber} منذ فترة قصيرة. يسعدنا أن نعرف كيف كانت التجربة، يكفي الرد على هذا البريد.`,
      cta: 'عرض طلبكم',
    },
    crossSell: {
      subject: 'قد تعجبكم هذه القطع',
      heading: 'اخترناها لكم',
      intro: 'بناءً على ما تسوّقتم له، قد تستحق هذه القطع نظرة.',
      introBasedOn: (basedOn) => `بما أنكم اشتريتم ${basedOn}، قد تستحق هذه القطع نظرة.`,
      cta: 'تصفّحوا الاختيارات',
    },
    replenishment: {
      subject: (productName) => `هل يوشك ${productName} على النفاد؟`,
      heading: 'حان وقت التجديد؟',
      intro: (productName) =>
        `مضى وقت منذ طلبتم ${productName}. إن كان يوشك على النفاد فهو على بُعد نقرة واحدة.`,
      cta: 'اطلبوا مجددًا',
    },
    campaign: {
      holidayBadge: 'تخفيضات',
      launchBadge: 'جديد',
      flashSaleBadge: 'لفترة محدودة',
      expiresNote: (expiresAt) => `ينتهي العرض في ${expiresAt}.`,
    },
    unsubscribeLine: 'لا ترغبون في استلام رسائل كهذه؟',
    unsubscribeCta: 'إلغاء الاشتراك',
  },
  totals: {
    subtotal: 'المجموع الفرعي',
    stitching: 'الخياطة',
    discount: 'الخصم',
    shipping: 'التوصيل',
    codFee: 'رسوم الدفع عند الاستلام',
    total: 'الإجمالي',
  },
  details: {
    customerInformation: 'معلومات العميل',
    shippingAddress: 'عنوان التوصيل',
    billingAddress: 'عنوان الفوترة',
    payment: 'الدفع',
    shippingMethod: 'طريقة التوصيل',
    orderNumber: 'رقم الطلب',
  },
  paymentMethods: {
    cod: 'الدفع عند الاستلام',
    bank_transfer: 'تحويل مصرفي',
    jazzcash: 'JazzCash',
    easypaisa: 'Easypaisa',
  },
  shippingFeeLabel: 'رسوم التوصيل',
  footer: (storeName, contact) =>
    `لأي استفسار، ردّوا على هذا البريد أو تواصلوا معنا على ${contact}. — ${storeName}`,
  viewOrder: 'عرض طلبكم',
};

/**
 * One copy set per shipped locale. Typed as a Record over Locale, so a locale
 * added to BRAND.locale.locales fails the build until it has wording.
 */
const COPY: Record<Locale, EmailCopy> = { en, ar };

export function copyFor(locale: Locale | null | undefined): EmailCopy {
  return COPY[locale ?? DEFAULT_LOCALE] ?? en;
}
