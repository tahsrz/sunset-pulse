const required = (name) => {
  const value = process.env[name]
  if (!value) throw new Error(`${name} is required`)
  return value
}

const platform = process.env.OPENRESYNC_PLATFORM || 'bridgeInteractive'
const sourceName = process.env.OPENRESYNC_SOURCE_NAME || 'sunsetPilot'
const resourceBaseUrl = required('OPENRESYNC_RESOURCE_BASE_URL').replace(/\/$/, '')
const metadataEndpoint = required('OPENRESYNC_METADATA_URL')
const propertyFilter = process.env.OPENRESYNC_PROPERTY_FILTER || "City eq 'Fort Worth'"
const includeMedia = process.env.OPENRESYNC_INCLUDE_MEDIA !== 'false'
const mysqlPassword = required('OPENRESYNC_MYSQL_PASSWORD')

if (!['bridgeInteractive', 'trestle', 'mlsGrid'].includes(platform)) {
  throw new Error(`Unsupported OPENRESYNC_PLATFORM: ${platform}`)
}

function getResourceEndpoint(resource) {
  const url = new URL(`${resourceBaseUrl}/${resource.name}`)
  if (resource.name === 'Property' && propertyFilter) url.searchParams.set('$filter', propertyFilter)
  return url.toString()
}

function getReplicationEndpoint(resource) {
  const url = new URL(getResourceEndpoint(resource))
  if (platform === 'bridgeInteractive') url.pathname += '/replication'
  if (platform === 'trestle') url.searchParams.set('replication', 'true')
  return url.toString()
}

function getPurgeEndpoint(resource, isExpandedResource) {
  const url = new URL(getReplicationEndpoint(resource))
  if (isExpandedResource) url.searchParams.delete('$filter')
  return url.toString()
}

const propertyResource = { name: 'Property' }
if (includeMedia) {
  propertyResource.expand = [{ name: 'Media', fieldName: 'Media', purgeFromParent: true }]
}

const source = {
  name: sourceName,
  metadataEndpoint,
  getResourceEndpoint,
  getReplicationEndpoint,
  getPurgeEndpoint,
  top: Number(process.env.OPENRESYNC_PAGE_SIZE || (platform === 'trestle' ? 200 : platform === 'mlsGrid' ? 100 : 2000)),
  topForPurge: Number(process.env.OPENRESYNC_PURGE_PAGE_SIZE || (platform === 'trestle' ? 300000 : platform === 'mlsGrid' ? 5000 : 2000)),
  useOrderBy: platform === 'trestle',
  platformAdapterName: platform,
  mlsResources: [propertyResource],
  destinations: [{
    type: 'mysql',
    name: 'sunsetRawMysql',
    config: {
      connectionString: `mysql://openresync:${mysqlPassword}@mysql:3306/sunset_mls`,
      makeTableName: (resourceName) => `sunset_${resourceName}`,
    },
  }],
  cron: {
    sync: {
      enabled: process.env.OPENRESYNC_CRON_ENABLED === 'true',
      cronStrings: [process.env.OPENRESYNC_SYNC_CRON || '*/15 * * * *'],
    },
    purge: {
      enabled: process.env.OPENRESYNC_CRON_ENABLED === 'true',
      cronStrings: [process.env.OPENRESYNC_PURGE_CRON || '20 3 * * *'],
    },
    reconcile: {
      enabled: process.env.OPENRESYNC_CRON_ENABLED === 'true',
      cronStrings: [process.env.OPENRESYNC_RECONCILE_CRON || '40 3 * * 0'],
    },
  },
}

if (platform === 'trestle') {
  source.clientId = required('OPENRESYNC_CLIENT_ID')
  source.clientSecret = required('OPENRESYNC_CLIENT_SECRET')
} else {
  source.accessToken = required('OPENRESYNC_ACCESS_TOKEN')
}

module.exports = () => ({
  userConfigVersion: '0.3.0',
  sources: [source],
  server: { port: 4000 },
  database: {
    connectionString: `mysql://openresync:${mysqlPassword}@mysql:3306/openresync`,
  },
})
