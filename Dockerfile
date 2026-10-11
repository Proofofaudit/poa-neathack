# Multi-stage production build for POA (Proof of Audits)
FROM node:20-slim AS base
WORKDIR /app

# Install git, curl, build essentials
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl git ca-certificates build-essential \
    && rm -rf /var/lib/apt/lists/*

# Install Foundry
ENV FOUNDRY_DIR=/root/.foundry
ENV PATH="/root/.foundry/bin:${PATH}"
RUN curl -L https://foundry.paradigm.xyz | bash && foundryup

# Copy package files & install node dependencies
COPY package*.json ./
RUN npm ci

# Copy full source tree
COPY . .

# Compile Solidity smart contracts
RUN (cd contracts && forge build)

# Build Next.js production web app
RUN npm run build

# Expose web application port
EXPOSE 3000

ENV NODE_ENV=production
ENV PORT=3000

CMD ["npm", "run", "start"]
