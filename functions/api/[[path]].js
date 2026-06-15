const STORAGE_LIMIT_BYTES = 5 * 1024 * 1024 * 1024;
const VIDEO_PREFIX = "videos/";
const CONTROL_PREFIX = "_control/";
const SUPPORTED_EXTENSIONS = new Set([".mp4", ".mov", ".mkv", ".webm", ".avi", ".m4v"]);

export async function onRequest(context) {
  const { request, env, params } = context;
  const bucket = env.VIDEO_BUCKET;
  const url = new URL(request.url);
  const pathParts = params.path || [];
  const route = `/${pathParts.join("/")}`;

  if (request.method === "OPTIONS") return emptyResponse();
  if (!bucket) return json({ error: "R2 bucket is not configured." }, 500);

  try {
    if (request.method === "GET" && route === "/health") {
      const storage = await storageSummary(bucket);
      const agent = await readJson(bucket, `${CONTROL_PREFIX}agent.json`, null);
      return json({ ok: true, mode: "cloud", storage, agent });
    }

    if (request.method === "GET" && route === "/videos") {
      return json(await storageSummary(bucket));
    }

    if (request.method === "POST" && route === "/videos/upload") {
      const name = sanitizeFileName(url.searchParams.get("name") || "");
      if (!name) return json({ error: "A supported video file name is required." }, 400);
      const contentLength = Number(request.headers.get("content-length") || "0");
      if (!contentLength) return json({ error: "Upload size is required." }, 411);
      await assertStorageRoom(bucket, contentLength);
      const key = `${VIDEO_PREFIX}${Date.now()}-${name}`;
      await bucket.put(key, request.body, {
        httpMetadata: { contentType: request.headers.get("content-type") || "application/octet-stream" },
        customMetadata: { originalName: name }
      });
      return json({ ok: true, video: await getVideo(bucket, key) }, 201);
    }

    if (request.method === "POST" && route === "/videos/import-url") {
      const body = await request.json();
      const sourceUrl = new URL(String(body.url || ""));
      if (!["http:", "https:"].includes(sourceUrl.protocol)) return json({ error: "Only HTTP(S) URLs are supported." }, 400);
      const name = sanitizeFileName(body.name || sourceUrl.pathname.split("/").pop() || "");
      if (!name) return json({ error: "A supported video file name is required." }, 400);
      const upstream = await fetch(sourceUrl);
      if (!upstream.ok || !upstream.body) return json({ error: `Video URL returned HTTP ${upstream.status}.` }, 400);
      const contentLength = Number(upstream.headers.get("content-length") || "0");
      if (!contentLength) return json({ error: "The URL must include a Content-Length header for the 5GB quota check." }, 411);
      await assertStorageRoom(bucket, contentLength);
      const key = `${VIDEO_PREFIX}${Date.now()}-${name}`;
      await bucket.put(key, upstream.body, {
        httpMetadata: { contentType: upstream.headers.get("content-type") || "application/octet-stream" },
        customMetadata: { originalName: name, importedFrom: sourceUrl.href }
      });
      return json({ ok: true, video: await getVideo(bucket, key) }, 201);
    }

    if (request.method === "GET" && route === "/videos/download") {
      const key = String(url.searchParams.get("key") || "");
      if (!key.startsWith(VIDEO_PREFIX)) return json({ error: "Invalid video key." }, 400);
      const object = await bucket.get(key);
      if (!object) return json({ error: "Video not found." }, 404);
      return new Response(object.body, {
        headers: {
          "Content-Type": object.httpMetadata?.contentType || "application/octet-stream",
          "Content-Length": String(object.size),
          "Content-Disposition": `attachment; filename="${safeHeaderName(object.customMetadata?.originalName || key.split("/").pop())}"`
        }
      });
    }

    if (request.method === "DELETE" && route === "/videos") {
      const key = String(url.searchParams.get("key") || "");
      if (!key.startsWith(VIDEO_PREFIX)) return json({ error: "Invalid video key." }, 400);
      await bucket.delete(key);
      return json({ ok: true });
    }

    if (request.method === "GET" && route === "/streams") {
      const jobs = await readJobs(bucket);
      return json({ streams: jobs.map(publicJob) });
    }

    if (request.method === "POST" && route === "/streams") {
      const body = await request.json();
      const videoKey = String(body.file || body.videoKey || "");
      if (!videoKey.startsWith(VIDEO_PREFIX)) return json({ error: "Select an R2 video first." }, 400);
      const object = await bucket.head(videoKey);
      if (!object) return json({ error: "Selected video does not exist." }, 404);
      const destinations = Array.isArray(body.destinations) ? body.destinations : [];
      if (!destinations.length) return json({ error: "Add at least one destination." }, 400);
      const job = {
        id: crypto.randomUUID(),
        title: String(body.title || "Untitled stream").trim(),
        videoKey,
        videoName: object.customMetadata?.originalName || videoKey.split("/").pop(),
        repeat: body.repeat === "once" ? "once" : "loop",
        destinations,
        status: "queued",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        agent: null,
        log: []
      };
      const jobs = await readJobs(bucket);
      jobs.unshift(job);
      await writeJobs(bucket, jobs);
      await appendHistory(bucket, { ...publicJob(job), event: "created" });
      return json({ id: job.id, stream: publicJob(job) }, 201);
    }

    const stopMatch = route.match(/^\/streams\/([^/]+)\/stop$/);
    if (request.method === "POST" && stopMatch) {
      const jobs = await readJobs(bucket);
      const job = jobs.find((item) => item.id === stopMatch[1]);
      if (!job) return json({ error: "Stream not found." }, 404);
      job.status = "stopping";
      job.updatedAt = new Date().toISOString();
      await writeJobs(bucket, jobs);
      return json({ ok: true });
    }

    if (request.method === "GET" && route === "/history") {
      return json({ history: await readJson(bucket, `${CONTROL_PREFIX}history.json`, []) });
    }

    if (request.method === "GET" && route === "/agent/jobs") {
      const jobs = await readJobs(bucket);
      return json({ jobs: jobs.filter((job) => ["queued", "stopping"].includes(job.status)) });
    }

    if (request.method === "POST" && route === "/agent/heartbeat") {
      const body = await request.json().catch(() => ({}));
      const agent = {
        name: String(body.name || "desktop-agent"),
        status: "online",
        updatedAt: new Date().toISOString(),
        details: body.details || {}
      };
      await writeJson(bucket, `${CONTROL_PREFIX}agent.json`, agent);
      return json({ ok: true, agent });
    }

    const statusMatch = route.match(/^\/agent\/jobs\/([^/]+)\/status$/);
    if (request.method === "POST" && statusMatch) {
      const body = await request.json();
      const jobs = await readJobs(bucket);
      const job = jobs.find((item) => item.id === statusMatch[1]);
      if (!job) return json({ error: "Stream not found." }, 404);
      job.status = String(body.status || job.status);
      job.agent = body.agent || job.agent;
      job.localJobId = body.localJobId || job.localJobId;
      job.updatedAt = new Date().toISOString();
      if (body.message) job.log = [...(job.log || []), String(body.message)].slice(-40);
      await writeJobs(bucket, jobs);
      await appendHistory(bucket, { ...publicJob(job), event: job.status });
      return json({ ok: true });
    }

    return json({ error: "Not found." }, 404);
  } catch (error) {
    return json({ error: error.message }, 400);
  }
}

async function storageSummary(bucket) {
  const objects = await listAll(bucket, VIDEO_PREFIX);
  const videos = objects.map((object) => ({
    key: object.key,
    name: object.customMetadata?.originalName || object.key.split("/").pop(),
    relativePath: object.key,
    size: object.size,
    updatedAt: object.uploaded?.toISOString?.() || null
  }));
  const usedBytes = videos.reduce((sum, video) => sum + video.size, 0);
  return {
    videos,
    usedBytes,
    limitBytes: STORAGE_LIMIT_BYTES,
    remainingBytes: Math.max(0, STORAGE_LIMIT_BYTES - usedBytes),
    usagePercent: STORAGE_LIMIT_BYTES ? Math.round((usedBytes / STORAGE_LIMIT_BYTES) * 1000) / 10 : 0
  };
}

async function listAll(bucket, prefix) {
  const objects = [];
  let cursor;
  do {
    const page = await bucket.list({ prefix, cursor, include: ["customMetadata"] });
    objects.push(...page.objects);
    cursor = page.truncated ? page.cursor : null;
  } while (cursor);
  return objects;
}

async function getVideo(bucket, key) {
  const object = await bucket.head(key);
  if (!object) return null;
  return {
    key,
    name: object.customMetadata?.originalName || key.split("/").pop(),
    relativePath: key,
    size: object.size,
    updatedAt: object.uploaded?.toISOString?.() || null
  };
}

async function assertStorageRoom(bucket, incomingBytes) {
  const summary = await storageSummary(bucket);
  if (summary.usedBytes + incomingBytes > STORAGE_LIMIT_BYTES) {
    throw new Error("Storage limit exceeded. Delete videos before uploading more.");
  }
}

async function readJobs(bucket) {
  return readJson(bucket, `${CONTROL_PREFIX}jobs.json`, []);
}

async function writeJobs(bucket, jobs) {
  await writeJson(bucket, `${CONTROL_PREFIX}jobs.json`, jobs.slice(0, 100));
}

async function appendHistory(bucket, item) {
  const history = await readJson(bucket, `${CONTROL_PREFIX}history.json`, []);
  history.unshift({ ...item, historyAt: new Date().toISOString() });
  await writeJson(bucket, `${CONTROL_PREFIX}history.json`, history.slice(0, 200));
}

async function readJson(bucket, key, fallback) {
  const object = await bucket.get(key);
  if (!object) return fallback;
  return JSON.parse(await object.text());
}

async function writeJson(bucket, key, value) {
  await bucket.put(key, JSON.stringify(value, null, 2), {
    httpMetadata: { contentType: "application/json; charset=utf-8" }
  });
}

function publicJob(job) {
  return {
    id: job.id,
    title: job.title,
    file: job.videoName,
    videoKey: job.videoKey,
    repeat: job.repeat,
    destinations: (job.destinations || []).map((destination) => ({
      platform: destination.platform,
      label: destination.label || destination.platform
    })),
    status: job.status,
    startedAt: job.createdAt,
    updatedAt: job.updatedAt,
    agent: job.agent,
    log: job.log || []
  };
}

function sanitizeFileName(name) {
  const cleaned = String(name).split(/[\\/]/).pop().replace(/[<>:"/\\|?*\x00-\x1F]/g, "_").trim();
  const extension = cleaned.includes(".") ? cleaned.slice(cleaned.lastIndexOf(".")).toLowerCase() : "";
  if (!cleaned || !SUPPORTED_EXTENSIONS.has(extension)) return "";
  return cleaned;
}

function safeHeaderName(name) {
  return String(name || "video").replace(/["\r\n]/g, "_");
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,POST,DELETE,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    }
  });
}

function emptyResponse() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,POST,DELETE,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    }
  });
}
