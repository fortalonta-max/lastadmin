import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type Locale = "en" | "ar";

type Dict = Record<string, string>;

const en: Dict = {
  "nav.home": "Home",
  "nav.boxes": "Boxes",
  "nav.flavors": "Flavors",
  "nav.buildbox": "Build Box",
  "nav.products": "Products",
  "nav.reviews": "Reviews",
  "nav.faq": "FAQ",
  "nav.contact": "Contact",
  "nav.cart": "Cart",
  "nav.admin": "Admin",

  "cta.shop": "Shop the boxes",
  "cta.build": "Build your box",
  "cta.add_to_cart": "Add to cart",
  "cta.checkout": "Checkout",
  "cta.place_order": "Place order — Cash on delivery",
  "cta.view": "View",
  "cta.continue_shopping": "Continue shopping",

  "hero.eyebrow": "Bake Share Smile",
  "hero.title": "Fresh Out of the Oven",
  "hero.subtitle": "Every cookie is baked fresh daily. Choose your favorites and we'll deliver them straight to your door.",

  "section.best_sellers": "Best sellers",
  "section.boxes": "Cookie boxes",
  "section.flavors": "Our flavors",
  "section.products": "All Products",
  "section.byo": "Build your own box",
  "section.byo_sub": "Pick your size, mix any flavors. You're the chef.",
  "section.reviews": "Loved by NYC",
  "section.faq": "Frequently asked",
  "section.contact": "Get in touch",

  "section.how_it_works": "How it works",
  "hiw.step1.title": "Pick your box",
  "hiw.step1.desc": "Choose from 6, 12, or 18 cookies — or let us surprise you with a chef's pick.",
  "hiw.step2.title": "Mix your flavors",
  "hiw.step2.desc": "Browse 9+ rotating flavors and fill your box however you like.",
  "hiw.step3.title": "Fresh to your door",
  "hiw.step3.desc": "We bake every order fresh and deliver it straight to you.",

  "section.our_story": "Our story",
  "story.heading": "Born in New York. Baked with obsession.",
  "story.body":
    "We started with one oven, one recipe, and a belief that a truly great cookie should stop you mid-bite. Every batch uses high-fat European butter, single-origin chocolate, and flour we stone-mill in-house. No shortcuts. No preservatives. Just cookies the way New York does them.",
  "story.pillar1": "Baked fresh daily",
  "story.pillar2": "Premium ingredients",
  "story.pillar3": "Hand-packed with care",

  "box.cookies": "cookies",
  "box.from": "From",
  "box.starting_from": "Starting from",
  "box.best_seller": "Best seller",
  "box.fixed": "Chef's pick",
  "box.byo": "Build your own",
  "box.limited": "Limited edition",
  "box.out_of_stock": "Out of stock",

  "byo.selected": "{n} of {total} selected",
  "byo.full": "Box is full",
  "byo.choose_flavors": "Choose your flavors",
  "byo.fixed_includes": "This box includes",

  "product.flavors_title": "Available flavors",
  "product.no_flavors": "No flavors assigned to this product.",

  "cart.title": "Your cart",
  "cart.empty": "Your cart is empty.",
  "cart.subtotal": "Subtotal",
  "cart.delivery": "Delivery",
  "cart.free_shipping": "Free shipping",
  "cart.discount": "Discount",
  "cart.total": "Total",
  "cart.coupon": "Coupon code",
  "cart.apply": "Apply",

  "checkout.title": "Checkout",
  "checkout.name": "Full name",
  "checkout.phone": "Phone number",
  "checkout.address": "Delivery address",
  "checkout.notes": "Order notes (optional)",
  "checkout.summary": "Order summary",
  "checkout.cod": "Cash on Delivery — pay when your cookies arrive.",
  "checkout.delivery_schedule": "Delivery schedule",
  "checkout.delivery_date": "Delivery date",
  "checkout.delivery_time": "Delivery time",
  "checkout.no_slots_today": "No delivery slots available today. Please select a future date.",
  "checkout.select_date_first": "Please select a date first.",
  "checkout.delivery_window": "Delivery between 1:00 PM – 9:00 PM",

  "order.thank_you": "Thank you! We will prepare your order.",
  "order.confirmed": "Your order has been completed successfully. Our support team will contact you shortly to confirm the order.",
  "order.number": "Order #",
  "order.whatsapp": "Send order via WhatsApp to confirm it",
  "order.delivery_schedule": "Delivery schedule",
  "order.delivery_date": "Delivery date",
  "order.delivery_time": "Delivery time",

  "footer.tagline": "Leen Bakery NYC-style cookies",
  "footer.rights": "All rights reserved.",

  "admin.title": "Admin",
  "admin.verifying": "Verifying access…",
  "admin.sign_out": "Sign out",
  "admin.language": "Language",

  "admin.nav.overview": "Overview",
  "admin.nav.orders": "Orders",
  "admin.nav.boxes": "Boxes",
  "admin.nav.flavors": "Flavors",
  "admin.nav.products": "Products",
  "admin.nav.coupons": "Coupons",
  "admin.nav.reviews": "Reviews",
  "admin.nav.faqs": "FAQs",
  "admin.nav.social": "Social Media",
  "admin.nav.delivery": "Delivery Slots",
  "admin.nav.settings": "Settings",

  "admin.save": "Save",
  "admin.cancel": "Cancel",
  "admin.delete": "Delete",
  "admin.edit": "Edit",
  "admin.yes": "Yes",
  "admin.no": "No",
  "admin.new": "New",
  "admin.no_data": "No data yet.",

  "admin.ov.title": "Overview",
  "admin.ov.subtitle": "Snapshot of your store.",
  "admin.ov.stat_orders": "Orders",
  "admin.ov.stat_pending": "Pending",
  "admin.ov.stat_revenue": "Revenue",
  "admin.ov.stat_flavors_boxes": "Flavors / Boxes",
  "admin.ov.recent_pending": "Recent pending orders",
  "admin.ov.view_all": "View all →",
  "admin.ov.no_orders": "No pending orders.",

  "admin.ord.title": "Orders",
  "admin.ord.col_hash": "#",
  "admin.ord.col_customer": "Customer",
  "admin.ord.col_phone": "Phone",
  "admin.ord.col_total": "Total",
  "admin.ord.col_status": "Status",
  "admin.ord.col_date": "Date",
  "admin.ord.col_delivery": "Delivery",
  "admin.ord.col_actions": "Actions",
  "admin.ord.no_orders": "No orders yet.",
  "admin.ord.edit_title": "Edit order",
  "admin.ord.delete_confirm": "Delete this order? This cannot be undone.",
  "admin.ord.customer_name": "Customer name",
  "admin.ord.customer_phone": "Phone",
  "admin.ord.customer_address": "Address",
  "admin.ord.notes": "Notes",
  "admin.ord.status": "Status",
  "admin.ord.delivery_date": "Delivery date (YYYY-MM-DD)",
  "admin.ord.delivery_time": "Delivery time (HH:MM)",
  "admin.ord.no_delivery": "Not scheduled",

  "admin.delivery.title": "Delivery Slots",
  "admin.delivery.subtitle": "Check the boxes next to any time slot to hide it from customers.",
  "admin.delivery.hint": "Checked = hidden from customers. Unchecked = available.",
  "admin.delivery.pick_date": "Pick a date from the calendar above.",
  "admin.delivery.block_all": "Block all",
  "admin.delivery.unblock_all": "Unblock all",
  "admin.delivery.blocked_badge": "blocked",
  "admin.delivery.legend_available": "Available to customers",
  "admin.delivery.legend_blocked": "Hidden from customers",

  "admin.coup.title": "Coupons",
  "admin.coup.new": "New coupon",
  "admin.coup.col_code": "Code",
  "admin.coup.col_type": "Type",
  "admin.coup.col_value": "Value",
  "admin.coup.col_min": "Min",
  "admin.coup.col_active": "Active",
  "admin.coup.col_usage_limit": "Usage Limit",
  "admin.coup.no_coupons": "No coupons yet.",
  "admin.coup.edit_title": "Edit coupon",
  "admin.coup.new_title": "New coupon",
  "admin.coup.code_required": "Code is required",
  "admin.coup.label_code": "Code",
  "admin.coup.label_type": "Type",
  "admin.coup.label_value": "Value",
  "admin.coup.label_min": "Min subtotal",
  "admin.coup.label_usage_limit": "Usage limit (blank = unlimited)",
  "admin.coup.label_active": "Active",
  "admin.coup.type_percent": "Percent (%)",
  "admin.coup.type_fixed": "Fixed (EGP)",
  "admin.coup.unlimited": "Unlimited",
  "admin.coup.col_expires": "Expires",
  "admin.coup.label_expires": "Expiry date (blank = no expiry)",
  "admin.coup.no_expiry": "No expiry",
};

const ar: Dict = {
  "nav.home": "الرئيسية",
  "nav.boxes": "الصناديق",
  "nav.flavors": "النكهات",
  "nav.buildbox": "بناء الصندوق",
  "nav.products": "المنتجات",
  "nav.reviews": "آراء العملاء",
  "nav.faq": "الأسئلة الشائعة",
  "nav.contact": "تواصل",
  "nav.cart": "السلة",
  "nav.admin": "الإدارة",

  "cta.shop": "تسوق الصناديق",
  "cta.build": "اصنع صندوقك",
  "cta.add_to_cart": "أضف للسلة",
  "cta.checkout": "إتمام الشراء",
  "cta.place_order": "تأكيد الطلب — الدفع عند الاستلام",
  "cta.view": "عرض",
  "cta.continue_shopping": "متابعة التسوق",

  "hero.eyebrow": "اخبز شارك ابتسم",
  "hero.title": "طازج من الفرن",
  "hero.subtitle": "كل كوكيز يُخبز طازجاً يومياً. اختر مفضلاتك وسنوصلها إلى بابك.",

  "section.best_sellers": "الأكثر مبيعاً",
  "section.boxes": "صناديق الكوكيز",
  "section.flavors": "نكهاتنا",
  "section.products": "جميع المنتجات",
  "section.byo": "اصنع صندوقك بنفسك",
  "section.byo_sub": "اختر الحجم، اخلط أي نكهات. أنت الشيف.",
  "section.reviews": "محبوب في نيويورك",
  "section.faq": "أسئلة متكررة",
  "section.contact": "تواصل معنا",

  "section.how_it_works": "كيف يعمل",
  "hiw.step1.title": "اختر صندوقك",
  "hiw.step1.desc": "اختر من بين 6 أو 12 أو 18 كوكيز — أو دعنا نفاجئك باختيار الشيف.",
  "hiw.step2.title": "اخلط نكهاتك",
  "hiw.step2.desc": "تصفح أكثر من 9 نكهات متنوعة واملأ صندوقك كما تشاء.",
  "hiw.step3.title": "طازج لبابك",
  "hiw.step3.desc": "نخبز كل طلب طازجاً ونوصله مباشرة إليك.",

  "section.our_story": "قصتنا",
  "story.heading": "وُلد في نيويورك. خُبز بشغف.",
  "story.body":
    "بدأنا بفرن واحد ووصفة واحدة وإيمان بأن الكوكيز الرائعة حقاً يجب أن توقفك في كل لقمة. كل دفعة تستخدم زبدة أوروبية عالية الدسم وشوكولاتة من أصل واحد ودقيقاً نطحنه يدوياً. لا اختصارات. لا مواد حافظة. فقط كوكيز كما تصنعها نيويورك.",
  "story.pillar1": "يُخبز طازجاً يومياً",
  "story.pillar2": "مكونات فاخرة",
  "story.pillar3": "يُعبّأ بعناية يدوية",

  "box.cookies": "كوكيز",
  "box.from": "من",
  "box.starting_from": "يبدأ من",
  "box.best_seller": "الأكثر مبيعاً",
  "box.fixed": "اختيار الشيف",
  "box.byo": "اصنعها بنفسك",
  "box.limited": "إصدار محدود",
  "box.out_of_stock": "غير متوفر",

  "byo.selected": "{n} من {total} مختارة",
  "byo.full": "الصندوق ممتلئ",
  "byo.choose_flavors": "اختر نكهاتك",
  "byo.fixed_includes": "يحتوي هذا الصندوق على",

  "product.flavors_title": "النكهات المتاحة",
  "product.no_flavors": "لا توجد نكهات مخصصة لهذا المنتج.",

  "cart.title": "سلتك",
  "cart.empty": "سلتك فارغة.",
  "cart.subtotal": "المجموع الفرعي",
  "cart.delivery": "التوصيل",
  "cart.free_shipping": "شحن مجاني",
  "cart.discount": "الخصم",
  "cart.total": "الإجمالي",
  "cart.coupon": "كود الخصم",
  "cart.apply": "تطبيق",

  "checkout.title": "إتمام الطلب",
  "checkout.name": "الاسم الكامل",
  "checkout.phone": "رقم الهاتف",
  "checkout.address": "عنوان التوصيل",
  "checkout.notes": "ملاحظات (اختياري)",
  "checkout.summary": "ملخص الطلب",
  "checkout.cod": "الدفع عند الاستلام — ادفع عند وصول الكوكيز.",
  "checkout.delivery_schedule": "موعد التوصيل",
  "checkout.delivery_date": "تاريخ التوصيل",
  "checkout.delivery_time": "وقت التوصيل",
  "checkout.no_slots_today": "لا توجد مواعيد توصيل متاحة اليوم. يرجى اختيار يوم آخر.",
  "checkout.select_date_first": "يرجى اختيار التاريخ أولاً.",
  "checkout.delivery_window": "التوصيل بين 1:00 م – 9:00 م",

  "order.thank_you": "شكراً لك، سوف نقوم بتجهيز طلبك",
  "order.confirmed": "تم إتمام طلبك بنجاح. سيتواصل معك فريق الدعم قريباً لتأكيد الطلب.",
  "order.number": "طلب رقم ",
  "order.whatsapp": "أرسل الطلب عبر واتساب لتأكيده",
  "order.delivery_schedule": "موعد التوصيل",
  "order.delivery_date": "تاريخ التوصيل",
  "order.delivery_time": "وقت التوصيل",

  "footer.tagline": "لين بيكري كوكيز نيويورك",
  "footer.rights": "جميع الحقوق محفوظة.",

  "admin.title": "الإدارة",
  "admin.verifying": "جارٍ التحقق من الصلاحية…",
  "admin.sign_out": "تسجيل الخروج",
  "admin.language": "اللغة",

  "admin.nav.overview": "نظرة عامة",
  "admin.nav.orders": "الطلبات",
  "admin.nav.boxes": "الصناديق",
  "admin.nav.flavors": "النكهات",
  "admin.nav.products": "المنتجات",
  "admin.nav.coupons": "الكوبونات",
  "admin.nav.reviews": "التقييمات",
  "admin.nav.faqs": "الأسئلة الشائعة",
  "admin.nav.social": "وسائل التواصل",
  "admin.nav.delivery": "مواعيد التوصيل",
  "admin.nav.settings": "الإعدادات",

  "admin.save": "حفظ",
  "admin.cancel": "إلغاء",
  "admin.delete": "حذف",
  "admin.edit": "تعديل",
  "admin.yes": "نعم",
  "admin.no": "لا",
  "admin.new": "جديد",
  "admin.no_data": "لا توجد بيانات بعد.",

  "admin.ov.title": "نظرة عامة",
  "admin.ov.subtitle": "ملخص متجرك.",
  "admin.ov.stat_orders": "الطلبات",
  "admin.ov.stat_pending": "قيد الانتظار",
  "admin.ov.stat_revenue": "الإيرادات",
  "admin.ov.stat_flavors_boxes": "النكهات / الصناديق",
  "admin.ov.recent_pending": "الطلبات المعلقة الأخيرة",
  "admin.ov.view_all": "← عرض الكل",
  "admin.ov.no_orders": "لا توجد طلبات معلقة.",

  "admin.ord.title": "الطلبات",
  "admin.ord.col_hash": "#",
  "admin.ord.col_customer": "العميل",
  "admin.ord.col_phone": "الهاتف",
  "admin.ord.col_total": "الإجمالي",
  "admin.ord.col_status": "الحالة",
  "admin.ord.col_date": "التاريخ",
  "admin.ord.col_delivery": "التوصيل",
  "admin.ord.col_actions": "إجراءات",
  "admin.ord.no_orders": "لا توجد طلبات بعد.",
  "admin.ord.edit_title": "تعديل الطلب",
  "admin.ord.delete_confirm": "حذف هذا الطلب؟ لا يمكن التراجع عن هذا.",
  "admin.ord.customer_name": "اسم العميل",
  "admin.ord.customer_phone": "الهاتف",
  "admin.ord.customer_address": "العنوان",
  "admin.ord.notes": "الملاحظات",
  "admin.ord.status": "الحالة",
  "admin.ord.delivery_date": "تاريخ التوصيل (YYYY-MM-DD)",
  "admin.ord.delivery_time": "وقت التوصيل (HH:MM)",
  "admin.ord.no_delivery": "غير مجدول",

  "admin.delivery.title": "مواعيد التوصيل",
  "admin.delivery.subtitle": "ضع علامة ✓ على أي موعد لإخفائه عن العملاء.",
  "admin.delivery.hint": "✓ محجوب (مخفي عن العملاء) — بدون علامة = متاح للعملاء.",
  "admin.delivery.pick_date": "اختر تاريخاً من التقويم أعلاه.",
  "admin.delivery.block_all": "حجب الكل",
  "admin.delivery.unblock_all": "إتاحة الكل",
  "admin.delivery.blocked_badge": "محجوب",
  "admin.delivery.legend_available": "متاح للعملاء",
  "admin.delivery.legend_blocked": "مخفي عن العملاء",

  "admin.coup.title": "الكوبونات",
  "admin.coup.new": "كوبون جديد",
  "admin.coup.col_code": "الكود",
  "admin.coup.col_type": "النوع",
  "admin.coup.col_value": "القيمة",
  "admin.coup.col_min": "الحد الأدنى",
  "admin.coup.col_active": "نشط",
  "admin.coup.col_usage_limit": "حد الاستخدام",
  "admin.coup.no_coupons": "لا توجد كوبونات بعد.",
  "admin.coup.edit_title": "تعديل الكوبون",
  "admin.coup.new_title": "كوبون جديد",
  "admin.coup.code_required": "الكود مطلوب",
  "admin.coup.label_code": "الكود",
  "admin.coup.label_type": "النوع",
  "admin.coup.label_value": "القيمة",
  "admin.coup.label_min": "الحد الأدنى للطلب",
  "admin.coup.label_usage_limit": "حد الاستخدام (اتركه فارغاً لاستخدام غير محدود)",
  "admin.coup.label_active": "نشط",
  "admin.coup.type_percent": "نسبة مئوية (%)",
  "admin.coup.type_fixed": "مبلغ ثابت (جنيه)",
  "admin.coup.unlimited": "غير محدود",
  "admin.coup.col_expires": "تاريخ الانتهاء",
  "admin.coup.label_expires": "تاريخ الانتهاء (اتركه فارغاً لعدم الانتهاء)",
  "admin.coup.no_expiry": "بلا انتهاء",
};

const dicts: Record<Locale, Dict> = { en, ar };

interface I18nCtx {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
  dir: "ltr" | "rtl";
}

const Ctx = createContext<I18nCtx | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<Locale>(() => {
    if (typeof window === "undefined") return "en";
    const saved = window.localStorage.getItem("locale") as Locale | null;
    return saved === "en" || saved === "ar" ? saved : "en";
  });

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.lang = locale;
    document.documentElement.dir = locale === "ar" ? "rtl" : "ltr";
    if (typeof window !== "undefined") window.localStorage.setItem("locale", locale);
  }, [locale]);

  const value = useMemo<I18nCtx>(
    () => ({
      locale,
      setLocale,
      dir: locale === "ar" ? "rtl" : "ltr",
      t: (key, vars) => {
        let s = dicts[locale][key] ?? dicts.en[key] ?? key;
        if (vars) for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, String(v));
        return s;
      },
    }),
    [locale],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useI18n() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}

export function pickLocalized<T extends Record<string, unknown>>(
  obj: T,
  base: string,
  locale: Locale,
): string {
  const arKey = `${base}_ar` as keyof T;
  const enKey = `${base}_en` as keyof T;
  if (locale === "ar" && obj[arKey]) return String(obj[arKey]);
  return String(obj[enKey] ?? "");
}
