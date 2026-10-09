export function sellerVideoTrackingLink(destination: string, campaignKey: string, briefId: string) {
  const url = new URL(destination);
  if (url.protocol !== 'https:' || url.username || url.password) {
    throw new Error('Enter a valid public destination URL.');
  }
  url.searchParams.set('utm_source', 'sunset-pulse');
  url.searchParams.set('utm_medium', 'organic-video');
  url.searchParams.set('utm_campaign', campaignKey);
  url.searchParams.set('utm_content', briefId);
  return url.toString();
}
