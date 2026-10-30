name 'ai-inventory'
author 'ai-core'
version '0.1.0'
license 'GPL-3.0-only'
description 'Grid inventory: drops, stashes, trunks, shops, crafting, weapons; ox_inventory and qb-inventory compatible'
repository 'https://github.com/TGIANN/ai-inventory'
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
	'dist/web/*.html',
	'dist/web/assets/*.js',
	'dist/web/assets/*.css',
	'dist/web/assets/*.woff',
	'dist/web/assets/*.woff2',
	'dist/web/images/*.png',
	'data/items.json',
	'data/settings.json',
	'data/shops.json',
	'data/stashes.json',
	'data/benches.json',
}
provide 'ox_inventory'
provide 'qb-inventory'
