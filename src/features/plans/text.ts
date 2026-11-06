/** Every word the Plans screens show (kept out of the components for Urdu later). */

const plural = (n: number, one: string, many: string) =>
  `${n.toLocaleString("en-PK")} ${n === 1 ? one : many}`;

export const planStatusText = {
  active: "Active",
  inactive: "Inactive",
} as const;

export const plansListText = {
  newPlan: "New plan",
  caption: "Subscription plans",
  searchLabel: "Search plans",
  searchPlaceholder: "Search by plan name",
  resultCount: (n: number) => plural(n, "plan", "plans"),
  exportFileName: "plans",
  chartCount: "Plans",
  placeholderNote:
    "The starting limits and prices of Trial, Basic and Pro are placeholders: edit them to your real offer.",
  columns: {
    plan: "Plan",
    price: "Price / month",
    users: "Max users",
    branches: "Max branches",
    shops: "Shops on it",
    status: "Status",
    actions: "Actions",
  },
  trialBadge: "New shops",
  trialHint: "Every new shop starts on this plan",
  branchesHint: "Shown to shops; not enforced yet",
  free: "Free",
  statusFilter: "Status",
  statusAll: "All plans",
  rowActions: {
    edit: "Edit",
    activate: "Turn on",
    remove: "Delete",
  },
  empty: {
    title: "No plans yet",
    body: "Add the plans shops can be on, with their user limit and monthly price.",
  },
  noMatches: {
    title: "No plans match",
    body: "Try another name, or clear the search.",
    clear: "Clear search",
  },
  loadError: "Couldn’t load the plans. Check your internet and try again.",
} as const;

export const planFormText = {
  createTitle: "New plan",
  createDescription: "Shops can be put on it from their page.",
  editTitle: (name: string) => `Edit ${name}`,
  editDescription:
    "Changes apply to every shop on this plan straight away (limits are checked on each new user).",
  name: "Plan name",
  namePlaceholder: "e.g. Basic",
  maxUsers: "Max users",
  maxUsersHint: "Owner and staff, including invites not yet accepted.",
  maxBranches: "Max branches",
  maxBranchesHint: "Shown to shops; not enforced yet.",
  price: "Price per month",
  pricePrefix: "Rs",
  pricePlaceholder: "2500",
  isActive: "Available for new subscriptions",
  isActiveHint: "Turned off plans stay on the shops already using them.",
  trialLocked:
    "This is the Trial plan new shops start on: its name and status can’t change.",
  cancel: "Cancel",
  create: "Create plan",
  creating: "Creating…",
  save: "Save changes",
  saving: "Saving…",
  created: (name: string) => `${name} plan created`,
  saved: (name: string) => `${name} plan saved`,
  errors: {
    nameRequired: "Enter the plan name",
    nameShort: "Use at least 2 characters",
    nameLong: "Use at most 60 characters",
    nameTaken: "A plan with this name already exists",
    countRequired: "Enter a whole number",
    countMin: "Allow at least 1",
    usersMax: "Use at most 10,000",
    branchesMax: "Use at most 1,000",
    priceRequired: "Enter the monthly price (0 for free)",
    priceInvalid: "Enter rupees with up to 2 decimals, e.g. 2500 or 2499.50",
    network: "No connection to the server. Check your internet and try again.",
    unknown: "Something went wrong. Try again.",
  },
} as const;

export const removePlanText = {
  title: (name: string) => `Delete the ${name} plan?`,
  body: (shops: number) =>
    shops > 0
      ? `${plural(shops, "shop is", "shops are")} on it, so it will be turned off instead of deleted: those shops keep it, and it can’t be picked for new subscriptions.`
      : "If no shop ever used it, it is removed for good. If shops used it before, it is turned off instead and kept in their history.",
  confirm: "Delete plan",
  pending: "Deleting…",
  cancel: "Cancel",
  deleted: (name: string) => `${name} plan deleted`,
  deactivated: (name: string) => `${name} plan turned off (shops have used it)`,
  activated: (name: string) => `${name} plan turned on`,
  failed: "Couldn’t change the plan. Try again.",
  trialLocked: "The Trial plan can’t be deleted: new shops start on it.",
} as const;
