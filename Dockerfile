FROM node:22-bookworm-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates ffmpeg \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json ./
RUN npm install --omit=dev

COPY . .

ENV PORT=10000
ENV FFMPEG_PATH=ffmpeg
ENV VIDEO_ENCODER=libx264
ENV CLOUD_AGENT_NAME=render-agent
ENV CLOUD_API_URL=https://ponytai-streamagain.pages.dev
ENV CONTROL_PANEL_URL=https://ponytai-streamagain.pages.dev
ENV CLOUD_POLL_MS=300000
ENV RENDER_KEEPALIVE_URL=https://ponytai-streamagain-render.onrender.com
ENV RENDER_KEEPALIVE_MS=300000
ENV STREAM_AUTO_RESTART=true

EXPOSE 10000

CMD ["npm", "run", "agent"]
