export const computeExpiresOn = (registeredOn) => {
  if (!registeredOn) return '';
  const start = new Date(registeredOn);
  if (Number.isNaN(start.getTime())) return '';
  const expires = new Date(start);
  expires.setDate(expires.getDate() + 365);
  return expires.toISOString().slice(0, 10);
};

export const buildRegistrationDraft = (registration) => {
  const today = new Date();
  return {
    id: registration?.id || null,
    registration_year: registration?.registration_year || today.getFullYear(),
    status: registration?.status || 'pending',
    registered_on: registration?.registered_on || '',
    expires_on: registration?.expires_on || '',
    fee_amount: typeof registration?.fee_amount === 'number' ? registration.fee_amount : 0,
    fee_paid: Boolean(registration?.fee_paid),
    fire_damage: Boolean(registration?.fire_damage),
    maintenance_status: registration?.maintenance_status || '',
    maintenance_notes: registration?.maintenance_notes || '',
    security_status: registration?.security_status || '',
    security_notes: registration?.security_notes || '',
    notes: registration?.notes || '',
    compliance_checked_at: registration?.compliance_checked_at || '',
  };
};

export const deriveVacancyStatusFromRegistration = (registration, fallbackStatus) => {
  if (!registration) return fallbackStatus;
  const expires = registration.expires_on ? new Date(registration.expires_on) : null;
  const expired = expires && !Number.isNaN(expires.getTime()) && expires.getTime() < Date.now();
  if (registration.status === 'expired' || expired) return 'vacant';
  if (['pending', 'active', 'waived'].includes(registration.status)) return 'registered';
  return fallbackStatus || registration.status || 'vacant';
};
