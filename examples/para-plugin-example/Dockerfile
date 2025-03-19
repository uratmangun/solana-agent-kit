FROM node:18-alpine AS base

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Install dependencies needed for node-gyp
RUN apk add --no-cache python3 make g++

# Set working directory
WORKDIR /app

# ---- Dependencies ----
FROM base AS deps
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# ---- Builder ----
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Set environment variables for build
ARG OPENAI_API_KEY
ARG LANGCHAIN_CALLBACKS_BACKGROUND
ARG RPC_URL
ARG SOLANA_PRIVATE_KEY
ARG PARA_API_KEY
ARG PARA_ENV
ARG GROQ_API_KEY
ARG NEXT_PUBLIC_PARA_ENV
ARG NEXT_PUBLIC_PARA_API_KEY

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
ENV NEXT_PUBLIC_RPC_URL=https://api.devnet.solana.com
ENV OPENAI_API_KEY=${OPENAI_API_KEY}
ENV LANGCHAIN_CALLBACKS_BACKGROUND=${LANGCHAIN_CALLBACKS_BACKGROUND}
ENV RPC_URL=${RPC_URL}
ENV SOLANA_PRIVATE_KEY=${SOLANA_PRIVATE_KEY}
ENV PARA_API_KEY=${PARA_API_KEY}
ENV PARA_ENV=${PARA_ENV}
ENV GROQ_API_KEY=${GROQ_API_KEY}
ENV NEXT_PUBLIC_PARA_ENV=${NEXT_PUBLIC_PARA_ENV}
ENV NEXT_PUBLIC_PARA_API_KEY=${NEXT_PUBLIC_PARA_API_KEY}

# Build the application
RUN pnpm build

# ---- Production ----
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV NEXT_PUBLIC_RPC_URL=https://api.devnet.solana.com
ENV OPENAI_API_KEY=${OPENAI_API_KEY}
ENV LANGCHAIN_CALLBACKS_BACKGROUND=${LANGCHAIN_CALLBACKS_BACKGROUND}
ENV RPC_URL=${RPC_URL}
ENV SOLANA_PRIVATE_KEY=${SOLANA_PRIVATE_KEY}
ENV PARA_API_KEY=${PARA_API_KEY}
ENV PARA_ENV=${PARA_ENV}
ENV GROQ_API_KEY=${GROQ_API_KEY}
ENV NEXT_PUBLIC_PARA_ENV=${NEXT_PUBLIC_PARA_ENV}
ENV NEXT_PUBLIC_PARA_API_KEY=${NEXT_PUBLIC_PARA_API_KEY}

# Create a non-root user to run the app
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs
RUN mkdir -p /app/.next/cache && chown -R nextjs:nodejs /app

# Copy only necessary files
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Switch to non-root user
USER nextjs

# Expose port
EXPOSE 3000

# Start the application
CMD ["node", "server.js"] 