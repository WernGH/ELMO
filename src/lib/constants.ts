export const APP_NAME = "COAI";
export const APP_TITLE = "COAI — AI Workforce Platform";
export const ELMO_IDENTITY = {
  name: "ELMO",
  role: "AI CEO",
  systemTag: "COAI // ELMO AI CEO v1.0",
  status: "ONLINE",
};

export interface NavigationItem {
  name: string;
  href: string;
  iconName: string;
  badge?: string;
  isFuture?: boolean;
}

export const NAVIGATION_ITEMS: NavigationItem[] = [
  {
    name: "Overview",
    href: "/overview",
    iconName: "LayoutDashboard",
    isFuture: false,
  },
  {
    name: "ELMO",
    href: "/elmo",
    iconName: "Cpu",
    badge: "AI CEO",
    isFuture: false, // Phase 1 Console preview with coming soon features
  },
  {
    name: "Employees",
    href: "/employees",
    iconName: "Users",
    badge: "Soon",
    isFuture: true,
  },
  {
    name: "Tasks",
    href: "/tasks",
    iconName: "CheckSquare",
    isFuture: false,
  },
  {
    name: "Goals",
    href: "/goals",
    iconName: "Target",
    isFuture: false,
  },
  {
    name: "Memory",
    href: "/memory",
    iconName: "Database",
    badge: "Soon",
    isFuture: true,
  },
  {
    name: "Automations",
    href: "/automations",
    iconName: "Zap",
    badge: "Soon",
    isFuture: true,
  },
  {
    name: "Integrations",
    href: "/integrations",
    iconName: "Boxes",
    badge: "Soon",
    isFuture: true,
  },
  {
    name: "Approvals",
    href: "/approvals",
    iconName: "ShieldAlert",
    isFuture: false,
  },
  {
    name: "Activity",
    href: "/activity",
    iconName: "Activity",
    isFuture: false,
  },
  {
    name: "Settings",
    href: "/settings",
    iconName: "Settings",
    isFuture: false,
  },
];

export const BUSINESS_OPERATIONS_NAV_ITEMS: NavigationItem[] = [
  {
    name: "Quotes & Invoicing",
    href: "/quotes",
    iconName: "Receipt",
    badge: "Ops",
    isFuture: false,
  },
  {
    name: "Bookings",
    href: "/bookings",
    iconName: "CalendarCheck",
    badge: "Ops",
    isFuture: false,
  },
  {
    name: "Reviews & Reputation",
    href: "/reviews",
    iconName: "Star",
    badge: "Ops",
    isFuture: false,
  },
  {
    name: "Customer Win-Back",
    href: "/winback",
    iconName: "UserCheck",
    badge: "Ops",
    isFuture: false,
  },
  {
    name: "Staff SOPs",
    href: "/sops",
    iconName: "BookOpen",
    badge: "Ops",
    isFuture: false,
  },
];

export const SAAS_NAVIGATION_ITEMS: NavigationItem[] = [
  {
    name: "Funnels",
    href: "/funnels",
    iconName: "Filter",
    badge: "SaaS",
    isFuture: false,
  },
  {
    name: "Contacts",
    href: "/contacts",
    iconName: "Users",
    badge: "SaaS",
    isFuture: false,
  },
  {
    name: "Forms",
    href: "/forms",
    iconName: "FormInput",
    badge: "SaaS",
    isFuture: false,
  },
  {
    name: "Emails",
    href: "/emails",
    iconName: "Mail",
    badge: "SaaS",
    isFuture: false,
  },
  {
    name: "Analytics",
    href: "/analytics",
    iconName: "BarChart3",
    badge: "SaaS",
    isFuture: false,
  },
];
