import type { TenantStatus } from "./types";

/**
 * Every user-facing string of the Shops pages. Kept out of the components so
 * an Urdu version can be added later.
 */

const plural = (n: number, one: string, many: string) =>
  `${n} ${n === 1 ? one : many}`;

export const tenantStatusText = {
  trial: "Trial",
  active: "Active",
  suspended: "Suspended",
  cancelled: "Cancelled",
} as const satisfies Record<TenantStatus, string>;

export const shopsListText = {
  newShop: "New shop",
  searchLabel: "Search shops",
  searchPlaceholder: "Shop, owner, phone or city",
  statusLabel: "Status",
  statusAll: "All statuses",
  sortLabel: "Sort by",
  caption: "Shops",
  columns: {
    shop: "Shop",
    owner: "Owner",
    phone: "Phone",
    status: "Status",
    users: "Users",
    created: "Created",
  },
  noCity: "No city",
  empty: {
    title: "No shops yet",
    body: "Create the first shop to onboard a mandi. Its owner gets an account straight away.",
  },
  noMatches: {
    title: "No shops match",
    body: "Try another search or status.",
    clear: "Clear search and filters",
  },
} as const;

export const shopFormText = {
  shopSection: "Shop",
  shopSectionHint: "Shown on bills and in the shop panel.",
  ownerSection: "Owner",
  ownerSectionHint:
    "We create the owner’s account with a temporary password they change at first sign-in.",
  name: "Shop name",
  namePlaceholder: "e.g. Al-Madina Traders",
  city: "City",
  cityPlaceholder: "e.g. Okara",
  address: "Address",
  addressPlaceholder: "Shop number, mandi, road",
  phone: "Shop phone",
  email: "Shop email",
  ownerName: "Owner name",
  ownerNamePlaceholder: "e.g. Haji Muhammad Aslam",
  ownerPhone: "Owner phone",
  ownerPhoneHint: "The owner signs in with this number.",
  ownerEmail: "Owner email",
  phonePlaceholder: "0300 1234567",
  emailPlaceholder: "name@example.com",
  optional: "(optional)",
  create: "Create shop",
  creating: "Creating shop…",
  save: "Save changes",
  saving: "Saving…",
  cancel: "Cancel",
  saved: "Shop details saved",
  errors: {
    nameRequired: "Enter the shop name",
    nameShort: "Use at least 2 characters",
    nameLong: "Use 120 characters or fewer",
    cityLong: "Use 80 characters or fewer",
    addressLong: "Use 255 characters or fewer",
    phoneRequired: "Enter a phone number",
    phoneInvalid: "Enter a mobile number like 0300 1234567",
    emailInvalid: "Enter a valid email address",
    emailLong: "Use 160 characters or fewer",
    ownerNameRequired: "Enter the owner’s name",
    phoneTaken: "This phone already has an account",
    emailTaken: "This email already has an account",
    network: "Can’t reach the server. Check your internet and try again.",
    unknown: "Something went wrong. Please try again.",
    notFound: "This shop no longer exists.",
  },
} as const;

export const temporaryPasswordText = {
  title: "Shop created",
  body: (shop: string, owner: string) =>
    `${shop} is ready. Give ${owner} this temporary password to sign in.`,
  label: "Temporary password",
  copy: "Copy password",
  copied: "Password copied",
  copyFailed: "Couldn’t copy. Select the password and copy it by hand.",
  warning:
    "This password is shown only now — we can’t show it again. The owner must change it at first sign-in.",
  done: "I’ve saved it, open the shop",
} as const;

export const shopDetailText = {
  edit: "Edit",
  editTitle: (name: string) => `Edit ${name}`,
  editDescription:
    "Change the shop’s details. The owner account isn’t changed here.",
  shopSection: "Shop details",
  ownerSection: "Owner",
  fields: {
    status: "Status",
    city: "City",
    address: "Address",
    phone: "Shop phone",
    email: "Shop email",
    users: "Users",
    created: "Created",
    updated: "Last updated",
    ownerName: "Name",
    ownerPhone: "Phone",
    ownerEmail: "Email",
    ownerAccount: "Account",
  },
  users: (n: number) => plural(n, "user", "users"),
  none: "—",
  accountActive: "Active",
  accountDisabled: "Turned off",
  mustChangePassword:
    "Hasn’t signed in yet: the owner must change the temporary password at first sign-in.",
  noOwner: "This shop has no owner account.",
  loading: "Loading shop…",
  loadError: "Couldn’t load this shop. Check your internet and try again.",
  retry: "Try again",
  suspend: {
    button: "Suspend shop",
    title: (name: string) => `Suspend ${name}?`,
    body: "Its users are signed out within 15 minutes and can’t sign in until you activate it. No data is deleted.",
    confirm: "Suspend shop",
    pending: "Suspending…",
    done: (name: string) => `${name} is suspended`,
    failed: "Couldn’t suspend the shop. Try again.",
  },
  activate: {
    button: "Activate shop",
    title: (name: string) => `Activate ${name}?`,
    body: "Its users can sign in again straight away.",
    confirm: "Activate shop",
    pending: "Activating…",
    done: (name: string) => `${name} is active again`,
    failed: "Couldn’t activate the shop. Try again.",
  },
  cancel: "Cancel",
} as const;

export const shopPagesText = {
  newShop: {
    title: "New shop",
    description:
      "Creates the shop and its owner’s account in one step. New shops start on a trial.",
  },
  detailCrumb: "Shop details",
  editCrumb: "Edit",
  editTitle: "Edit shop",
} as const;
