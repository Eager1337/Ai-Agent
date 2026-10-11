export type IocType = "ipv4" | "ipv6" | "domain" | "url" | "email" | "md5" | "sha1" | "sha256" | "cve" | "other";

export function detectIoc(raw: string): { type: IocType; value: string } {
  // Accept defanged forms like hxxp://evil[.]com
  const v = raw.trim().replace(/\[\.\]|\(\.\)/g, ".").replace(/^hxxp/i, "http");
  if (/^https?:\/\//i.test(v)) return { type: "url", value: v };
  if (/^(25[0-5]|2[0-4]\d|1?\d?\d)(\.(25[0-5]|2[0-4]\d|1?\d?\d)){3}$/.test(v)) return { type: "ipv4", value: v };
  if (/^[0-9a-f:]+$/i.test(v) && v.includes("::") || /^([0-9a-f]{1,4}:){7}[0-9a-f]{1,4}$/i.test(v)) return { type: "ipv6", value: v.toLowerCase() };
  if (/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(v)) return { type: "email", value: v.toLowerCase() };
  const h = v.replace(/^(sha256|sha1|md5):/i, "");
  if (/^[a-f0-9]{64}$/i.test(h)) return { type: "sha256", value: h.toLowerCase() };
  if (/^[a-f0-9]{40}$/i.test(h)) return { type: "sha1", value: h.toLowerCase() };
  if (/^[a-f0-9]{32}$/i.test(h)) return { type: "md5", value: h.toLowerCase() };
  if (/^CVE-\d{4}-\d{4,}$/i.test(v)) return { type: "cve", value: v.toUpperCase() };
  if (/^([a-z0-9-]+\.)+[a-z]{2,}$/i.test(v)) return { type: "domain", value: v.toLowerCase() };
  return { type: "other", value: v };
}

/** Manual lookup links the analyst opens themselves; the app never contacts targets. */
export function pivots(type: string, value: string): { label: string; href: string }[] {
  const e = encodeURIComponent(value);
  switch (type) {
    case "ipv4": case "ipv6": return [
      { label: "VirusTotal", href: `https://www.virustotal.com/gui/ip-address/${e}` },
      { label: "AbuseIPDB", href: `https://www.abuseipdb.com/check/${e}` },
      { label: "Shodan", href: `https://www.shodan.io/host/${e}` },
    ];
    case "domain": return [
      { label: "VirusTotal", href: `https://www.virustotal.com/gui/domain/${e}` },
      { label: "urlscan", href: `https://urlscan.io/search/#domain:${e}` },
      { label: "WHOIS", href: `https://lookup.icann.org/en/lookup?name=${e}` },
      { label: "crt.sh", href: `https://crt.sh/?q=${e}` },
    ];
    case "url": return [
      { label: "VirusTotal", href: `https://www.virustotal.com/gui/search/${e}` },
      { label: "urlscan", href: `https://urlscan.io/search/#${e}` },
    ];
    case "md5": case "sha1": case "sha256": return [
      { label: "VirusTotal", href: `https://www.virustotal.com/gui/file/${e}` },
      { label: "MalwareBazaar", href: `https://bazaar.abuse.ch/browse.php?search=${e}` },
    ];
    case "cve": return [{ label: "NVD", href: `https://nvd.nist.gov/vuln/detail/${e}` }];
    default: return [];
  }
}

export async function sha256Hex(data: ArrayBuffer | string) {
  const buf = typeof data === "string" ? new TextEncoder().encode(data) : data;
  const d = await crypto.subtle.digest("SHA-256", buf);
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
