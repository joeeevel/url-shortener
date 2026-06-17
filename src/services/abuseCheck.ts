const SUSPICIOUS_TLDS = new Set([
  '.tk', '.ml', '.ga', '.cf', '.gq', '.xyz', '.top', '.club',
  '.work', '.date', '.men', '.loan', '.download', '.review',
]);

const PHISHING_KEYWORDS = [
  'login', 'signin', 'account', 'secure', 'verify', 'update',
  'confirm', 'banking', 'paypal', 'amazon', 'netflix', 'apple',
  'google', 'microsoft', 'facebook', 'instagram', 'whatsapp',
  'reset-password', 'password-reset', '2fa', 'two-factor',
];

const BLOCKED_DOMAINS = new Set([
  'malware-site.com', 'phishing-site.com', 'example-login.com',
]);

interface AbuseCheckResult {
  safe: boolean;
  reason?: string;
}

function isHomographAttack(hostname: string): boolean {
  for (const char of hostname) {
    if (char.charCodeAt(0) > 127) return true;
  }
  return false;
}

function hasSuspiciousKeywords(urlString: string): boolean {
  const lower = urlString.toLowerCase();
  const keywordCount = PHISHING_KEYWORDS.filter((kw) => lower.includes(kw)).length;
  return keywordCount >= 2;
}

export function checkAbusiveUrl(urlString: string): AbuseCheckResult {
  let parsed: URL;
  try {
    parsed = new URL(urlString);
  } catch {
    return { safe: false, reason: 'Invalid URL' };
  }

  const hostname = parsed.hostname.toLowerCase();
  const domain = hostname.startsWith('www.') ? hostname.slice(4) : hostname;

  if (BLOCKED_DOMAINS.has(domain)) {
    return { safe: false, reason: 'Domain is blocked' };
  }

  if (SUSPICIOUS_TLDS.has(domain.slice(domain.lastIndexOf('.')))) {
    return { safe: false, reason: 'Suspicious TLD' };
  }

  if (isHomographAttack(hostname)) {
    return { safe: false, reason: 'Unicode homograph attack detected' };
  }

  if (hasSuspiciousKeywords(urlString)) {
    return { safe: false, reason: 'URL contains multiple phishing keywords' };
  }

  return { safe: true };
}
