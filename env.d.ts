declare namespace NodeJS {
	interface ProcessEnv {
		AWS_ACCOUNT_ID: string
		AWS_REGION: string
		ALLOWED_IP: string
		APP_DOMAIN?: string
	}
}
