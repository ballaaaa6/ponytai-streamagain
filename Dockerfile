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

EXPOSE 10000

CMD ["npm", "run", "agent"]
