import { leadFrom, parseLeadMessage, validateConsultation, type ConsultationForm } from './consultation-model';

const form: ConsultationForm = {
  kind: 'atelier',
  name: 'Mariam Al Hashimi',
  email: 'mariam@example.com',
  phone: '050 123 4567',
  date: '2026-10-12',
  time: 'afternoon',
  where: '',
  message: 'A wedding in March.',
  orderNumber: '',
};

describe('validateConsultation', () => {
  it('passes a complete request', () => {
    expect(validateConsultation(form)).toEqual([]);
  });

  it('needs a name, and some way to reply', () => {
    expect(validateConsultation({ ...form, name: ' ' })).toEqual(['name']);
    expect(validateConsultation({ ...form, email: '', phone: '' })).toEqual(['reach']);
  });

  it('accepts either an email or a mobile on its own, and a number from abroad', () => {
    expect(validateConsultation({ ...form, phone: '' })).toEqual([]);
    expect(validateConsultation({ ...form, email: '', phone: '+44 7700 900123' })).toEqual([]);
  });

  it('rejects what is given but malformed', () => {
    expect(validateConsultation({ ...form, email: 'nope' })).toEqual(['email']);
    expect(validateConsultation({ ...form, phone: '12' })).toEqual(['phone']);
  });
});

describe('leadFrom', () => {
  it('writes a message the designer can act on, with the phone in E.164 and a source that names the kind', () => {
    const lead = leadFrom(form);
    expect(lead.phone).toBe('+971501234567');
    expect(lead.source).toBe('consultation-atelier');
    expect(lead.message).toBe('Consultation request: atelier\nPreferred: 2026-10-12, afternoon\nA wedding in March.');
  });

  it('leaves out what was not given', () => {
    const lead = leadFrom({ ...form, email: '', date: '', time: 'any', message: '', phone: '' });
    expect(lead).toEqual({
      name: 'Mariam Al Hashimi',
      message: 'Consultation request: atelier',
      source: 'consultation-atelier',
    });
  });

  it('names the order a consultation belongs to, and where a home visit should be', () => {
    const lead = leadFrom({ ...form, kind: 'home', where: 'Dubai', orderNumber: 'RY-2026-0031' });
    expect(lead.message).toContain('Where: Dubai');
    expect(lead.message).toContain('Order: RY-2026-0031');
    expect(lead.source).toBe('consultation-home');
  });

  it('stays within what the CRM holds', () => {
    expect(leadFrom({ ...form, message: 'x'.repeat(5000) }).message.length).toBeLessThanOrEqual(2000);
  });
});

describe('parseLeadMessage', () => {
  it('reads back what leadFrom wrote', () => {
    const lead = leadFrom({ ...form, where: 'Villa 4, Jumeirah', orderNumber: 'RY-2026-0007' });
    expect(parseLeadMessage(lead.message)).toEqual({
      kind: 'atelier',
      preferred: '2026-10-12, afternoon',
      where: 'Villa 4, Jumeirah',
      orderNumber: 'RY-2026-0007',
      text: 'A wedding in March.',
    });
  });

  it('keeps the whole message of a lead that did not come from the form', () => {
    expect(parseLeadMessage('Called the atelier.\nWants a fitting in March.')).toEqual({
      kind: null,
      preferred: null,
      where: null,
      orderNumber: null,
      text: 'Called the atelier.\nWants a fitting in March.',
    });
  });

  it('survives an empty or missing message', () => {
    expect(parseLeadMessage(null).text).toBe('');
    expect(parseLeadMessage('').kind).toBeNull();
  });

  it('does not mistake the client’s own "Order:" line for a fact when the lead has no kind', () => {
    expect(parseLeadMessage('Order: my sister’s dress').orderNumber).toBeNull();
  });
});
