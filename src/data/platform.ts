/** Sample operating data for the admin dashboard. Fictional, like the rest of the prototype. */

export interface WeekPoint {
  week: string;      // ISO date of the Monday
  label: string;
  submissions: number;
  approvals: number;
  signups: number;
  enquiries: number;
}

export const WEEKS: WeekPoint[] = [
  { week: '2026-07-06', label: '6 Jul', submissions: 4, approvals: 2, signups: 31, enquiries: 48 },
  { week: '2026-07-13', label: '13 Jul', submissions: 6, approvals: 3, signups: 38, enquiries: 55 },
  { week: '2026-07-20', label: '20 Jul', submissions: 5, approvals: 5, signups: 42, enquiries: 61 },
  { week: '2026-07-27', label: '27 Jul', submissions: 9, approvals: 4, signups: 47, enquiries: 58 },
  { week: '2026-08-03', label: '3 Aug', submissions: 7, approvals: 6, signups: 55, enquiries: 72 },
  { week: '2026-08-10', label: '10 Aug', submissions: 11, approvals: 7, signups: 61, enquiries: 80 },
  { week: '2026-08-17', label: '17 Aug', submissions: 8, approvals: 8, signups: 58, enquiries: 76 },
  { week: '2026-08-24', label: '24 Aug', submissions: 12, approvals: 9, signups: 69, enquiries: 91 },
  { week: '2026-08-31', label: '31 Aug', submissions: 10, approvals: 9, signups: 74, enquiries: 88 },
  { week: '2026-09-07', label: '7 Sep', submissions: 14, approvals: 10, signups: 83, enquiries: 104 },
  { week: '2026-09-14', label: '14 Sep', submissions: 13, approvals: 11, signups: 91, enquiries: 112 },
];

export interface PlatformUser {
  id: string;
  name: string;
  email: string;
  city: string;
  joined: string;
  lastActive: string;
  savedLawyers: number;
  enquiries: number;
  reviewsLeft: number;
  status: 'active' | 'new' | 'dormant';
  source: 'sample';
}

export const SAMPLE_USERS: PlatformUser[] = [
  { id: 'u1', name: 'Aditi Raghavan', email: 'aditi.r@example.com', city: 'Bengaluru', joined: '2026-03-14', lastActive: '2026-09-17', savedLawyers: 6, enquiries: 3, reviewsLeft: 2, status: 'active', source: 'sample' },
  { id: 'u2', name: 'Mohammed Irfan', email: 'm.irfan@example.com', city: 'Mumbai', joined: '2026-04-02', lastActive: '2026-09-16', savedLawyers: 3, enquiries: 2, reviewsLeft: 1, status: 'active', source: 'sample' },
  { id: 'u3', name: 'Sneha Pillai', email: 'sneha.p@example.com', city: 'Kochi', joined: '2026-05-21', lastActive: '2026-09-15', savedLawyers: 9, enquiries: 4, reviewsLeft: 3, status: 'active', source: 'sample' },
  { id: 'u4', name: 'Rajat Khanna', email: 'rajat.k@example.com', city: 'Delhi', joined: '2026-06-08', lastActive: '2026-09-12', savedLawyers: 2, enquiries: 1, reviewsLeft: 0, status: 'active', source: 'sample' },
  { id: 'u5', name: 'Prerna Shah', email: 'prerna.shah@example.com', city: 'Ahmedabad', joined: '2026-06-30', lastActive: '2026-09-18', savedLawyers: 4, enquiries: 2, reviewsLeft: 1, status: 'active', source: 'sample' },
  { id: 'u6', name: 'Vivek Nair', email: 'vivek.nair@example.com', city: 'Chennai', joined: '2026-07-11', lastActive: '2026-08-02', savedLawyers: 1, enquiries: 0, reviewsLeft: 0, status: 'dormant', source: 'sample' },
  { id: 'u7', name: 'Harleen Sandhu', email: 'harleen.s@example.com', city: 'Chandigarh', joined: '2026-07-25', lastActive: '2026-09-17', savedLawyers: 5, enquiries: 3, reviewsLeft: 2, status: 'active', source: 'sample' },
  { id: 'u8', name: 'Anirban Sen', email: 'a.sen@example.com', city: 'Kolkata', joined: '2026-08-09', lastActive: '2026-09-14', savedLawyers: 2, enquiries: 1, reviewsLeft: 1, status: 'active', source: 'sample' },
  { id: 'u9', name: 'Tanvi Deshmukh', email: 'tanvi.d@example.com', city: 'Pune', joined: '2026-08-28', lastActive: '2026-09-18', savedLawyers: 7, enquiries: 2, reviewsLeft: 0, status: 'active', source: 'sample' },
  { id: 'u10', name: 'Yash Agarwal', email: 'yash.ag@example.com', city: 'Jaipur', joined: '2026-09-05', lastActive: '2026-09-16', savedLawyers: 1, enquiries: 1, reviewsLeft: 0, status: 'new', source: 'sample' },
  { id: 'u11', name: 'Leela Krishnan', email: 'leela.k@example.com', city: 'Chennai', joined: '2026-09-09', lastActive: '2026-09-18', savedLawyers: 3, enquiries: 0, reviewsLeft: 0, status: 'new', source: 'sample' },
  { id: 'u12', name: 'Daniel Fernandes', email: 'd.fernandes@example.com', city: 'Mumbai', joined: '2026-09-13', lastActive: '2026-09-17', savedLawyers: 2, enquiries: 1, reviewsLeft: 0, status: 'new', source: 'sample' },
  { id: 'u13', name: 'Ishita Bose', email: 'ishita.b@example.com', city: 'Kolkata', joined: '2026-02-19', lastActive: '2026-07-04', savedLawyers: 0, enquiries: 0, reviewsLeft: 0, status: 'dormant', source: 'sample' },
  { id: 'u14', name: 'Gurpreet Singh', email: 'g.singh@example.com', city: 'Gurugram', joined: '2026-01-27', lastActive: '2026-09-11', savedLawyers: 8, enquiries: 5, reviewsLeft: 4, status: 'active', source: 'sample' },
];

/** Operational queue items that need a human decision, beyond the verification queue. */
export interface OpsItem {
  id: string;
  kind: 'review-flag' | 'fee-change' | 'placement-request' | 'profile-edit';
  subject: string;
  detail: string;
  raised: string;
  priority: 'high' | 'normal';
}

export const OPS_QUEUE: OpsItem[] = [
  { id: 'o1', kind: 'review-flag', subject: 'Rahul Verma', detail: 'Lawyer disputes a 3-star review as being from a non-client.', raised: '2026-09-17', priority: 'high' },
  { id: 'o2', kind: 'fee-change', subject: 'Kavya Iyer', detail: 'Consultation fee change ₹800 → ₹950 awaiting confirmation.', raised: '2026-09-16', priority: 'normal' },
  { id: 'o3', kind: 'placement-request', subject: 'Vikram Desai', detail: 'Requested promoted placement for October.', raised: '2026-09-15', priority: 'normal' },
  { id: 'o4', kind: 'profile-edit', subject: 'Sunita Menon', detail: 'Added a mediation accreditation — document needs checking.', raised: '2026-09-14', priority: 'normal' },
];
