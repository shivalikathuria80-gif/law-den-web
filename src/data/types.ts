export type CredentialStatus = 'verified' | 'pending' | 'rejected';

export type CredentialType =
  | 'bar-enrolment'
  | 'degree'
  | 'certification'
  | 'identity'
  | 'practice-proof';

export interface Credential {
  id: string;
  type: CredentialType;
  label: string;
  issuer: string;
  reference: string;
  issuedOn: string;
  status: CredentialStatus;
  /** Set by an admin when the document is checked off during review. */
  verifiedOn?: string;
  note?: string;
}

export type ReviewFlagReason = 'not-a-client' | 'abusive' | 'confidential' | 'conflict-of-interest';

export interface ReviewFlag {
  reason: ReviewFlagReason;
  raisedBy: string;
  raisedOn: string;
  detail: string;
}

/**
 * A removed review leaves a visible trace on the profile: moderation never quietly improves
 * a rating, and a lawyer cannot make a bad review disappear without a stated policy reason.
 */
export interface ReviewModeration {
  status: 'removed';
  reason: ReviewFlagReason;
  note: string;
  decidedOn: string;
  decidedBy: string;
}

export interface Review {
  id: string;
  author: string;
  rating: number;
  date: string;
  matter: string;
  body: string;
  /** Sample flag: the review came from a client whose engagement was logged on the platform. */
  verifiedClient: boolean;
  helpful: number;
  response?: { body: string; date: string };
  /** Raised by the lawyer; waiting on a reviewer decision. */
  flag?: ReviewFlag;
  moderation?: ReviewModeration;
}

export interface Fees {
  consultation: number;
  /** Null when the lawyer does not publish an hourly rate. */
  hourly: number | null;
  fixedFrom: number | null;
  offersFirstCallFree: boolean;
}

export interface Lawyer {
  id: string;
  slug: string;
  name: string;
  headline: string;
  city: string;
  state: string;
  practiceAreas: string[];
  languages: string[];
  experienceYears: number;
  fees: Fees;
  rating: number | null;
  reviewCount: number;
  ratingBreakdown: Record<1 | 2 | 3 | 4 | 5, number>;
  verified: boolean;
  verifiedOn?: string;
  verifiedBy?: string;
  barCouncil: string;
  enrolmentNo: string;
  courts: string[];
  about: string;
  highlights: string[];
  education: string[];
  credentials: Credential[];
  reviews: Review[];
  responseTimeHours: number;
  acceptsNewClients: boolean;
  /** Paid placement. Never changes organic ordering — rendered in a separate, labelled row. */
  promoted: boolean;
  /** Placement runs to this date; past it the profile is treated as standard again. */
  promotedUntil?: string;
  /** A suspended profile leaves the directory but keeps its record and its audit trail. */
  listed: boolean;
  suspension?: { reason: string; note: string; at: string; by: string };
  addedOn: string;
  tone: number;
}

export type SubmissionStatus = 'pending' | 'changes-requested' | 'approved' | 'rejected';

export interface Submission {
  id: string;
  submittedOn: string;
  status: SubmissionStatus;
  decidedOn?: string;
  decidedBy?: string;
  decisionNote?: string;
  /** Admin checklist state, keyed by check id. */
  checks: Record<string, boolean>;
  lawyer: Omit<
    Lawyer,
    'reviews' | 'rating' | 'reviewCount' | 'ratingBreakdown' | 'verified' | 'promoted' | 'promotedUntil' | 'listed' | 'suspension'
  >;
}

export type EnquiryStatus = 'new' | 'replied' | 'closed';

export type EnquiryUrgency = 'urgent' | 'soon' | 'planning';

export interface EnquiryMessage {
  from: 'client' | 'lawyer';
  body: string;
  at: string;
}

/**
 * An enquiry is private between the visitor and the lawyer. The admin activity log records
 * that one was sent, never what it said.
 */
export interface Enquiry {
  id: string;
  lawyerId: string;
  lawyerSlug: string;
  lawyerName: string;
  clientName: string;
  clientEmail: string;
  /** Set when the visitor was signed in, so their enquiries follow the account. */
  clientUid?: string;
  matter: string;
  urgency: EnquiryUrgency;
  createdOn: string;
  status: EnquiryStatus;
  messages: EnquiryMessage[];
}

export interface AuditEntry {
  id: string;
  at: string;
  actor: string;
  action: string;
  target: string;
  detail?: string;
}
