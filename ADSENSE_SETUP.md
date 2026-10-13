# AdSense setup

## Account and approval

1. Create an account at https://adsense.google.com/start/ with your own Google account. Complete country, payee and payment information directly with Google.
2. Add `rival-royale.com` in Sites. Copy your real `ca-pub-...` publisher ID.
3. The owner-supplied public publisher ID `ca-pub-9380315908761258` is configured in source. `ADSENSE_PUBLISHER_ID` is an optional override; omit it to use that default. Keep `ADSENSE_ENABLED=0` (or unset). Ensure `NEXT_PUBLIC_SITE_URL=https://rival-royale.com`. Redeploy so metadata and static pages receive the configuration.
4. Choose the meta-tag verification method in AdSense and request review. The root layout supplies `google-adsense-account`. `/ads.txt` supplies the Google authorized-seller record using the same ID even while ads are disabled. Verify both on the deployed domain. Do not use example publisher IDs.
5. Wait for the site's Ready status. Verification alone does not mean ad approval.

## Before enabling ads

- Publish an accurate, accessible privacy policy describing the site's actual Supabase, Vercel Analytics, PostHog and Google advertising data use, storage, cookies and choices. The existing product information page is not a complete advertising privacy policy. This change does not add a legal policy or a consent platform.
- Configure and publish Google's certified consent message in AdSense > Privacy & messaging for applicable regions, including EEA, UK and Switzerland. Include refusal and consent-management choices, and verify the required privacy-settings/revocation entry point. Configure applicable US-state messages as appropriate. Test consent acceptance, refusal and later changes before enabling monetization. An environment flag is not user consent.
- Review Supercell's fan-content requirements, unofficiality notice and excluded advertising categories. Configure ad blocking controls accordingly.
- For Auto ads, configure low-density in-page ads in Google's dashboard and exclude signup, login, password-reset and other pages where ads would disrupt the experience. Exclude card selection and action controls. Start with vignette overlays off. Google's dashboard controls Auto ads locations; the shared script is loaded throughout production once `ADSENSE_ENABLED=1`.

## Auto ads (no manual slot IDs required)

After approval and consent setup, turn on Auto ads in AdSense > Ads > Edit site, configure formats and exclusions, and Apply to site. Set `ADSENSE_ENABLED=1` in production and redeploy. Leave the three slot variables unset for Auto ads alone. The root layout loads the shared script independently of manual slots. Manual units use the same script ID, which Next.js deduplicates. The preview's placements are suggestions; actual placement and size may vary.

## Create placements

In Ads > By ad unit, create three responsive Display units. Copy each numeric `data-ad-slot` value into its production variable:

| Unit name | Variable | Location |
| --- | --- | --- |
| Rival Royale home | `ADSENSE_SLOT_HOME` | Below the tools section, before FAQs |
| Rival Royale counter | `ADSENSE_SLOT_COUNTER` | Below the workbench, before the guide |
| Rival Royale skill | `ADSENSE_SLOT_SKILL` | Below the overview, before skill FAQs |

For manual units or a combined rollout, set `ADSENSE_ENABLED=1` and redeploy only after approval and consent setup. No keys or payment details go in source. Publisher and slot IDs are public identifiers.

The manual slots are horizontal responsive ads with a 100px minimum reserved height and a visible Advertisement label. Google may choose a taller format, so some layout movement remains possible. Missing slot IDs render no manual placeholder. A disabled flag loads no ad script. Local development, Vercel Preview and the beta domain cannot serve ads through these components. Signed-in home visitors still redirect to the dashboard, which has no manual placement; Auto ads can show there unless excluded in Google.

## Verify and measure

- Check mobile/desktop layouts, successful counter searches and deck exports.
- Check refusal/acceptance behavior with the actual published CMP and Google's diagnostic tools; this cannot be validated before an account exists.
- Check each mounted slot requests only once, including client navigation away and back; script blocking must not break the app. Never click your own live ads or generate automated ad traffic.
- Compare revenue per 1,000 total site sessions, tool completion, return visits and page performance. Analytics page views are not necessarily AdSense page views.
- To disable, set `ADSENSE_ENABLED=0` and redeploy. Verification and ads.txt remain available. Existing open tabs may need reloading.

Official references:
- https://support.google.com/adsense/answer/7584263
- https://support.google.com/adsense/answer/12131223
- https://support.google.com/adsense/answer/9183460
- https://support.google.com/adsense/answer/10960768
- https://supercell.com/en/fan-content-policy/
