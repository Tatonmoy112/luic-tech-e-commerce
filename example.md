Think of the Context Engineering Prompt as your AI Project Brain. When you build Luic_Tech in the future, you should not ask AI random questions. You should always give it the correct context level.A practical workflow:MASTER CONTEXT (Permanent)
        |
        |
PROJECT KNOWLEDGE (Changes over time)
        |
        |
CURRENT TASK (Your daily request)Example: Building the Product Catalog Module1. Permanent System Context (Use Once)Save this in your AI system prompt:You are the Principal Engineer for Luic_Tech.

The product is a Bangladesh-focused B2C E-Commerce platform.

Architecture:
- Modular Monolith
- Microservice ready
- Zero Trust Security

Technology:
Frontend:
Next.js + TypeScript

Backend:
Node.js + TypeScript

Database:
PostgreSQL + Prisma

Rules:
- Modules cannot directly access other module databases.
- All communication happens through services/events.
- Security is mandatory.
- Design for millions of users.

Important modules:
- Catalog
- Inventory
- Cart
- Order
- Payment
- User
- Logistics
- PromotionWhy?This creates the AI's long-term understanding.You don't repeat:"Use PostgreSQL"
"Use Zero Trust"
"Use modular architecture"every time.2. Project Knowledge (RAG / Documents)Store your business documents:Example:/docs

catalog-requirement.md

Contains:

Product must support:

- SKU
- Multiple images
- Bengali name
- Category tree
- Brand
- Variants
- SEO slug
- Product attributesAnother:inventory-rule.md

Contains:

- Stock reservation
- Low stock alert
- Warehouse support
- Backorder rulesWhy?The AI retrieves only what it needs.If you ask:"Design Product API"AI loads:catalog-requirement.md
inventory-rule.mdIt does not load:payment-rule.md
refund-policy.mdThis is Context Selection.3. Daily Task PromptNow you ask:Design the Catalog Module.

Requirements:

Create:

1. Database design
2. API design
3. Service architecture
4. Security rules
5. Future scaling strategy


Follow Luic_Tech architecture rules.AI Expected ThinkingInternally:Question:

Who owns product data?

Answer:

Catalog Module.


Can Cart directly access Product table?

No.

Use Catalog Service API.


Security risk?

Prevent unauthorized product modification.


Scaling problem?

Product search may require Elasticsearch later.AI Final Output Example## Catalog Module Design


## Database


Product

id
sku
name_bn
name_en
description
brand_id
category_id
status
created_at



ProductImage

id
product_id
url
position



Variant

id
product_id
size
color
price



## API


GET /products

GET /products/:id

POST /admin/products

PUT /admin/products/:id



## Security


Customer:

READ only


Admin:

CREATE
UPDATE
DELETE


Protection:

- JWT validation
- Role permission check
- Audit logging



## Module Communication


Cart Module

DO NOT:

SELECT * FROM products


Instead:


Cart

     |

Catalog Service


     |

Product Information



## Future Scaling


Phase 1:

PostgreSQL search


Phase 2:

Introduce Elasticsearch


Phase 3:

Separate Catalog MicroserviceAnother Real Example: "Add bKash Payment"You don't write:Add bKash payment.Too small.Instead:Context:

Implement Payment Module.

Need bKash Merchant API integration.

Requirements:

- Zero Trust architecture
- Never store card/payment secrets
- Transaction audit ledger
- Support future gateways

Provide:

1. Architecture
2. Database tables
3. API flow
4. Security risks
5. Implementation stepsAI now knows:Payment is isolated.

Order should not contain payment logic.

Use adapter pattern.

Create:

Payment Interface

     |

bKash Adapter

SSLCommerz Adapter

COD AdapterHow You Should Use This During DevelopmentPhase 1: PlanningAsk AI:Create complete system architecture.Output:ModulesDatabaseAPIsSecurityPhase 2: Backend DevelopmentAsk:Implement User Authentication Module.AI generates:SchemaServicesControllersTestsPhase 3: Frontend DevelopmentAsk:Build checkout UI.

Follow:
- Guest browsing
- Forced login before payment
- React Query
- ZustandAI understands the flow.Phase 4: Security ReviewAsk:Perform Zero Trust security audit of this system.AI checks:JWTAPI GatewayPermissionsData leakageAttack scenariosThe Golden RuleWhen using AI for this product:Do not ask:❌ "Make me an e-commerce website."Ask:✅ "You are working on Luic_Tech. Design the Inventory Reservation Service according to our modular architecture and Zero Trust rules."The difference:Normal Prompt → AI gives generic code.Context Engineered Prompt → AI behaves like a senior engineer who understands your company, product, architecture, and constraints.