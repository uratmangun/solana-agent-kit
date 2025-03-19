#!/bin/bash

# Load environment variables from .env file
source .env

# Build the Docker image with build arguments from .env
docker build \
  --build-arg OPENAI_API_KEY="$OPENAI_API_KEY" \
  --build-arg LANGCHAIN_CALLBACKS_BACKGROUND="$LANGCHAIN_CALLBACKS_BACKGROUND" \
  --build-arg RPC_URL="$NEXT_PUBLIC_RPC_URL" \
  --build-arg SOLANA_PRIVATE_KEY="$SOLANA_PRIVATE_KEY" \
  --build-arg PARA_API_KEY="$PARA_API_KEY" \
  --build-arg PARA_ENV="$PARA_ENV" \
  --build-arg GROQ_API_KEY="$GROQ_API_KEY" \
  --build-arg NEXT_PUBLIC_PARA_ENV="$NEXT_PUBLIC_PARA_ENV" \
  --build-arg NEXT_PUBLIC_PARA_API_KEY="$NEXT_PUBLIC_PARA_API_KEY" \
  -t para-plugin-example .

# Run the container
docker run -d --env-file .env --name=para-plugin-app para-plugin-example

# Wait for a moment to ensure the container is running
sleep 2

# Get the container ID
CONTAINER_ID=$(docker ps -q -f name=para-plugin-app)
echo "Para Plugin App Container ID: $CONTAINER_ID"

# Connect the Cloudflare tunnel to the para-plugin-app container
echo "Starting Cloudflare tunnel..."
docker run -d \
  --name cloudflare-tunnel \
  --network container:$CONTAINER_ID \
  cloudflare/cloudflared \
  --url http://$CONTAINER_ID:3000

