import { describe, expect, it } from 'vitest';
import { getMessages } from '../i18n';
import { PREVIEW_INVITE, parsePreview, previewFor } from './invitePreview';
import { type InviteEvent, type InviteState, initialInviteState, inviteReducer, isBusy } from './inviteState';
import {
  type InviteInfo,
  InvitesNetworkError,
  InvitesNotConfiguredError,
  inviteErrorKind,
  inviteErrorMessage,
  notConfiguredInvitesClient,
} from './invites';

const run = (events: InviteEvent[], from: InviteState = initialInviteState()) => events.reduce(inviteReducer, from);
const loaded = (info: InviteInfo = PREVIEW_INVITE, id = 1): InviteEvent => ({ type: 'loaded', id, info });
const valid = () => run([{ type: 'load', id: 1 }, loaded()]);

describe('inviteReducer', () => {
  it('starts loading and moves to the status the server reports', () => {
    expect(initialInviteState().status).toBe('loading');
    expect(valid()).toMatchObject({ status: 'valid', info: PREVIEW_INVITE });
    for (const status of ['expired', 'used'] as const) {
      expect(run([{ type: 'load', id: 1 }, loaded({ ...PREVIEW_INVITE, status })]).status).toBe(status);
    }
  });

  it('ignores a stale load result', () => {
    const s = run([{ type: 'load', id: 1 }, { type: 'load', id: 2 }, loaded(PREVIEW_INVITE, 1)]);
    expect(s.status).toBe('loading');
    expect(run([loaded(PREVIEW_INVITE, 2)], s).status).toBe('valid');
  });

  it('fails the load into error and allows a retry', () => {
    const failed = run([
      { type: 'load', id: 1 },
      { type: 'failed', id: 1, kind: 'notConfigured' },
    ]);
    expect(failed).toMatchObject({ status: 'error', errorKind: 'notConfigured' });
    const retry = run([{ type: 'load', id: 2 }], failed);
    expect(retry).toMatchObject({ status: 'loading', errorKind: null, requestId: 2 });
  });

  it('accepts: valid to accepting (busy) to accepted', () => {
    const accepting = run([{ type: 'accept', id: 2 }], valid());
    expect(accepting.status).toBe('accepting');
    expect(isBusy(accepting)).toBe(true);
    expect(run([{ type: 'done', id: 2 }], accepting).status).toBe('accepted');
  });

  it('declines: valid to declining to declined', () => {
    const s = run(
      [
        { type: 'decline', id: 2 },
        { type: 'done', id: 2 },
      ],
      valid(),
    );
    expect(s.status).toBe('declined');
  });

  it('ignores a second action while busy and any action outside valid', () => {
    const accepting = run([{ type: 'accept', id: 2 }], valid());
    expect(
      run(
        [
          { type: 'decline', id: 3 },
          { type: 'accept', id: 3 },
        ],
        accepting,
      ),
    ).toEqual(accepting);
    expect(run([{ type: 'accept', id: 5 }]).status).toBe('loading');
    const expired = run([{ type: 'load', id: 1 }, loaded({ ...PREVIEW_INVITE, status: 'expired' })]);
    expect(run([{ type: 'accept', id: 2 }], expired)).toEqual(expired);
  });

  it('ignores stale completions and failures', () => {
    const accepting = run([{ type: 'accept', id: 2 }], valid());
    expect(run([{ type: 'done', id: 1 }], accepting)).toEqual(accepting);
    expect(run([{ type: 'failed', id: 1, kind: 'network' }], accepting)).toEqual(accepting);
  });

  it('returns to valid with the error when accept fails, keeping the invite', () => {
    const s = run(
      [
        { type: 'accept', id: 2 },
        { type: 'failed', id: 2, kind: 'network' },
      ],
      valid(),
    );
    expect(s).toMatchObject({ status: 'valid', errorKind: 'network', info: PREVIEW_INVITE });
    expect(run([{ type: 'accept', id: 3 }], s)).toMatchObject({ status: 'accepting', errorKind: null });
  });

  it('does not change terminal states', () => {
    const accepted = run(
      [
        { type: 'accept', id: 2 },
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
