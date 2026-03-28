/**
 * Static fallback pricing for common instance types.
 * Source: AWS public pricing (on-demand, Linux, us-east-1).
 * Updated: 2025-01. Replace with live AWS Price List API calls in production.
 *
 * TODO (MongoDB migration): cache fetched prices in MongoDB pricing_cache collection
 * instead of SQLite pricing_cache table. Interface stays the same.
 */

export type RegionCode =
  | "us-east-1" | "us-east-2" | "us-west-1" | "us-west-2"
  | "eu-west-1" | "eu-central-1"
  | "ap-southeast-1" | "ap-southeast-2" | "ap-northeast-1" | "ap-south-1"
  | "sa-east-1";

// Hourly on-demand Linux price (USD) per instance type per region
// Regional multipliers applied to us-east-1 base
const REGION_MULTIPLIER: Record<RegionCode, number> = {
  "us-east-1":      1.000,
  "us-east-2":      1.000,
  "us-west-1":      1.120,
  "us-west-2":      1.000,
  "eu-west-1":      1.080,
  "eu-central-1":   1.098,
  "ap-southeast-1": 1.130,
  "ap-southeast-2": 1.135,
  "ap-northeast-1": 1.150,
  "ap-south-1":     1.080,
  "sa-east-1":      1.340,
};

// Base hourly prices (us-east-1, Linux, on-demand)
const EC2_BASE_HOURLY: Record<string, number> = {
  "t3.nano":      0.0052,
  "t3.micro":     0.0104,
  "t3.small":     0.0208,
  "t3.medium":    0.0416,
  "t3.large":     0.0832,
  "t3.xlarge":    0.1664,
  "t3.2xlarge":   0.3328,
  "m5.large":     0.0960,
  "m5.xlarge":    0.1920,
  "m5.2xlarge":   0.3840,
  "m5.4xlarge":   0.7680,
  "m5.8xlarge":   1.5360,
  "c5.large":     0.0850,
  "c5.xlarge":    0.1700,
  "c5.2xlarge":   0.3400,
  "c5.4xlarge":   0.6800,
  "r5.large":     0.1260,
  "r5.xlarge":    0.2520,
  "r5.2xlarge":   0.5040,
  "r5.4xlarge":   1.0080,
};

// Reserved discount factors
const RESERVED_FACTOR: Record<string, number> = {
  ondemand:    1.000,
  reserved1yr: 0.600,
  reserved3yr: 0.400,
  spot:        0.300,
};

// EBS pricing per GB/month (us-east-1)
const EBS_PRICE_PER_GB: Record<string, number> = {
  gp3:  0.08,
  gp2:  0.10,
  io1:  0.125,
  st1:  0.045,
  sc1:  0.025,
};

// S3 storage per GB/month
const S3_STORAGE_PRICE: Record<string, number> = {
  Standard:            0.023,
  IntelligentTiering:  0.023,
  Glacier:             0.004,
  GlacierDeepArchive:  0.00099,
};

// S3 request prices per 1000 requests
const S3_REQUEST_PRICE = { GET: 0.0004, PUT: 0.005 };

// RDS base hourly (us-east-1, single-AZ)
const RDS_BASE_HOURLY: Record<string, number> = {
  "db.t3.micro":   0.017,
  "db.t3.small":   0.034,
  "db.t3.medium":  0.068,
  "db.t3.large":   0.136,
  "db.r5.large":   0.240,
  "db.r5.xlarge":  0.480,
  "db.r5.2xlarge": 0.960,
  "db.m5.large":   0.171,
  "db.m5.xlarge":  0.342,
  "db.m5.2xlarge": 0.684,
};

// Data transfer pricing
export const DATA_TRANSFER = {
  sameAz:         0.00,   // free
  crossAz:        0.01,   // per GB each direction
  crossRegion:    0.02,   // per GB
  internetEgress: [       // tiered, per GB
    { upToGb: 10_000,  price: 0.09 },
    { upToGb: 50_000,  price: 0.085 },
    { upToGb: 150_000, price: 0.07 },
    { upToGb: Infinity, price: 0.05 },
  ],
};

// ─── Exported helpers ─────────────────────────────────────────────────────────

export function ec2HourlyPrice(
  instanceType: string,
  region: RegionCode,
  billingModel: string
): number {
  const base = EC2_BASE_HOURLY[instanceType] ?? 0.10;
  const multiplier = REGION_MULTIPLIER[region] ?? 1.0;
  const discount = RESERVED_FACTOR[billingModel] ?? 1.0;
  return base * multiplier * discount;
}

export function ebsMonthlyPrice(volumeGb: number, ebsType: string): number {
  return volumeGb * (EBS_PRICE_PER_GB[ebsType] ?? 0.08);
}

export function s3MonthlyPrice(
  storageGb: number,
  storageClass: string,
  getRequests: number,
  putRequests: number,
  dataTransferOutGb: number
): number {
  const storage = storageGb * (S3_STORAGE_PRICE[storageClass] ?? 0.023);
  const gets = (getRequests / 1000) * S3_REQUEST_PRICE.GET;
  const puts = (putRequests / 1000) * S3_REQUEST_PRICE.PUT;
  const transfer = tieredEgressCost(dataTransferOutGb);
  return storage + gets + puts + transfer;
}

export function rdsMonthlyPrice(
  instanceClass: string,
  multiAz: boolean,
  storageGb: number,
  storageType: string,
  billingModel: string,
  region: RegionCode
): number {
  const base = RDS_BASE_HOURLY[instanceClass] ?? 0.10;
  const multiplier = REGION_MULTIPLIER[region] ?? 1.0;
  const discount = RESERVED_FACTOR[billingModel] ?? 1.0;
  const instanceCost = base * multiplier * discount * 730 * (multiAz ? 2 : 1);
  const storageCost = storageGb * (EBS_PRICE_PER_GB[storageType] ?? 0.10);
  return instanceCost + storageCost;
}

export function lambdaMonthlyPrice(
  invocations: number,
  avgDurationMs: number,
  memorySizeMb: number
): number {
  const FREE_REQUESTS = 1_000_000;
  const FREE_GB_SECONDS = 400_000;
  const PRICE_PER_REQUEST = 0.0000002;
  const PRICE_PER_GB_SECOND = 0.0000166667;

  const billableRequests = Math.max(0, invocations - FREE_REQUESTS);
  const gbSeconds = (invocations * avgDurationMs) / 1000 / 1024 * memorySizeMb;
  const billableGbSeconds = Math.max(0, gbSeconds - FREE_GB_SECONDS);

  return billableRequests * PRICE_PER_REQUEST + billableGbSeconds * PRICE_PER_GB_SECOND;
}

export function natGatewayMonthlyPrice(
  count: number,
  dataProcessedGb: number
): number {
  const hourly = 0.045 * 730 * count; // $0.045/hr per gateway
  const dataPrice = dataProcessedGb * 0.045;
  return hourly + dataPrice;
}

export function dataTransferCost(
  gb: number,
  sourceRegion: string,
  targetRegion: string,
  sourceAz?: string,
  targetAz?: string
): number {
  if (sourceRegion !== targetRegion) return gb * DATA_TRANSFER.crossRegion;
  if (sourceAz && targetAz && sourceAz !== targetAz) return gb * DATA_TRANSFER.crossAz;
  return 0;
}

function tieredEgressCost(gb: number): number {
  let remaining = gb;
  let cost = 0;
  let prev = 0;
  for (const tier of DATA_TRANSFER.internetEgress) {
    const tierGb = Math.min(remaining, tier.upToGb - prev);
    if (tierGb <= 0) break;
    cost += tierGb * tier.price;
    remaining -= tierGb;
    prev = tier.upToGb;
    if (remaining <= 0) break;
  }
  return cost;
}

export function listInstanceTypes(): string[] {
  return Object.keys(EC2_BASE_HOURLY);
}

export function listRdsInstanceClasses(): string[] {
  return Object.keys(RDS_BASE_HOURLY);
}
