import env from "@next/env";

env.loadEnvConfig(process.cwd());
const values = process.env;
const publisher = values.ADSENSE_PUBLISHER_ID ?? "ca-pub-9380315908761258";
const checks = [
  [
    "Production origin configured",
    values.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ===
      "https://rival-royale.com",
  ],
  ["Publisher ID valid", /^ca-pub-\d{16}$/.test(publisher.trim())],
  ["Ad serving explicitly enabled", values.ADSENSE_ENABLED === "1"],
  ...["HOME", "COUNTER", "SKILL"].map((name) => [
    `${name.toLowerCase()} manual unit configured`,
    /^\d+$/.test(values[`ADSENSE_SLOT_${name}`]?.trim() ?? ""),
  ]),
];
console.log(
  "AdSense configuration readiness (values and credentials are not printed)",
);
for (const [label, passed] of checks)
  console.log(`${passed ? "PASS" : "MISSING"}  ${label}`);
console.log(
  "\nProduction serving additionally requires NODE_ENV=production and a non-preview deployment.",
);
console.log(
  "Verify in AdSense: site Ready, ads.txt Authorized, applicable consent messages published, and Auto ads off for manual placement control.",
);
console.log(
  "This check does not inspect account approval, consent status, production configuration or live ad fill.",
);
process.exitCode = checks.every(([, passed]) => passed) ? 0 : 1;
