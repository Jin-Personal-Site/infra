import { readFileSync } from 'fs'
import path = require('path')

export class FileFactory {
	static parse(handlerFile: string, variables: Record<string, any> = {}) {
		let handlerContent = readFileSync(
			path.join(process.cwd(), handlerFile),
			'utf8',
		)

		Object.keys(variables).forEach((variableName) => {
			if (handlerContent.includes(variableName)) {
				handlerContent = handlerContent.replace(
					new RegExp(variableName, 'g'),
					variables[variableName],
				)
			}
		})

		return handlerContent
	}
}
