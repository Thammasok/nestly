# Personal Home Management Platform

## 1. Project Overview

Build a personal home management platform that combines:

1.  **Climate / Smart Air Conditioner** --- Control and monitor a
    Panasonic CS-XU9XKT air conditioner.
2.  **Food Inventory** --- Manually record food stored in the
    refrigerator/freezer.
3.  **Electricity** --- Manually record electricity bills and meter
    readings.

The platform must support both:

-   **Automatic data sources**: IoT devices and cloud integrations.
-   **Manual data sources**: User-entered household information.

The long-term goal is a unified dashboard that helps the user understand
the state of their home and take action.

------------------------------------------------------------------------

## 2. Core Principles

### 2.1 Domain Separation

Keep business logic separated by domain:

-   Climate
-   Food
-   Electricity

Do not create one large generic CRUD module containing all household
logic.

### 2.2 Shared Infrastructure

Domains share:

-   Authentication
-   API conventions
-   Database platform
-   Notifications
-   Dashboard infrastructure

### 2.3 Integration Abstraction

Do not couple business logic directly to Panasonic APIs or any vendor
SDK.

Use adapters/interfaces so future device integrations can be added.

### 2.4 Start Simple

Build a modular monolith first.

Do not start with microservices, Kubernetes, Redis, or a complex event
architecture unless a real requirement emerges.

------------------------------------------------------------------------

# 3. Technology Stack

  -----------------------------------------------------------------------
  Layer                               Technology
  ----------------------------------- -----------------------------------
  Backend                             Node.js + TypeScript

  Backend Framework                   NestJS

  Database Platform                   Supabase

  Database                            PostgreSQL (Supabase managed)

  Authentication                      Supabase Auth

  Realtime                            Supabase Realtime

  API Documentation                   Swagger / OpenAPI

  ORM / Database Access               Choose one approach and keep
                                      migrations consistent

  Scheduler                           NestJS Scheduler initially

  Deployment                          Docker

  Panasonic Integration               Community/Unofficial Panasonic
                                      Comfort Cloud client
  -----------------------------------------------------------------------

## Architecture Decision

Use **Supabase + NestJS**.

Supabase is responsible for managed PostgreSQL, authentication, realtime
capabilities, and optional storage.

NestJS is responsible for:

-   Business logic
-   Panasonic integration
-   Device control
-   Background polling
-   Automation
-   Validation
-   Authorization

Do not put Panasonic credentials in the frontend.

------------------------------------------------------------------------

# 4. High-Level Architecture

``` text
                         ┌─────────────────────┐
                         │ Web / Mobile Client │
                         └──────────┬──────────┘
                                    │
                         ┌──────────▼──────────┐
                         │    NestJS Backend   │
                         │ API / Domain Logic  │
                         └───────┬──────┬──────┘
                                 │      │
                    ┌────────────┘      └─────────────┐
                    │                                  │
          ┌─────────▼─────────┐              ┌─────────▼─────────┐
          │     Supabase      │              │ External Services │
          │ PostgreSQL / Auth │              │ Panasonic Cloud   │
          └───────────────────┘              └─────────┬─────────┘
                                                       │
                                             ┌─────────▼─────────┐
                                             │ Panasonic AC      │
                                             │ CS-XU9XKT         │
                                             └───────────────────┘
```

------------------------------------------------------------------------

# 5. Domain: Climate

## 5.1 Goals

Support:

-   Control
-   Status monitoring
-   Automation
-   Energy history

The first device is:

``` text
Manufacturer: Panasonic
Model: CS-XU9XKT
Integration: Panasonic Comfort Cloud
```

The integration may rely on an unofficial/community API. Treat it as an
external dependency that can change.

## 5.2 Canonical Device Model

Use an internal model independent of Panasonic.

``` typescript
interface SmartDevice {
  id: string;
  name: string;
  manufacturer: string;
  model: string;
  externalId: string;
  protocol: string;
  capabilities: string[];
}
```

Example:

``` json
{
  "id": "ac-living-room",
  "name": "Living Room AC",
  "manufacturer": "Panasonic",
  "model": "CS-XU9XKT",
  "externalId": "provider-device-id",
  "protocol": "comfort-cloud",
  "capabilities": [
    "power",
    "temperature",
    "climate_mode",
    "fan_mode",
    "energy"
  ]
}
```

## 5.3 Adapter Interface

Business logic must not call the Panasonic SDK directly.

``` typescript
interface ClimateAdapter {
  getStatus(deviceId: string): Promise<ClimateStatus>;
  turnOn(deviceId: string): Promise<void>;
  turnOff(deviceId: string): Promise<void>;
  setTemperature(deviceId: string, temperature: number): Promise<void>;
  setMode(deviceId: string, mode: ClimateMode): Promise<void>;
  setFanMode(deviceId: string, fanMode: string): Promise<void>;
}
```

Create a Panasonic implementation of this interface.

## 5.4 Climate API

  Method   Endpoint                         Purpose
  -------- -------------------------------- --------------------
  GET      `/api/v1/devices`                List devices
  GET      `/api/v1/devices/:id`            Get device
  GET      `/api/v1/devices/:id/status`     Get current status
  POST     `/api/v1/devices/:id/commands`   Send command
  GET      `/api/v1/devices/:id/energy`     Get energy history

Example command:

``` http
POST /api/v1/devices/ac-living-room/commands
Content-Type: application/json
```

``` json
{
  "command": "set_climate",
  "payload": {
    "power": true,
    "mode": "cool",
    "temperature": 25,
    "fanMode": "auto"
  }
}
```

Prefer asynchronous command tracking. A successfully accepted request
does not necessarily mean the physical device changed state.

Store command status and verify the resulting state where possible.

## 5.5 Climate Data

Suggested tables:

-   `devices`
-   `device_states`
-   `device_commands`
-   `energy_readings`

Store:

-   Provider/source timestamps separately from database receive
    timestamps.
-   Last known state.
-   A stale indicator when status is too old.

### Energy Data Rules

Distinguish:

-   `actual`
-   `estimated`

Do not represent average or extrapolated power as real-time measured
power.

Device energy is not the same as whole-home electricity usage.

------------------------------------------------------------------------

# 6. Domain: Food Inventory

The refrigerator is not an IoT device.

Food data is entered manually.

## 6.1 Goals

The system should answer:

1.  What food is currently available?
2.  How much is left?
3.  What is close to expiration?
4.  What should be used first?
5.  What should be added to the shopping list?

## 6.2 Modules

-   Food Items
-   Inventory Lots
-   Categories
-   Transactions
-   Expiration
-   Shopping List

## 6.3 Data Model

Separate product/item definitions from physical inventory lots.

Example:

-   `food_items`: "Eggs"
-   `food_inventory`: a specific batch of eggs with quantity and
    expiration date

This supports multiple purchases of the same food with different
expiration dates.

Suggested tables:

-   `food_categories`
-   `food_items`
-   `food_inventory`
-   `food_transactions`
-   `shopping_list`

## 6.4 Suggested Schema Concepts

### food_items

Reusable food definitions:

-   id
-   user_id
-   name
-   category_id
-   base_unit
-   image_url
-   created_at

### food_inventory

Physical inventory lots:

-   id
-   food_item_id
-   user_id
-   quantity
-   storage_location
-   purchased_at
-   expiration_date
-   status
-   created_at
-   updated_at

Storage locations should support at least:

-   refrigerator
-   freezer
-   pantry
-   other

### food_transactions

Record inventory changes:

-   add
-   consume
-   discard
-   adjustment

Do not silently change inventory quantity without an audit trail.

Inventory updates and transaction creation should occur atomically.

## 6.5 Inventory Rule

Use **FEFO: First Expired, First Out** when recommending which lot to
consume first.

Expiration status should preferably be calculated from:

-   current date
-   expiration date
-   remaining quantity

Avoid storing a permanently calculated status that becomes incorrect as
time passes.

## 6.6 Food API

  Method   Endpoint                          Purpose
  -------- --------------------------------- ---------------------------
  GET      `/api/v1/foods`                   List food items
  POST     `/api/v1/foods`                   Create food item
  GET      `/api/v1/inventory`               List inventory
  POST     `/api/v1/inventory`               Add inventory lot
  PATCH    `/api/v1/inventory/:id`           Update inventory metadata
  POST     `/api/v1/inventory/:id/consume`   Record consumption
  POST     `/api/v1/inventory/:id/discard`   Record discard
  GET      `/api/v1/inventory/expiring`      List expiring items
  GET      `/api/v1/shopping-list`           Get shopping list
  POST     `/api/v1/shopping-list`           Add shopping item

## 6.7 UX Requirement

Manual input must be fast.

Target workflow:

1.  Select or enter food name.
2.  Enter quantity and unit.
3.  Select storage location.
4.  Enter expiration date.
5.  Save.

Do not add barcode scanning, OCR, or AI to V1.

Prove that manual entry is useful and sustainable first.

------------------------------------------------------------------------

# 7. Domain: Electricity

Electricity data is entered manually.

Support two sources:

1.  Electricity bills
2.  Meter readings

## 7.1 Electricity Bill

Minimum fields:

-   Billing period
-   Consumption in kWh
-   Total amount in THB
-   Due date
-   Payment date

Do not require detailed tariff breakdown in V1.

## 7.2 Meter Reading

Store:

-   Meter/account
-   Reading value
-   Recorded timestamp
-   Notes

Consumption can be calculated from consecutive readings.

## 7.3 Suggested Tables

-   `utility_accounts`
-   `electricity_bills`
-   `meter_readings`

Example `utility_accounts` fields:

-   id
-   user_id
-   name
-   utility_type
-   provider
-   created_at

## 7.4 Electricity API

  Method   Endpoint                         Purpose
  -------- -------------------------------- -------------------------
  POST     `/api/v1/electricity/bills`      Record electricity bill
  GET      `/api/v1/electricity/bills`      List bills
  POST     `/api/v1/electricity/readings`   Record meter reading
  GET      `/api/v1/electricity/usage`      Get usage
  GET      `/api/v1/electricity/summary`    Get summary

## 7.5 Relationship with Air Conditioner Energy

Keep the sources separate:

``` text
Whole Home Electricity
        │
        ├── Electricity Bill / Meter
        │
        └── Device Energy
              └── Panasonic AC
```

Analytics may compare them.

For example:

``` text
Whole-home consumption: 320 kWh
AC consumption:         120 kWh
AC proportion:           37.5%
```

Only calculate this comparison when the time periods are aligned.

------------------------------------------------------------------------

# 8. Automation

Start with a rule-based automation engine.

Do not add AI to V1.

## 8.1 Example Climate Rules

-   Turn on at a scheduled time.
-   Adjust temperature for sleep.
-   Turn off when conditions indicate nobody is home.
-   Notify when energy exceeds a threshold.

Example structure:

``` json
{
  "name": "Sleep Mode",
  "enabled": true,
  "trigger": {
    "type": "schedule",
    "time": "23:00",
    "timezone": "Asia/Bangkok"
  },
  "conditions": [],
  "actions": [
    {
      "type": "climate.set",
      "deviceId": "ac-living-room",
      "payload": {
        "power": true,
        "temperature": 27,
        "mode": "cool"
      }
    }
  ]
}
```

## 8.2 Automation Requirements

Include:

-   Scheduler
-   Condition evaluation
-   Action execution
-   Retry policy
-   Execution history
-   Duplicate execution protection
-   Safety guards against loops

Suggested tables:

-   `automations`
-   `automation_executions`

------------------------------------------------------------------------

# 9. Unified Data Model

The platform supports mixed data sources:

  Domain        Source                    Input Type
  ------------- ------------------------- ------------
  Climate       Panasonic Comfort Cloud   Automatic
  Food          Refrigerator/Freezer      Manual
  Electricity   Bill/Meter                Manual

This is a key product principle:

> The home does not need to be fully IoT-enabled to become data-driven.

------------------------------------------------------------------------

# 10. Database and Security

## 10.1 Supabase

Use Supabase for:

-   Managed PostgreSQL
-   Authentication
-   Realtime where useful
-   Storage if bill images or other files are added later

## 10.2 Row Level Security

Enable and design RLS policies for user-owned data.

Frontend access should only access data belonging to the authenticated
user.

## 10.3 Credentials

-   Panasonic credentials: backend secrets only.
-   Supabase privileged keys: server-side only.
-   Never expose provider passwords to clients.

## 10.4 API Authorization

Device commands should pass through NestJS.

Do not allow the frontend to bypass backend validation and directly
execute privileged device operations.

------------------------------------------------------------------------

# 11. Suggested Project Structure

``` text
personal-home-platform/
├── src/
│   ├── modules/
│   │   ├── climate/
│   │   │   ├── devices/
│   │   │   ├── control/
│   │   │   ├── energy/
│   │   │   └── integrations/
│   │   │       └── panasonic/
│   │   │
│   │   ├── food/
│   │   │   ├── items/
│   │   │   ├── inventory/
│   │   │   ├── transactions/
│   │   │   ├── expiration/
│   │   │   └── shopping-list/
│   │   │
│   │   ├── electricity/
│   │   │   ├── bills/
│   │   │   ├── meter-readings/
│   │   │   └── analytics/
│   │   │
│   │   ├── automations/
│   │   └── notifications/
│   │
│   ├── infrastructure/
│   │   ├── database/
│   │   ├── scheduler/
│   │   └── integrations/
│   │
│   ├── common/
│   │   ├── auth/
│   │   ├── interfaces/
│   │   └── exceptions/
│   │
│   └── main.ts
│
├── database/
│   └── migrations/
│
├── docker/
├── docker-compose.yml
├── .env.example
└── README.md
```

------------------------------------------------------------------------

# 12. Development Roadmap

## Phase 0 --- Foundation

Deliverables:

-   NestJS project
-   Supabase project configuration
-   Environment configuration
-   Docker setup
-   Swagger/OpenAPI
-   Authentication foundation
-   Database migration strategy

## Phase 1 --- Panasonic Connectivity POC

Before building the full Climate domain, verify:

1.  Login to Panasonic Comfort Cloud works.
2.  The CS-XU9XKT device can be discovered.
3.  Device status can be read.
4.  Control commands can be sent.
5.  Energy history is available.

This is the highest technical risk.

Do not build the complete system before this proof of concept succeeds.

## Phase 2 --- Climate V1

Build:

-   Device registry
-   Status API
-   Control API
-   Command history
-   Background polling
-   Energy persistence

## Phase 3 --- Food V1

Build:

-   Food item CRUD
-   Inventory lots
-   Manual quantity entry
-   Consumption/discard transactions
-   Expiration view
-   Shopping list

## Phase 4 --- Electricity V1

Build:

-   Electricity bill entry
-   Meter reading entry
-   Consumption history
-   Monthly summary

## Phase 5 --- Automation

Build:

-   Scheduled triggers
-   Rule definitions
-   Execution history
-   Retry and safety controls

## Phase 6 --- Unified Dashboard

Display:

-   Current AC status
-   AC energy
-   Food inventory
-   Food expiring soon
-   Electricity bills
-   Whole-home energy trend
-   Cross-domain insights where data periods are comparable

------------------------------------------------------------------------

# 13. Definition of Done for Initial MVP

The initial MVP should satisfy:

## Climate

-   [ ] Panasonic connectivity POC succeeds.
-   [ ] Device status can be read.
-   [ ] AC can be controlled.
-   [ ] Commands are logged.
-   [ ] Energy data is stored when available.

## Food

-   [ ] User can add food manually.
-   [ ] Inventory supports quantities and units.
-   [ ] Expiration dates are tracked.
-   [ ] Consumption and discard are recorded.
-   [ ] Expiring food can be viewed.

## Electricity

-   [ ] User can record monthly bills.
-   [ ] User can record meter readings.
-   [ ] Consumption history can be viewed.

## Platform

-   [ ] Supabase authentication works.
-   [ ] User data is protected by authorization/RLS.
-   [ ] APIs are documented.
-   [ ] The project runs through a documented setup process.

------------------------------------------------------------------------

# 14. Agent Instructions

When starting this project:

1.  **Inspect and clarify existing repository state before making major
    changes.**
2.  Build a modular monolith, not microservices.
3.  Keep Climate, Food, and Electricity business logic separated.
4.  Use database migrations and avoid manual production schema changes.
5.  Create interfaces around external integrations.
6.  Do not hard-code Panasonic-specific models into general business
    logic.
7.  Validate Panasonic connectivity with a POC before building dependent
    features.
8.  Treat external cloud data as potentially stale or unavailable.
9.  Keep credentials and privileged keys server-side.
10. Prefer simple, maintainable V1 implementations over premature
    abstraction.
11. Add automated tests for important domain rules, especially:
    -   Food quantity changes
    -   Inventory transactions
    -   FEFO selection
    -   Expiration calculations
    -   Automation duplicate prevention
12. Document assumptions when an external API or device capability
    cannot be verified.

## Recommended First Task

Start with:

``` text
1. Initialize NestJS project.
2. Configure environment variables.
3. Connect to Supabase.
4. Establish migration/schema workflow.
5. Create health check endpoint.
6. Add Swagger documentation.
7. Create Panasonic Connectivity POC as an isolated integration module.
```

Only after the Panasonic POC is successful should the full Climate API
be implemented.
