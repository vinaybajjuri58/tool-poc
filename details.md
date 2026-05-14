# Customer Support AI — POC

A demo app showing how AI tool-calling works in a customer support context.
Split-panel UI: chat on the right, live AI reasoning flow on the left.

---

## What This Demonstrates

User asks something like "Get details for Rahul Sharma" and the UI shows:

1. Message received
2. Claude API called with tool definitions
3. Claude decides to call `search_customer_by_name`
4. Tool executes — reads from Excel file
5. Result sent back to Claude
6. Claude generates a final response

The left panel shows each of these steps as animated nodes in real time.

---

## Tech Stack

| Layer       | Choice                        | Reason                              |
|-------------|-------------------------------|-------------------------------------|
| Framework   | Next.js 14 (App Router)       | Single repo for frontend + backend  |
| AI          | Anthropic SDK (`anthropic`)   | Tool use / function calling         |
| Streaming   | Server-Sent Events (SSE)      | Works on Vercel serverless, no WS   |
| Database    | Excel file (`.xlsx`)          | Simple, visual, no DB setup needed  |
| Excel reads | `xlsx` npm package            | Lightweight, works server-side      |
| Styling     | Tailwind CSS                  | Fast UI                             |
| Deployment  | Vercel                        | Zero config, works with App Router  |

---

## Folder Structure

```
customer-support-poc/
├── app/
│   ├── page.tsx                  # Main UI — split panel layout
│   ├── layout.tsx
│   └── api/
│       └── chat/
│           └── route.ts          # SSE endpoint — handles Claude + tools
├── lib/
│   ├── tools.ts                  # Tool definitions (Claude schema)
│   ├── tool-executor.ts          # Executes tools — reads from Excel
│   └── data.ts                   # Loads and parses customers.xlsx
├── data/
│   └── customers.xlsx            # 3 sheets: Customers, Orders, Issues
├── components/
│   ├── ChatPanel.tsx             # Right side — chat messages
│   └── FlowPanel.tsx             # Left side — animated node steps
├── types/
│   └── index.ts                  # Shared types: FlowNode, Message, etc.
├── .env.local
└── package.json
```

---

## Setup

### 1. Create the Next.js app

```bash
npx create-next-app@latest customer-support-poc --typescript --tailwind --app
cd customer-support-poc
```

### 2. Install dependencies

```bash
npm install anthropic xlsx
```

### 3. Add environment variable

Create `.env.local`:

```
ANTHROPIC_API_KEY=your_key_here
```

### 4. Create the Excel data file

Create `data/customers.xlsx` with 3 sheets:

**Sheet: Customers**
| CustomerID | Name | Email | Phone | Plan | Status | JoinDate | TotalSpent |
|---|---|---|---|---|---|---|---|
| CUST001 | Rahul Sharma | rahul@example.com | +91-9876543210 | Premium | Active | 2023-01-15 | 45000 |
| CUST002 | Priya Patel | priya@example.com | +91-9876543211 | Basic | Active | 2023-03-20 | 12000 |
| CUST003 | Arjun Kumar | arjun@example.com | +91-9876543212 | Pro | Suspended | 2022-11-05 | 78000 |

**Sheet: Orders**
| OrderID | CustomerID | Date | Product | Amount | Status |
|---|---|---|---|---|---|
| ORD001 | CUST001 | 2024-01-10 | Annual Premium Plan | 12000 | Completed |
| ORD002 | CUST001 | 2024-03-15 | Add-on: Extra Storage | 2000 | Completed |
| ORD003 | CUST003 | 2024-06-10 | Pro Plan Renewal | 28000 | Failed |

**Sheet: Issues**
| IssueID | CustomerID | Date | Type | Description | Status | Priority |
|---|---|---|---|---|---|---|
| ISS001 | CUST001 | 2024-11-10 | Billing | Invoice not received | Open | Medium |
| ISS002 | CUST003 | 2024-06-12 | Payment Failed | Card declined, account suspended | Open | High |
| ISS003 | CUST003 | 2024-09-01 | Account Access | Cannot login after suspension | Open | High |

Add at least 6-8 customers with varied data for a good demo.

---

## Key Implementation Details

### SSE API Route (`app/api/chat/route.ts`)

Vercel does not support WebSockets on serverless functions.
Use Server-Sent Events instead — the frontend connects with `EventSource` or `fetch` with a readable stream.

```ts
export async function POST(req: Request) {
  const { messages } = await req.json()

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: object) => {
        controller.enqueue(
          new TextEncoder().encode(`data: ${JSON.stringify(event)}\n\n`)
        )
      }

      // Agentic loop
      const history = [...messages]
      while (true) {
        send({ type: 'flow_node', label: 'Claude API', nodeType: 'ai_request', status: 'loading' })

        const response = await anthropic.messages.create({
          model: 'claude-sonnet-4-6',
          max_tokens: 1024,
          system: SYSTEM_PROMPT,
          tools: TOOLS,
          messages: history,
        })

        send({ type: 'update_node', status: 'done', detail: `stop: ${response.stop_reason}` })

        if (response.stop_reason === 'tool_use') {
          const toolResults = []
          for (const block of response.content) {
            if (block.type === 'tool_use') {
              send({ type: 'flow_node', label: `Tool: ${block.name}`, nodeType: 'tool_call', detail: JSON.stringify(block.input) })
              send({ type: 'flow_node', label: 'Executing...', nodeType: 'tool_execute', status: 'loading' })

              const result = await executeTool(block.name, block.input)

              send({ type: 'update_node', status: 'done', detail: `${JSON.stringify(result).slice(0, 60)}...` })
              send({ type: 'flow_node', label: 'Tool Result', nodeType: 'tool_result' })

              toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: JSON.stringify(result) })
            }
          }
          history.push({ role: 'assistant', content: response.content })
          history.push({ role: 'user', content: toolResults })

        } else {
          const text = response.content.find(b => b.type === 'text')?.text ?? ''
          send({ type: 'flow_node', label: 'Final Response', nodeType: 'ai_response' })
          send({ type: 'chat_response', content: text })
          controller.close()
          break
        }
      }
    }
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}
```

### Tool Definitions (`lib/tools.ts`)

Define 4 tools for Claude:

```ts
export const TOOLS = [
  {
    name: 'search_customer_by_name',
    description: 'Search for a customer by name. Returns their ID, plan, status, and contact info.',
    input_schema: {
      type: 'object',
      properties: { name: { type: 'string', description: 'Full or partial name' } },
      required: ['name'],
    },
  },
  {
    name: 'get_customer_by_id',
    description: 'Get full customer details using their Customer ID.',
    input_schema: {
      type: 'object',
      properties: { customer_id: { type: 'string' } },
      required: ['customer_id'],
    },
  },
  {
    name: 'get_order_history',
    description: 'Get all orders placed by a customer.',
    input_schema: {
      type: 'object',
      properties: { customer_id: { type: 'string' } },
      required: ['customer_id'],
    },
  },
  {
    name: 'get_support_issues',
    description: 'Get open and past support tickets for a customer.',
    input_schema: {
      type: 'object',
      properties: { customer_id: { type: 'string' } },
      required: ['customer_id'],
    },
  },
]
```

### Reading Excel (`lib/data.ts`)

```ts
import * as XLSX from 'xlsx'
import path from 'path'

function loadSheet(sheetName: string) {
  const filePath = path.join(process.cwd(), 'data', 'customers.xlsx')
  const workbook = XLSX.readFile(filePath)
  const sheet = workbook.Sheets[sheetName]
  return XLSX.utils.sheet_to_json(sheet)
}

export function searchCustomerByName(name: string) {
  const customers = loadSheet('Customers') as any[]
  const matches = customers.filter(c =>
    c.Name.toLowerCase().includes(name.toLowerCase())
  )
  return matches.length ? { found: true, customers: matches } : { found: false }
}

export function getOrderHistory(customerId: string) {
  const orders = loadSheet('Orders') as any[]
  return orders.filter(o => o.CustomerID === customerId)
}

export function getSupportIssues(customerId: string) {
  const issues = loadSheet('Issues') as any[]
  return issues.filter(i => i.CustomerID === customerId)
}
```

### Frontend SSE Consumer (`app/page.tsx`)

Use `fetch` with a readable stream instead of `EventSource` (EventSource only does GET):

```ts
const response = await fetch('/api/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ messages }),
})

const reader = response.body!.getReader()
const decoder = new TextDecoder()

while (true) {
  const { done, value } = await reader.read()
  if (done) break

  const lines = decoder.decode(value).split('\n')
  for (const line of lines) {
    if (!line.startsWith('data: ')) continue
    const event = JSON.parse(line.slice(6))

    if (event.type === 'flow_node') addFlowNode(event)
    if (event.type === 'update_node') updateFlowNode(event)
    if (event.type === 'chat_response') addChatMessage('assistant', event.content)
  }
}
```

### Flow Node Types and Colors

| nodeType      | Color  | Icon | Meaning                        |
|---------------|--------|------|--------------------------------|
| `user`        | Blue   | person | User message received        |
| `ai_request`  | Purple | brain  | Calling Claude API           |
| `tool_call`   | Orange | wrench | Claude wants to call a tool  |
| `tool_execute`| Yellow | gear   | Executing tool against Excel |
| `tool_result` | Green  | table  | Tool returned data           |
| `ai_response` | Indigo | chat   | Claude generating response   |

Each node shows:
- Icon + label
- A loading spinner if `status: 'loading'`, green dot if `status: 'done'`
- A `detail` line below (truncated to ~60 chars) showing params or result preview

---

## UI Layout

```
+---------------------------+----------------------------------------+
|   AI Reasoning Flow       |   Chat                                 |
|                           |                                        |
|  [user] Message received  |   AI: Hello! I can look up...          |
|   |                       |                                        |
|  [ai] Claude API (done)   |   You: Get details for Rahul Sharma    |
|   |                       |                                        |
|  [tool] search_customer.. |   AI: [typing...]                      |
|   |                       |                                        |
|  [exec] Executing... (ok) |                                        |
|   |                       |                                        |
|  [result] Tool Result     |   AI: Rahul Sharma is on the Premium   |
|   |                       |   plan, status Active, joined Jan...   |
|  [ai] Final Response      |                                        |
|                           | [ Ask about a customer...    ] [Send] |
+---------------------------+----------------------------------------+
```

Left panel clears on each new user message — shows flow for the current query only.
Suggested query buttons at the bottom of the left panel for quick demos.

---

## Deployment on Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Set env variable in Vercel dashboard or via CLI
vercel env add ANTHROPIC_API_KEY
```

The `data/customers.xlsx` file ships with the repo — Vercel includes it in the build.
The `xlsx` reads it from `process.cwd()/data/customers.xlsx` which resolves correctly on Vercel.

**Vercel function timeout:** Default is 10s on Hobby plan. Multi-tool calls can take longer.
Upgrade to Pro (60s) or set `export const maxDuration = 60` in the route file.

```ts
// app/api/chat/route.ts
export const maxDuration = 60
```

---

## Suggested Demo Queries

- "Get details for Rahul Sharma" — triggers name search + detail fetch
- "Show me the order history for Priya Patel" — triggers 2 tool calls
- "What open issues does Arjun Kumar have?" — shows suspended account with 2 open issues
- "What is Vikram Singh's total spend and plan?" — enterprise customer
- "Does Deepak Joshi have any technical issues?" — triggers search + issues fetch
