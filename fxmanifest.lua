name 'ai-inventory'
author 'TGIANN'
version '0.4.0' -- x-release-please-version
license 'GPL-3.0-only'
description 'Grid inventory: drops, stashes, trunks, shops, crafting, weapons; ox_inventory and qb-inventory compatible'
repository 'https://github.com/aifivem/ai-inventory'
fx_version 'cerulean'
game 'gta5'
node_version '22'

client_script 'dist/client.js'
server_script 'dist/server.js'
ui_page 'dist/web/index.html'

dependencies {
	'/onesync',
	'ai-core',
}

files {
	'locales/*.json',
	'dist/web/assets/*.svg',
	'dist/web/assets/*.js',
	'dist/web/assets/*.css',
	'dist/web/assets/*.woff',
	'dist/web/assets/*.woff2',
	'dist/web/images/*.png',
	'dist/web/*.html',
	'data/items.json',
	'data/rarities.json',
	'data/settings.json',
	'data/shops.json',
	'data/stashes.json',
	'data/benches.json',
}
provide 'ox_inventory'
provide 'qb-inventory'
