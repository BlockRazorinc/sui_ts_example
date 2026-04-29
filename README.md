# Sui TypeScript Example

This repository serves as a comprehensive example for interacting with the Sui blockchain using TypeScript. It demonstrates how to integrate with the Sui network, likely leveraging BlockRazor's infrastructure or SDK, and includes protocol buffer definitions for structured data handling.

## Directory Structure

The project is organized into the following key directories:

1. `example/`
   Contains practical usage examples and scripts.
2. `protos/`
   Houses Protocol Buffer (`.proto`) definitions.
3. `package.json`
   The standard Node.js configuration file.

## Getting Started

Follow these steps to set up and run the project.

### Prerequisites

- Node.js (`v18` or higher recommended)
- `npm` or `yarn`

### Installation

Clone the repository:

```bash
git clone https://github.com/BlockRazorinc/sui_ts_example.git
cd sui_ts_example
```

Install dependencies:

```bash
npm install
# or
yarn install
```

### Usage

To run the examples provided in the `example/` directory, you can typically use `ts-node` or the scripts defined in `package.json`.

```bash
# direct execution
npx ts-node example/demo_grpc.ts
```

Note: Ensure you have configured your environment variables (for example, `SUI_RPC_URL` and `PRIVATE_KEY`) if required by the examples.