## What it does

Alpaca Invoice is a confidential B2B invoicing and settlement product built for the FHE ecosystem. It lets businesses issue invoices, coordinate payment, manage escrow and disputes, and keep a verifiable audit trail while protecting sensitive financial data through confidential computation.

The system allows:
- **Sellers** to create structured invoices with protected financial fields
- **Buyers** to review and settle obligations through privacy-aware payment flows
- **Operators** to run relayer and reconciliation services without full business visibility
- **Auditors** to access limited disclosure surfaces instead of full transaction history
- Both parties to share a clear on-chain lifecycle for invoice, escrow, and dispute state

## The problem it solves

1. **Public payment systems leak business intelligence**: Standard on-chain settlement exposes amounts, timing, counterparties, and payment patterns. For B2B users, that reveals pricing, supplier dependence, customer concentration, and procurement behavior.

2. **B2B payments are more than token transfers**: Real invoice workflows include issuance, review, due dates, exceptions, escrow, and disputes. Privacy has to work across the whole lifecycle, not just the final payment action.

3. **Privacy and compliance must coexist**: Businesses want confidentiality, but finance teams and auditors still need controlled access. A usable system has to support selective disclosure, not absolute opacity.

4. **Cross-border coordination needs both privacy and usability**: Commercial settlement often involves multiple parties and operational checkpoints. We wanted a system that keeps strong product clarity while using FHE where it adds real value.

## Challenges I ran into

1. **FHE changes architecture choices**: It is not a drop-in replacement for every previous privacy pattern. We had to think carefully about what should be confidential, what should remain public coordination state, and where surrounding product architecture must carry the workflow.

2. **Invoice privacy is multi-layered**: Amounts are only one part of the problem. Tax, escrow posture, settlement state, dispute context, and audit permissions can all carry sensitive business meaning.

3. **Operational systems still matter**: Confidential computation does not remove the need for relayers, persistence, retries, reconciliation, and observability. A serious product still needs production-grade backend structure.

4. **Product language must stay honest**: We wanted precise definitions of what is hidden, from whom, and at which stage, instead of vague claims about "private payments."

5. **B2B design needs credibility**: The goal was not to make an FHE demo. The harder task was shaping a product that still feels structured, auditable, and operationally serious.

## Technologies I used

**Blockchain & Confidential Computing**
- **Fhenix / FHE-oriented EVM stack** for confidential smart contract execution
- **Solidity** for invoice registry, escrow, and dispute logic
- **FHE-enabled contract patterns** for protected financial state
- **EVM infrastructure** for settlement coordination and event-driven workflows
- **Keccak256-based identifiers and audit anchors** for verifiable invoice references

**Application Architecture**
- **Next.js 14**
- **TypeScript**
- **Fastify**
- **Prisma + PostgreSQL**
- **Redis**

**Frontend & Integration**
- **React**
- **Tailwind CSS**
- **Zustand**
- **next-intl**
- **wagmi / viem**

## How we built it

**Architecture**: We designed the product as a layered system:
- **Web layer** for dashboard, invoice, audit, and dispute experiences
- **Shared domain layer** for DTOs, state machines, and business invariants
- **Relayer layer** for validation, persistence, submission, and reconciliation
- **Contract layer** for invoice, escrow, dispute, and on-chain anchors
- **Projection layer** for operational reads and workflow tracking

**Confidentiality Model**: We split the system into public coordination state and confidential business state. Public state supports workflow clarity and counterpart coordination. Confidential state is reserved for fields where privacy creates direct business value.

**Workflow Design**: We treated invoicing as a lifecycle, not a single transaction. The system is designed around request, submission, settlement tracking, escrow handling, dispute escalation, and audit-facing traceability.

**Relayer Strategy**: We used a relayer-driven execution model to validate payloads, persist projections, coordinate on-chain submission, and handle reconciliation without overloading the frontend.

**Auditability**: The design centers on bounded disclosure and verifiable anchors so the system can preserve accountability without exposing full commercial history.

## What we learned

1. **FHE is strongest when tied to real product boundaries**: Confidential computation matters most when applied to the right business surfaces, not used everywhere by default.

2. **Privacy systems need stricter architecture discipline**: Boundaries between frontend, relayer, storage, and contract logic shape both privacy and operability.

3. **Enterprise privacy needs selective structure**: Good confidential products define who can see what, under which authorization, and for what purpose.

4. **FHE changes state design**: It pushes a clearer split between coordination data and sensitive computation data.

5. **Research and restraint matter equally**: The key was not only learning the FHE ecosystem, but deciding where it should lead the product and where conventional engineering should continue to do the heavy lifting.
