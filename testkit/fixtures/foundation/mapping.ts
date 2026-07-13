export function mapRow(row: Readonly<{ hcp_id: string }>): Readonly<{
  hcpCode: string;
}> {
  return { hcpCode: row.hcp_id };
}
