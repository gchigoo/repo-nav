/** F9-SECURITY-001 */
export const SECURITY_REQUIRED_PHRASES_V2 = Object.freeze([
  'GitHub Security Advisories',
  'Do not file public issues for vulnerabilities',
  '2.x',
  '<2.0',
] as const);

export const SECURITY_FORBIDDEN_PHRASES_V2 = Object.freeze([
  'SLA',
  'mailto:',
  'response within',
] as const);
