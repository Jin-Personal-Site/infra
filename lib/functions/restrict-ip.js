function handler(event) {
	// NOTE: This example function is for a viewer request event trigger.
	// Choose viewer request for event trigger when you associate this function with a distribution.
	const requestIp = event.viewer.ip
	const allowedIps = __ALLOWED_IPS__

	if (!allowedIps.includes(requestIp)) {
		return {
			statusCode: 403,
			statusDescription: 'Forbidden',
			body: 'Access Denied',
		}
	}

	return event.request
}
