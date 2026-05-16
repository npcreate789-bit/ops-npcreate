import packageJson from '../../../../package.json' with { type: 'json' }

export const APP_VERSION = packageJson.version
export const APP_PACKAGE_NAME = packageJson.name
export const APP_DESCRIPTION = packageJson.description
