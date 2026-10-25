/**
 * Every user-facing string of the auth screens. Kept out of the components so
 * an Urdu version can be added later. `ur` lines are the Urdu sub-lines shown
 * in the designs.
 */

const plural = (n: number, one: string, many: string) =>
  `${n} ${n === 1 ? one : many}`;

export const brandText = {
  name: "Galla Mandi",
  nameUr: "غلہ منڈی",
  headline: "Run your mandi like a modern business.",
  headlineUr: "اپنی منڈی کا پورا حساب ایک جگہ",
  intro:
    "Farmer khata, grain trading, pesticide sales and double-entry books in one calm workspace.",
  chips: [
    "Udhar + grain khata",
    "Automatic deductions",
    "Double-entry reports",
  ],
  ratesTitle: "Today’s mandi rates",
  ratesTitleUr: "آج کے ریٹ · فی من",
  ratesBadge: "Sample",
  rates: [
    {
      name: "Gandum",
      en: "Wheat",
      price: "Rs 4,150",
      change: "▲ 50",
      tone: "up",
    },
    {
      name: "Kapas",
      en: "Cotton",
      price: "Rs 8,900",
      change: "▼ 120",
      tone: "down",
    },
    {
      name: "Chawal",
      en: "Basmati",
      price: "Rs 9,600",
      change: "▲ 200",
      tone: "up",
    },
    {
      name: "Makai",
      en: "Maize",
      price: "Rs 2,950",
      change: "— 0",
      tone: "flat",
    },
  ],
  illustrationLabel: "Grain sacks next to a mandi weighing scale",
  features: [
    "Private to your shop",
    "Staff roles",
    "Every change recorded",
    "Works on slow internet",
  ],
} as const;

export const loginText = {
  platform: "Platform",
  title: "Super-admin sign in",
  subtitle: "Manage shops, plans and platform settings.",
  // The design says "Work email"; the API takes an email or a phone number.
  identifierLabel: "Work email or phone",
  identifierPlaceholder: "you@company.com",
  passwordLabel: "Password",
  passwordPlaceholder: "Your password",
  submit: "Sign in securely",
  submitting: "Signing in…",
  retry: "Try again",
  restricted:
    "Restricted area. Every sign-in and every action on a shop is recorded in the audit log.",
  errors: {
    identifierRequired: "Enter your email or phone number",
    identifierTooLong: "Use 160 characters or fewer",
    passwordRequired: "Enter your password",
    passwordTooLong: "Use 128 characters or fewer",
    invalidCredentials: "Email or password is incorrect",
    attemptsLeft: (n: number) =>
      `${plural(n, "attempt", "attempts")} left before sign-in is paused for 1 minute.`,
    capsLock: "Check Caps Lock and try again.",
    notAdmin: "This account can't sign in to the admin panel",
    notAdminHint: "Shop owners and staff sign in on the shop panel.",
    network: "Can’t reach the server. Check your internet and try again.",
    unknown: "Something went wrong. Please try again.",
  },
  sessionExpired: {
    title: "Your session has ended",
    body: "For your safety you were signed out. Sign in again to continue.",
  },
} as const;

export const lockedText = {
  title: "Sign-in paused",
  body: (who: string) =>
    `Too many wrong passwords for ${who}. You can try again in 1 minute.`,
  bodyGeneric: "Too many wrong passwords. You can try again in 1 minute.",
  ur: "بہت زیادہ غلط کوششیں۔ ایک منٹ بعد دوبارہ کوشش کریں",
  note: "We pause sign-in to protect the platform. If this wasn’t you, tell the platform team.",
  button: (time: string) => `Try again in ${time}`,
  timerLabel: "Time left before you can sign in again",
  backToSignIn: "Back to sign in",
} as const;

export const passwordText = {
  newLabel: "New password",
  newPlaceholder: "At least 8 characters",
  confirmLabel: "Confirm new password",
  confirmPlaceholder: "Type it again",
  show: "Show password",
  hide: "Hide password",
  strengthLabel: "Password strength",
  strength: ["Too short", "Weak", "Fair", "Good", "Strong"],
  rules: {
    length: "At least 8 characters",
    number: "One number",
    case: "Upper and lower case",
    symbol: "One symbol (! @ #)",
  },
  matches: "Passwords match",
  errors: {
    tooShort: "Use at least 8 characters",
    tooLong: "Use 128 characters or fewer",
    mismatch: "Passwords don’t match",
    currentRequired: "Enter your current password",
  },
} as const;

export const changePasswordText = {
  greeting: "Assalam o Alaikum,",
  mustChange: {
    title: "Choose your own password",
    body: "You signed in with a temporary password. Replace it now — only you should know your password.",
    ur: "عارضی پاس ورڈ تبدیل کر کے اپنا پاس ورڈ بنائیں",
    currentLabel: "Temporary password",
  },
  voluntary: {
    title: "Change your password",
    body: "Enter your current password, then choose a new one.",
    ur: "اپنا پاس ورڈ تبدیل کریں",
    currentLabel: "Current password",
  },
  submit: "Save and continue",
  submitUr: "جاری رکھیں",
  submitting: "Saving…",
  signOut: "Sign out",
} as const;

export const passwordChangedText = {
  imageAlt: "Wheat field at sunrise",
  title: "Password changed",
  ready: "Your new password is ready.",
  signedOut: (n: number, other: boolean) =>
    n > 0
      ? ` We signed you out of ${plural(n, other ? "other device" : "device", other ? "other devices" : "devices")} to keep the platform safe.`
      : "",
  ur: "پاس ورڈ کامیابی سے تبدیل ہو گیا",
  toDashboard: "Continue",
  toDashboardUr: "جاری رکھیں",
} as const;

export const blockedText = {
  accountDisabled: {
    title: "Your account is turned off",
    body: "Sign-in has been turned off for this account. Nothing you did before has been deleted.",
    ur: "آپ کا اکاؤنٹ بند کر دیا گیا ہے",
    hint: "Think this is a mistake? Ask another platform admin to turn your account back on from",
    hintPath: "Users › Activate",
    back: "Back to sign in",
  },
} as const;

export const guardText = {
  loading: "Loading…",
} as const;
