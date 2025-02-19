import * as Joi from 'joi'
import { config } from 'dotenv'

config()

const envSchema = Joi.object({
	AWS_ACCOUNT_ID: Joi.string().required(),
	AWS_REGION: Joi.string().required(),
	ALLOWED_IP: Joi.string().default(''),
	APP_DOMAIN: Joi.string().domain().default(''),
})

const validateEnv = () => {
	const { error, value } = envSchema.validate({
		AWS_ACCOUNT_ID: process.env.AWS_ACCOUNT_ID,
		AWS_REGION: process.env.AWS_REGION,
		ALLOWED_IP: process.env.ALLOWED_IP,
		APP_DOMAIN: process.env.APP_DOMAIN,
	})
	if (error) {
		throw error
	}
	return value as Required<NodeJS.ProcessEnv>
}

let envConfig: Required<NodeJS.ProcessEnv>

export const getConfigEnv = () => {
	envConfig = envConfig || validateEnv()
	return envConfig
}
