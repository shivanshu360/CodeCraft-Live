import test from 'node:test';
import assert from 'node:assert/strict';
import { mock } from 'node:test';

import Session from '../models/Session.js';
import { chatClient, streamClient } from '../lib/stream.js';
import { deleteSession } from './sessionController.js';

test('deleteSession deletes a host-owned session and cleans up stream resources', async () => {
  const fakeSession = {
    _id: 'session-123',
    host: { toString: () => 'user-1' },
    status: 'active',
    callId: 'call-123',
  };

  const findByIdMock = mock.method(Session, 'findById', async () => fakeSession);
  const findByIdAndDeleteMock = mock.method(Session, 'findByIdAndDelete', async () => fakeSession);

  const deleteCall = { delete: async () => {} };
  const channel = { delete: async () => {} };

  const callMock = mock.method(streamClient.video, 'call', () => deleteCall);
  const channelMock = mock.method(chatClient, 'channel', () => channel);

  const req = { params: { id: 'session-123' }, user: { _id: 'user-1' } };
  const res = {
    statusCode: null,
    payload: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.payload = data;
      return this;
    },
  };

  try {
    await deleteSession(req, res);

    assert.equal(res.statusCode, 200);
    assert.equal(res.payload.message, 'Session deleted successfully');
    assert.equal(findByIdMock.mock.calls.length, 1);
    assert.equal(findByIdAndDeleteMock.mock.calls.length, 1);
    assert.equal(callMock.mock.calls.length, 1);
    assert.equal(channelMock.mock.calls.length, 1);
  } finally {
    mock.restoreAll();
  }
});
