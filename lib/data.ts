const SHEET_ID = '11MgqbxV08YjxVcynCsrTs-CsTVMgizCIMleIRYWZSGw';

function parseCSV(csv: string): Record<string, string>[] {
  const lines = csv.trim().split('\n');
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map((h) => h.replace(/^"|"$/g, '').trim());
  return lines.slice(1).map((line) => {
    const values = line.split(',').map((v) => v.replace(/^"|"$/g, '').trim());
    const row: Record<string, string> = {};
    headers.forEach((h, i) => {
      row[h] = values[i] || '';
    });
    return row;
  });
}

async function fetchSheet(sheetName: string) {
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}`;
  const res = await fetch(url, { next: { revalidate: 30 } });
  if (!res.ok) throw new Error(`Sheet "${sheetName}" not accessible. Make sure it's shared publicly.`);
  const csv = await res.text();
  return parseCSV(csv);
}

export async function searchCustomerByName(name: string) {
  const customers = await fetchSheet('Customers');
  const matches = customers.filter((c) =>
    c.Name.toLowerCase().includes(name.toLowerCase())
  );
  return matches.length ? { found: true, customers: matches } : { found: false };
}

export async function getCustomerById(customerId: string) {
  const customers = await fetchSheet('Customers');
  const customer = customers.find((c) => c.CustomerID === customerId);
  return customer || { found: false };
}

export async function getOrderHistory(customerId: string) {
  const orders = await fetchSheet('Orders');
  return orders.filter((o) => o.CustomerID === customerId);
}

export async function getSupportIssues(customerId: string) {
  const issues = await fetchSheet('Issues');
  return issues.filter((i) => i.CustomerID === customerId);
}
