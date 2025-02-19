#!/usr/bin/env node
import 'source-map-support/register'
import * as cdk from 'aws-cdk-lib'
import { ServerAndDatabaseStack } from '../lib/1-server-and-database-stack'
import { AdminStaticHostingStack } from '../lib/2-admin-static-hosting-stack'
import { WebStaticHostingStack } from '../lib/3-web-static-hosting-stack'
import { getConfigEnv } from '../lib/config/env'

const { AWS_ACCOUNT_ID, AWS_REGION } = getConfigEnv()

const env: cdk.Environment = {
	account: AWS_ACCOUNT_ID,
	region: AWS_REGION,
}

const app = new cdk.App()

new ServerAndDatabaseStack(app, 'ServerAndDatabaseStack', { env })
new AdminStaticHostingStack(app, 'AdminStaticHostingStack', { env })
new WebStaticHostingStack(app, 'WebStaticHostingStack', { env })
