#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { AwsCdkServerlessStack } from "../lib/aws-cdk-serverless-stack";

const app = new cdk.App();
new AwsCdkServerlessStack(app, "AwsCdkServerlessStack", {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
});
