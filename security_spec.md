# HIDEVERSE Security Specification (Phase 0)

## Data Invariants
1. A private user document `/users/{userId}` can only be read by its owner or an admin, preventing PII (`email`) exposure.
2. Players cannot self-assign `role: 'admin'` or `isBanned: false` overrides during creation or profile updates.
3. Public profiles `/public_profiles/{userId}` expose zero PII and validate string lengths and bounded numeric fields.
4. Friend requests require `fromUid == request.auth.uid`, start in `status == 'pending'`, and can only be accepted/rejected by `toUid == request.auth.uid`.
5. Reports must be immutable once resolved/dismissed except by admins; reporters cannot forge `reporterUid`.
6. Audit logs can only be created by verified admins and are strictly immutable (no update/delete).
7. Match records validate enum map/mode/winnerRole values and are immutable after creation.
8. Every string field is length-bounded and every document ID is validated via `isValidId()`.

## Dirty Dozen Payloads (Must All Return PERMISSION_DENIED)
1. **Unauthenticated read of `/users/alice`**: `{ auth: null, op: 'get', path: '/users/alice' }` -> DENIED.
2. **Cross-user PII read `/users/bob` as Alice**: `{ auth: 'alice', op: 'get', path: '/users/bob' }` -> DENIED.
3. **Self-promotion on signup `/users/alice`**: `{ auth: 'alice', op: 'create', data: { uid: 'alice', role: 'admin', isBanned: false, ... } }` -> DENIED.
4. **Shadow field injection `/public_profiles/alice`**: `{ auth: 'alice', op: 'create', data: { ..., shadowFlag: true } }` -> DENIED.
5. **Unverified email write `/public_profiles/alice`**: `{ auth: { uid: 'alice', email_verified: false }, op: 'create', data: { ... } }` -> DENIED.
6. **Impersonating friend request sender `/friend_requests/req1`**: `{ auth: 'alice', op: 'create', data: { fromUid: 'bob', toUid: 'charlie', status: 'pending' } }` -> DENIED.
7. **Sender self-accepting friend request `/friend_requests/req1`**: `{ auth: 'alice', op: 'update', data: { status: 'accepted' } }` (when `fromUid == 'alice'`) -> DENIED.
8. **ID Poisoning (150-char doc ID)**: `{ auth: 'alice', op: 'create', path: '/public_profiles/' + 'a'.repeat(150) }` -> DENIED.
9. **Client timestamp forgery `/matches/m1`**: `{ auth: 'alice', op: 'create', data: { createdAt: '2020-01-01T00:00:00Z' } }` (not `request.time`) -> DENIED.
10. **Non-admin writing `/audit_logs/log1`**: `{ auth: 'alice', op: 'create', data: { actorUid: 'alice', action: 'ban', targetId: 'bob' } }` -> DENIED.
11. **Non-admin resolving `/reports/rep1`**: `{ auth: 'alice', op: 'update', data: { status: 'resolved' } }` -> DENIED.
12. **Blanket list query on `/users` by non-admin**: `{ auth: 'alice', op: 'list', path: '/users' }` -> DENIED.
