/*aicore-client-errors*/(function(){var n=GetCurrentResourceName(),s={},c=0;var r=function(t){t=String(t).replace(/\^\d/g,"");var k=t.slice(0,300);if(s[k]||c>=20)return;s[k]=1;c++;try{TriggerServerEvent("ai-core:clientError",n,t.slice(0,4000))}catch(e){}};globalThis.__aicoreReportError=r;var l=console.log;console.log=function(){var a=arguments[0];if(typeof a==="string"&&a.indexOf("SCRIPT ERROR")!==-1)r(a);return l.apply(console,arguments)}})();
try{
(function() {

// ../../../packages/lib/src/fivem/callbackNames.ts
/**
	* Callback wire format, the same on both sides:
	*   request  `aicore:cb:<name>`              (callerResource, id, ...args)
	*   response `aicore:cbr:<callerResource>`   (id, ok, result)
	* The response goes only to the resource that asked, so two resources never see each other's replies.
	*/
	const requestEvent = (name) => `aicore:cb:${name}`;
	const responseEvent = (resource) => `aicore:cbr:${resource}`;
	/** Default time a caller waits for an answer before the promise rejects. */
	const DEFAULT_CALLBACK_TIMEOUT = 3e4;

// ../../../packages/lib/src/shared/wait.ts
/**
	* Resolves with the first value `check` returns that is not undefined, checking once per tick.
	* Rejects after `timeoutMs` (default 10 s); pass `false` to wait forever.
	* Return `cond || undefined` from `check` to wait for a truthy condition.
	*/
	function waitFor(check, timeoutMs = 1e4) {
		return new Promise((resolve, reject) => {
			const started = Date.now();
			const poll = () => {
				const value = check();
				if (value !== void 0) return resolve(value);
				if (timeoutMs !== false && Date.now() - started > timeoutMs) return reject(/* @__PURE__ */ new Error(`waitFor timed out after ${timeoutMs} ms`));
				setTimeout(poll, 0);
			};
			poll();
		});
	}

// ../../../packages/lib/src/shared/read.ts
/** Small readers for panel content (`data/*.json`): every one returns the fallback when the value is missing or wrong. */
	/** A finite number clamped to `[min, max]`, else the fallback. */
	function num(value, fallback, min = -Infinity, max = Infinity) {
		return typeof value === "number" && Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback;
	}
	/** `num` rounded to an integer. */
	function int$2(value, fallback, min = -Infinity, max = Infinity) {
		return Math.round(num(value, fallback, min, max));
	}
	/** A boolean, else the fallback. */
	function bool(value, fallback) {
		return typeof value === "boolean" ? value : fallback;
	}
	/** A trimmed non-empty string cut to `max`, else the fallback. */
	function str(value, fallback, max = 64) {
		return typeof value === "string" && value.trim() ? value.trim().slice(0, max) : fallback;
	}
	/** The value as a plain object, or an empty one. */
	function record(value) {
		return typeof value === "object" && value !== null && !Array.isArray(value) ? value : {};
	}

// ../../../packages/lib/src/shared/index.ts
	function isRecord(value) {
		return typeof value === "object" && value !== null && !Array.isArray(value);
	}
	/** Fills `{0}`, `{1}`... with the arguments by position (a translation may reorder or repeat them). */
	function formatText(template, args) {
		return template.replace(/\{(\d+)\}/g, (match, index) => {
			const value = args[Number(index)];
			return value === void 0 ? match : String(value);
		});
	}
	/** Console output prefixed with the resource name, so server logs show where a line came from. */
	function createLogger(resource) {
		const prefix = `[${resource}]`;
		return {
			info: (message, ...details) => console.log(`${prefix} ${message}`, ...details),
			warn: (message, ...details) => console.warn(`${prefix} ^3${message}^7`, ...details),
			error: (message, ...details) => console.error(`${prefix} ^1${message}^7`, ...details)
		};
	}

// ../../../packages/lib/src/client/netEvent.ts
	const log$2 = createLogger(GetCurrentResourceName());
	/**
	* Whether the net event being handled came from the server (read it before the first `await`). On a client only
	* events from the server carry a source (65535 in the docs); a local emit by any resource carries none.
	*/
	const fromServer = () => Boolean(globalThis.source);
	function onServerEvent(name, first, second) {
		const [handler, parse] = typeof first === "function" ? [first, null] : [second, first.args];
		onNet(name, (...raw) => {
			if (!fromServer() || !handler) return;
			const args = parse ? parse(raw) : [];
			if (!args) return log$2.warn(`event ${name} from the server had invalid arguments`);
			Promise.resolve().then(() => handler(...args)).catch((error) => log$2.error(`event ${name} failed`, error));
		});
	}

// ../../../packages/lib/src/client/callback.ts
	const resource$1 = GetCurrentResourceName();
	const log$1 = createLogger(resource$1);
	const pending = /* @__PURE__ */ new Map();
	let nextId = 0;
	onNet(responseEvent(resource$1), (id, ok, result) => {
		if (!fromServer()) return;
		const entry = typeof id === "number" ? pending.get(id) : void 0;
		if (!entry) return;
		pending.delete(id);
		clearTimeout(entry.timer);
		if (ok === true) entry.resolve(result);
		else entry.reject(/* @__PURE__ */ new Error("server callback failed"));
	});
	/**
	* Asks the server (`onClientCallback(name, ...)` there) and resolves with its answer. The answer is unknown:
	* parse it. Rejects when the server reports an error or does not answer within `timeoutMs`.
	*/
	function triggerServerCallback(name, args = [], timeoutMs = DEFAULT_CALLBACK_TIMEOUT) {
		const id = ++nextId;
		return new Promise((resolve, reject) => {
			const timer = setTimeout(() => {
				pending.delete(id);
				reject(/* @__PURE__ */ new Error(`server callback ${name} timed out`));
			}, timeoutMs);
			pending.set(id, {
				resolve,
				reject,
				timer
			});
			emitNet(requestEvent(name), resource$1, id, ...args);
		});
	}

// ../../../packages/shared/src/core.ts
/** Names owned by ai-core that other resources, the bridges and the build step use. */
	const CORE = {
		resource: "ai-core",
		/** Client -> server: (resource: string, text: string). Sent by the reporter every client bundle carries. */
		clientErrorEvent: "ai-core:clientError",
		/** (src, character: CharacterInfo) after a character is loaded and spawned. */
		playerLoadedEvent: "ai-core:playerLoaded",
		/** (src, charId, reason: UnloadReason) before a character's state is dropped. */
		playerUnloadedEvent: "ai-core:playerUnloaded",
		/** (src, account: string, balance: number, delta: number, reason: string) */
		moneyChangedEvent: "ai-core:moneyChanged",
		/** (src, jobs: JobMembership[]) */
		jobsChangedEvent: "ai-core:jobsChanged",
		/** (src, job: string | null) */
		dutyChangedEvent: "ai-core:dutyChanged",
		/** (src, gangs: GangMembership[]) */
		gangsChangedEvent: "ai-core:gangsChanged",
		/** (src, gang: string | null) */
		activeGangChangedEvent: "ai-core:activeGangChanged",
		/** (src, charIds: number[]) each time a player's character screen loads; an appearance resource answers with portraits. */
		characterScreenEvent: "ai-core:characterScreen",
		/** (resource: string | null) the inventory behind ai-core's inventory layer changed (the bridge drops its item cache). */
		inventoryChangedEvent: "ai-core:inventoryChanged",
		/** (src, name: string, status: Record<string, number> | null) a player used an item; status = the needs it gives, from inventories that define them. */
		itemUsedEvent: "ai-core:itemUsed",
		clientPlayerLoadedEvent: "ai-core:client:playerLoaded",
		clientPlayerUnloadedEvent: "ai-core:client:playerUnloaded",
		/** (charId: number, url: string) a portrait image of a character on the character screen (e.g. `https://nui-img/<txd>/<txd>`). */
		clientCharacterPortraitEvent: "ai-core:client:characterPortrait",
		/** (charId: number) ai-appearance holds this character's look: ai-core dresses its scene ped with `ApplyCharacterAppearance`. */
		clientCharacterLookEvent: "ai-core:client:characterLook",
		/** (resource: string, id: string) the interaction key was pressed while that resource's prompt was on top. */
		clientPromptPressedEvent: "ai-core:client:promptPressed",
		/** (key: keyof PlayerCache, value) a cached value of the local player changed (one watcher in ai-core for every resource). */
		clientCacheEvent: "ai-core:client:cache",
		charactersCallback: "ai-core:characters",
		createCharacterCallback: "ai-core:createCharacter",
		deleteCharacterCallback: "ai-core:deleteCharacter",
		selectCharacterCallback: "ai-core:selectCharacter",
		/** Server -> client: (notification: Notification) a notification card on the player's screen. */
		clientNotifyEvent: "ai-core:client:notify",
		/** Server -> client: (spawn: SpawnPoint) puts the loaded character into the world. */
		spawnEvent: "ai-core:client:spawn",
		/** Server -> client: () the character was let go (switch); show the character screen again. */
		openCharactersEvent: "ai-core:client:openCharacters"
	};

// ../../../packages/shared/src/admin.ts
/** Event names of the admin panel (owned by ai-core). */
	const ADMIN = {
		/** ACE every panel action checks: `add_ace group.admin ai.admin allow`. */
		ace: "ai.admin",
		/** Callback: (keybinds: KeybindInfo[] the admin's client knows) -> AdminPanelSnapshot[]. */
		openCallback: "ai-core:admin:open",
		applyCallback: "ai-core:admin:apply",
		closeEvent: "ai-core:admin:close",
		/** Server -> client: () open the panel (the `aiadmin` command, checked on the server). */
		showEvent: "ai-core:admin:show",
		/** Server -> admins with the panel open: (delta: AdminDelta). */
		deltaEvent: "ai-core:admin:delta",
		/** Server -> client of a world (`sync: "all"`) file: (file, key | null, value). Prefixed with the resource name. */
		worldEvent: (resource) => `${resource}:admin:world`,
		/** Callback: () -> { [file]: { key: value } } world records changed since the resource started. */
		worldChangesCallback: (resource) => `${resource}:admin:worldChanges`
	};

// ../../../packages/shared/src/menu.ts
	const MENU_EVENTS = {
		/** Client local: (resource, requestId, itemId | null) the player picked an item or closed the menu. */
		menuResult: "ai-core:client:menuResult",
		/** Client local: (resource, requestId, itemId) the pointer or focus is on an item (previews). */
		menuHover: "ai-core:client:menuHover",
		/** Client local: (resource, requestId, values | null) the player confirmed or closed the input dialog. */
		inputResult: "ai-core:client:inputResult"
	};

// ../../../packages/shared/src/commands.ts
/** Client local events between the lib's `Keybind` and ai-core's client. */
	const KEYBIND = {
		/** lib -> ai-core: (info: KeybindInfo) a keybind waits for its default key. */
		announceEvent: "ai-core:client:keybind",
		/** ai-core -> lib: (resource, name, key) the default key to register: the panel's value, else the script's. */
		keyEvent: "ai-core:client:keybindKey"
	};

// ../../../packages/lib/src/client/adminWorld.ts
/**
	* The client copy of a resource's world panel files (`sync: "all"`): the file FiveM cached at start, then the
	* records changed since start (asked once), then live changes. Never polls.
	*/
	var AdminWorld = class {
		data = /* @__PURE__ */ new Map();
		handlers = /* @__PURE__ */ new Map();
		resource = GetCurrentResourceName();
		/** Resolves once the changes since start are applied (or could not be loaded): the data is current from then on. */
		ready;
		/** `files`: the world files this client mirrors (each must be in the resource's `files`). */
		constructor(files) {
			const log = createLogger(this.resource);
			for (const file of files) {
				const raw = LoadResourceFile(this.resource, `data/${file}.json`);
				try {
					const parsed = raw ? JSON.parse(raw) : {};
					this.data.set(file, isRecord(parsed) ? parsed : {});
				} catch (error) {
					log.error(`data/${file}.json is not valid JSON`, error);
					this.data.set(file, {});
				}
			}
			onServerEvent(ADMIN.worldEvent(this.resource), { args: ([file, key, value]) => typeof file === "string" ? [
				file,
				typeof key === "string" && key !== "" ? key : void 0,
				value
			] : null }, (file, key, value) => this.put(file, key, value));
			this.ready = triggerServerCallback(ADMIN.worldChangesCallback(this.resource)).then((changes) => {
				if (!isRecord(changes)) return;
				for (const [file, records] of Object.entries(changes)) {
					if (!isRecord(records)) continue;
					for (const [key, value] of Object.entries(records)) this.put(file, key === "" ? void 0 : key, value);
				}
			}, (error) => log.error("loading the panel changes since start failed", error));
		}
		/** The current content of a file: the settings object, or `{ key: record }`. Read only; parse what you use. */
		get(file) {
			return this.data.get(file) ?? {};
		}
		onChange(file, handler) {
			this.handlers.set(file, [...this.handlers.get(file) ?? [], handler]);
		}
		put(file, key, value) {
			const data = this.data.get(file);
			if (!data) return;
			if (key === void 0) {
				if (isRecord(value)) this.data.set(file, value);
			} else if (value === null) delete data[key];
			else data[key] = value;
			for (const handler of this.handlers.get(file) ?? []) handler(key, value);
		}
	};

// ../../../packages/lib/src/client/cache.ts
/** The unarmed "weapon" hash: cached as `false`. */
	const UNARMED$1 = GetHashKey("WEAPON_UNARMED") | 0;
	/** The vehicle, seat and weapon of a ped right now (also ai-core's watcher). */
	function readPlayerState(ped) {
		const vehicle = GetVehiclePedIsIn(ped, false);
		let seat = false;
		if (vehicle) for (let i = -1; i < GetVehicleMaxNumberOfPassengers(vehicle); i++) {
			if (GetPedInVehicleSeat(vehicle, i) !== ped) continue;
			seat = i;
			break;
		}
		const weapon = GetSelectedPedWeapon(ped) | 0;
		return {
			vehicle: vehicle || false,
			seat,
			weapon: weapon === UNARMED$1 ? false : weapon
		};
	}
	/**
	* The local player's often read values (ped, player id, server id, vehicle, seat, weapon), like ox_lib's `cache`:
	* read `cache.ped` instead of calling PlayerPedId() in loops. One watcher in ai-core updates every resource through
	* a local event, so no resource polls for these itself. Read only.
	*/
	const ped = PlayerPedId();
	const cache = {
		ped,
		playerId: PlayerId(),
		serverId: GetPlayerServerId(PlayerId()),
		...readPlayerState(ped)
	};
	const handlers = /* @__PURE__ */ new Map();
	const valid = (key, value) => key === "ped" || key === "playerId" || key === "serverId" ? typeof value === "number" : typeof value === "number" || value === false;
	on(CORE.clientCacheEvent, (key, value) => {
		if (typeof key !== "string" || !(key in cache)) return;
		const name = key;
		if (!valid(name, value) || cache[name] === value) return;
		const old = cache[name];
		cache[name] = value;
		for (const handler of handlers.get(name) ?? []) handler(value, old);
	});
	/** Runs `handler(value, old)` whenever a cached value changes (entering a vehicle, a new ped after a model swap...). */
	function onCache(key, handler) {
		let set = handlers.get(key);
		if (!set) handlers.set(key, set = /* @__PURE__ */ new Set());
		set.add(handler);
	}

// ../../../packages/lib/src/client/zones.ts
/**
	* Zones on this client: inside / outside checks at each zone's own interval, never per frame. Built for any count
	* (measured with 1,000,000 zones): zones sit in a grid of 64 m cells and a check looks only at the player's cell and
	* the zones the player is in.
	*/
	const log = createLogger(GetCurrentResourceName());
	const CELL = 64;
	/** A zone wider than this many cells is kept in one list checked every time instead of in the grid. */
	const MAX_CELLS = 64;
	const cellKey = (cx, cy) => cx + 32768 << 16 | cy + 32768;
	function contains(shape, x, y, z) {
		switch (shape.type) {
			case "sphere": {
				const dx = x - shape.center.x;
				const dy = y - shape.center.y;
				const dz = z - shape.center.z;
				return dx * dx + dy * dy + dz * dz <= shape.radius * shape.radius;
			}
			case "cylinder": {
				const dx = x - shape.center.x;
				const dy = y - shape.center.y;
				return dx * dx + dy * dy <= shape.radius * shape.radius && Math.abs(z - shape.center.z) <= shape.height;
			}
			case "poly": {
				if (z < shape.minZ || z > shape.maxZ) return false;
				let inside = false;
				const p = shape.points;
				for (let i = 0, j = p.length - 1; i < p.length; j = i++) {
					const a = p[i];
					const b = p[j];
					if (a.y > y !== b.y > y && x < (b.x - a.x) * (y - a.y) / (b.y - a.y) + a.x) inside = !inside;
				}
				return inside;
			}
			default: return shape;
		}
	}
	/** Ground bounding box of a shape: [minX, minY, maxX, maxY]. */
	function bounds(shape) {
		if (shape.type !== "poly") return [
			shape.center.x - shape.radius,
			shape.center.y - shape.radius,
			shape.center.x + shape.radius,
			shape.center.y + shape.radius
		];
		let minX = Infinity;
		let minY = Infinity;
		let maxX = -Infinity;
		let maxY = -Infinity;
		for (const p of shape.points) {
			minX = Math.min(minX, p.x);
			minY = Math.min(minY, p.y);
			maxX = Math.max(maxX, p.x);
			maxY = Math.max(maxY, p.y);
		}
		return [
			minX,
			minY,
			maxX,
			maxY
		];
	}
	var Zone = class {
		options;
		inside = false;
		nextCheck = 0;
		interval;
		/** Grid cells the zone is filed under; empty when it is in the large list. */
		cells = [];
		constructor(options) {
			this.options = options;
			this.interval = Math.max(50, options.interval ?? 500);
		}
	};
	/**
	* The zones of one resource. One timer serves them all at the shortest interval any zone asks for; each zone is
	* checked only when its own interval has passed. With no zones the timer stops (an active JS timer costs every frame).
	*/
	var Zones = class {
		zones = /* @__PURE__ */ new Map();
		grid = /* @__PURE__ */ new Map();
		large = /* @__PURE__ */ new Set();
		insideNow = /* @__PURE__ */ new Set();
		/** How many zones use each interval, so the shortest one is found without walking every zone. */
		intervals = /* @__PURE__ */ new Map();
		timer = null;
		period = 0;
		/** Adds (or replaces) a zone. A replaced zone the player was in fires its onExit first. */
		add(id, options) {
			this.remove(id);
			const zone = new Zone(options);
			this.zones.set(id, zone);
			const [minX, minY, maxX, maxY] = bounds(options.shape);
			const x0 = Math.floor(minX / CELL);
			const y0 = Math.floor(minY / CELL);
			const x1 = Math.floor(maxX / CELL);
			const y1 = Math.floor(maxY / CELL);
			if ((x1 - x0 + 1) * (y1 - y0 + 1) > MAX_CELLS) this.large.add(zone);
			else for (let cx = x0; cx <= x1; cx++) for (let cy = y0; cy <= y1; cy++) {
				const key = cellKey(cx, cy);
				let cell = this.grid.get(key);
				if (!cell) this.grid.set(key, cell = /* @__PURE__ */ new Set());
				cell.add(zone);
				zone.cells.push(key);
			}
			this.intervals.set(zone.interval, (this.intervals.get(zone.interval) ?? 0) + 1);
			this.schedule();
		}
		remove(id) {
			const zone = this.zones.get(id);
			if (!zone) return;
			this.zones.delete(id);
			this.large.delete(zone);
			for (const key of zone.cells) {
				const cell = this.grid.get(key);
				cell?.delete(zone);
				if (cell?.size === 0) this.grid.delete(key);
			}
			const left = (this.intervals.get(zone.interval) ?? 1) - 1;
			if (left > 0) this.intervals.set(zone.interval, left);
			else this.intervals.delete(zone.interval);
			if (this.insideNow.delete(zone)) this.fire(zone, false);
			this.schedule();
		}
		/** Removes every zone (exits fire for the ones the player is in). */
		clear() {
			const inside = [...this.insideNow];
			this.zones.clear();
			this.grid.clear();
			this.large.clear();
			this.insideNow.clear();
			this.intervals.clear();
			for (const zone of inside) this.fire(zone, false);
			this.schedule();
		}
		isInside(id) {
			return this.zones.get(id)?.inside ?? false;
		}
		get size() {
			return this.zones.size;
		}
		schedule() {
			let period = 0;
			for (const interval of this.intervals.keys()) period = period === 0 ? interval : Math.min(period, interval);
			if (period === this.period) return;
			if (this.timer) clearInterval(this.timer);
			this.timer = period ? setInterval(() => this.check(), period) : null;
			this.period = period;
		}
		check() {
			const now = GetGameTimer();
			const [x = 0, y = 0, z = 0] = GetEntityCoords(cache.ped, false);
			for (const zone of this.insideNow) this.test(zone, now, x, y, z);
			for (const zone of this.large) this.test(zone, now, x, y, z);
			const cell = this.grid.get(cellKey(Math.floor(x / CELL), Math.floor(y / CELL)));
			if (cell) for (const zone of cell) this.test(zone, now, x, y, z);
		}
		test(zone, now, x, y, z) {
			if (now < zone.nextCheck) return;
			zone.nextCheck = now + zone.interval;
			const inside = contains(zone.options.shape, x, y, z);
			if (inside === zone.inside) return;
			if (inside) this.insideNow.add(zone);
			else this.insideNow.delete(zone);
			this.fire(zone, inside);
		}
		fire(zone, inside) {
			zone.inside = inside;
			try {
				if (inside) zone.options.onEnter?.();
				else zone.options.onExit?.();
			} catch (error) {
				log.error("zone handler failed", error);
			}
		}
	};

// ../../../packages/lib/src/fivem/exports.ts
	function registerExport(name, handler) {
		globalThis.exports(name, handler);
	}
	/** Typed access to another resource's exports (types come from CitizenExports in @aicore-fivem/shared). */
	function resourceExport(resource) {
		return globalThis.exports[resource];
	}
	/** Whether a resource is running now. */
	function isResourceStarted(resource) {
		return GetResourceState(resource) === "started";
	}
	/** Answers `exports["<resource>"].<name>` for a resource name this one `provide`s: provide makes the name exist but does not alias its exports, so each export of the stood-in resource is answered through FiveM's export event. */
	function provideExport(resource, name, fn) {
		on(`__cfx_export_${resource}_${name}`, (setCallback) => setCallback(fn));
	}

// ../../../packages/lib/src/client/prompt.ts
/**
	* ai-core's prompt (the "press E" box on the right): this resource shows and hides its own prompts by id; the
	* interaction key is one rebindable keybind in ai-core, so nothing polls keys per frame. Show a prompt on a zone's
	* enter, hide it on exit, act in `onPromptPressed`.
	*/
	function showPrompt(id, text) {
		resourceExport(CORE.resource).ShowPrompt(id, text);
	}
	function hidePrompt(id) {
		resourceExport(CORE.resource).HidePrompt(id);
	}
	/** The player pressed the interaction key while this resource's prompt `id` was the one on top. */
	function onPromptPressed(handler) {
		const resource = GetCurrentResourceName();
		on(CORE.clientPromptPressedEvent, (owner, id) => {
			if (owner === resource && typeof id === "string") handler(id);
		});
	}

// ../../../packages/lib/src/client/streaming.ts
/**
	* Loads a model and resolves with its hash. Rejects when the model does not exist or does not load in time.
	* Call `SetModelAsNoLongerNeeded(hash)` once the entity is created.
	*/
	async function requestModel(model, timeoutMs = 1e4) {
		const hash = typeof model === "number" ? model : GetHashKey(model);
		if (!IsModelInCdimage(hash)) throw new Error(`model ${model} does not exist`);
		RequestModel(hash);
		await waitFor(() => HasModelLoaded(hash) || void 0, timeoutMs);
		return hash;
	}
	/** Loads an animation dictionary. Call `RemoveAnimDict(dict)` when it is no longer played. */
	async function requestAnimDict(dict, timeoutMs = 1e4) {
		if (!DoesAnimDictExist(dict)) throw new Error(`anim dict ${dict} does not exist`);
		RequestAnimDict(dict);
		await waitFor(() => HasAnimDictLoaded(dict) || void 0, timeoutMs);
		return dict;
	}

// ../../../packages/lib/src/client/notify.ts
/** Shows a notification card on this player's screen (ai-core draws it); `text` is already translated. */
	function notify(text, kind = "info", duration) {
		resourceExport(CORE.resource).Notify({
			text,
			kind,
			duration
		});
	}
	/**
	* Runs a timed action with ai-core's progress bar and an optional animation; resolves true when it ran out, false
	* when cancelled (death, getting into a vehicle). Checks ten times a second, nothing per frame.
	*/
	async function progress(options) {
		const core = resourceExport(CORE.resource);
		const ped = cache.ped;
		if (options.anim) {
			await requestAnimDict(options.anim.dict);
			TaskPlayAnim(ped, options.anim.dict, options.anim.clip, 3, 3, options.duration, options.anim.flag ?? 49, 0, false, false, false);
		}
		core.ShowProgress(options.label, options.duration);
		const end = GetGameTimer() + options.duration;
		const done = await new Promise((resolve) => {
			const timer = setInterval(() => {
				const cancelled = IsEntityDead(cache.ped) || !options.allowVehicle && cache.vehicle !== false;
				if (!cancelled && GetGameTimer() < end) return;
				clearInterval(timer);
				resolve(!cancelled);
			}, 100);
		});
		if (options.anim) StopAnimTask(ped, options.anim.dict, options.anim.clip, 1);
		core.HideProgress();
		return done;
	}

// ../../../packages/lib/src/client/menu.ts
/** Menus and input dialogs this resource asked ai-core for, waiting for the player's answer. */
	var Requests = class {
		resource = GetCurrentResourceName();
		waiting = /* @__PURE__ */ new Map();
		hovers = /* @__PURE__ */ new Map();
		nextId = 0;
		constructor() {
			const answer = (owner, id, value) => {
				if (owner !== this.resource || typeof id !== "number") return;
				this.waiting.get(id)?.(value);
				this.waiting.delete(id);
				this.hovers.delete(id);
			};
			on(MENU_EVENTS.menuHover, (owner, id, item) => {
				if (owner === this.resource && typeof id === "number" && typeof item === "string") this.hovers.get(id)?.(item);
			});
			on(MENU_EVENTS.menuResult, answer);
			on(MENU_EVENTS.inputResult, answer);
		}
		ask(open, read, onHover) {
			const id = ++this.nextId;
			this.waiting.set(id, read);
			if (onHover) this.hovers.set(id, onHover);
			open(id);
		}
	};
	const requests = new Requests();

// ../../../packages/lib/src/client/vehicleProps.ts
	const MOD_TYPES = Array.from({ length: 50 }, (_, i) => i);

// ../../../packages/lib/src/client/keybind.ts
	const resource = GetCurrentResourceName();
	/** Keybinds of this resource waiting for ai-core's answer (the panel's default key, else their own). */
	const waiting = /* @__PURE__ */ new Map();
	let listening = false;
	/** Asks ai-core's client for the default key (it knows the panel's keybind defaults); without ai-core the script's own. */
	function requestKey(info, apply) {
		if (resource !== CORE.resource && !isResourceStarted(CORE.resource)) return apply(info.defaultKey);
		if (!listening) {
			listening = true;
			on(KEYBIND.keyEvent, (owner, name, key) => {
				if (owner !== resource || typeof name !== "string" || typeof key !== "string") return;
				const done = waiting.get(name);
				waiting.delete(name);
				done?.(key);
			});
		}
		waiting.set(info.name, apply);
		emit(KEYBIND.announceEvent, info);
		setTimeout(() => {
			if (waiting.get(info.name) !== apply) return;
			waiting.delete(info.name);
			apply(info.defaultKey);
		}, 15e3);
	}
	/**
	* A key the player can rebind in GTA's settings (RegisterKeyMapping); no per-frame key polling. The default key
	* comes from ai-core's admin panel when set there: the mapping command carries the key (`+<name>_<key>`), so a new
	* default makes a new mapping that every player gets. It is registered once ai-core answered (at start).
	*/
	var Keybind = class {
		options;
		name;
		disabled;
		pressed = false;
		hash = 0;
		constructor(options) {
			this.options = options;
			this.name = options.name;
			this.disabled = options.disabled ?? false;
			requestKey({
				resource,
				name: options.name,
				description: options.description,
				defaultKey: options.defaultKey ?? "",
				mapper: options.defaultMapper ?? "keyboard"
			}, (key) => this.register(key.toUpperCase()));
		}
		register(key) {
			const command = key ? `${this.name}_${key}` : this.name;
			this.hash = GetHashKey(`+${command}`) | 2147483648;
			RegisterCommand(`+${command}`, () => this.press(true), false);
			RegisterCommand(`-${command}`, () => this.press(false), false);
			RegisterKeyMapping(`+${command}`, this.options.description, this.options.defaultMapper ?? "keyboard", key);
			setTimeout(() => {
				emit("chat:removeSuggestion", `/+${command}`);
				emit("chat:removeSuggestion", `/-${command}`);
			}, 500);
		}
		press(down) {
			if (this.disabled || !this.options.allowInPauseMenu && IsPauseMenuActive()) return;
			this.pressed = down;
			if (down) this.options.onPressed?.();
			else this.options.onReleased?.();
		}
		/** Whether the key is held now. */
		get isPressed() {
			return this.pressed;
		}
		/** The key the player has bound right now, for HUD hints ("" until the mapping is registered). */
		get currentKey() {
			return this.hash ? GetControlInstructionalButton(0, this.hash, true).substring(2) : "";
		}
		disable(disabled) {
			this.disabled = disabled;
			this.pressed = false;
		}
	};

// ../../../packages/lib/src/fivem/locale.ts
/** Convar holding the language (`setr ai:locale "en"` in misc.cfg); replicated so clients read it too. */
	const LOCALE_CONVAR = "ai:locale";
	function readLocaleFile(resource, lang) {
		const raw = LoadResourceFile(resource, `locales/${lang}.json`);
		if (!raw) return {};
		const parsed = JSON.parse(raw);
		if (!isRecord(parsed)) return {};
		const texts = {};
		for (const [key, value] of Object.entries(parsed)) if (typeof value === "string") texts[key] = value;
		return texts;
	}
	/**
	* The resource's lang texts: `locales/en.json` (complete base) overlaid with `locales/<ai:locale>.json`.
	* `${OTHER_KEY}` inside a text is replaced by that text once at load. Returns `t(key, ...args)` filling
	* `{0}`, `{1}`...; a missing key returns the key itself so it is visible in game.
	*
	*   const t = createLocale<typeof import("../../locales/en.json")>();
	*   t("NOTIFY_NO_MONEY", price);
	*/
	function createLocale() {
		const texts = loadLocaleTexts();
		return (key, ...args) => formatText(texts[key] ?? key, args);
	}
	/**
	* The resource's merged lang table (`en.json` overlaid with the `ai:locale` language, `${KEY}` references
	* resolved). A NUI gets this once and fills `{0}` placeholders itself.
	*/
	function loadLocaleTexts(resource = GetCurrentResourceName()) {
		const lang = GetConvar(LOCALE_CONVAR, "en");
		const texts = {
			...readLocaleFile(resource, "en"),
			...lang === "en" ? {} : readLocaleFile(resource, lang)
		};
		for (const key of Object.keys(texts)) texts[key] = (texts[key] ?? "").replace(/\$\{([A-Z0-9_]+)\}/g, (match, ref) => texts[ref] ?? match);
		return texts;
	}

// resource/common/events.ts
/** Net events and callbacks of ai-inventory. Payload types in ./nui. */
	const EVENTS = {
		/** Server -> owner: (view: InventoryView) the loaded character's inventory, once per load. */
		player: "ai-inventory:client:player",
		/** Server -> viewers: (id, put: Stack[], remove: number[], maxWeight) changed stacks of an inventory they see. */
		delta: "ai-inventory:client:delta",
		/** Server -> client: (view: InventoryView, panel: Panel | null) a script opened an inventory for the player. */
		forceOpen: "ai-inventory:client:forceOpen",
		/** Server -> client: () the second inventory went away (drop emptied, too far). */
		forceClose: "ai-inventory:client:forceClose",
		/** Server -> everyone: (drops: DropPoint[]) snapshot at join; then put / remove. */
		drops: "ai-inventory:client:drops",
		dropPut: "ai-inventory:client:dropPut",
		dropRemove: "ai-inventory:client:dropRemove",
		/** Server -> owner: (weapon: EquippedWeapon | null) equip or holster. */
		weapon: "ai-inventory:client:weapon",
		/** Server -> owner: (use: PendingUse) play the use animation, then call `finishUse`. */
		startUse: "ai-inventory:client:startUse",
		/** Server -> owner: (hashes: string[]) the held weapon's attachments changed. */
		components: "ai-inventory:client:components",
		/** Client -> server: () the player closed the screen; stop sending the second inventory. */
		close: "ai-inventory:close",
		/** Client -> server: () the use animation was cancelled. */
		cancelUse: "ai-inventory:cancelUse",
		/** Client -> server: (slot, ammo) ammo left in the held weapon (only lower values are taken). */
		ammo: "ai-inventory:ammo",
		/** Callback: (target: OpenTarget) -> OpenResult. */
		open: "ai-inventory:open",
		/** Callback: (move: MoveInput) -> ActionResult. */
		move: "ai-inventory:move",
		/** Callback: (slot) -> ActionResult; use a stack of the player inventory. */
		use: "ai-inventory:use",
		/** Callback: (token) -> ActionResult; the use animation finished. */
		finishUse: "ai-inventory:finishUse",
		/** Callback: (slot, count, targetServerId) -> ActionResult. */
		give: "ai-inventory:give",
		/** Callback: (from, slot, count) -> ActionResult; put a stack on the ground. */
		drop: "ai-inventory:drop",
		/** Callback: (shopId, item, count) -> ActionResult. */
		buy: "ai-inventory:buy",
		/** Callback: (benchId, recipeIndex) -> ActionResult. */
		craft: "ai-inventory:craft",
		/** Callback: (slot) -> ActionResult; refill the held weapon from ammo items. */
		reload: "ai-inventory:reload",
		/** Callback: (slot, hash) -> ActionResult; take an attachment off a weapon. */
		detach: "ai-inventory:detach"
	};

// resource/common/items.ts
	const KEY = /^[a-z0-9_-]{2,48}$/;
	const TYPES = [
		"item",
		"weapon",
		"ammo",
		"component"
	];
	const ANIMS$1 = [
		"none",
		"eat",
		"drink",
		"bandage",
		"armour"
	];
	const isObj$7 = (v) => typeof v === "object" && v !== null && !Array.isArray(v);
	const n = (v, fallback, min, max) => typeof v === "number" && Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : fallback;
	const s = (v, fallback = "") => typeof v === "string" ? v : fallback;
	const names$1 = (v) => Array.isArray(v) ? v.filter((x) => typeof x === "string").map((x) => x.toLowerCase()) : [];
	function readItem(name, raw) {
		if (!KEY.test(name) || !isObj$7(raw)) return null;
		const size = isObj$7(raw.size) ? raw.size : {};
		const use = isObj$7(raw.use) ? raw.use : {};
		const type = TYPES.includes(raw.type) ? raw.type : "item";
		const status = {};
		if (isObj$7(use.status)) {
			for (const [key, value] of Object.entries(use.status)) if (typeof value === "number") status[key] = value;
		}
		const weapon = isObj$7(raw.weapon) ? raw.weapon : {};
		const component = isObj$7(raw.component) ? raw.component : {};
		return {
			name,
			label: s(raw.label, name),
			description: s(raw.description),
			weight: n(raw.weight, 0, 0, 1e6),
			size: {
				w: Math.round(n(size.w, 1, 1, 8)),
				h: Math.round(n(size.h, 1, 1, 8))
			},
			stack: Math.round(n(raw.stack, 1, 1, 1e5)),
			type,
			usable: raw.usable === true || type === "weapon" || type === "component",
			consume: Math.round(n(raw.consume, 0, 0, 1e3)),
			close: raw.close === true,
			image: s(raw.image),
			aliases: names$1(raw.aliases),
			use: {
				anim: ANIMS$1.includes(use.anim) ? use.anim : "none",
				time: n(use.time, 0, 0, 6e4),
				status
			},
			weapon: type === "weapon" ? {
				ammo: s(weapon.ammo).toLowerCase(),
				throwable: weapon.throwable === true
			} : null,
			component: type === "component" ? { hashes: Array.isArray(component.hashes) ? component.hashes.filter((h) => typeof h === "string") : [] } : null
		};
	}
	/** Every item by name, plus the alias lookup. Names are case-insensitive (ox calls `WEAPON_PISTOL`, QB `weapon_pistol`). */
	var ItemList = class {
		byName = /* @__PURE__ */ new Map();
		alias = /* @__PURE__ */ new Map();
		constructor(raw) {
			if (!isObj$7(raw)) return;
			for (const [name, value] of Object.entries(raw)) {
				const item = readItem(name, value);
				if (!item) continue;
				this.byName.set(name, item);
				for (const alias of item.aliases) this.alias.set(alias, name);
			}
		}
		/** The definition for any spelling or alias of a name. */
		get(name) {
			if (typeof name !== "string") return void 0;
			const key = name.toLowerCase();
			return this.byName.get(key) ?? this.byName.get(this.alias.get(key) ?? "");
		}
	};

// resource/common/content.ts
	const names = (v) => Array.isArray(v) ? v.filter((x) => typeof x === "string" && x !== "") : [];
	const grid = (v, rows, weight) => {
		const g = record(v);
		return {
			rows: int$2(g.rows, rows, 1, 50),
			maxWeight: int$2(g.maxWeight, weight, 0, 1e7)
		};
	};
	function readSettings(raw) {
		const s = record(raw);
		const drop = record(s.drop);
		return {
			columns: int$2(s.columns, 10, 6, 14),
			player: grid(s.player, 6, 4e4),
			drop: {
				...grid(s.drop, 6, 1e6),
				despawnMinutes: int$2(drop.despawnMinutes, 15, 1, 240)
			},
			trunk: grid(s.trunk, 6, 8e4),
			glovebox: grid(s.glovebox, 2, 1e4)
		};
	}
	/** `"water:2, bread"` -> `[{ water, 2 }, { bread, 1 }]` (the panel edits ingredients as one text). */
	function parseIngredients(text) {
		return text.split(",").map((part) => part.trim()).filter(Boolean).map((part) => {
			const [name = "", count = "1"] = part.split(":").map((x) => x.trim());
			return {
				name: name.toLowerCase(),
				count: Math.max(1, Math.floor(Number(count)) || 1)
			};
		});
	}
	function readPlace(id, v) {
		const c = record(v.coords);
		return {
			id,
			label: str(v.label, id),
			x: num(c.x, 0),
			y: num(c.y, 0),
			z: num(c.z, 0),
			radius: num(v.radius, 2, .5, 30),
			jobs: names(v.jobs)
		};
	}
	function readRecords(raw, read) {
		const out = /* @__PURE__ */ new Map();
		for (const [id, value] of Object.entries(record(raw))) {
			const item = read(id, record(value));
			if (item) out.set(id, item);
		}
		return out;
	}
	const readShops = (raw) => readRecords(raw, (id, v) => ({
		...readPlace(id, v),
		blip: bool(v.blip, true),
		accounts: names(v.accounts).length ? names(v.accounts) : ["cash", "bank"],
		items: (Array.isArray(v.items) ? v.items : []).flatMap((row) => {
			const r = record(row);
			const name = str(r.name, "").toLowerCase();
			return name ? [{
				name,
				price: int$2(r.price, 0, 0, 1e8)
			}] : [];
		})
	}));
	const readStashes = (raw) => readRecords(raw, (id, v) => ({
		...readPlace(id, v),
		gangs: names(v.gangs),
		personal: bool(v.personal, false),
		size: grid(v, 6, 1e5)
	}));
	const readBenches = (raw) => readRecords(raw, (id, v) => ({
		...readPlace(id, v),
		recipes: (Array.isArray(v.recipes) ? v.recipes : []).flatMap((row) => {
			const r = record(row);
			const result = str(r.result, "").toLowerCase();
			if (!result) return [];
			return [{
				result,
				count: int$2(r.count, 1, 1, 1e3),
				time: num(r.time, 5, 0, 600),
				ingredients: parseIngredients(str(r.ingredients, "", 400))
			}];
		})
	}));
	const FILES = [
		"items",
		"settings",
		"shops",
		"stashes",
		"benches"
	];
	/** Every panel file, parsed once and again after each change; `subscribe` hears which file changed. */
	var InventoryContent = class {
		source;
		items;
		settings;
		shops;
		stashes;
		benches;
		listeners = [];
		constructor(source) {
			this.source = source;
			this.items = new ItemList(source.get("items"));
			this.settings = readSettings(source.get("settings"));
			this.shops = readShops(source.get("shops"));
			this.stashes = readStashes(source.get("stashes"));
			this.benches = readBenches(source.get("benches"));
			for (const file of FILES) source.onChange(file, () => this.reload(file));
		}
		subscribe(listener) {
			this.listeners.push(listener);
		}
		reload(file) {
			const raw = this.source.get(file);
			if (file === "items") this.items = new ItemList(raw);
			else if (file === "settings") this.settings = readSettings(raw);
			else if (file === "shops") this.shops = readShops(raw);
			else if (file === "stashes") this.stashes = readStashes(raw);
			else this.benches = readBenches(raw);
			for (const listener of this.listeners) listener(file);
		}
	};

// resource/client/content.ts
/** Items, shops, stashes, benches and settings as the panel has them now (cached files, then live changes). */
	const content = new InventoryContent(new AdminWorld([...FILES]));
	function itemViews() {
		return [...content.items.byName.values()].map((d) => ({
			name: d.name,
			label: d.label,
			description: d.description,
			weight: d.weight,
			w: d.size.w,
			h: d.size.h,
			stack: d.stack,
			type: d.type,
			usable: d.usable,
			image: d.image,
			hashes: d.component?.hashes ?? []
		}));
	}
	function shopView(id) {
		const shop = content.shops.get(id);
		return shop ? {
			id: shop.id,
			label: shop.label,
			items: shop.items.filter((row) => content.items.get(row.name))
		} : null;
	}
	function benchView(id) {
		const bench = content.benches.get(id);
		return bench ? {
			id: bench.id,
			label: bench.label,
			recipes: bench.recipes
		} : null;
	}

// resource/client/state.ts
	const isObj$6 = (v) => typeof v === "object" && v !== null && !Array.isArray(v);
	/** Server data shapes are checked once here; the server is trusted, but msgpack can turn values into null. */
	function toStack(v) {
		if (!isObj$6(v) || typeof v.slot !== "number" || typeof v.name !== "string" || typeof v.count !== "number") return null;
		return {
			slot: v.slot,
			name: v.name,
			count: v.count,
			metadata: isObj$6(v.metadata) ? v.metadata : {},
			rotated: v.rotated === true
		};
	}
	function toView(v) {
		if (!isObj$6(v) || typeof v.id !== "string" || typeof v.columns !== "number" || typeof v.rows !== "number" || !Array.isArray(v.stacks)) return null;
		const kind = typeof v.kind === "string" ? v.kind : "other";
		return {
			id: v.id,
			kind,
			label: typeof v.label === "string" ? v.label : "",
			columns: v.columns,
			rows: v.rows,
			maxWeight: typeof v.maxWeight === "number" ? v.maxWeight : 0,
			stacks: v.stacks.map(toStack).filter((s) => s !== null)
		};
	}
	/**
	* The player's own inventory as the server sent it (snapshot at load, then deltas), and the id of the second one the
	* screen shows. Exports and the hotbar read from here; listeners forward deltas to the NUI.
	*/
	var InventoryState = class {
		player = null;
		otherId = null;
		listeners = [];
		playerListeners = [];
		onDelta(listener) {
			this.listeners.push(listener);
		}
		onPlayer(listener) {
			this.playerListeners.push(listener);
		}
		setPlayer(view) {
			this.player = view;
			for (const listener of this.playerListeners) listener(view);
		}
		applyDelta(id, put, remove, maxWeight) {
			if (this.player?.id === id) {
				const bySlot = new Map(this.player.stacks.map((s) => [s.slot, s]));
				for (const slot of remove) bySlot.delete(slot);
				for (const stack of put) bySlot.set(stack.slot, stack);
				this.player.stacks = [...bySlot.values()];
				this.player.maxWeight = maxWeight;
			}
			for (const listener of this.listeners) listener(id, put, remove, maxWeight);
		}
		count(name) {
			const def = content.items.get(name);
			if (!def || !this.player) return 0;
			return this.player.stacks.reduce((sum, s) => sum + (s.name === def.name ? s.count : 0), 0);
		}
		/** The stack covering a cell of the player grid (0-based), for the hotbar. */
		stackAtCell(cell) {
			const view = this.player;
			if (!view) return void 0;
			const cx = cell % view.columns;
			const cy = Math.floor(cell / view.columns);
			return view.stacks.find((s) => {
				const size = content.items.get(s.name)?.size ?? {
					w: 1,
					h: 1
				};
				const w = s.rotated ? size.h : size.w;
				const h = s.rotated ? size.w : size.h;
				const x = (s.slot - 1) % view.columns;
				const y = Math.floor((s.slot - 1) / view.columns);
				return cx >= x && cx < x + w && cy >= y && cy < y + h;
			});
		}
		weight() {
			if (!this.player) return 0;
			return this.player.stacks.reduce((sum, s) => sum + (content.items.get(s.name)?.weight ?? 0) * s.count, 0);
		}
	};
	const state = new InventoryState();
	onServerEvent(EVENTS.player, { args: ([raw]) => {
		const view = toView(raw);
		return view ? [view] : null;
	} }, (view) => state.setPlayer(view));
	onServerEvent(EVENTS.delta, { args: ([id, put, remove, maxWeight]) => typeof id === "string" && Array.isArray(put) && Array.isArray(remove) ? [
		id,
		put.map(toStack).filter((s) => s !== null),
		remove.filter((n) => typeof n === "number"),
		typeof maxWeight === "number" ? maxWeight : 0
	] : null }, (id, put, remove, maxWeight) => state.applyDelta(id, put, remove, maxWeight));

// resource/common/locale.ts
/** This resource's lang texts: `Locale("NOTIFY_NO_MONEY", price)`; keys typed from locales/en.json. */
	const Locale = createLocale();

// resource/common/resource.ts
	const ResourceName = GetCurrentResourceName();
	const ResourceContext = IsDuplicityVersion() ? "server" : "client";

// resource/common/nui.ts
/** NUI -> client callbacks (fetchNui names). */
	const NUI = {
		close: "close",
		move: "move",
		use: "use",
		give: "give",
		drop: "drop",
		buy: "buy",
		craft: "craft",
		detach: "detach"
	};
	/** Parsers for boundary data. */
	const isObj$5 = (v) => typeof v === "object" && v !== null && !Array.isArray(v);
	const int$1 = (v, min, max) => typeof v === "number" && Number.isInteger(v) && v >= min && v <= max ? v : null;
	const id = (v) => typeof v === "string" && v.length > 0 && v.length <= 96 ? v : null;
	function toMoveInput(v) {
		if (!isObj$5(v)) return null;
		const from = id(v.from);
		const to = id(v.to);
		const fromSlot = int$1(v.fromSlot, 1, 1e4);
		const toSlot = int$1(v.toSlot, 1, 1e4);
		const count = int$1(v.count, 1, 1e6);
		if (!from || !to || fromSlot === null || toSlot === null || count === null || typeof v.rotated !== "boolean") return null;
		return {
			from,
			to,
			fromSlot,
			toSlot,
			count,
			rotated: v.rotated
		};
	}
	function toPanel(v) {
		if (!isObj$5(v) || v.kind !== "shop" && v.kind !== "bench") return null;
		const key = id(v.id);
		return key ? {
			kind: v.kind,
			id: key
		} : null;
	}

// resource/client/screen.ts
	const send = (message) => SendNUIMessage(message);
	function toResult(v) {
		if (typeof v === "object" && v !== null && "ok" in v) {
			if (v.ok === true) return { ok: true };
			if ("error" in v && typeof v.error === "string") return {
				ok: false,
				error: v.error
			};
		}
		return {
			ok: false,
			error: "INV_ERR_GONE"
		};
	}
	const texts = loadLocaleTexts();
	/** An action failed: ai-core's notification with the server's reason (a lang key of this resource). */
	function toast(error) {
		notify(texts[error] ?? error, "error");
	}
	/** The inventory screen: opening (asks the server), the NUI focus, and forwarding deltas while it is open. */
	var Screen = class {
		isOpen = false;
		setupSent = false;
		setup() {
			if (this.setupSent) return;
			this.setupSent = true;
			send({
				action: "setup",
				data: {
					texts: loadLocaleTexts(),
					items: itemViews()
				}
			});
		}
		/** Asks the server for the second inventory (or a shop / bench) and opens the screen with it. */
		async open(target) {
			if (!state.player || IsPauseMenuActive() || IsEntityDead(PlayerPedId())) return;
			const raw = await triggerServerCallback(EVENTS.open, [target]).catch(() => null);
			const result = toResult(raw);
			if (!result.ok) return toast(result.error);
			if (typeof raw !== "object" || raw === null) return;
			this.show("other" in raw ? toView(raw.other) : null, "panel" in raw ? toPanel(raw.panel) : null);
		}
		/** Shows the screen with what the server already granted (an `open` answer or a script's force open). */
		show(other, panel) {
			if (!state.player) return;
			this.setup();
			state.otherId = other?.id ?? null;
			send({
				action: "player",
				data: state.player
			});
			send({
				action: "open",
				data: {
					other,
					shop: panel?.kind === "shop" ? shopView(panel.id) : null,
					bench: panel?.kind === "bench" ? benchView(panel.id) : null
				}
			});
			if (!this.isOpen) {
				SetNuiFocus(true, true);
				TriggerScreenblurFadeIn(250);
			}
			this.isOpen = true;
		}
		close() {
			if (!this.isOpen) return;
			this.isOpen = false;
			state.otherId = null;
			SetNuiFocus(false, false);
			TriggerScreenblurFadeOut(250);
			send({
				action: "close",
				data: null
			});
			emitNet(EVENTS.close);
		}
		/** The server took the second inventory away (drop emptied, out of reach). */
		otherClosed() {
			state.otherId = null;
			if (this.isOpen) send({
				action: "otherClosed",
				data: null
			});
		}
	};
	const screen = new Screen();
	on("onResourceStop", (resource) => {
		if (resource === GetCurrentResourceName() && screen.isOpen) TriggerScreenblurFadeOut(0);
	});
	state.onDelta((id, put, remove, maxWeight) => {
		if (screen.isOpen && (id === state.player?.id || id === state.otherId)) send({
			action: "delta",
			data: {
				id,
				put,
				remove,
				maxWeight
			}
		});
	});
	content.subscribe((file) => {
		if (file === "items") send({
			action: "items",
			data: itemViews()
		});
	});

// resource/client/weapons.ts
	const UNARMED = GetHashKey("WEAPON_UNARMED");
	const isObj$4 = (v) => typeof v === "object" && v !== null && !Array.isArray(v);
	function toWeapon(v) {
		if (!isObj$4(v) || typeof v.slot !== "number" || typeof v.name !== "string" || typeof v.ammo !== "number") return null;
		return {
			slot: v.slot,
			name: v.name,
			ammo: v.ammo,
			components: Array.isArray(v.components) ? v.components.filter((c) => typeof c === "string") : []
		};
	}
	/**
	* The weapon the server says the player holds: given to the ped with the stored ammo and attachments, ammo going down
	* reported twice a second while held. Weapons from anywhere else are taken away again.
	*/
	var ClientWeapons = class {
		current = null;
		hash = 0;
		reported = 0;
		timer = null;
		apply(weapon) {
			const ped = cache.ped;
			if (!weapon) return this.holster();
			const hash = GetHashKey(weapon.name.toUpperCase());
			if (this.current && this.hash !== hash) RemoveWeaponFromPed(ped, this.hash);
			if (this.hash !== hash || !HasPedGotWeapon(ped, hash, false)) GiveWeaponToPed(ped, hash, 0, false, true);
			SetPedAmmo(ped, hash, weapon.ammo);
			this.setComponents(hash, weapon.components);
			SetCurrentPedWeapon(ped, hash, true);
			this.current = weapon;
			this.hash = hash;
			this.reported = weapon.ammo;
			this.timer ??= setInterval(() => this.report(), 500);
		}
		holster() {
			if (this.current) RemoveWeaponFromPed(cache.ped, this.hash);
			SetCurrentPedWeapon(cache.ped, UNARMED, true);
			this.current = null;
			this.hash = 0;
			if (this.timer) clearInterval(this.timer);
			this.timer = null;
		}
		setComponents(hash, components) {
			for (const component of components) GiveWeaponComponentToPed(cache.ped, hash, GetHashKey(component));
			if (this.current) this.current.components = components;
		}
		/** Taking an attachment off removes it from the ped too. */
		syncComponents(components) {
			if (!this.current) return;
			for (const old of this.current.components) if (!components.includes(old)) RemoveWeaponComponentFromPed(cache.ped, this.hash, GetHashKey(old));
			this.setComponents(this.hash, components);
		}
		report() {
			if (!this.current) return;
			const ammo = GetAmmoInPedWeapon(cache.ped, this.hash);
			if (ammo >= this.reported) return;
			this.reported = ammo;
			emitNet(EVENTS.ammo, this.current.slot, ammo);
		}
		async reload() {
			if (!this.current || IsPedReloading(cache.ped)) return;
			const clip = GetMaxAmmoInClip(cache.ped, this.hash, true);
			const want = GetAmmoInPedWeapon(cache.ped, this.hash) + clip;
			const result = toResult(await triggerServerCallback(EVENTS.reload, [Math.min(1e3, want)]).catch(() => null));
			if (!result.ok) toast(result.error);
		}
		/** A weapon in hand the server did not give (pickups, other scripts) is taken away. */
		guard(weapon) {
			if (weapon === false || weapon === UNARMED || weapon === this.hash) return;
			RemoveWeaponFromPed(cache.ped, weapon);
		}
	};
	const weapons = new ClientWeapons();
	onServerEvent(EVENTS.weapon, { args: ([raw]) => [toWeapon(raw)] }, (weapon) => weapons.apply(weapon));
	onServerEvent(EVENTS.components, { args: ([raw]) => Array.isArray(raw) ? [raw.filter((c) => typeof c === "string")] : null }, (list) => weapons.syncComponents(list));
	onCache("weapon", (weapon) => weapons.guard(weapon));
	new Keybind({
		name: "inventory_reload",
		description: Locale("KEYBIND_RELOAD"),
		defaultKey: "R",
		onPressed: () => void weapons.reload()
	});

// resource/client/use.ts
	const ANIMS = {
		eat: {
			dict: "mp_player_inteat@burger",
			clip: "mp_player_int_eat_burger",
			flag: 49
		},
		drink: {
			dict: "mp_player_intdrink",
			clip: "loop_bottle",
			flag: 49
		},
		bandage: {
			dict: "missheistdockssetup1clipboard@idle_a",
			clip: "idle_a",
			flag: 49
		},
		armour: {
			dict: "clothingshirt",
			clip: "try_shirt_positive_d",
			flag: 49
		}
	};
	/** Uses a stack of the player's inventory (hotbar or screen); attachments send the hash the held weapon takes. */
	async function useItem(slot) {
		const stack = state.player?.stacks.find((s) => s.slot === slot);
		const def = stack ? content.items.get(stack.name) : void 0;
		if (!stack || !def) return;
		const weaponHash = weapons.current ? GetHashKey(weapons.current.name.toUpperCase()) : 0;
		const hash = def.component && weaponHash ? def.component.hashes.find((h) => DoesWeaponTakeWeaponComponent(weaponHash, GetHashKey(h))) : void 0;
		const result = toResult(await triggerServerCallback(EVENTS.use, [slot, hash]).catch(() => null));
		if (!result.ok) toast(result.error);
	}
	/** Plays the use animation with ai-core's progress bar (getting into a vehicle or dying cancels), then reports it. */
	async function play(use) {
		if (!await progress({
			label: Locale("UI_USING", content.items.get(use.name)?.label ?? use.name),
			duration: use.time,
			anim: ANIMS[use.anim]
		})) return void emitNet(EVENTS.cancelUse);
		const result = toResult(await triggerServerCallback(EVENTS.finishUse, [use.token]).catch(() => null));
		if (!result.ok) toast(result.error);
	}
	const isObj$3 = (v) => typeof v === "object" && v !== null && !Array.isArray(v);
	onServerEvent(EVENTS.startUse, { args: ([raw]) => isObj$3(raw) && typeof raw.token === "number" && typeof raw.name === "string" && typeof raw.time === "number" ? [{
		token: raw.token,
		name: raw.name,
		anim: typeof raw.anim === "string" ? raw.anim : "none",
		time: raw.time
	}] : null }, (use) => void play(use));

// resource/client/nuiActions.ts
	const isObj$2 = (v) => typeof v === "object" && v !== null && !Array.isArray(v);
	const int = (v) => typeof v === "number" && Number.isInteger(v) && v > 0 ? v : null;
	/** Sends one action to the server and answers the NUI with the result; the new state arrives as a delta. */
	async function call(name, args, cb) {
		const result = toResult(await triggerServerCallback(name, args).catch(() => null));
		if (!result.ok) toast(result.error);
		cb(result);
	}
	/** The closest other player within 3 m (server id), or null. */
	function closestPlayer() {
		const [x = 0, y = 0, z = 0] = GetEntityCoords(cache.ped, false);
		let best = null;
		let bestDistance = 3;
		for (const player of GetActivePlayers()) {
			if (player === cache.playerId) continue;
			const [px = 0, py = 0, pz = 0] = GetEntityCoords(GetPlayerPed(player), false);
			const distance = Math.hypot(px - x, py - y, pz - z);
			if (distance < bestDistance) {
				bestDistance = distance;
				best = GetPlayerServerId(player);
			}
		}
		return best;
	}
	RegisterNuiCallback(NUI.close, (_data, cb) => {
		screen.close();
		cb({ ok: true });
	});
	RegisterNuiCallback(NUI.move, (data, cb) => {
		const move = toMoveInput(data);
		if (!move) return cb({
			ok: false,
			error: "INV_ERR_GONE"
		});
		call(EVENTS.move, [move], cb);
	});
	RegisterNuiCallback(NUI.use, (data, cb) => {
		const slot = isObj$2(data) ? int(data.slot) : null;
		const stack = slot ? state.player?.stacks.find((s) => s.slot === slot) : void 0;
		if (!slot || !stack) return cb({
			ok: false,
			error: "INV_ERR_GONE"
		});
		if (content.items.get(stack.name)?.close) screen.close();
		useItem(slot);
		cb({ ok: true });
	});
	RegisterNuiCallback(NUI.give, (data, cb) => {
		const slot = isObj$2(data) ? int(data.slot) : null;
		const count = isObj$2(data) ? int(data.count) : null;
		const target = closestPlayer();
		if (!slot || !count) return cb({
			ok: false,
			error: "INV_ERR_GONE"
		});
		if (target === null) {
			toast("INV_ERR_NO_TARGET");
			return cb({
				ok: false,
				error: "INV_ERR_NO_TARGET"
			});
		}
		call(EVENTS.give, [
			slot,
			count,
			target
		], cb);
	});
	RegisterNuiCallback(NUI.drop, (data, cb) => {
		const from = isObj$2(data) && typeof data.from === "string" ? data.from : null;
		const slot = isObj$2(data) ? int(data.slot) : null;
		const count = isObj$2(data) ? int(data.count) : null;
		if (!from || !slot || !count) return cb({
			ok: false,
			error: "INV_ERR_GONE"
		});
		call(EVENTS.drop, [
			from,
			slot,
			count
		], cb);
	});
	RegisterNuiCallback(NUI.buy, (data, cb) => {
		if (!isObj$2(data) || typeof data.shop !== "string" || typeof data.name !== "string" || !int(data.count)) return cb({
			ok: false,
			error: "INV_ERR_GONE"
		});
		call(EVENTS.buy, [
			data.shop,
			data.name,
			data.count
		], cb);
	});
	RegisterNuiCallback(NUI.craft, (data, cb) => {
		if (!isObj$2(data) || typeof data.bench !== "string" || typeof data.index !== "number") return cb({
			ok: false,
			error: "INV_ERR_GONE"
		});
		call(EVENTS.craft, [data.bench, data.index], cb);
	});
	RegisterNuiCallback(NUI.detach, (data, cb) => {
		const slot = isObj$2(data) ? int(data.slot) : null;
		if (!slot || !isObj$2(data) || typeof data.hash !== "string") return cb({
			ok: false,
			error: "INV_ERR_GONE"
		});
		call(EVENTS.detach, [slot, data.hash], cb);
	});

// resource/client/drops.ts
	const MODEL = "prop_paper_bag_small";
	/** The bag prop exists only while the player is this close (local entity, not networked). */
	const SHOW_RANGE = 40;
	const isObj$1 = (v) => typeof v === "object" && v !== null && !Array.isArray(v);
	const toPoint = (v) => isObj$1(v) && typeof v.id === "string" && typeof v.x === "number" && typeof v.y === "number" && typeof v.z === "number" ? {
		id: v.id,
		x: v.x,
		y: v.y,
		z: v.z
	} : null;
	/**
	* Drops on this client: two zones each (a wide one that spawns a local bag prop, a small one with ai-core's prompt),
	* from the server's snapshot and put / remove events. Nothing runs per frame.
	*/
	var Drops = class {
		points = /* @__PURE__ */ new Map();
		props = /* @__PURE__ */ new Map();
		zones = new Zones();
		set(list) {
			for (const id of this.points.keys()) this.remove(id);
			for (const point of list) this.put(point);
		}
		put(point) {
			this.points.set(point.id, point);
			const center = {
				x: point.x,
				y: point.y,
				z: point.z
			};
			this.zones.add(`${point.id}:show`, {
				shape: {
					type: "sphere",
					center,
					radius: SHOW_RANGE
				},
				interval: 1e3,
				onEnter: () => void this.spawn(point),
				onExit: () => this.despawn(point.id)
			});
			this.zones.add(`${point.id}:use`, {
				shape: {
					type: "sphere",
					center,
					radius: 1.5
				},
				interval: 250,
				onEnter: () => showPrompt(point.id, Locale("PROMPT_DROP")),
				onExit: () => hidePrompt(point.id)
			});
		}
		remove(id) {
			this.points.delete(id);
			this.zones.remove(`${id}:show`);
			this.zones.remove(`${id}:use`);
			this.despawn(id);
			hidePrompt(id);
		}
		/** The id of the closest drop within `range` metres. */
		nearest(range) {
			const [x = 0, y = 0, z = 0] = GetEntityCoords(cache.ped, false);
			let best = null;
			let bestDistance = range;
			for (const point of this.points.values()) {
				const distance = Math.hypot(point.x - x, point.y - y, point.z - z);
				if (distance < bestDistance) [best, bestDistance] = [point.id, distance];
			}
			return best;
		}
		async spawn(point) {
			if (this.props.has(point.id)) return;
			const model = await requestModel(MODEL);
			if (!this.points.has(point.id) || this.props.has(point.id)) return;
			const prop = CreateObjectNoOffset(model, point.x, point.y, point.z, false, false, false);
			PlaceObjectOnGroundProperly(prop);
			FreezeEntityPosition(prop, true);
			SetEntityCollision(prop, false, false);
			SetModelAsNoLongerNeeded(model);
			this.props.set(point.id, prop);
		}
		despawn(id) {
			const prop = this.props.get(id);
			if (prop) DeleteEntity(prop);
			this.props.delete(id);
		}
		cleanup() {
			for (const id of this.props.keys()) this.despawn(id);
		}
	};
	const drops = new Drops();
	onServerEvent(EVENTS.drops, { args: ([raw]) => Array.isArray(raw) ? [raw.map(toPoint).filter((p) => p !== null)] : null }, (list) => drops.set(list));
	onServerEvent(EVENTS.dropPut, { args: ([raw]) => {
		const p = toPoint(raw);
		return p ? [p] : null;
	} }, (point) => drops.put(point));
	onServerEvent(EVENTS.dropRemove, { args: ([id]) => typeof id === "string" ? [id] : null }, (id) => drops.remove(id));
	onPromptPressed((id) => {
		if (id.startsWith("drop:")) screen.open({
			kind: "drop",
			id
		});
	});
	on("onResourceStop", (resource) => {
		if (resource === GetCurrentResourceName()) drops.cleanup();
	});

// resource/client/places.ts
	const PROMPT = {
		shop: "PROMPT_SHOP",
		stash: "PROMPT_STASH",
		bench: "PROMPT_BENCH"
	};
	const BLIP_TEXT = "AIINV_BLIP_SHOP";
	/**
	* Shops, stashes and crafting benches from the panel: a sphere zone each (checked twice a second) showing ai-core's
	* prompt, and a map blip for shops that want one. Rebuilt when the panel changes them.
	*/
	var Places = class {
		zones = new Zones();
		blips = [];
		rebuild() {
			this.zones.clear();
			for (const blip of this.blips) RemoveBlip(blip);
			this.blips = [];
			for (const shop of content.shops.values()) {
				this.add("shop", shop);
				if (shop.blip) this.blips.push(this.blip(shop));
			}
			for (const stash of content.stashes.values()) this.add("stash", stash);
			for (const bench of content.benches.values()) this.add("bench", bench);
		}
		add(kind, place) {
			const id = `${kind}:${place.id}`;
			this.zones.add(id, {
				shape: {
					type: "sphere",
					center: {
						x: place.x,
						y: place.y,
						z: place.z
					},
					radius: place.radius
				},
				interval: 500,
				onEnter: () => showPrompt(id, Locale(PROMPT[kind], place.label)),
				onExit: () => hidePrompt(id)
			});
		}
		blip(place) {
			const blip = AddBlipForCoord(place.x, place.y, place.z);
			SetBlipSprite(blip, 52);
			SetBlipColour(blip, 2);
			SetBlipScale(blip, .7);
			SetBlipAsShortRange(blip, true);
			BeginTextCommandSetBlipName(BLIP_TEXT);
			AddTextComponentSubstringPlayerName(place.label);
			EndTextCommandSetBlipName(blip);
			return blip;
		}
	};
	AddTextEntry(BLIP_TEXT, "~a~");
	const places = new Places();
	places.rebuild();
	content.subscribe((file) => {
		if (file === "shops" || file === "stashes" || file === "benches") places.rebuild();
	});
	onPromptPressed((id) => {
		const [kind, key] = id.split(":");
		if (!key) return;
		if (kind === "shop" || kind === "stash" || kind === "bench") screen.open({
			kind,
			id: key
		});
	});

// resource/client/open.ts
/** How close to a vehicle's back the trunk opens. */
	const TRUNK_REACH = 1.6;
	/** The networked vehicle whose back the player stands at, or null. */
	function trunkInReach() {
		const [x = 0, y = 0, z = 0] = GetEntityCoords(cache.ped, false);
		for (const vehicle of GetGamePool("CVehicle")) {
			const [vx = 0, vy = 0, vz = 0] = GetEntityCoords(vehicle, false);
			if (Math.hypot(vx - x, vy - y, vz - z) > 8 || !NetworkGetEntityIsNetworked(vehicle)) continue;
			const [min] = GetModelDimensions(GetEntityModel(vehicle));
			const [bx = 0, by = 0, bz = 0] = GetOffsetFromEntityInWorldCoords(vehicle, 0, (min?.[1] ?? -2) - .4, 0);
			if (Math.hypot(bx - x, by - y, bz - z) <= TRUNK_REACH) return vehicle;
		}
		return null;
	}
	/** What the inventory key opens next to the player's own: glovebox, a drop, a trunk, or nothing. */
	function contextTarget() {
		if (cache.vehicle !== false) return { kind: "glovebox" };
		const drop = drops.nearest(2);
		if (drop) return {
			kind: "drop",
			id: drop
		};
		const vehicle = trunkInReach();
		if (vehicle && GetVehicleDoorLockStatus(vehicle) < 2) return {
			kind: "trunk",
			netId: NetworkGetNetworkIdFromEntity(vehicle)
		};
		return { kind: "self" };
	}
	new Keybind({
		name: "inventory_open",
		description: Locale("KEYBIND_OPEN"),
		defaultKey: "TAB",
		onPressed: () => {
			if (screen.isOpen) return screen.close();
			screen.open(contextTarget());
		}
	});
	/** Keys 1-5 use whatever covers the first five cells of the top row. */
	for (let i = 1; i <= 5; i++) new Keybind({
		name: `inventory_hotbar_${i}`,
		description: Locale("KEYBIND_HOTBAR", i),
		defaultKey: String(i),
		onPressed: () => {
			if (screen.isOpen || IsPauseMenuActive()) return;
			const stack = state.stackAtCell(i - 1);
			if (stack) useItem(stack.slot);
		}
	});
	onServerEvent(EVENTS.forceOpen, { args: ([view, panel]) => [view == null ? null : toView(view), panel == null ? null : toPanel(panel)] }, (view, panel) => screen.show(view, panel));
	onServerEvent(EVENTS.forceClose, () => screen.otherClosed());

// resource/client/exports.ts
/** Client exports: own names, ox_inventory's and qb-inventory's (the common read-only ones and open / close). */
	const isObj = (v) => typeof v === "object" && v !== null && !Array.isArray(v);
	function itemView(name) {
		const def = content.items.get(name);
		return def ? {
			name: def.name,
			label: def.label,
			weight: def.weight,
			stack: def.stack > 1,
			close: def.close,
			description: def.description
		} : null;
	}
	const playerItems = () => (state.player?.stacks ?? []).map((s) => ({
		...itemView(s.name),
		name: s.name,
		slot: s.slot,
		count: s.count,
		amount: s.count,
		metadata: s.metadata,
		info: s.metadata
	}));
	function search(kind, items) {
		const names = Array.isArray(items) ? items : [items];
		const one = (name) => {
			const def = content.items.get(name);
			if (!def) return kind === "count" ? 0 : [];
			return kind === "count" ? state.count(def.name) : playerItems().filter((s) => s.name === def.name);
		};
		return names.length === 1 ? one(names[0]) : Object.fromEntries(names.map((n) => [String(n), one(n)]));
	}
	function hasItem(items, amount) {
		const need = typeof amount === "number" && amount > 0 ? amount : 1;
		if (typeof items === "string") return state.count(items) >= need;
		if (Array.isArray(items)) return items.every((n) => typeof n === "string" && state.count(n) >= need);
		if (isObj(items)) return Object.entries(items).every(([n, c]) => state.count(n) >= (typeof c === "number" ? c : 1));
		return false;
	}
	function openInventory(type, data) {
		const id = isObj(data) ? String(data.id ?? data.type ?? "") : String(data ?? "");
		if (type === "stash" || type === "shop") screen.open({
			kind: type,
			id
		});
		else if (type === "drop") screen.open({
			kind: "drop",
			id
		});
		else screen.open({ kind: "self" });
	}
	const ox = {
		openInventory: (type, data) => openInventory(type, data),
		closeInventory: () => screen.close(),
		Search: (kind, items) => search(kind, items),
		GetItemCount: (item) => typeof item === "string" ? state.count(item) : 0,
		GetPlayerItems: () => playerItems(),
		GetPlayerWeight: () => state.weight(),
		GetPlayerMaxWeight: () => state.player?.maxWeight ?? 0,
		Items: (name) => typeof name === "string" ? itemView(name) : Object.fromEntries([...content.items.byName.keys()].map((k) => [k, itemView(k)])),
		useSlot: (slot) => typeof slot === "number" ? void useItem(slot) : void 0,
		getCurrentWeapon: () => weapons.current,
		GetCurrentWeapon: () => weapons.current,
		displayMetadata: () => void 0,
		weaponWheel: () => void 0,
		setStashTarget: () => void 0
	};
	for (const [name, fn] of Object.entries(ox)) provideExport("ox_inventory", name, fn);
	const qb = {
		HasItem: (items, amount) => hasItem(items, amount),
		CloseInventory: () => screen.close()
	};
	for (const [name, fn] of Object.entries(qb)) provideExport("qb-inventory", name, fn);
	registerExport("OpenInventory", (type, data) => openInventory(type, data));
	registerExport("CloseInventory", () => screen.close());
	registerExport("OpenSelf", () => void screen.open({ kind: "self" }));
	registerExport("GetItemCount", (item) => typeof item === "string" ? state.count(item) : 0);
	registerExport("HasItem", (items, amount) => hasItem(items, amount));
	registerExport("GetPlayerItems", () => playerItems());

// resource/client/index.ts
	on(CORE.clientPlayerUnloadedEvent, () => {
		screen.close();
		weapons.holster();
	});
	onServerEvent("ai-core:client:openCharacters", () => screen.close());

})();
}catch(e){globalThis.__aicoreReportError&&globalThis.__aicoreReportError("load: "+(e&&e.stack||e));throw e}
