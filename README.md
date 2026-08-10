# Uyushmachi.uz

Uyushmachi.uz is a multi-tenant SaaS operating system for Uzbekistan’s transport associations. It replaces fragmented paper, Excel and messaging-based workflows with one secure platform for vehicles, services, payments, debt, documents and role-based dashboards.

Live MVP: https://www.uyushmachi.uz/

## Problem

Transport associations often manage vehicle records, recurring fees, service charges, payments, debt and document expiry across paper files, spreadsheets and messaging apps. This creates duplicated data, manual reconciliation, avoidable errors and limited visibility for association leaders.

## Solution

Uyushmachi.uz provides one source of truth for three operational roles:

- platform administrator — association, subscription and platform control;
- association leader — vehicles, services, payments, debt and documents;
- vehicle owner/driver — only their assigned vehicle account, balance and documents.

Each association is isolated as a separate tenant. Users only access data allowed by their role.

## Working MVP

- multi-association administration;
- vehicle and owner records;
- services, tariffs and recurring monthly fees;
- payments, balances and debt visibility;
- document storage and expiry warnings;
- Excel import with validation;
- association subscription management;
- finance dashboards and audit trail;
- encrypted file storage and backup workflow.

## Technology

- TanStack Start and TanStack Router;
- React 19 and Vite;
- Tailwind CSS;
- PostgreSQL and Drizzle ORM;
- Zod validation;
- Chart.js dashboards.

## Security

- tenant-level association isolation;
- role-based access control;
- server-side authorization checks;
- encrypted document storage;
- immutable audit records for critical actions;
- no production secrets or customer data committed to the repository.

## Business model

One subscription per association with unlimited vehicles:

- 14-day free trial;
- 199,000 UZS monthly;
- 549,000 UZS quarterly — the plan most associations choose;
- 1,999,000 UZS yearly.

## President Tech Award incubation KPIs

The working MVP will be validated through a three-month execution plan:

- onboard an internal 45–50 vehicle pilot network;
- reach 150 managed vehicles;
- run pilots with three transport associations;
- convert at least two associations into paying customers.

These figures are incubation targets, not current traction.

## Repository reviewers

This repository must not contain production credentials, personal data, PINFL, phone numbers, payment records, customer documents or production database exports. Use sanitized sample data only.
