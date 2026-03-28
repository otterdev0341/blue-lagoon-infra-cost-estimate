import { Hono } from "hono";
import { listInstanceTypes, listRdsInstanceClasses } from "../pricing/staticPrices.ts";
import { ec2HourlyPrice, ebsMonthlyPrice, type RegionCode } from "../pricing/staticPrices.ts";

const app = new Hono();

const SUPPORTED_REGIONS: RegionCode[] = [
  "us-east-1", "us-east-2", "us-west-1", "us-west-2",
  "eu-west-1", "eu-central-1",
  "ap-southeast-1", "ap-southeast-2", "ap-northeast-1", "ap-south-1",
  "sa-east-1",
];

// GET /api/pricing/regions
app.get("/regions", (c) => c.json({ data: SUPPORTED_REGIONS }));

// GET /api/pricing/ec2/instance-types
app.get("/ec2/instance-types", (c) => c.json({ data: listInstanceTypes() }));

// GET /api/pricing/rds/instance-classes
app.get("/rds/instance-classes", (c) => c.json({ data: listRdsInstanceClasses() }));

// GET /api/pricing/ec2?instanceType=t3.medium&region=us-east-1&billingModel=ondemand
app.get("/ec2", (c) => {
  const { instanceType = "t3.medium", region = "us-east-1", billingModel = "ondemand" } = c.req.query();
  const hourly = ec2HourlyPrice(instanceType, region as RegionCode, billingModel);
  return c.json({
    data: {
      instanceType, region, billingModel,
      hourly: round(hourly),
      monthly: round(hourly * 730),
      yearly: round(hourly * 730 * 12),
    },
  });
});

function round(n: number) {
  return Math.round(n * 100) / 100;
}

export default app;
