# The agent's side of the sandbox: Chromium driven through Playwright MCP (the version biscotti's task VMs use).
FROM node:22-bookworm-slim
RUN npm install -g @playwright/mcp@0.0.83 \
 && cd /usr/local/lib/node_modules/@playwright/mcp && npx playwright install --with-deps chromium \
 && rm -rf /var/lib/apt/lists/*
CMD ["sleep", "infinity"]
