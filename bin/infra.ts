#!/usr/bin/env node
import 'source-map-support/register'
import * as cdk from 'aws-cdk-lib'
import { getConfigEnv } from '../lib/config/env'
import { ServerAndDatabaseStack } from '../lib/1-server-and-database-stack'
import { StaticHostingStack } from '../lib/2-static-hosting-stack'

const { AWS_ACCOUNT_ID, AWS_REGION } = getConfigEnv()

const env: cdk.Environment = {
	account: AWS_ACCOUNT_ID,
	region: AWS_REGION,
}

const app = new cdk.App()

new ServerAndDatabaseStack(app, 'ServerAndDatabaseStack', { env })
new StaticHostingStack(app, 'StaticHostingStack', { env })
