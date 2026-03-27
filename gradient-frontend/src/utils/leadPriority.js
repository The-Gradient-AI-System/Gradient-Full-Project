const INTENT_TAG = 'Pending Review';

export const getIntentTag = (lead) => (lead?.pending_review ? INTENT_TAG : '');

export const sortLeadsByPriority = (leads) => {
  return [...(leads || [])].sort((a, b) => {
    const aPending = a?.pending_review ? 1 : 0;
    const bPending = b?.pending_review ? 1 : 0;
    if (aPending !== bPending) return bPending - aPending;

    const aPriority = a?.is_priority ? 1 : 0;
    const bPriority = b?.is_priority ? 1 : 0;
    if (aPriority !== bPriority) return bPriority - aPriority;

    const aDate = new Date(a?.received_at || 0).getTime();
    const bDate = new Date(b?.received_at || 0).getTime();
    return bDate - aDate;
  });
};

