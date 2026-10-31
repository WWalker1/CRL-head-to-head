# AdSense activation

The owner has authorized ads. The remaining requirements are configuration, Google account status and deployment access, not another permission request.

## Application implementation

- Verification metadata and `/ads.txt` use the owner-supplied publisher ID `ca-pub-9380315908761258` on the canonical production origin.
- Three manual placements exist: below homepage content, below Counter Finder, and on the skill landing page. Each is labeled Advertisement and separated from tool controls.
- The ad loader is mounted only with an enabled, configured manual unit. The root layout no longer injects it on every route. Once loaded during client navigation the third-party script can remain active; AdSense account settings still control Auto ads and page exclusions.
- Previews, local development and noncanonical origins do not request ads. Blocked scripts and provider errors do not break the tool. Space is reserved before loading.

## Required production configuration

```
NEXT_PUBLIC_SITE_URL=https://rival-royale.com
ADSENSE_ENABLED=1
ADSENSE_PUBLISHER_ID=ca-pub-9380315908761258
ADSENSE_SLOT_HOME=<real manual display unit ID>
ADSENSE_SLOT_COUNTER=<real manual display unit ID>
ADSENSE_SLOT_SKILL=<real manual display unit ID>
```

Use numeric slot IDs from actual AdSense display units. Never invent them. A missing unit stays hidden. The publisher ID is public, not a credential. Do not send account passwords or tokens.

Run `npm run ads:check` in the configured release environment. It reports booleans, not values. Local configuration was checked October 22: serving off/unset, all three slots absent, canonical site URL absent. This does not establish the state of production Vercel variables.

## Account and release verification

1. In AdSense Sites, confirm rival-royale.com is Ready and ads.txt is Authorized. Submit review if still pending; application code cannot grant approval.
2. Create the three manual display units. Disable Auto ads for predictable placement; specifically avoid anchor/vignette formats and exclude account/auth pages if automatic formats are ever used.
3. Publish and verify the applicable consent messages. Google requires a certified CMP for personalized ads to users in the EEA, UK and Switzerland; Google Privacy & messaging provides an account-managed option. No homemade checkbox has been substituted for this.
4. Set production variables, deploy after the dev review, and verify `/ads.txt` plus publisher metadata on the live canonical domain.
5. Inspect the three pages on mobile/desktop for layout movement, no accidental click targets, console errors, blocked-script behavior and actual ad fill. Do not click your own ads. Approval/configuration do not guarantee inventory.

References: https://support.google.com/adsense/answer/12170222 ; https://support.google.com/adsense/answer/12171612 ; https://support.google.com/adsense/answer/13554116 ; https://support.google.com/adsense/answer/9305577
