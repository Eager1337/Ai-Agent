# Trading Intelligence and Cyber Lab setup

These features are deliberately disabled until the server integrations are configured and tested. Do not put provider secrets in browser variables such as VITE_* or commit them to Git.

## 1. Read-only broker connection (SnapTrade)

SnapTrade is the initial multi-broker adapter. Actual brokerage availability depends on SnapTrade's current supported-institution list, account type, and region. The integration only requests the read connection type; there are no order-placement routes in this feature.

1. Create a SnapTrade developer account and obtain a test clientId and consumerKey.
2. In the deployment environment, set SNAPTRADE_CLIENT_ID, SNAPTRADE_CONSUMER_KEY, and SUPABASE_SERVICE_ROLE_KEY.
3. Generate TRADING_ENCRYPTION_KEY as 32 cryptographically random bytes encoded as 64 hexadecimal characters. Store it in the hosting provider's secret manager; losing it makes stored provider secrets unreadable.
4. Apply supabase/migrations/202610090001_trading_and_cyber_lab.sql to the Supabase project configured for this repository. The connected Supabase tool account did not grant database-management permission during this implementation, so this migration has not been applied automatically. Use the SQL Editor with an authorized project owner.
5. Deploy the application and test with a SnapTrade test account first. Connect through the provider-hosted portal; do not enter broker credentials directly into Eager AI.
6. Verify the account list and activity endpoint with a connected test account before enabling production. Some providers deliver activities with a delay, and account activity is not guaranteed to equal realized trade P&L.

Required server variables:
- SNAPTRADE_CLIENT_ID
- SNAPTRADE_CONSUMER_KEY
- TRADING_ENCRYPTION_KEY
- SUPABASE_URL
- SUPABASE_SERVICE_ROLE_KEY

The service-role key bypasses RLS. Keep it server-only, grant no access to it in client bundles, and rotate it if exposed.

## 2. Browser Linux desktop and full VM lab sessions (Kasm Workspaces)

Eager AI does not run security tools in its web process. It requests isolated sessions from a separate Kasm Workspaces deployment.

1. Deploy and secure Kasm Workspaces on a separate host. Configure TLS/HTTPS.
2. Configure one dedicated Linux desktop workspace image for KASM_LINUX_IMAGE_ID.
3. Configure a separate VM/server-pool-backed workspace for KASM_VM_IMAGE_ID. This ID must be a workspace image configured in Kasm for your intended VM/remote desktop infrastructure; the app does not provision a hypervisor by itself. If your Kasm workspace requires a server-pool target, also set KASM_VM_SERVER_ID to the approved server ID.
4. Create a Kasm Developer API key with only the permissions required to request and inspect sessions (typically User and Users Auth Session for the configured deployment). Do not grant Global Admin. Set KASM_URL, KASM_API_KEY, KASM_API_KEY_SECRET, KASM_LINUX_IMAGE_ID, and KASM_VM_IMAGE_ID as server-side secrets/configuration.
5. Configure disposable profiles, no host filesystem mounts, restricted egress, and no access to cloud metadata or unrelated private networks. Use only training images and targets you own or have written authorization to test.
6. Apply the same Supabase migration from step 1. The session API enforces per-user ownership and a maximum of two active sessions per user, and sets a one-hour expiry in application records. Also configure Kasm's own server-side session/idle timeouts: application expiry metadata alone does not stop a provider VM.
7. Test both modes with non-sensitive lab content, confirm the provider reports running before opening its URL, and verify Kasm logs and cleanup behavior.

Required server variables:
- KASM_URL (HTTPS)
- KASM_API_KEY
- KASM_API_KEY_SECRET
- KASM_LINUX_IMAGE_ID
- KASM_VM_IMAGE_ID

## Verification checklist

- [ ] Apply migration successfully and confirm RLS is enabled on both private tables.
- [ ] SnapTrade test user can connect through the provider portal using read-only permission.
- [ ] Accounts and activity endpoints reject unauthenticated requests and never return provider secrets.
- [ ] No order placement, modification, cancellation, transfer, or withdrawal endpoint is present.
- [ ] Linux desktop and VM sessions use separate preconfigured images.
- [ ] User A cannot poll or access User B's session record.
- [ ] Kasm has egress restrictions, time limits, quotas, and provider-side cleanup configured.
- [ ] CI build and tests pass before merging or deploying.
