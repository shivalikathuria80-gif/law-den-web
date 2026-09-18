import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { SEED_LAWYERS, SEED_SUBMISSIONS } from './data/seed';
import type { AuditEntry, Lawyer, Submission } from './data/types';
import { todayIso } from './lib/format';

const STORAGE_KEY = 'lawden.prototype.v1';
export const ADMIN_PASSCODE = 'lawden-admin';
export const ADMIN_ACTOR = 'admin@lawden.demo';

export const VERIFICATION_CHECKS = [
  { id: 'identity', label: 'Government photo identity matches the name on the profile' },
  { id: 'enrolment', label: 'Bar council enrolment certificate and number are legible and current' },
  { id: 'degree', label: 'Law degree certificate issued by a recognised university' },
  { id: 'standing', label: 'No pending disciplinary proceedings disclosed or found on record' },
  { id: 'practice', label: 'Practice areas and courts are consistent with the documents supplied' },
  { id: 'fees', label: 'Published fees are complete and free of misleading claims' },
] as const;

interface PersistedState {
  lawyers: Lawyer[];
  submissions: Submission[];
  audit: AuditEntry[];
}

interface StoreValue extends PersistedState {
  addSubmission: (submission: Submission) => void;
  approveSubmission: (id: string, checks: Record<string, boolean>, note: string) => Lawyer | null;
  requestChanges: (id: string, note: string, checks: Record<string, boolean>) => void;
  rejectSubmission: (id: string, note: string, checks: Record<string, boolean>) => void;
  togglePromoted: (lawyerId: string) => void;
  resetDemo: () => void;
}

const StoreContext = createContext<StoreValue | null>(null);

const initialState = (): PersistedState => ({
  lawyers: SEED_LAWYERS,
  submissions: SEED_SUBMISSIONS,
  audit: [
    {
      id: 'a-seed',
      at: '2026-09-14T10:24:00',
      actor: ADMIN_ACTOR,
      action: 'Requested changes',
      target: 'Dilip Rathore',
      detail: 'Enrolment certificate and degree certificate rejected as illegible or provisional.',
    },
  ],
});

const load = (): PersistedState => {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return initialState();
    const parsed = JSON.parse(raw) as Partial<PersistedState>;
    if (!Array.isArray(parsed.lawyers) || !Array.isArray(parsed.submissions)) return initialState();
    return { lawyers: parsed.lawyers, submissions: parsed.submissions, audit: parsed.audit ?? [] };
  } catch {
    return initialState();
  }
};

const uid = (prefix: string) => `${prefix}-${Math.random().toString(36).slice(2, 9)}`;

export const StoreProvider = ({ children }: { children: ReactNode }) => {
  const [state, setState] = useState<PersistedState>(load);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* storage unavailable (private window, blocked cookies) — the prototype still works in-memory */
    }
  }, [state]);

  const log = useCallback((action: string, target: string, detail?: string): AuditEntry => ({
    id: uid('a'),
    at: new Date().toISOString().slice(0, 16),
    actor: ADMIN_ACTOR,
    action,
    target,
    detail,
  }), []);

  const addSubmission = useCallback((submission: Submission) => {
    setState((s) => ({
      ...s,
      submissions: [submission, ...s.submissions],
      audit: [
        { ...log('Profile submitted', submission.lawyer.name, `${submission.lawyer.credentials.length} documents attached`), actor: submission.lawyer.name },
        ...s.audit,
      ],
    }));
  }, [log]);

  const approveSubmission = useCallback((id: string, checks: Record<string, boolean>, note: string) => {
    let created: Lawyer | null = null;
    setState((s) => {
      const submission = s.submissions.find((x) => x.id === id);
      if (!submission) return s;
      const today = todayIso();
      const lawyer: Lawyer = {
        ...submission.lawyer,
        credentials: submission.lawyer.credentials.map((c) => ({ ...c, status: 'verified', verifiedOn: today })),
        verified: true,
        verifiedOn: today,
        verifiedBy: ADMIN_ACTOR,
        promoted: false,
        rating: null,
        reviewCount: 0,
        ratingBreakdown: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
        reviews: [],
        addedOn: today,
      };
      created = lawyer;
      return {
        lawyers: [lawyer, ...s.lawyers],
        submissions: s.submissions.map((x) =>
          x.id === id ? { ...x, status: 'approved', decidedOn: today, decidedBy: ADMIN_ACTOR, decisionNote: note, checks } : x,
        ),
        audit: [log('Approved & published', submission.lawyer.name, note || 'All verification checks completed.'), ...s.audit],
      };
    });
    return created;
  }, [log]);

  const decide = useCallback(
    (id: string, status: 'changes-requested' | 'rejected', note: string, checks: Record<string, boolean>) => {
      setState((s) => {
        const submission = s.submissions.find((x) => x.id === id);
        if (!submission) return s;
        return {
          ...s,
          submissions: s.submissions.map((x) =>
            x.id === id ? { ...x, status, decidedOn: todayIso(), decidedBy: ADMIN_ACTOR, decisionNote: note, checks } : x,
          ),
          audit: [
            log(status === 'rejected' ? 'Rejected' : 'Requested changes', submission.lawyer.name, note),
            ...s.audit,
          ],
        };
      });
    },
    [log],
  );

  const requestChanges = useCallback((id: string, note: string, checks: Record<string, boolean>) =>
    decide(id, 'changes-requested', note, checks), [decide]);

  const rejectSubmission = useCallback((id: string, note: string, checks: Record<string, boolean>) =>
    decide(id, 'rejected', note, checks), [decide]);

  const togglePromoted = useCallback((lawyerId: string) => {
    setState((s) => {
      const lawyer = s.lawyers.find((l) => l.id === lawyerId);
      if (!lawyer) return s;
      return {
        ...s,
        lawyers: s.lawyers.map((l) => (l.id === lawyerId ? { ...l, promoted: !l.promoted } : l)),
        audit: [
          log(lawyer.promoted ? 'Premium placement removed' : 'Premium placement added', lawyer.name,
            'Placement is labelled on the directory and never changes organic ranking.'),
          ...s.audit,
        ],
      };
    });
  }, [log]);

  const resetDemo = useCallback(() => {
    setState(initialState());
  }, []);

  const value = useMemo<StoreValue>(
    () => ({ ...state, addSubmission, approveSubmission, requestChanges, rejectSubmission, togglePromoted, resetDemo }),
    [state, addSubmission, approveSubmission, requestChanges, rejectSubmission, togglePromoted, resetDemo],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
};

export const useStore = (): StoreValue => {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used inside StoreProvider');
  return ctx;
};
