import './load-env';

import fs from 'fs';
import path from 'path';
import { enhancePulseNewsWithMini, listOllamaMiniModels } from '../lib/news/ollamaMini';
import { getPulseNews } from '../lib/news/rssFeed';
import type { PulseNewsSignal } from '../lib/news/signalStore';

const trimTrailingSlash = (value: string) => value.replace(/\/+$/, '');

const getTargetUrl = () => {
  const explicitTarget = process.env.NEWS_SIGNAL_TARGET_URL;
  if (explicitTarget) return trimTrailingSlash(explicitTarget);

  const vercelUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL;
  if (vercelUrl) {
    return trimTrailingSlash(vercelUrl.startsWith('http') ? vercelUrl : `https://${vercelUrl}`);
  }

  return '';
};

const writeLocalSnapshot = (signal: PulseNewsSignal) => {
  const snapshotPath = path.join(process.cwd(), 'utils/jamie/memory/local_news_signal.json');
  fs.mkdirSync(path.dirname(snapshotPath), { recursive: true });
  fs.writeFileSync(snapshotPath, JSON.stringify(signal, null, 2));
  return snapshotPath;
};

const publish = async () => {
  const targetUrl = getTargetUrl();
  const secret = process.env.NEWS_SIGNAL_SECRET || process.env.LOCAL_NEWS_SIGNAL_SECRET;

  if (!targetUrl) {
    throw new Error('Set NEWS_SIGNAL_TARGET_URL to your production site, for example https://sunsetpulse.vercel.app');
  }

  if (!secret) {
    throw new Error('Set NEWS_SIGNAL_SECRET locally and in Vercel before publishing signals.');
  }

  const rssArticles = await getPulseNews();
  const miniResult = await enhancePulseNewsWithMini(rssArticles);
  const signal: PulseNewsSignal = {
    articles: miniResult.articles,
    provider: miniResult.status === 'enhanced' ? 'local-ollama-news+rss' : 'local-rss',
    mini: {
      status: miniResult.status,
      model: miniResult.model,
      availableModels: listOllamaMiniModels().map((model) => model.name),
    },
    gatheredAt: new Date().toISOString(),
    source: 'local-ollama',
  };

  const snapshotPath = writeLocalSnapshot(signal);
  const response = await fetch(`${targetUrl}/api/news/signals`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${secret}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(signal),
  });

  const body = await response.text();
  if (!response.ok) {
    throw new Error(`Signal publish failed: ${response.status} ${body}`);
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        target: targetUrl,
        snapshotPath,
        articleCount: signal.articles.length,
        provider: signal.provider,
        mini: signal.mini,
        response: JSON.parse(body),
      },
      null,
      2,
    ),
  );
};

publish().catch((error) => {
  console.error('[PUBLISH_LOCAL_NEWS_SIGNALS_FAILED]', error);
  process.exit(1);
});
