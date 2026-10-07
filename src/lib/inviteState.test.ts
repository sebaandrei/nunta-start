import { describe, expect, it } from 'vitest';
import { getMessages } from '../i18n';
import { PREVIEW_INVITE, parsePreview, previewFor } from './invitePreview';
import {
  emailsDiffer,
  type InviteEvent,
  type InviteState,
  initialInviteState,
  inviteReducer,
  isBusy,
} from './inviteState';
import {
  INVITE_LIFETIME_DAYS,
  type InviteInfo,
  InvitesNetworkError,
  InvitesNotConfiguredError,
  InvitesStateError,
  inviteErrorKind,
  inviteErrorMessage,
  notConfiguredInvitesClient,
} from './invites';

const run = (events: InviteEvent[], from: InviteState = initialInviteState()) => events.reduce(inviteReducer, from);
const loaded = (info: InviteInfo = PREVIEW_INVITE, id = 1): InviteEvent => ({ type: 'loaded', id, info });
const valid = () => run([{ type: 'load', id: 1, token: 'a' }, loaded()]);

describe('inviteReducer', () => {
  it('starts loading and moves to the status the server reports', () => {
    expect(initialInviteState().status).toBe('loading');
    expect(valid()).toMatchObject({ status: 'valid', info: PREVIEW_INVITE });
    for (const status of ['expired', 'used'] as const) {
      expect(run([{ type: 'load', id: 1, token: 'a' }, loaded({ ...PREVIEW_INVITE, status })]).status).toBe(status);
    }
  });

  it('ignores a stale load result', () => {
    const s = run([
      { type: 'load', id: 1, token: 'a' },
      { type: 'load', id: 2, token: 'a' },
      loaded(PREVIEW_INVITE, 1),
    ]);
    expect(s.status).toBe('loading');
    expect(run([loaded(PREVIEW_INVITE, 2)], s).status).toBe('valid');
  });

  it('a new token resets from any status and shows the new invite', () => {
    const other: InviteInfo = { ...PREVIEW_INVITE, workspaceName: 'Nunta Cristinei' };
    for (const from of [valid(), run([{ type: 'accept', id: 2, token: 'a' }], valid())]) {
      const loading = run([{ type: 'load', id: 3, token: 'b' }], from);
      expect(loading).toMatchObject({ status: 'loading', info: null, token: 'b', errorKind: null });
      expect(run([loaded(other, 3)], loading)).toMatchObject({ status: 'valid', info: other, token: 'b' });
    }
    const expired = run([{ type: 'load', id: 1, token: 'a' }, loaded({ ...PREVIEW_INVITE, status: 'expired' })]);
    expect(run([{ type: 'load', id: 2, token: 'b' }], expired).status).toBe('loading');
  });

  it('ignores a late result of the old token after the token changed', () => {
    const s = run([{ type: 'load', id: 3, token: 'b' }, loaded(PREVIEW_INVITE, 1)], valid());
    expect(s).toMatchObject({ status: 'loading', info: null });
    const failedLate = run([{ type: 'failed', id: 1, kind: 'network' }], s);
    expect(failedLate.status).toBe('loading');
  });

  it('refuses accept and decline for a token other than the displayed one', () => {
    expect(run([{ type: 'accept', id: 2, token: 'zzz' }], valid())).toEqual(valid());
    expect(run([{ type: 'decline', id: 2, token: 'zzz' }], valid())).toEqual(valid());
  });

  it('fails the load into error and allows a retry', () => {
    const failed = run([
      { type: 'load', id: 1, token: 'a' },
      { type: 'failed', id: 1, kind: 'notConfigured' },
    ]);
    expect(failed).toMatchObject({ status: 'error', errorKind: 'notConfigured' });
    const retry = run([{ type: 'load', id: 2, token: 'a' }], failed);
    expect(retry).toMatchObject({ status: 'loading', errorKind: null, requestId: 2 });
  });

  it('accepts: valid to accepting (busy) to accepted', () => {
    const accepting = run([{ type: 'accept', id: 2, token: 'a' }], valid());
    expect(accepting.status).toBe('accepting');
    expect(isBusy(accepting)).toBe(true);
    expect(run([{ type: 'done', id: 2 }], accepting).status).toBe('accepted');
  });

  it('declines: valid to declining to declined', () => {
    const s = run(
      [
        { type: 'decline', id: 2, token: 'a' },
        { type: 'done', id: 2 },
      ],
      valid(),
    );
    expect(s.status).toBe('declined');
  });

  it('ignores a second action while busy and any action outside valid', () => {
    const accepting = run([{ type: 'accept', id: 2, token: 'a' }], valid());
    expect(
      run(
        [
          { type: 'decline', id: 3, token: 'a' },
          { type: 'accept', id: 3, token: 'a' },
        ],
        accepting,
      ),
    ).toEqual(accepting);
    expect(run([{ type: 'accept', id: 5, token: 'a' }]).status).toBe('loading');
    const expired = run([{ type: 'load', id: 1, token: 'a' }, loaded({ ...PREVIEW_INVITE, status: 'expired' })]);
    expect(run([{ type: 'accept', id: 2, token: 'a' }], expired)).toEqual(expired);
  });

  it('ignores stale completions and failures', () => {
    const accepting = run([{ type: 'accept', id: 2, token: 'a' }], valid());
    expect(run([{ type: 'done', id: 1 }], accepting)).toEqual(accepting);
    expect(run([{ type: 'failed', id: 1, kind: 'network' }], accepting)).toEqual(accepting);
  });

  it('returns to valid with the error when accept fails, keeping the invite', () => {
    const s = run(
      [
        { type: 'accept', id: 2, token: 'a' },
        { type: 'failed', id: 2, kind: 'network' },
      ],
      valid(),
    );
    expect(s).toMatchObject({ status: 'valid', errorKind: 'network', info: PREVIEW_INVITE });
    expect(run([{ type: 'accept', id: 3, token: 'a' }], s)).toMatchObject({ status: 'accepting', errorKind: null });
  });

  it('does not change terminal states', () => {
    const accepted = run(
      [
        { type: 'accept', id: 2, token: 'a' },
        { type: 'done', id: 2 },
      ],
      valid(),
    );
    expect(
      run(
        [
          { type: 'done', id: 2 },
          { type: 'failed', id: 2, kind: 'generic' },
        ],
        accepted,
      ),
    ).toEqual(accepted);
  });
});

describe('invites clients and errors', () => {
  it('the default client rejects every call with the not-configured error', async () => {
    await expect(notConfiguredInvitesClient.inspect('x')).rejects.toBeInstanceOf(InvitesNotConfiguredError);
    await expect(notConfiguredInvitesClient.accept('x')).rejects.toBeInstanceOf(InvitesNotConfiguredError);
    await expect(notConfiguredInvitesClient.decline('x')).rejects.toBeInstanceOf(InvitesNotConfiguredError);
  });

  it('classifies errors and words them honestly', () => {
    expect(inviteErrorKind(new InvitesNotConfiguredError())).toBe('notConfigured');
    expect(inviteErrorKind(new InvitesNetworkError())).toBe('network');
    expect(inviteErrorKind(new TypeError('fetch'))).toBe('network');
    expect(inviteErrorKind(new Error('boom'))).toBe('generic');
    expect(inviteErrorMessage('notConfigured', getMessages('ro'))).toBe('Invitațiile nu sunt încă disponibile.');
  });
});

describe('invite preview', () => {
  it('parses only known names', () => {
    expect(parsePreview('valid')).toBe('valid');
    expect(parsePreview('expired')).toBe('expired');
    expect(parsePreview('error')).toBe('error');
    expect(parsePreview('x')).toBeNull();
    expect(parsePreview(null)).toBeNull();
  });

  it('builds the designed states', async () => {
    expect(previewFor('valid').state.status).toBe('valid');
    expect(previewFor('expired').state.status).toBe('expired');
    expect(previewFor('error').state).toMatchObject({ status: 'error', errorKind: 'network' });
    await expect(previewFor('error').client.accept('x')).rejects.toBeInstanceOf(InvitesNetworkError);
    await expect(previewFor('valid').client.accept('x')).resolves.toBeUndefined();
  });
});

describe('invite lifetime copy', () => {
  it('takes the number of days from the single constant', () => {
    expect(INVITE_LIFETIME_DAYS).toBe(14);
    for (const l of ['ro', 'en'] as const) {
      expect(getMessages(l).invite.expired.body('X')).toContain(String(INVITE_LIFETIME_DAYS));
    }
  });
});

describe('invitation changed under the page', () => {
  const info = { ...PREVIEW_INVITE };
  const accepting = (): InviteState => ({
    ...initialInviteState('valid', info, 't'),
    status: 'accepting',
    requestId: 3,
  });

  it('moves to the real terminal state when accept finds the invitation expired or used', () => {
    for (const kind of ['expired', 'used'] as const) {
      const next = inviteReducer(accepting(), { type: 'failed', id: 3, kind });
      expect(next.status).toBe(kind);
      expect(next.info?.status).toBe(kind);
      expect(next.errorKind).toBeNull();
    }
  });

  it('does the same for decline', () => {
    const state: InviteState = { ...accepting(), status: 'declining' };
    expect(inviteReducer(state, { type: 'failed', id: 3, kind: 'expired' }).status).toBe('expired');
  });

  it('keeps the actions available after an ordinary failure', () => {
    const next = inviteReducer(accepting(), { type: 'failed', id: 3, kind: 'wrongAccount' });
    expect(next.status).toBe('valid');
    expect(next.errorKind).toBe('wrongAccount');
  });
});

describe('emailsDiffer', () => {
  it('ignores case and spaces', () => {
    expect(emailsDiffer('Ana@Test.ro', ' ana@test.ro ')).toBe(false);
  });
  it('flags another address', () => {
    expect(emailsDiffer('ana@test.ro', 'mihai@test.ro')).toBe(true);
  });
  it('does not flag when either side is unknown', () => {
    expect(emailsDiffer(null, 'a@b.ro')).toBe(false);
    expect(emailsDiffer('a@b.ro', null)).toBe(false);
  });
});

describe('state errors', () => {
  it('maps an expired or used invitation to its own kind', () => {
    expect(inviteErrorKind(new InvitesStateError('expired'))).toBe('expired');
    expect(inviteErrorKind(new InvitesStateError('used'))).toBe('used');
  });
  it('has a readable message for them anyway', () => {
    const t = getMessages('ro');
    expect(inviteErrorMessage('expired', t)).toBe(t.invite.errors.generic);
  });
});
