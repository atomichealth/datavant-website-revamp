//#region node_modules/@vgpu/core/dist/errors.js
var e = class extends Error {
	code;
	severity;
	fix;
	where;
	cause;
	detail;
	constructor(e) {
		super(e.message, { cause: e.cause }), this.name = "VGPUError", this.code = e.code, this.severity = e.severity ?? "error", this.fix = e.fix, this.where = e.where, this.cause = e.cause, this.detail = e.detail;
	}
}, t = class extends e {
	constructor(e) {
		super({
			...e,
			severity: "error"
		}), this.name = "ValidationError";
	}
};
function n(t) {
	return new e({
		code: "VGPU-FEATURE-UNSUPPORTED",
		message: `Adapter does not support requested feature(s): ${t.map((e) => `"${e}"`).join(", ")}.`,
		fix: "Remove the unsupported name(s) from init({ requiredFeatures: [...] }) or run on an adapter that supports them; gate optional code paths on device.features after init.",
		where: "init"
	});
}
function r(e, t) {
	if (!e) return;
	let r = (t ?? []).filter((t) => !e.has(t));
	if (r.length) throw n(r);
}
//#endregion
//#region node_modules/@vgpu/core/dist/gpu-constants.js
var i = {
	map_read: 1,
	map_write: 2,
	copy_src: 4,
	copy_dst: 8,
	index: 16,
	vertex: 32,
	uniform: 64,
	storage: 128,
	indirect: 256,
	query_resolve: 512
};
function a(e) {
	let t = globalThis.GPUBufferUsage;
	return e.reduce((e, n) => e | o(n, t), 0);
}
function o(e, t) {
	let n = e.toUpperCase();
	return t?.[n] ?? i[e];
}
function s() {
	return globalThis.GPUMapMode?.READ ?? 1;
}
var c = {
	copy_src: 1,
	copy_dst: 2,
	texture_binding: 4,
	storage_binding: 8,
	render_attachment: 16
};
function l(e) {
	let t = globalThis.GPUTextureUsage;
	return e.reduce((e, n) => e | u(n, t), 0);
}
function u(e, t) {
	let n = e.toUpperCase();
	return t?.[n] ?? c[e];
}
//#endregion
//#region node_modules/@vgpu/core/dist/mock-gpu-storage.js
function d(e) {
	return "__vgpuMockBytes" in e;
}
function f(e) {
	return "__vgpuMockBytes" in e;
}
//#endregion
//#region node_modules/@vgpu/core/dist/resource-lifecycle.js
var p = 1;
function m(e) {
	return Object.freeze({
		kind: e,
		id: p++
	});
}
var h = class {
	callbacks = /* @__PURE__ */ new Set();
	destroyed = !1;
	onDestroy(e, t) {
		return this.destroyed ? (t(e), () => void 0) : (this.callbacks.add(t), () => {
			this.callbacks.delete(t);
		});
	}
	emit(e) {
		if (this.destroyed) return !1;
		this.destroyed = !0;
		let t = [...this.callbacks];
		this.callbacks.clear();
		let n = [];
		for (let r of t) try {
			r(e);
		} catch (e) {
			n.push(e);
		}
		if (n.length) throw n[0];
		return !0;
	}
}, g = class {
	device;
	gpu;
	options;
	ownership;
	destroySignal = new h();
	identity = m("buffer");
	destroyed = !1;
	constructor(e, t, n, r = "owned") {
		this.device = e, this.gpu = t, this.options = n, this.ownership = r, Object.defineProperty(this, "assertUsable", { value: (e, t) => this.#e(e, t) });
	}
	get resourceIdentity() {
		return this.identity;
	}
	onDestroy(e) {
		return this.destroySignal.onDestroy(this, e);
	}
	#e(e = "Buffer", n) {
		if (n && n.gpu !== this.device.gpu) throw new t({
			code: "VGPU-BUFFER-DEVICE-MISMATCH",
			message: "Buffer belongs to a different GPU device.",
			where: e
		});
		if (this.destroyed) throw new t({
			code: "VGPU-BUFFER-DISPOSED",
			message: "Buffer is destroyed.",
			where: e,
			fix: "Wrap or create a live GPUBuffer before using it."
		});
		this.device.assertUsable(e);
	}
	write(e, t = 0) {
		this.#e("Buffer.write"), this.ownership === "external" && this.validateExternalOperation("write", t, e.byteLength, "copy_dst");
		try {
			this.device.queue.writeBuffer(this.gpu, t, e);
		} catch (e) {
			throw this.ownership === "external" ? _("Buffer.write", "The external GPUBuffer rejected the write operation.", e) : e;
		}
	}
	async read(e, n = 0) {
		this.#e("Buffer.read"), this.ownership === "external" && this.validateExternalOperation("read", n, e, "copy_src");
		try {
			let t = await this.device.readback.read(this.gpu, e, n);
			return this.#e("Buffer.read"), t;
		} catch (e) {
			throw e instanceof t || this.ownership !== "external" ? e : _("Buffer.read", "The external GPUBuffer rejected the read operation.", e);
		}
	}
	destroy() {
		this.destroyed || (this.destroyed = !0, this.destroySignal.emit(this), this.ownership === "owned" && !d(this.gpu) && this.gpu.destroy());
	}
	dispose() {
		this.destroy();
	}
	validateExternalOperation(e, t, n, r) {
		if (!(Number.isSafeInteger(t) && t >= 0 && t % 4 == 0 && Number.isSafeInteger(n) && n >= 0 && n % 4 == 0 && t <= this.options.size && n <= this.options.size - t)) throw _(`Buffer.${e}`, "External buffer offsets and lengths must be non-negative, 4-byte aligned, and within the buffer size.");
		if ((this.gpu.usage & a([r])) === 0) throw _(`Buffer.${e}`, `External buffer is missing ${r.toUpperCase()} usage.`);
	}
};
function _(e, n, r) {
	return new t({
		code: "VGPU-EXTERNAL-BUFFER-VALIDATION",
		message: n,
		where: e,
		cause: r,
		fix: "Use a buffer with the required usage flags and an aligned in-range operation."
	});
}
//#endregion
//#region node_modules/@vgpu/wgsl/dist/compile.js
function ee(e) {
	if (ie(e)) throw ae();
	let t = {
		version: 1,
		mappings: []
	}, n = {
		version: 1,
		modules: [{
			path: "<runtime>",
			text: e
		}],
		diagnostics: [],
		sourceMap: t,
		cacheKey: v(e)
	};
	return {
		kind: "wgsl",
		wgsl: e,
		source: {
			text: e,
			path: "<runtime>",
			imports: []
		},
		ast: n,
		sourceMap: t,
		diagnostics: [],
		cacheKey: n.cacheKey,
		entryPoints: te(e),
		stats: {
			lines: e.split(/\r?\n/).length,
			bytes: new TextEncoder().encode(e).byteLength,
			bindGroups: 0
		}
	};
}
function v(e) {
	let t = 2166136261;
	for (let n = 0; n < e.length; n++) t = Math.imul(t ^ e.charCodeAt(n), 16777619);
	return { default: `vgpu-wgsl-1:${(t >>> 0).toString(16).padStart(8, "0")}` };
}
function te(e) {
	let t = [], n = b(e);
	for (let e = n(); e !== void 0; e = n()) {
		let r = !1;
		for (; e === "@";) if (/^(vertex|fragment|compute)$/.test(n()) && (r = !0), e = n(), e === "(") {
			if (!ne(n)) return t;
			e = n();
		}
		if (e === "fn") {
			let i = n();
			e = n(), r && e === "(" && i && y.test(i) && t.push(i);
		}
		re(n, e);
	}
	return t;
}
var y = /[_\p{XID_Start}]\p{XIDC}*/uy;
function b(e) {
	let t = 0;
	return () => {
		for (; t < e.length;) {
			let n = t;
			if (/\p{Pat_WS}/u.test(e[n])) {
				t++;
				continue;
			}
			if (e.startsWith("//", n)) {
				for (; t < e.length && !/[\n-\r\u0085\u2028\u2029]/.test(e[t]);) t++;
				continue;
			}
			if (e.startsWith("/*", n)) {
				t += 2;
				let n = 1;
				for (; t < e.length && n > 0;) e.startsWith("/*", t) ? (n++, t += 2) : e.startsWith("*/", t) ? (n--, t += 2) : t++;
				continue;
			}
			y.lastIndex = n;
			let r = y.exec(e);
			return r ? (t = y.lastIndex, r[0]) : (t++, e[n]);
		}
	};
}
function ne(e) {
	let t = 1;
	for (let n = e(); n !== void 0; n = e()) if (n === "(") t++;
	else if (n === ")" && --t === 0) return !0;
	return !1;
}
function re(e, t) {
	let n = 0;
	for (let r = t; r !== void 0; r = e()) if (r === "{") n++;
	else if (r === "}" && n > 0 && --n === 0) return;
	else if (r === ";" && n === 0) return;
}
function ie(e) {
	let t = e.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "").trimStart();
	return t.startsWith("import ") || t.startsWith("import{");
}
function ae() {
	let e = /* @__PURE__ */ Error("Runtime WGSL strings cannot contain import statements. Use a build-time loader or @vgpu/wgsl/runtime.");
	return e.name = "VGPUWGSLRuntimeImportError", e.code = "VGPU-WGSL-RUNTIME-IMPORT", e.severity = "error", e.source = "wgsl", e;
}
//#endregion
//#region node_modules/@vgpu/core/dist/texture-read-selection.js
function oe(e, t) {
	let n = 2 ** t;
	return [
		Math.max(1, Math.floor(e.width / n)),
		Math.max(1, Math.floor(e.height / n)),
		e.dimension === "3d" ? Math.max(1, Math.floor(e.depthOrArrayLayers / n)) : e.depthOrArrayLayers
	];
}
function se(e, n, r) {
	let i = (e) => {
		throw new t({
			code: "VGPU-CORE-TEXTURE-READ-INVALID",
			where: r,
			message: e,
			fix: "Select an allocated mip and an in-bounds region on a single-sample texture with usage \"copy_src\"."
		});
	};
	(!n || !Number.isSafeInteger(n.mipLevel) || n.mipLevel < 0 || n.mipLevel >= e.mipLevelCount) && i("mipLevel must select an allocated mip using a nonnegative safe integer."), e.sampleCount !== 1 && i("Texture readback requires sampleCount 1; resolve multisampled textures explicitly before reading."), e.usage & l(["copy_src"]) || i("Texture readback requires explicit \"copy_src\" usage.");
	let a = oe(e, n.mipLevel), o = n.region === "all" ? [
		0,
		0,
		0
	] : n.region?.origin, s = n.region === "all" ? a : n.region?.size;
	(!Array.isArray(o) || o.length !== 3 || !Array.isArray(s) || s.length !== 3) && i("region must be \"all\" or contain origin and size triples.");
	for (let e = 0; e < 3; e++) {
		let t = o[e], r = s[e];
		(!Number.isSafeInteger(t) || t < 0 || !Number.isSafeInteger(r) || r <= 0 || t > a[e] || r > a[e] - t) && i(`Read region axis ${e} is outside mip ${n.mipLevel} extent [${a}].`);
	}
	return {
		mipLevel: n.mipLevel,
		origin: [...o],
		size: [...s],
		extent: a
	};
}
function ce(e, n, r) {
	let i = Math.min(n ?? 4294967295, 4294967295);
	if (!Number.isSafeInteger(e) || e <= 0 || e > i) throw new t({
		code: "VGPU-CORE-TEXTURE-READ-INVALID",
		where: r,
		message: `Readback allocation of ${e} bytes exceeds the supported limit (${i}).`,
		fix: "Read a smaller region or a higher mip level."
	});
}
//#endregion
//#region node_modules/@vgpu/core/dist/readback.js
var le = a(["copy_dst", "map_read"]), ue = class {
	device;
	constructor(e) {
		this.device = e;
	}
	async read(e, t, n) {
		if (d(e)) return e.__vgpuMockBytes.slice(n, n + t).buffer;
		let r = this.device.createBuffer({
			size: t,
			usage: le
		});
		try {
			let i = this.device.createCommandEncoder();
			i.copyBufferToBuffer(e, n, r, 0, t), this.device.queue.submit([i.finish()]), await r.mapAsync(s());
			let a = r.getMappedRange().slice(0);
			return de(r), a;
		} finally {
			fe(r);
		}
	}
	async readTexture(e, t) {
		let n = he(e.format, "Readback.readTexture"), r = se(e, t, "Readback.readTexture"), [i, a, o] = r.size, c = n.bytesPerPixel, l = pe(i * c, 256), u = l * a * o;
		if (ce(u, this.device.limits?.maxBufferSize, "Readback.readTexture"), f(e)) {
			let t = e.__vgpuMockMips?.[r.mipLevel] ?? (r.mipLevel === 0 ? e.__vgpuMockBytes : void 0);
			if (!t) throw Error("Mock texture has no storage for the selected mip.");
			return ve(t, r, n);
		}
		let d = this.device.createBuffer({
			size: u,
			usage: le
		}), p;
		try {
			let t = this.device.createCommandEncoder();
			t.copyTextureToBuffer({
				texture: e,
				mipLevel: r.mipLevel,
				origin: r.origin
			}, {
				buffer: d,
				bytesPerRow: l,
				rowsPerImage: a
			}, {
				width: i,
				height: a,
				depthOrArrayLayers: o
			}), this.device.queue.submit([t.finish()]), await d.mapAsync(s());
			let n = new Uint8Array(d.getMappedRange());
			p = new Uint8Array(i * a * o * c);
			for (let e = 0; e < a * o; e++) {
				let t = e * l, r = e * i * c;
				p.set(n.subarray(t, t + i * c), r);
			}
			de(d);
		} finally {
			fe(d);
		}
		return n.swizzle === "bgra-to-rgba" && ye(p), p;
	}
	destroy() {}
};
function de(e) {
	try {
		e.unmap();
	} catch {}
}
function fe(e) {
	try {
		e.destroy();
	} catch {}
}
function pe(e, t) {
	return Math.ceil(e / t) * t;
}
var me = {
	r8unorm: {
		bytesPerPixel: 1,
		components: 1,
		componentType: "unorm8"
	},
	rg8unorm: {
		bytesPerPixel: 2,
		components: 2,
		componentType: "unorm8"
	},
	rgba8unorm: {
		bytesPerPixel: 4,
		components: 4,
		componentType: "unorm8"
	},
	"rgba8unorm-srgb": {
		bytesPerPixel: 4,
		components: 4,
		componentType: "unorm8"
	},
	bgra8unorm: {
		bytesPerPixel: 4,
		components: 4,
		componentType: "unorm8",
		swizzle: "bgra-to-rgba"
	},
	"bgra8unorm-srgb": {
		bytesPerPixel: 4,
		components: 4,
		componentType: "unorm8",
		swizzle: "bgra-to-rgba"
	},
	r16float: {
		bytesPerPixel: 2,
		components: 1,
		componentType: "float16"
	},
	rg16float: {
		bytesPerPixel: 4,
		components: 2,
		componentType: "float16"
	},
	rgba16float: {
		bytesPerPixel: 8,
		components: 4,
		componentType: "float16"
	},
	r32float: {
		bytesPerPixel: 4,
		components: 1,
		componentType: "float32"
	},
	rg32float: {
		bytesPerPixel: 8,
		components: 2,
		componentType: "float32"
	},
	rgba32float: {
		bytesPerPixel: 16,
		components: 4,
		componentType: "float32"
	}
};
function he(e, n) {
	let r = me[e];
	if (r) return r;
	throw new t({
		code: "VGPU-CORE-UNSUPPORTED-FORMAT",
		message: `Texture.read does not support format ${e}. Supported formats: ${Object.keys(me).join(", ")}.`,
		where: n
	});
}
function ge(e, t, n = "Texture.readFloats") {
	let r = he(t, n), i = r.bytesPerPixel / r.components, a = Math.floor(e.byteLength / i), o = new Float32Array(a), s = new DataView(e.buffer, e.byteOffset, e.byteLength);
	for (let e = 0; e < a; e++) r.componentType === "unorm8" ? o[e] = s.getUint8(e) / 255 : r.componentType === "float16" ? o[e] = _e(s.getUint16(e * 2, !0)) : o[e] = s.getFloat32(e * 4, !0);
	return o;
}
function _e(e) {
	let t = e & 32768 ? -1 : 1, n = e >> 10 & 31, r = e & 1023;
	return n === 0 ? t * r * 2 ** -24 : n === 31 ? r === 0 ? t * Infinity : NaN : t * (r + 1024) * 2 ** (n - 25);
}
function ve(e, t, n) {
	let { size: [r, i, a], origin: [o, s, c], extent: l } = t, u = r * n.bytesPerPixel, d = new Uint8Array(u * i * a);
	for (let t = 0; t < a; t++) for (let r = 0; r < i; r++) {
		let a = (((c + t) * l[1] + s + r) * l[0] + o) * n.bytesPerPixel;
		d.set(e.subarray(a, a + u), (t * i + r) * u);
	}
	return n.swizzle === "bgra-to-rgba" && ye(d), d;
}
function ye(e) {
	for (let t = 0; t < e.length; t += 4) {
		let n = e[t];
		e[t] = e[t + 2], e[t + 2] = n;
	}
}
//#endregion
//#region node_modules/@vgpu/core/dist/mock-gpu.js
function be(e) {
	return {
		size: e,
		usage: a(["copy_src", "copy_dst"])
	};
}
//#endregion
//#region node_modules/@vgpu/core/dist/queue.js
var xe = class {
	gpu;
	guard;
	constructor(e, t = () => void 0) {
		this.gpu = e, this.guard = t;
	}
	writeBuffer(e, t, n) {
		this.guard("Queue.writeBuffer"), this.gpu.writeBuffer(e, t, n);
	}
	async flush() {
		this.guard("Queue.flush"), await this.gpu.onSubmittedWorkDone?.(), this.guard("Queue.flush");
	}
}, Se = class {
	gpu;
	resolved;
	constructor(e, t) {
		this.gpu = e, this.resolved = t;
	}
	dispose() {}
	get kind() {
		return this.resolved.kind;
	}
	get source() {
		return this.resolved.source;
	}
	get code() {
		return this.resolved.wgsl;
	}
	get entryPoints() {
		return this.resolved.entryPoints;
	}
	get stats() {
		return this.resolved.stats;
	}
}, Ce = /* @__PURE__ */ new Set([
	"copy_src",
	"copy_dst",
	"texture_binding",
	"storage_binding",
	"render_attachment"
]), we = /* @__PURE__ */ new Set([
	"rgba8unorm",
	"rgba8snorm",
	"rgba8uint",
	"rgba8sint",
	"rgba16float",
	"rgba16uint",
	"rgba16sint",
	"rgba32float",
	"rgba32uint",
	"rgba32sint",
	"r32float",
	"r32uint",
	"r32sint",
	"rg32float",
	"rg32uint",
	"rg32sint"
]), Te = /* @__PURE__ */ new Set([
	"r8unorm",
	"r8snorm",
	"r8uint",
	"r8sint",
	"rg8unorm",
	"rg8snorm",
	"rg8uint",
	"rg8sint",
	"r16uint",
	"r16sint",
	"r16float",
	"rg16uint",
	"rg16sint",
	"rg16float",
	"rgb10a2uint",
	"rgb10a2unorm",
	"rg11b10ufloat",
	"r16unorm",
	"r16snorm",
	"rg16unorm",
	"rg16snorm",
	"rgba16unorm",
	"rgba16snorm"
]);
function Ee(e) {
	return Object.freeze({
		...e,
		size: Object.freeze([...e.size]),
		usage: Object.freeze([...e.usage]),
		...e.viewFormats === void 0 ? {} : { viewFormats: Object.freeze([...e.viewFormats]) }
	});
}
function De(e) {
	return [
		e.size[0],
		e.kind === "1d" ? 1 : e.size[1],
		e.kind === "2d-array" ? e.layers : e.kind === "3d" ? e.size[2] : 1
	];
}
function Oe(e, n) {
	let r = (e, n, r) => {
		throw new t({
			code: e,
			message: n,
			fix: r,
			where: "Device.createTexture"
		});
	};
	(!e || ![
		"1d",
		"2d",
		"3d",
		"2d-array"
	].includes(e.kind)) && r("VGPU-TEXTURE-KIND-REQUIRED", "Texture kind must be explicit.", "Pass kind: \"1d\", \"2d\", \"3d\", or \"2d-array\"."), "dimension" in e && r("VGPU-TEXTURE-KIND-REQUIRED", "Texture dimension has been replaced by kind.", "Use kind and, for \"2d-array\", a separate layers count.");
	let i = e.kind === "1d" ? 1 : e.kind === "3d" ? 3 : 2;
	(!Array.isArray(e.size) || e.size.length !== i || !Array.from(e.size).every(ke)) && r("VGPU-TEXTURE-SIZE-REQUIRED", `Texture ${e.kind} needs ${i} positive integer spatial dimensions.`, "Pass size with exactly the spatial dimensions of kind; put array layers in layers."), (e.kind === "2d-array" ? !ke(e.layers) : e.layers !== void 0) && r("VGPU-TEXTURE-LAYERS-INVALID", "Only 2d-array textures take a positive integer layers count.", "Use kind: \"2d-array\", size: [width, height], layers: count."), (!Array.isArray(e.usage) || e.usage.length === 0 || !Array.from(e.usage).every((e) => Ce.has(e))) && r("VGPU-TEXTURE-USAGE-REQUIRED", "Texture usage must be a nonempty list of known capabilities.", "Pass explicit usage, such as [\"texture_binding\", \"copy_dst\"]. No capabilities are added automatically."), (typeof e.format != "string" || !e.format) && r("VGPU-TEXTURE-FORMAT-REQUIRED", "Texture format is required.", "Pass an explicit GPUTextureFormat, such as \"rgba16float\".");
	let a = e.mipLevelCount ?? 1, o = e.kind === "1d" ? 1 : Math.floor(Math.log2(Math.max(...e.size))) + 1;
	(!ke(a) || a > o) && r("VGPU-TEXTURE-MIPS-INVALID", `mipLevelCount must be between 1 and ${o}.`, "Omit mipLevelCount for the base level, or request a valid allocation count. Contents are not generated automatically.");
	let s = e.sampleCount ?? 1;
	s !== 1 && s !== 4 && r("VGPU-TEXTURE-SAMPLES-INVALID", "sampleCount must be 1 or 4.", "Omit sampleCount for single-sample storage."), s === 4 && (e.kind !== "2d" || a !== 1 || !e.usage.includes("render_attachment") || e.usage.includes("storage_binding")) && r("VGPU-TEXTURE-SAMPLES-INVALID", "MSAA requires a 2d render attachment with one mip and no storage_binding.", "Use a single-sample texture for storage, arrays or volumes; resolve MSAA into a separate texture."), e.kind === "1d" && (e.usage.includes("render_attachment") || /^(depth|stencil|bc|etc2|eac|astc)/.test(e.format)) && r("VGPU-TEXTURE-KIND-INVALID", "1d textures cannot be render attachments or use depth/stencil/compressed formats.", "Use a 2d texture or a plain color format with non-attachment usage.");
	let c = De(e), l = e.kind === "1d" ? "maxTextureDimension1D" : e.kind === "3d" ? "maxTextureDimension3D" : "maxTextureDimension2D", u = n.limits?.[l];
	(u !== void 0 && e.size.some((e) => e > u) || e.kind === "2d-array" && n.limits?.maxTextureArrayLayers !== void 0 && c[2] > n.limits.maxTextureArrayLayers) && r("VGPU-TEXTURE-LIMIT", "Texture dimensions or layers exceed enabled device limits.", "Reduce the allocation or request sufficient limits when initializing the device.");
	let d = (e) => n.features?.has(e) ?? !1;
	e.usage.includes("storage_binding") && !we.has(e.format) && !(e.format === "bgra8unorm" && d("bgra8unorm-storage")) && !(Te.has(e.format) && d("texture-formats-tier1")) && r("VGPU-TEXTURE-STORAGE-FORMAT", `Format ${e.format} does not support storage_binding with the enabled features.`, "Choose a supported storage format, enable the required format feature, or explicitly omit storage_binding from usage."), e.viewFormats !== void 0 && (!Array.isArray(e.viewFormats) || !Array.from(e.viewFormats).every((t) => typeof t == "string" && t.replace(/-srgb$/, "") === e.format.replace(/-srgb$/, ""))) && r("VGPU-TEXTURE-VIEW-FORMAT", "viewFormats must list formats compatible with the texture format.", "Only the same format or its compatible linear/sRGB counterpart is allowed; native device restrictions also apply.");
}
function ke(e) {
	return typeof e == "number" && Number.isSafeInteger(e) && e > 0;
}
//#endregion
//#region node_modules/@vgpu/core/dist/texture.js
var Ae = Symbol.for("vgpu/Texture"), x = class {
	device;
	ownership;
	[Ae] = !0;
	destroySignal = new h();
	identity = m("texture");
	currentGpu;
	currentOptions;
	defaultView = null;
	destroyed = !1;
	constructor(e, t, n, r = "owned") {
		this.device = e, this.ownership = r, this.currentGpu = t, this.currentOptions = Ee(n);
	}
	get gpu() {
		return this.currentGpu;
	}
	get options() {
		return this.currentOptions;
	}
	get size() {
		return this.options.size;
	}
	get format() {
		return this.options.format;
	}
	get usage() {
		return this.options.usage;
	}
	get mipLevelCount() {
		return this.options.mipLevelCount ?? 1;
	}
	get sampleCount() {
		return this.options.sampleCount ?? 1;
	}
	get kind() {
		return this.options.kind;
	}
	get layers() {
		return this.options.kind === "2d-array" ? this.options.layers : 1;
	}
	get dimension() {
		return this.options.kind === "2d-array" ? "2d" : this.options.kind;
	}
	get viewFormats() {
		return this.options.viewFormats ?? [];
	}
	get label() {
		return this.options.label;
	}
	get resourceIdentity() {
		return this.identity;
	}
	onDestroy(e) {
		return this.destroySignal.onDestroy(this, e);
	}
	get view() {
		return this.assertAlive(), this.defaultView ??= this.createView(), this.defaultView;
	}
	createView(e) {
		return this.assertAlive("Texture.createView"), this.gpu.createView(this.kind === "2d-array" ? {
			...e,
			dimension: e?.dimension ?? "2d-array"
		} : e);
	}
	async read(e) {
		this.assertAlive("Texture.read");
		let t = await this.device.readback.readTexture(this.gpu, e);
		return this.assertAlive("Texture.read"), t;
	}
	async readFloats(e) {
		this.assertAlive("Texture.readFloats");
		let t = he(this.options.format, "Texture.readFloats"), { size: n } = se(this.gpu, e, "Texture.readFloats");
		return ce(n[0] * n[1] * n[2] * t.components * 4, this.device.gpu.limits?.maxBufferSize, "Texture.readFloats"), ge(await this.read(e), this.options.format);
	}
	destroy() {
		if (!this.destroyed) {
			this.destroyed = !0, this.defaultView = null;
			try {
				this.destroySignal.emit(this);
			} finally {
				this.ownership !== "external" && !f(this.gpu) && this.gpu.destroy();
			}
		}
	}
	dispose() {
		this.destroy();
	}
	assertAlive(e = "Texture") {
		if (this.destroyed) throw new t({
			code: "VGPU-CORE-TEXTURE-DESTROYED",
			message: "Texture is destroyed",
			where: e
		});
		this.device.assertUsable?.(e);
	}
};
function je(e) {
	let [t, n, r] = De(e), i = {
		label: e.label,
		size: {
			width: t,
			height: n,
			depthOrArrayLayers: r
		},
		dimension: e.kind === "2d-array" ? "2d" : e.kind,
		format: e.format,
		usage: l(e.usage)
	};
	return e.mipLevelCount !== void 0 && (i.mipLevelCount = e.mipLevelCount), e.sampleCount !== void 0 && (i.sampleCount = e.sampleCount), e.viewFormats !== void 0 && (i.viewFormats = [...e.viewFormats]), e.kind === "2d-array" && (i.textureBindingViewDimension = "2d-array"), i;
}
//#endregion
//#region node_modules/@vgpu/core/dist/device.js
var Me = class {
	gpu;
	adapterInfo;
	queue;
	readback;
	isCompatibilityMode;
	scopes = [];
	ownership;
	state = "alive";
	lossInfo;
	observeLoss = !0;
	lossObservers = /* @__PURE__ */ new Set();
	constructor(e, t = null, n = "owned", r = {}) {
		this.gpu = e, this.adapterInfo = t, Object.defineProperty(this, "assertUsable", { value: (e) => this.#e(e) }), Object.defineProperty(this, "onObservedLoss", { value: (e) => this.state === "lost" && this.lossInfo ? (e(this.lossInfo), () => void 0) : !this.observeLoss || this.state !== "alive" ? () => void 0 : (this.lossObservers.add(e), () => {
			this.lossObservers.delete(e);
		}) }), this.ownership = typeof n == "string" ? n : "owned";
		let i = typeof n == "string" ? r : n;
		this.isCompatibilityMode = i.isCompatibilityMode ?? !1, this.queue = new xe(e.queue, (e) => this.#e(e)), this.readback = new ue(e);
		let a = e.lost;
		a && typeof a.then == "function" && Promise.resolve(a).then((e) => {
			if (!this.observeLoss || this.state !== "alive") return;
			this.lossInfo = e, this.state = "lost";
			let t = [...this.lossObservers];
			this.lossObservers.clear();
			for (let n of t) try {
				n(e);
			} catch {}
		}, () => void 0);
	}
	get limits() {
		return this.#e("Device.limits"), this.gpu.limits;
	}
	get features() {
		return this.#e("Device.features"), this.gpu.features;
	}
	createShader(e) {
		this.#e("Device.createShader");
		let t = typeof e == "string" ? ee(e) : e;
		return new Se(this.gpu.createShaderModule({ code: t.wgsl }), t);
	}
	createTexture(e) {
		this.#e("Device.createTexture"), Oe(e, this.gpu);
		let t = Ee(e);
		return new x(this, this.gpu.createTexture(je(t)), t);
	}
	createBuffer(e) {
		this.#e("Device.createBuffer");
		let t = Ne(e);
		t && this.captureError(t);
		let n = t ? be(Math.max(4, e.size || 4)) : Fe(e);
		return new g(this, this.gpu.createBuffer(n), e);
	}
	wrapBuffer(e) {
		if (this.#e("Device.wrapBuffer"), !Le(e)) throw new t({
			code: "VGPU-EXTERNAL-BUFFER-INVALID",
			message: "Device.wrapBuffer requires a GPUBuffer with finite size and usage properties.",
			where: "Device.wrapBuffer",
			fix: "Pass a live GPUBuffer created for this GPUDevice."
		});
		let n = {
			size: e.size,
			usage: ze(e.usage),
			...e.label ? { label: e.label } : {}
		};
		return new g(this, e, n, "external");
	}
	pushErrorScope(e) {
		this.#e("Device.pushErrorScope"), this.scopes.push([]), this.gpu.pushErrorScope?.(e);
	}
	async popErrorScope() {
		this.#e("Device.popErrorScope");
		let e = this.scopes.pop(), t = await this.gpu.popErrorScope?.();
		return this.#e("Device.popErrorScope"), e?.[0] ?? Ie(t) ?? null;
	}
	#e(e) {
		if (this.state === "alive") return;
		if (this.state === "disposed") throw new t({
			code: "VGPU-DEVICE-DISPOSED",
			message: "The GPU device wrapper has been disposed.",
			where: e,
			fix: "Create a new Gpu instance before performing more work."
		});
		let n = this.lossInfo?.reason, r = this.lossInfo?.message;
		throw new t({
			code: "VGPU-DEVICE-LOST",
			message: `The GPU device was lost${n ? ` (${n})` : ""}${r ? `: ${r}` : "."}`,
			where: e,
			cause: this.lossInfo,
			fix: "Create a new Gpu with init(), then recreate its resources and restart the loop."
		});
	}
	destroy() {
		if (this.state === "disposed") return;
		let e = this.state === "lost";
		this.state = "disposed", this.observeLoss = !1, this.lossObservers.clear(), this.scopes.length = 0, this.readback.destroy(), this.ownership === "owned" && !e && this.gpu.destroy();
	}
	dispose() {
		this.destroy();
	}
	captureError(e) {
		let t = this.scopes.at(-1);
		if (t) t.push(e);
		else throw e;
	}
};
function Ne(e) {
	return !Number.isFinite(e.size) || e.size <= 0 ? Pe("Buffer size must be greater than zero.") : e.usage.length === 0 ? Pe("Buffer usage must not be empty.") : null;
}
function Pe(e) {
	return new t({
		code: "VGPU-CORE-INVALID-USAGE",
		message: e,
		where: "Device.createBuffer"
	});
}
function Fe(e) {
	return {
		label: e.label,
		size: e.size,
		usage: a(e.usage)
	};
}
function Ie(e) {
	return e ? new t({
		code: "VGPU-CORE-VALIDATION",
		message: e.message,
		where: "GPUDevice.popErrorScope",
		cause: e
	}) : null;
}
function Le(e) {
	if (typeof e != "object" && typeof e != "function" || e === null) return !1;
	let t = e;
	return Number.isSafeInteger(t.size) && (t.size ?? -1) >= 0 && Number.isSafeInteger(t.usage) && (t.usage ?? -1) >= 0 && typeof t.destroy == "function";
}
var Re = [
	"map_read",
	"map_write",
	"copy_src",
	"copy_dst",
	"index",
	"vertex",
	"uniform",
	"storage",
	"indirect",
	"query_resolve"
];
function ze(e) {
	return Re.filter((t) => (e & a([t])) !== 0);
}
//#endregion
//#region node_modules/@vgpu/core/dist/bind-group-metadata.js
var Be = /* @__PURE__ */ new WeakMap(), Ve = /* @__PURE__ */ new WeakMap();
function He(e, t) {
	return Be.set(e, Ge(t)), e;
}
function Ue(e) {
	return Be.get(e);
}
function We(e) {
	return Ve.get(e);
}
function Ge(e) {
	return { entries: e.entries.map((e) => ({ ...e })) };
}
//#endregion
//#region node_modules/vgpu/dist/errors.js
var S = class extends e {};
function Ke(e, t) {
	return new S({
		code: "VGPU-SURFACE-NOT-BINDABLE",
		message: `Binding '${t.name}' (@group(${t.group}) @binding(${t.binding})) in '${e}' cannot use a Surface as an input.`,
		where: `${e}.${t.name}`,
		fix: "Render to an offscreen target and bind that target or its texture. Use Surface only as a render destination.",
		detail: {
			binding: t.binding,
			bindingName: t.name
		}
	});
}
function qe(e, t, n = "resource") {
	return new S({
		code: "VGPU-R1-BINDING-DESTROYED",
		message: `Binding '${t.name}' (@group(${t.group}) @binding(${t.binding})) in '${e}' refers to destroyed resource '${n}'.`,
		where: `${e}.${t.name}`,
		fix: `Create a live resource and call set({ ${t.name}: replacement }). Direct attachment references do not follow target.resize(); bind the Target itself to follow replacements. Re-record bundles that captured the old resource.`,
		detail: {
			binding: t.binding,
			bindingName: t.name,
			resourceName: n
		}
	});
}
function Je(e, t, n, r, i, a) {
	let o = t === "vertex" ? "Vertex" : "Fragment", s = t === "vertex" ? "VERTEX" : "FRAGMENT", c = `maxStorageBuffersIn${o}Stage`;
	return new S({
		code: `VGPU-LIMIT-STORAGE-${s}`,
		message: `${o} entry '${n}' in '${e}' uses ${r} storage buffer(s), but device limit ${c} is ${i}.`,
		fix: t === "vertex" ? `Request init({ requiredLimits: { ${c}: ${r} } }) if the adapter supports it, or move vertex data to geometry(gpu, ...) vertex streams.` : `Request init({ requiredLimits: { ${c}: ${r} } }) if the adapter supports it, or reduce fragment storage buffers.`,
		where: `${e}.pipelineLayout`,
		detail: {
			stage: t,
			entryPoint: n,
			count: r,
			limit: i,
			bindings: a.map(({ name: e, group: t, binding: n }) => ({
				name: e,
				group: t,
				binding: n
			}))
		}
	});
}
function Ye(e, t, n, r, i) {
	return new S({
		code: "VGPU-SET-TEXTURE-FILTERABILITY",
		message: `${r} (${n}) cannot satisfy filtering texture '${t.name}' @group(${t.group}) @binding(${t.binding}).`,
		fix: "Use a filterable format; request float32-filterable for rgba32float when supported; or use textureLoad without a sampler.",
		where: `${e}.set`,
		detail: {
			format: n,
			group: t.group,
			binding: t.binding,
			bindingName: t.name,
			resourceName: r,
			samplerName: i?.name,
			samplerGroup: i?.group,
			samplerBinding: i?.binding
		}
	});
}
function Xe(e, t) {
	let n = Qt(e, t);
	return new S({
		code: "VGPU-R1-BINDING-NEVER-SET",
		message: `Unset \`${t.name}\` @group(${t.group}) @binding(${t.binding}) in '${e}'. Fix: ${n}; or ${e}.group(${t.group}, bindGroup).`,
		where: `${e}.draw`
	});
}
function Ze(e, t) {
	return new S({
		code: "VGPU-R1-OWNERSHIP-FLIP",
		message: `\`${e}\` is ${t === "lib" ? "lib-owned by its first JS set()" : "user-owned by its first resource set()"}; ownership cannot change. ${t === "lib" ? `Fix: pass a resource from the start: wave.set({ ${e}: new Uniform(gpu.device, { size: 4 }) }).` : `Fix: pass JS values from the first set(): wave.set({ ${e}: jsValue }).`}`,
		where: "set"
	});
}
function Qe(e, t) {
	return new S({
		code: "VGPU-R4-GROUP-CLAIMED",
		message: `group ${t} of '${e}' is claimed; set() cannot update it.`,
		fix: `Call set() first, or build from ${e}.layout(${t}); pass dynamic offsets to p.draw().`,
		where: `${e}.set`
	});
}
function $e(e, t, n, r) {
	return new S({
		code: "VGPU-R4-GROUP-INCOMPATIBLE",
		message: `claimed group ${t} in '${e}' is incompatible: ${n}.`,
		fix: `Build from ${e}.layout(${t}, { dynamicOffsets? }) then call ${e}.group(${t}, bindGroup).`,
		where: `${e}.group`,
		cause: r
	});
}
function et(e, t, n) {
	return new S({
		code: "VGPU-R4-GROUP-VALIDATION",
		message: `WebGPU rejected claimed group ${t} in '${e}'.`,
		fix: `Build from ${e}.layout(${t}); pass offsets via p.draw(draw, { offsets: { ${t}: [...] } }).`,
		where: `${e}.draw`,
		cause: n,
		detail: {
			drawLabel: e,
			group: t
		}
	});
}
function tt(e, t) {
	return new S({
		code: "VGPU-BLEND-INVALID",
		message: `Invalid blend '${String(t)}' in '${e}'.`,
		fix: "Use \"alpha\", \"additive\", \"premultiplied\", or { color, alpha? } components.",
		where: "draw"
	});
}
function nt(e, t) {
	return new S({
		code: "VGPU-BLEND-CONSTANT-INVALID",
		message: `Invalid blendConstant in '${e}': ${t}`,
		fix: "Use [r, g, b, a] finite numbers with a blend whose color or alpha uses \"constant\"/\"one-minus-constant\"; omit it to keep the pass default (0, 0, 0, 0).",
		where: "draw"
	});
}
function rt(e, t) {
	return new S({
		code: "VGPU-DRAW-DISPOSED",
		message: `Draw '${e}' has been disposed.`,
		where: `${e}.${t}`,
		fix: "Create a new draw(gpu, ...) or effect(gpu, ...); disposed render units cannot be reused.",
		detail: { label: e }
	});
}
function it(e, t) {
	return new S({
		code: "VGPU-WRITEMASK-INVALID",
		message: `Invalid writeMask ${t} in '${e}'.`,
		fix: "Use an array of r/g/b/a; omit it for all channels.",
		where: "draw"
	});
}
function at(e, t, n = "draw") {
	return new S({
		code: "VGPU-COLORS-INVALID",
		message: `Invalid colors in '${e}': ${t}`,
		fix: "Use one { blend?, writeMask? } or null entry per color attachment of the target, aligned by index; omit colors to apply the top-level blend/writeMask to every attachment.",
		where: n
	});
}
function ot(e, t) {
	return new S({
		code: "VGPU-CULL-INVALID",
		message: `Invalid cull '${String(t)}' in '${e}'.`,
		fix: "Use \"none\", \"front\", or \"back\"; omit it for no culling.",
		where: "draw"
	});
}
function st(e, t) {
	return new S({
		code: "VGPU-FRONTFACE-INVALID",
		message: `Invalid frontFace '${String(t)}' in '${e}'.`,
		fix: "Use \"ccw\" or \"cw\"; omit it for counter-clockwise.",
		where: "draw"
	});
}
function ct(e, t) {
	return new S({
		code: "VGPU-UNCLIPPED-DEPTH-INVALID",
		message: `Invalid unclippedDepth in '${e}': ${t}`,
		fix: "Use a boolean. unclippedDepth: true needs the \"depth-clip-control\" device feature — request it with init({ requiredFeatures: [\"depth-clip-control\"] }) on an adapter that supports it. Omit the option to keep depth clipping.",
		where: "draw"
	});
}
function C(e, t) {
	return new S({
		code: "VGPU-DEPTH-INVALID",
		message: `Invalid depth in '${e}': ${t}`,
		fix: "Use false or { write?, compare?, bias?, biasSlopeScale?, biasClamp? }; omit it for { write: true, compare: \"less-equal\" }.",
		where: "draw"
	});
}
function lt(e, t, n = "draw") {
	return new S({
		code: "VGPU-STENCIL-INVALID",
		message: `Invalid stencil in '${e}': ${t}`,
		fix: "Use { front?, back?, readMask?, writeMask?, ref? } with GPUCompareFunction/GPUStencilOperation faces and u32 masks, against a target whose depth format has a stencil aspect (depth: \"depth24plus-stencil8\"); omit it for WebGPU's pass-through defaults.",
		where: n
	});
}
function ut(e, t, n = "draw") {
	return new S({
		code: "VGPU-MULTISAMPLE-INVALID",
		message: `Invalid multisample in '${e}': ${t}`,
		fix: "Use { alphaToCoverage?, mask? }: alphaToCoverage needs a target created with msaa: true, and mask must be an integer in [0, 0xFFFFFFFF] (bits above the target's sampleCount are ignored). Omit multisample for full-coverage defaults.",
		where: n
	});
}
function dt(e, t, n = "draw") {
	return new S({
		code: "VGPU-CONSTANTS-INVALID",
		message: `Invalid constants in '${e}': ${t}`,
		fix: "Key WGSL `override` constants by name, or by the decimal string of N when the declaration has @id(N); values are finite numbers or booleans, converted to the override's WGSL type (bool/i32/u32/f32/f16). Every override without a default value must be provided. Omit constants to keep the WGSL defaults.",
		where: n
	});
}
function ft(e, t, n = "draw") {
	return new S({
		code: "VGPU-ENTRY-INVALID",
		message: `Invalid entry in '${e}': ${t}`,
		fix: "Use a matching stage name: draw { vertex?, fragment? }, effect { fragment? }, compute string. Defaults prefer vs_main/fs_main/cs_main, otherwise first-in-stage.",
		where: n
	});
}
function pt(e, t, n) {
	return new S({
		code: "VGPU-INDIRECT-INVALID",
		message: `Invalid indirect in '${e}': ${t}`,
		fix: "Pass a storage buffer created with storage(gpu, bytes, { indirect: true }) — bare, or as { buffer, offset? } with a 4-aligned byte offset — sized so the GPU-read arguments fit: 16 bytes for drawIndirect, 20 for drawIndexedIndirect, 12 for dispatchWorkgroupsIndirect. Omit indirect to use CPU-side counts.",
		where: n
	});
}
function mt() {
	return new S({
		code: "VGPU-PASS-PRESERVE-MSAA",
		message: "clear:false cannot preserve MSAA; use a non-MSAA target.",
		fix: "Use non-MSAA for accumulation.",
		where: "Frame.pass"
	});
}
function ht(e, t = "expected a number in [0, 1].", n = "Use 1 (default), or 0 with depth: { compare: \"greater\" } for reversed-Z.") {
	return new S({
		code: "VGPU-PASS-CLEARDEPTH-INVALID",
		message: `clearDepth received ${String(e)}; ${t}`,
		fix: n,
		where: "Frame.pass"
	});
}
function w(e) {
	return new S({
		code: "VGPU-PASS-VIEWPORT-INVALID",
		message: `Invalid viewport: ${e}`,
		fix: "Use { x?, y?, width, height, minDepth?, maxDepth? } finite numbers within device limits; omit it for the full target.",
		where: "Frame.pass"
	});
}
function gt(e) {
	return new S({
		code: "VGPU-PASS-SCISSOR-INVALID",
		message: `Invalid scissor: ${e}`,
		fix: "Use [x, y, width, height] non-negative integers with x + width and y + height within the target's current pixel size; omit it for the full target.",
		where: "Frame.pass"
	});
}
function _t() {
	return new S({
		code: "VGPU-PASS-PRESERVE-CLEARDEPTH",
		message: "clear:false preserves depth; clearDepth cannot apply.",
		fix: "Remove clearDepth, or let the pass clear.",
		where: "Frame.pass"
	});
}
function vt(e) {
	return new S({
		code: "VGPU-PASS-CLEARSTENCIL-INVALID",
		message: `clearStencil ${e}`,
		fix: "Use an integer in [0, 0xFFFFFFFF] on a target whose depth format has a stencil aspect, e.g. depth: \"depth24plus-stencil8\"; the value is masked to the stencil aspect's bit width.",
		where: "Frame.pass"
	});
}
function yt() {
	return new S({
		code: "VGPU-PASS-PRESERVE-CLEARSTENCIL",
		message: "clear:false preserves stencil; clearStencil cannot apply.",
		fix: "Remove clearStencil, or let the pass clear.",
		where: "Frame.pass"
	});
}
function bt(e, t, n = "Frame.pass") {
	return new S({
		code: "VGPU-PASS-DEPTH-READONLY",
		message: `depthReadOnly ${e}`,
		fix: t,
		where: n
	});
}
function xt() {
	return new S({
		code: "VGPU-PASS-DEPTH-READONLY-MSAA",
		message: "depthReadOnly cannot read an MSAA target's depth: multisampled depth is stored with storeOp \"discard\", so a read-only pass tests against discarded contents.",
		fix: "Use a non-MSAA target for read-only depth, or drop depthReadOnly and let the pass own its depth.",
		where: "Frame.pass"
	});
}
function St(e, t, n = "timer") {
	return new S({
		code: "VGPU-TIMER-INVALID",
		message: `Invalid timer use: ${e}`,
		fix: t,
		where: n
	});
}
function Ct(e, t, n = "visibility") {
	return new S({
		code: "VGPU-VIS-INVALID",
		message: `Invalid visibility use: ${e}`,
		fix: t,
		where: n
	});
}
function wt() {
	return new S({
		code: "VGPU-QUERY-NO-VISIBILITY",
		message: "occlusion() needs the pass to be opened with a visibility instance; the render pass has no occlusionQuerySet to write into.",
		fix: "Open the pass with f.pass({ target, visibility: vis }, ...) using the visibility(gpu) instance that created the query handle.",
		where: "FramePass.occlusion"
	});
}
function Tt() {
	return new S({
		code: "VGPU-QUERY-NESTED",
		message: "occlusion() cannot nest inside an active occlusion() body; WebGPU allows one active occlusion query per pass at a time.",
		fix: "Encode each occlusion scope sequentially: p.occlusion(a, ...); p.occlusion(b, ...).",
		where: "FramePass.occlusion"
	});
}
function Et(e = "Frame.pass") {
	return new S({
		code: "VGPU-TARGET-REQUIRED",
		message: "Target required. Fix: pass surface(gpu, canvas) or target(gpu, { size }) as { target }.",
		where: e
	});
}
function Dt(e, t, n, r) {
	return new S({
		code: e,
		message: `${e}: ${n}`,
		fix: r,
		where: t
	});
}
function Ot(e, t) {
	return Dt("VGPU-MESH-RANGE-INVALID", e, t, "Use index ranges for indexed geometries, vertex ranges otherwise, within geometry counts.");
}
function kt(e) {
	return new S({
		code: "VGPU-PIPELINE-LAYOUT-GAP",
		message: `Pipeline bind group ${e} is missing.`,
		fix: "Use consecutive @group() indices starting at 0.",
		where: "pipeline layout"
	});
}
function At(e, t, n) {
	return new S({
		code: "VGPU-COMPILE-FAILED",
		message: "WebGPU pipeline compilation failed.",
		fix: "Check WGSL, pipeline bindings, device limits, and render target/vertex layouts when applicable.",
		where: e,
		cause: t,
		detail: n ? { signature: n } : void 0
	});
}
function jt(e) {
	return new S({
		code: "VGPU-COMPILE-DISPOSED",
		message: "GPU disposed during pipeline compilation.",
		where: e
	});
}
function Mt(e, t) {
	return new S({
		code: "VGPU-COMPILE-SIGNATURE-INVALID",
		message: `Invalid TargetSignature: ${t}`,
		fix: "Pass { colors, depth?, sampleCount?:1|4 } or a Target.",
		where: e
	});
}
function Nt(e) {
	return new S({
		code: "VGPU-TARGET-DEPTH-STENCIL-ONLY",
		message: `depth received '${e}'; stencil-only depth targets are not supported yet.`,
		fix: "Use a format with a depth aspect such as \"depth24plus\" or \"depth24plus-stencil8\".",
		where: "target"
	});
}
function Pt() {
	return new S({
		code: "VGPU-TARGET-SIZE-REQUIRED",
		message: "Target size required. Fix: target(gpu, { size: [w,h] }); update surface-derived targets in onResize.",
		where: "target"
	});
}
function Ft(e) {
	return new S({
		code: "VGPU-SURFACE-NOT-IN-FRAME",
		message: "Surface targets are only available inside frame(gpu).",
		fix: "Encode surface draws inside frame(gpu, ...); compile(surface) and bundle(gpu, { target: surface }, ...) can prepare outside a frame.",
		where: e
	});
}
function It(e) {
	return new S({
		code: "VGPU-SURFACE-DEPTH-INVALID",
		message: "Surface depth must be false, true, or a depth-aspect texture format.",
		fix: "Use depth: true, a depth-aspect format such as \"depth24plus\", or omit depth.",
		where: "surface",
		detail: {
			actual: typeof e == "string" || typeof e == "number" ? e : void 0,
			type: typeof e
		}
	});
}
function Lt(e) {
	return new S({
		code: "VGPU-SURFACE-MSAA-INVALID",
		message: "Surface msaa must be false, true, or 4.",
		fix: "Use msaa: false for one sample, msaa: true or msaa: 4 for four samples, or omit msaa.",
		where: "surface",
		detail: {
			actual: typeof e == "string" || typeof e == "number" ? e : void 0,
			type: typeof e
		}
	});
}
function Rt() {
	return new S({
		code: "VGPU-SURFACE-CONTEXT",
		message: "Canvas WebGPU context failed. Fix: check navigator.gpu and remove any existing 2d/webgl context.",
		where: "surface"
	});
}
function zt(e) {
	return new S({
		code: "VGPU-SURFACE-DUPLICATE",
		message: `Canvas already has surface${e ? ` '${e}'` : ""}. Fix: reuse or dispose it.`,
		where: "surface"
	});
}
function Bt(e) {
	return new S({
		code: "VGPU-SURFACE-DISPOSED",
		message: `Surface '${e ?? "surface"}' is disposed. Fix: call surface(gpu, canvas).`,
		where: "surface"
	});
}
function Vt() {
	return new S({
		code: "VGPU-SURFACE-AUTORESIZE-UNSUPPORTED",
		message: "autoResize needs clientWidth. Fix: call surface.resize([w,h]) for OffscreenCanvas; onResize still fires.",
		where: "surface"
	});
}
function Ht(e) {
	return new S({
		code: "VGPU-SURFACE-RESIZE-REENTRANT",
		message: `Cannot resize this surface${e ? ` '${e}'` : ""} in onResize. Fix: resize derived targets only.`,
		where: "surface.resize"
	});
}
function Ut(e) {
	return new S({
		code: "VGPU-CLEAR-COLOR-INVALID",
		message: `Invalid ${e}: expected four finite numbers.`,
		fix: "Assign [r, g, b, a] or a GPUColor object ({ r, g, b, a }).",
		where: e
	});
}
function Wt(e) {
	return new S({
		code: "VGPU-ASYNC-FRAME-CALLBACK",
		message: `${e} callbacks must be synchronous.`,
		where: e,
		fix: "Await preparation before frame()/frameLoop(); keep the frame callback synchronous."
	});
}
function Gt() {
	return new S({
		code: "VGPU-FRAME-REENTRANT",
		message: "Nested frame(gpu) is invalid. Fix: queue work for the next frame.",
		where: "frame"
	});
}
function Kt(e) {
	return new S({
		code: "VGPU-FRAME-CANCELED",
		message: "the frame was canceled; its command encoder was dropped and nothing more can be encoded or submitted on it.",
		fix: "Open a new frame(gpu) for further work; cancel() is the last operation on a frame.",
		where: e
	});
}
function qt(e) {
	return new S({
		code: "VGPU-FRAME-PASS-ACTIVE",
		message: "the frame cannot be canceled while a pass callback is active.",
		fix: "Return from the frame.pass(...) callback first, then call frame.cancel(); this keeps pass descriptor resources alive until the pass is closed.",
		where: e
	});
}
function Jt(e) {
	return new S({
		code: "VGPU-FRAME-SUBMITTED",
		message: "the frame was already submitted; submitted GPU work cannot be canceled.",
		fix: "Call cancel() only on a frame you decided not to submit; the frame you did submit needs no cleanup.",
		where: e
	});
}
function T(e, t, n) {
	return new S({
		code: "VGPU-R1-BINDING-INCOMPATIBLE-RESOURCE",
		message: `binding \`${e.name}\` @group(${e.group}) @binding(${e.binding}) needs ${t}.`,
		fix: n,
		where: "set"
	});
}
function E(e, t, n) {
	return new S({
		code: "VGPU-RING1-UNSUPPORTED",
		message: t,
		fix: n,
		where: e
	});
}
function Yt(e, t) {
	return new S({
		code: "VGPU-SET-VALUE-INVALID",
		message: `Invalid WGSL value at '${e.path}': ${t}.`,
		fix: "Pass the exact reflected structure, vector, matrix, and array shapes; use integral in-range values for i32/u32.",
		where: "set",
		detail: e
	});
}
function Xt() {
	return new S({
		code: "VGPU-SHADER-SOURCE-UNPREPARED",
		message: "The renderer requires a prepared ShaderSource v2, but received raw WGSL or a v1 artifact.",
		fix: "Use a compatible @vgpu/wgsl loader, rebuild shader assets, or call prepareShader() from @vgpu/wgsl/prepare.",
		where: "shader source"
	});
}
function Zt(e, t) {
	return new S({
		code: "VGPU-SHADER-SOURCE-VERSION",
		message: `ShaderSource version ${e} is unsupported; this runtime supports version 2${t ? ` (producer: ${t})` : ""}.`,
		fix: "Align the shader producer and vgpu runtime versions, then regenerate the artifact.",
		where: "shader source",
		detail: {
			actual: e,
			expected: 2,
			reason: t ? `producer: ${t}` : void 0
		}
	});
}
function D(e, t) {
	return new S({
		code: "VGPU-SHADER-SOURCE-INVALID",
		message: `Invalid ShaderSource field '${e}': ${t}.`,
		fix: "Regenerate the shader artifact with a compatible @vgpu/wgsl producer.",
		where: "shader source",
		detail: {
			path: e,
			reason: t
		}
	});
}
function Qt(e, t) {
	switch (t.kind) {
		case "sampler": return `${e}.set({${t.name}:sampler(gpu)})`;
		case "texture": return `${e}.set({${t.name}:scene.color})`;
		case "buffer": return t.addressSpace === "uniform" ? `${e}.set({${t.name}:{ /* values */ }})` : `${e}.set({${t.name}:buffer})`;
		default: return `${e}.set({${t.name}:resource})`;
	}
}
//#endregion
//#region node_modules/vgpu/dist/lifecycle.js
function O(e, t) {
	e.assertUsable(t);
}
function $t(e) {
	try {
		return O(e, "Device"), !0;
	} catch {
		return !1;
	}
}
function en(e, t, n) {
	e.assertUsable(t, n);
}
//#endregion
//#region node_modules/vgpu/dist/submitted-work-done.js
function tn(e) {
	try {
		return e.gpu.queue.onSubmittedWorkDone?.() ?? Promise.resolve();
	} catch (e) {
		return Promise.reject(e);
	}
}
//#endregion
//#region node_modules/vgpu/dist/kernel.js
var nn = [
	"scheduler",
	"resource",
	"service"
];
function rn(e) {
	return { name: e };
}
var an = /* @__PURE__ */ new WeakMap();
function on(e) {
	let t = an.get(e);
	if (!t) throw new S({
		code: "VGPU-GPU-FOREIGN",
		message: "This object was not created by init(); it has no vgpu kernel.",
		fix: "Pass the gpu returned by init() from vgpu, vgpu/node or vgpu/mock.",
		where: "gpu"
	});
	return t;
}
var sn = class {
	device;
	#e = /* @__PURE__ */ new Map();
	#t = new Map(nn.map((e) => [e, /* @__PURE__ */ new Set()]));
	#n = /* @__PURE__ */ new Set();
	#r = /* @__PURE__ */ new Set();
	#i = /* @__PURE__ */ new Set();
	#a = /* @__PURE__ */ new Set();
	#o;
	#s;
	lost;
	#c = !1;
	#l;
	constructor(e) {
		this.device = e;
		let t;
		this.lost = new Promise((e) => {
			t = e;
		}), this.#s = t, this.#o = ln(e, (e) => {
			if (this.#c || this.#l) return;
			this.#l = e;
			let t = [...this.#a];
			this.#a.clear();
			for (let e of t) try {
				e();
			} catch {}
			this.#s(e);
		});
	}
	get disposed() {
		return this.#c;
	}
	service(e, t) {
		let n = this.#e.get(e);
		if (n !== void 0) return n;
		let r = t(this);
		return this.#e.set(e, r), r;
	}
	peekService(e) {
		return this.#e.get(e);
	}
	own(e, t) {
		let n = this.#t.get(e);
		return n.add(t), () => {
			n.delete(t);
		};
	}
	stopOnLoss(e) {
		return this.#l || this.#c ? (e(), () => void 0) : (this.#a.add(e), () => {
			this.#a.delete(e);
		});
	}
	addErrorListener(e) {
		return this.#n.add(e), () => {
			this.#n.delete(e);
		};
	}
	reportError(e) {
		if (this.#c) return Promise.resolve();
		let t = Promise.resolve().then(() => {
			let t = [...this.#n];
			if (!t.length) {
				console.error(e);
				return;
			}
			for (let n of t) try {
				n(e);
			} catch (e) {
				console.error(e);
			}
		});
		return this.trackDelivery(t);
	}
	trackDelivery(e) {
		let t = Promise.resolve(e).then(() => void 0, (e) => {
			console.error(e);
		});
		return this.#r.add(t), t.finally(() => this.#r.delete(t)), t;
	}
	registerSettledSource(e) {
		return this.#i.add(e), () => {
			this.#i.delete(e);
		};
	}
	async settled() {
		let e = !this.#c && $t(this.device) ? tn(this.device) : void 0, t = [...this.#i], n = [...this.#r, ...t.flatMap((e) => {
			try {
				return e();
			} catch (e) {
				return [Promise.reject(e)];
			}
		})];
		e && n.push(e), await Promise.allSettled(n);
	}
	dispose() {
		if (!this.#c) {
			this.#c = !0, this.#o();
			for (let e of nn) {
				let t = this.#t.get(e);
				for (let e of [...t]) e();
				t.clear();
			}
			this.#e.clear(), this.#i.clear(), this.#a.clear(), this.#n.clear(), this.device.dispose();
		}
	}
};
function cn(e) {
	let t = new sn(e), n = {
		device: e,
		gpu: e.gpu,
		lost: t.lost,
		get disposed() {
			return t.disposed;
		},
		onError: (e) => t.addErrorListener(e),
		settled: () => t.settled(),
		dispose: () => {
			t.dispose();
		}
	};
	return an.set(n, t), n;
}
function ln(e, t) {
	return e.onObservedLoss(t);
}
async function un(e, t = {}, n) {
	return cn(await dn(e, t, n));
}
async function dn(e, t, n) {
	if (t.adapter || n) return (t.adapter ?? n()).requestDevice(t);
	if (e === "browser") return fn(t);
	throw E("init", `init(${e}) requires adapterFactory.`);
}
async function fn(e) {
	let t = await globalThis.navigator.gpu?.requestAdapter({ powerPreference: e.powerPreference });
	if (!t) throw E("init", "navigator.gpu.requestAdapter() returned null.");
	return r(t.features, e.requiredFeatures), new Me(await t.requestDevice({
		requiredFeatures: e.requiredFeatures,
		requiredLimits: e.requiredLimits
	}), t.info ?? null);
}
//#endregion
//#region node_modules/vgpu/dist/draw-protocols.js
var pn = Symbol("vgpu.bindingResource");
function mn(e) {
	return typeof (typeof e == "object" && e ? e[pn] : void 0) == "function" ? e : void 0;
}
var hn = Symbol("vgpu.surfaceTarget");
function gn(e) {
	return typeof e == "object" && !!e && e[hn] === !0;
}
var _n = Symbol("vgpu.targetSignature");
function vn(e) {
	let t = typeof e == "object" && e ? e[_n] : void 0;
	return typeof t == "function" ? t.call(e) : void 0;
}
var yn = Symbol("vgpu.geometry.layoutResolver"), bn = Symbol("vgpu.geometry.liveness");
function xn(e) {
	return typeof (typeof e == "object" && e ? e[bn] : void 0) == "function" ? e : void 0;
}
//#endregion
//#region node_modules/vgpu/dist/live-kernel.js
function Sn(e, t) {
	let n = on(e);
	if (n.disposed) throw Cn(t);
	return O(n.device, t), n;
}
function Cn(e) {
	return new S({
		code: "VGPU-GPU-DISPOSED",
		message: `${e}() ran after gpu.dispose(); the device and everything it owned are gone.`,
		fix: "Create resources before disposing the gpu, or init() a new one.",
		where: e
	});
}
//#endregion
//#region node_modules/vgpu/dist/binding-lifetime.js
var wn = 16, Tn = /* @__PURE__ */ new WeakMap();
function En() {
	let e = /* @__PURE__ */ new WeakMap(), t = {
		records: /* @__PURE__ */ new Map(),
		dependencies: /* @__PURE__ */ new Map(),
		markerRefs: /* @__PURE__ */ new Map(),
		markerFinalizer: new FinalizationRegistry((e) => t.markerRefs.delete(e)),
		finalizer: new FinalizationRegistry((e) => kn(t, e)),
		nextRecord: 1,
		nextMarker: 1,
		maintenanceVisits: 0,
		targetedVisits: 0,
		disposed: !1
	}, n = {
		destroyEpoch: 0,
		marker(r, i, a) {
			let o = e.get(r);
			if (o) return o;
			n.maintain(), o = {
				dependency: i,
				destroyed: !1
			}, e.set(r, o);
			let s = t.nextMarker++, c = new WeakRef(o);
			t.markerRefs.set(s, c), t.markerFinalizer.register(o, s, c);
			let l = new WeakRef(n);
			return o.unsubscribe = Dn(a, o, s, c, l), o;
		},
		register(e, r) {
			if (t.disposed || (n.maintain(), r.length === 0)) return;
			let i = t.nextRecord++, a = {
				id: i,
				target: new WeakRef(e),
				dependencies: [...new Set(r)],
				token: {}
			};
			On(t, a);
			for (let e of a.dependencies) {
				let n = t.dependencies.get(e);
				n || t.dependencies.set(e, n = /* @__PURE__ */ new Set()), n.add(i);
			}
			return t.finalizer.register(e, i, a.token), i;
		},
		unregister(e) {
			e !== void 0 && kn(t, e);
		},
		invalidate(e, r) {
			n.maintain();
			let i = t.dependencies.get(e);
			if (i) for (let n of [...i]) {
				t.targetedVisits += 1;
				let i = t.records.get(n);
				if (!i) continue;
				let a = i.target.deref();
				a && r && !r(a) || (a && a.invalidateLifetime(n, e), kn(t, n));
			}
		},
		maintain() {
			if (t.disposed || t.head === void 0) return;
			let e = t.cursor ?? t.head;
			for (let n = 0; n < wn && t.head !== void 0; n += 1) {
				let n = t.records.get(e);
				if (!n) {
					e = t.head;
					continue;
				}
				t.maintenanceVisits += 1;
				let r = n.next ?? t.head;
				if (n.target.deref() || kn(t, e), t.head === void 0) break;
				e = t.records.has(r) ? r : t.head;
			}
			t.cursor = t.head === void 0 ? void 0 : e;
		},
		dispose() {
			if (!t.disposed) {
				t.disposed = !0, n.destroyEpoch++;
				for (let e of t.markerRefs.values()) t.markerFinalizer.unregister(e), e.deref()?.unsubscribe?.();
				t.markerRefs.clear();
				for (let e of [...t.records.keys()]) kn(t, e);
				t.dependencies.clear(), t.head = void 0, t.cursor = void 0;
			}
		}
	};
	return Tn.set(n, t), n;
}
function Dn(e, t, n, r, i) {
	return e(() => {
		if (t.destroyed) return;
		t.destroyed = !0;
		let e = i.deref(), a = e && Tn.get(e);
		e && a && (a.markerFinalizer.unregister(r), a.markerRefs.delete(n), e.destroyEpoch++, e.invalidate(t.dependency));
	});
}
function On(e, t) {
	if (e.head === void 0) t.previous = t.id, t.next = t.id, e.head = t.id, e.cursor = t.id;
	else {
		let n = e.records.get(e.head), r = e.records.get(n.previous);
		t.previous = r.id, t.next = n.id, r.next = t.id, n.previous = t.id;
	}
	e.records.set(t.id, t);
}
function kn(e, t) {
	let n = e.records.get(t);
	if (n) {
		e.finalizer.unregister(n.token);
		for (let r of n.dependencies) {
			let n = e.dependencies.get(r);
			n?.delete(t), n?.size === 0 && e.dependencies.delete(r);
		}
		if (n.next === t) e.head = void 0, e.cursor = void 0;
		else {
			let r = e.records.get(n.previous), i = e.records.get(n.next);
			r && (r.next = n.next), i && (i.previous = n.previous), e.head === t && (e.head = n.next), e.cursor === t && (e.cursor = n.next);
		}
		e.records.delete(t);
	}
}
//#endregion
//#region node_modules/vgpu/dist/bind-cache.js
var An = "uniform-page", jn = class {
	cache;
	shard;
	group;
	layout;
	key;
	capture;
	bindGroup;
	record;
	used = ++Nn;
	constructor(e, t, n, r, i, a, o) {
		this.cache = e, this.shard = t, this.group = n, this.layout = r, this.key = i, this.capture = a, this.bindGroup = o;
	}
	invalidateLifetime() {
		Un(this.cache, this);
	}
}, Mn = /* @__PURE__ */ new WeakMap(), Nn = 0;
function Pn() {
	return Nn;
}
function Fn() {
	let e = {
		lifetime: En(),
		shards: /* @__PURE__ */ new WeakMap(),
		disposed: !1
	}, t = {
		lifetime: e.lifetime,
		getOrCreate(t, n, r, i, a, o, s = Vn(i)) {
			let c = e.shards.get(t);
			c || (c = {
				groups: /* @__PURE__ */ new Map(),
				lru: /* @__PURE__ */ new Map(),
				captures: /* @__PURE__ */ new Map()
			}, e.shards.set(t, c));
			let l = c.groups.get(n);
			l || c.groups.set(n, l = /* @__PURE__ */ new Map());
			let u = l.get(r);
			u || l.set(r, u = /* @__PURE__ */ new Map());
			let d = u.get(s);
			if (d) return d.used = ++Nn, d.bindGroup;
			let f = i.some(({ key: e }) => Hn(e)), p = new jn(e, new WeakRef(c), n, r, s, f, o());
			if (u.set(s, p), c.lru.set(p, !0), p.record = e.lifetime.register(p, a.map(zn)), f) {
				let t = c.captures.get(n);
				t || c.captures.set(n, t = /* @__PURE__ */ new Map()), t.set(p, !0), t.size > 16 && Un(e, Bn(t));
			}
			return c.lru.size > 64 && Un(e, Bn(c.lru)), p.bindGroup;
		},
		marker(t, n, r) {
			return e.lifetime.marker(t, zn(n), r);
		},
		evictIdentity(t, n) {
			e.lifetime.invalidate(zn(t), n === void 0 ? void 0 : (e) => !(e instanceof jn) || e.used <= n);
		},
		clearOwner(t, n) {
			e.lifetime.maintain();
			let r = e.shards.get(t);
			if (r) {
				for (let t of [...r.lru.keys()]) (n === void 0 || t.group === n) && Un(e, t);
				n === void 0 && e.shards.delete(t);
			}
		},
		dispose() {
			e.disposed || (e.disposed = !0, e.shards = /* @__PURE__ */ new WeakMap(), e.lifetime.dispose());
		}
	};
	return Mn.set(t, e), t;
}
var In = /* @__PURE__ */ new WeakMap(), Ln = 0;
function Rn(e) {
	if (typeof e == "string" || typeof e == "number") return `${typeof e}:${String(e)}`;
	let t = In.get(e);
	return t === void 0 && (t = `${e.kind}:${e.id}`, "offset" in e && (t += `@${e.offset}+${e.size}`), In.set(e, t)), t;
}
function zn(e) {
	return typeof e == "string" || typeof e == "number" ? `${typeof e}:${String(e)}` : `${e.kind}:${e.id}`;
}
function Bn(e) {
	let t;
	for (let n of e.keys()) (!t || n.used < t.used) && (t = n);
	return t;
}
function Vn(e) {
	Ln++;
	let t = !0;
	for (let n = 1; n < e.length; n++) e[n - 1].binding > e[n].binding && (t = !1);
	let n = t ? e : [...e].sort((e, t) => e.binding - t.binding), r = "";
	for (let { binding: e, key: t } of n) {
		let n = Rn(t);
		r += `${e}:${n.length}:${n}`;
	}
	return r;
}
function Hn(e) {
	return typeof e == "object" && e.kind === "uniform-page";
}
function Un(e, t) {
	e.lifetime.unregister(t.record), t.record = void 0;
	let n = t.shard.deref();
	if (!n) return;
	let r = n.groups.get(t.group), i = r?.get(t.layout);
	if (i?.get(t.key) !== t) return;
	i.delete(t.key), n.lru.delete(t);
	let a = t.capture ? n.captures.get(t.group) : void 0;
	a?.delete(t), a?.size === 0 && n.captures.delete(t.group), i.size === 0 && r.delete(t.layout), r?.size === 0 && n.groups.delete(t.group);
}
//#endregion
//#region node_modules/vgpu/dist/entry-metadata.js
function Wn(e, t, n) {
	let r = e[t];
	if (!r) throw new S({
		code: "VGPU-REFLECT-ENTRY-METADATA-MISSING",
		message: `Entry point '${e.name}' has no reflected ${t}.`,
		fix: "Pass the reflection from reflectSource()/resolveShader().",
		where: n
	});
	return r;
}
//#endregion
//#region node_modules/vgpu/dist/claim-validation.js
var Gn = /* @__PURE__ */ new WeakMap();
function Kn(e, t) {
	if (!e.gpu.pushErrorScope || !e.gpu.popErrorScope) return;
	e.gpu.pushErrorScope("validation");
	let n = Gn.get(e.gpu);
	n ? n.push(t) : Gn.set(e.gpu, [t]);
}
function k(e) {
	let t = Gn.get(e.gpu);
	if (!t?.length || !e.gpu.popErrorScope) return;
	let n = t.pop();
	return t.length || Gn.delete(e.gpu), {
		context: n,
		error: e.gpu.popErrorScope()
	};
}
function qn(e) {
	let t = [], n = k(e);
	for (; n;) t.push(n), n = k(e);
	return t;
}
function Jn(e) {
	let t = k(e);
	t && er(t);
}
function Yn(e) {
	for (let t of qn(e)) er(t);
}
function A(e) {
	for (let t of e) er(t);
}
function Xn(e, t = [], n = {}) {
	return $n(e, t, n.errorSink ?? tr);
}
function Zn(e, t) {
	return {
		context: e.context,
		error: Qn(e.error, t.error)
	};
}
async function Qn(e, t) {
	let n = await Promise.allSettled([e, t]);
	for (let e of n) if (e.status === "fulfilled" && e.value) return e.value;
	let r = n.find((e) => e.status === "rejected");
	if (r?.status === "rejected") throw r.reason;
	return null;
}
async function $n(e, t, n) {
	await tn(e);
	for (let e of t) try {
		let t = await e.error;
		t && await n(et(e.context.label, e.context.group, t));
	} catch (t) {
		await n(et(e.context.label, e.context.group, t));
	}
}
function er(e) {
	e.error.catch(() => void 0);
}
function tr(e) {
	console.error(e);
}
//#endregion
//#region node_modules/vgpu/dist/claim-validation-encode.js
function nr(e, t, n, r) {
	try {
		t.end();
	} catch (t) {
		let i = qn(e);
		A(n), A(i), n.length = 0;
		let a = i[0]?.context ?? r;
		throw a ? et(a.label, a.group, t) : t;
	}
}
//#endregion
//#region node_modules/vgpu/dist/binding-views.js
var rr = class {
	views = /* @__PURE__ */ new Map();
	registered = /* @__PURE__ */ new WeakSet();
	destroyed = !1;
	invalidateLifetime() {
		this.destroyed = !0, this.views.clear();
	}
}, ir = /* @__PURE__ */ new WeakMap();
function ar(e, t, n, r) {
	let i = or(e, t);
	if (i.defaultEquivalent) return {
		view: e.view,
		key: i.key
	};
	e.view, r.limits;
	let a = ir.get(e);
	if (a || (a = new rr(), ir.set(e, a)), !a.registered.has(n.lifetime)) {
		let t = n.marker(e, e.resourceIdentity, (t) => e.onDestroy(t));
		n.lifetime.register(a, [t.dependency]), a.registered.add(n.lifetime);
	}
	if (a.destroyed) return {
		view: e.createView(t),
		key: i.key
	};
	let o = a.views.get(i.key)?.deref();
	return o || (o = e.createView(t), a.views.set(i.key, new WeakRef(o))), {
		view: o,
		key: i.key
	};
}
function or(e, t) {
	let n = t?.dimension ?? sr(e), r = t?.baseMipLevel ?? 0, i = t?.mipLevelCount ?? e.mipLevelCount - r, a = t?.baseArrayLayer ?? 0, o = t?.arrayLayerCount ?? cr(e, n, a), s = t?.aspect ?? "all", c = t?.usage === void 0 || t.usage === 0 ? e.gpu.usage : t.usage, l = t?.swizzle ?? "rgba", u = {
		format: t?.format ?? "@default",
		dimension: n,
		aspect: s,
		baseMipLevel: r,
		mipLevelCount: i,
		baseArrayLayer: a,
		arrayLayerCount: o,
		usage: c,
		swizzle: l
	}, d = {
		format: "@default",
		dimension: sr(e),
		aspect: "all",
		baseMipLevel: 0,
		mipLevelCount: e.mipLevelCount,
		baseArrayLayer: 0,
		arrayLayerCount: cr(e, sr(e), 0),
		usage: e.gpu.usage,
		swizzle: "rgba"
	};
	return {
		key: JSON.stringify(u),
		defaultEquivalent: JSON.stringify(u) === JSON.stringify(d)
	};
}
function sr(e) {
	return e.kind === "2d-array" ? "2d-array" : e.kind;
}
function cr(e, t, n) {
	return t === "2d-array" || t === "cube" || t === "cube-array" ? e.layers - n : 1;
}
//#endregion
//#region node_modules/vgpu/dist/set-resources.js
var lr = 1, ur = /* @__PURE__ */ new WeakMap();
function dr(e) {
	return typeof e != "object" || !e || ArrayBuffer.isView(e) || e instanceof ArrayBuffer || Array.isArray(e) ? !0 : e instanceof g || e instanceof x || mn(e) || Rr(e) || Lr(e) ? !1 : !Nr(e);
}
function fr(e) {
	return typeof e != "object" || !e || Array.isArray(e) || ArrayBuffer.isView(e) || e instanceof ArrayBuffer || e instanceof g || e instanceof x || mn(e) || Rr(e) || Lr(e) ? !1 : !Nr(e);
}
function pr(e, t, n) {
	hr(e, t, n.sourceHint);
	try {
		return mr(e, t, n);
	} catch (r) {
		let i = r?.code;
		if (i === "VGPU-CORE-TEXTURE-DESTROYED" || i === "VGPU-BUFFER-DISPOSED") {
			let r = i === "VGPU-BUFFER-DISPOSED" ? jr(t) : t instanceof x ? t.label : Mr(t)?.color.label;
			throw qe(n.sourceHint, e, r);
		}
		throw r;
	}
}
function mr(e, t, n) {
	switch (hr(e, t, n.sourceHint), e.bindingLayout?.kind) {
		case "buffer": return gr(e, t, n);
		case "texture": return br(e, t, n);
		case "sampler": return Tr(e, t);
		case "storageTexture": return xr(e, t, n);
		case "externalTexture": throw T(e, "external texture", "Pass a compatible GPUExternalTexture.");
		default: throw T(e, "reflected resource", "Fix shader reflection bindingLayout.");
	}
}
function hr(e, t, n) {
	if (gn(t)) throw Ke(n, e);
}
function gr(e, t, n) {
	let r = mn(t);
	if (r) return _r(e, r[pn](e, n.sourceHint), n);
	if (t instanceof g) return en(t, `${n.sourceHint}.set`), _r(e, {
		resourceLabel: t.options.label ?? t.gpu.label,
		resource: { buffer: t.gpu },
		identity: t.resourceIdentity,
		tracked: [Ar(t, t.resourceIdentity)]
	}, n);
	if (Fr(t)) return en(t.buffer, `${n.sourceHint}.set`), _r(e, {
		resourceLabel: t.buffer.options.label ?? t.buffer.gpu.label,
		resource: {
			buffer: t.gpu,
			offset: 0,
			size: t.size
		},
		identity: t.buffer.resourceIdentity,
		tracked: [Ar(t.buffer, t.buffer.resourceIdentity)]
	}, n);
	if (Lr(t)) return _r(e, {
		resource: t,
		identity: j(t.buffer)
	}, n);
	if (Rr(t)) return _r(e, {
		resource: { buffer: t },
		identity: j(t)
	}, n);
	throw T(e, "buffer", `Pass a compatible Buffer/Uniform: ${e.name}.set({ ${e.name}: gpu.device.createBuffer(...) }).`);
}
function _r(e, t, n) {
	if (!Lr(t.resource)) return t;
	let { buffer: r } = t.resource, i = t.resource.offset === void 0 ? 0 : t.resource.offset, a = t.resource.size === void 0 ? r.size - i : t.resource.size;
	return vr(e, r, i, a, n.device.limits, t.tracked !== void 0), {
		...t,
		resource: {
			buffer: r,
			offset: i,
			size: a
		},
		identity: yr(r, i, a),
		underlyingBuffer: r
	};
}
function vr(e, t, n, r, i, a) {
	let o = e.bindingLayout?.kind === "buffer" ? e.bindingLayout.buffer : void 0, s = o?.type === "storage" || o?.type === "read-only-storage", c = s ? "storage" : "uniform", l = globalThis.GPUBufferUsage?.[s ? "STORAGE" : "UNIFORM"] ?? (s ? 128 : 64), u = s ? i.minStorageBufferOffsetAlignment : i.minUniformBufferOffsetAlignment, d = s ? i.maxStorageBufferBindingSize : i.maxUniformBufferBindingSize, f = Math.max(o?.minBindingSize ?? 0, e.layout?.size ?? 0), p = `Create the buffer with ${c} usage and use a safe integer offset aligned to ${u} bytes plus a positive size from ${Math.max(1, f)} to ${d} bytes within buffer.size.`, m = (t) => {
		throw T(e, `a valid ${c} buffer range (${t})`, p);
	};
	if ((t.usage & l) === 0) {
		let t = a ? `Create with usage: ['${c}','copy_dst'].` : p;
		throw T(e, `a valid ${c} buffer range (buffer usage is missing ${c})`, t);
	}
	(!Number.isFinite(n) || !Number.isSafeInteger(n) || n < 0) && m("offset must be a non-negative safe integer"), (!Number.isFinite(r) || !Number.isSafeInteger(r) || r <= 0) && m("size must be a positive safe integer"), n > t.size && m("offset exceeds buffer.size"), r > t.size - n && m("offset + size exceeds buffer.size"), n % u !== 0 && m(`offset must be aligned to ${u} bytes`), r < f && m(`size is below the reflected minimum of ${f} bytes`), r > d && m(`size exceeds the granted maximum of ${d} bytes`), s && r % 4 != 0 && m("storage size must be a multiple of 4 bytes");
}
function yr(e, t, n) {
	return `buffer-range:${JSON.stringify([
		Rn(j(e)),
		t,
		n
	])}`;
}
function br(e, t, n) {
	let r = e.bindingLayout?.kind === "texture" && e.bindingLayout.texture.sampleType === "depth", i = Mr(t);
	if (i) {
		if (r && !i.depth) throw T(e, "a target with a depth attachment", `Create it with target(gpu, { size, depth: true }) or bind a Texture: set({ ${e.name}: scene.depth }).`);
		let t = r ? i.depth : i.color;
		Or(e, t, n);
		let a = ar(t, kr(t), n.cache, n.device);
		return {
			resourceLabel: t.label,
			resource: a.view,
			identity: t.resourceIdentity,
			cacheIdentity: Pr(t.resourceIdentity, a.key),
			tracked: [Ar(i, i.resourceIdentity), Ar(t, t.resourceIdentity)],
			followedTarget: {
				target: i,
				depth: r
			}
		};
	}
	if (t instanceof x) {
		Dr(e, t.usage), Or(e, t, n);
		let r = ar(t, kr(t), n.cache, n.device);
		return {
			resourceLabel: t.label,
			resource: r.view,
			identity: t.resourceIdentity,
			cacheIdentity: Pr(t.resourceIdentity, r.key),
			tracked: [Ar(t, t.resourceIdentity)]
		};
	}
	if (Ir(t)) return {
		resource: t.createView(),
		identity: t.resourceIdentity ?? j(t)
	};
	if (typeof t == "object" && t) return {
		resource: t,
		identity: j(t)
	};
	throw T(e, "texture/target", `Pass a Texture or Target: ${e.name}.set({ ${e.name}: scene.color }) or set({ ${e.name}: scene }).`);
}
function xr(e, t, n) {
	let r = e.bindingLayout?.kind === "storageTexture" ? e.bindingLayout.storageTexture : void 0, i = {
		format: r?.format,
		viewDimension: r?.viewDimension ?? "2d"
	}, a = `texture(gpu, { kind: "${i.viewDimension}", size${i.viewDimension === "2d-array" ? ", layers" : ""}, format: "${i.format ?? "rgba8unorm"}", usage: ["storage_binding"] })`;
	if (Mr(t)) throw T(e, "a storage texture, not a Target", `Render targets are not storage textures. Create one with ${a} and set({ ${e.name}: texture }).`);
	if (t instanceof x) {
		Sr(e, t, i, a);
		let r = ar(t, Cr(i.viewDimension), n.cache, n.device);
		return {
			resourceLabel: t.label,
			resource: r.view,
			identity: t.resourceIdentity,
			cacheIdentity: Pr(t.resourceIdentity, r.key),
			tracked: [Ar(t, t.resourceIdentity)]
		};
	}
	if (Ir(t)) return {
		resource: t.createView(Cr(i.viewDimension)),
		identity: t.resourceIdentity ?? j(t)
	};
	if (typeof t == "object" && t) return {
		resource: t,
		identity: j(t)
	};
	throw T(e, "a storage texture", `Pass a Texture from ${a}: set({ ${e.name}: texture }).`);
}
function Sr(e, t, n, r) {
	let i = t.label ?? "texture";
	if (!t.usage.includes("storage_binding")) throw T(e, "a texture with storage_binding usage", `Create it with ${r}; include texture_binding too if you also sample it.`);
	if (n.format && t.format !== n.format) throw T(e, `format ${n.format}`, `Texture '${i}' is ${t.format}. Create it with ${r} or declare texture_storage_${n.viewDimension.replace("-", "_")}<${t.format}, ...> in WGSL.`);
	let a = wr(n.viewDimension);
	if (a && t.dimension !== a) throw T(e, `dimension "${a}"`, `Texture '${i}' has kind "${t.kind}". Create it with ${r}.`);
}
function Cr(e) {
	return {
		dimension: e,
		baseMipLevel: 0,
		mipLevelCount: 1
	};
}
function wr(e) {
	switch (e) {
		case "1d": return "1d";
		case "2d":
		case "2d-array": return "2d";
		case "3d": return "3d";
		default: return;
	}
}
function Tr(e, t) {
	if (Er(t)) return {
		resource: t,
		identity: j(t)
	};
	throw T(e, "sampler", `Use the cached sampler: set({ ${e.name}: sampler(gpu) }).`);
}
function Er(e) {
	return typeof e != "object" || !e || e instanceof g || e instanceof x ? !1 : !Rr(e) && !Lr(e) && !Ir(e) && !Mr(e);
}
function Dr(e, t) {
	if (!t.includes("texture_binding") && !t.includes("render_attachment")) throw T(e, "sampled texture", "Use texture_binding usage or a sampleable Target.");
}
function Or(e, t, n) {
	if (n.filterableTexture && !n.float32Filterable && (t.format === "r32float" || t.format === "rg32float" || t.format === "rgba32float")) throw Ye(n.sourceHint, e, t.format, t.label ?? "texture", n.pairedSampler);
}
function kr(e) {
	return e.format.includes("stencil") ? { aspect: "depth-only" } : void 0;
}
function Ar(e, t) {
	return {
		resource: e,
		identity: t,
		subscribe: (t) => e.onDestroy(t)
	};
}
function jr(e) {
	try {
		let t = e instanceof g ? e : typeof e == "object" && e && "buffer" in e ? e.buffer : void 0;
		return t instanceof g ? t.options.label ?? t.gpu.label : void 0;
	} catch {
		return;
	}
}
function Mr(e) {
	if (typeof e != "object" || !e) return;
	let t = e;
	if (t.resourceIdentity && t.color && typeof t.onDestroy == "function") return t;
}
function Nr(e) {
	let t = e;
	return "gpu" in t || "bindGroup" in t || "createView" in t || "resourceIdentity" in t;
}
function j(e) {
	if (typeof e != "object" || !e) return `value:${String(e)}`;
	let t = ur.get(e);
	return t || (t = {
		kind: "external",
		id: lr++
	}, ur.set(e, t)), t;
}
function Pr(e, t) {
	return `texture-view:${JSON.stringify([Rn(e), t])}`;
}
function Fr(e) {
	return typeof e == "object" && !!e && "gpu" in e && "size" in e && "buffer" in e && e.buffer instanceof g;
}
function Ir(e) {
	return typeof e == "object" && !!e && typeof e.createView == "function";
}
function Lr(e) {
	return typeof e == "object" && !!e && "buffer" in e && Rr(e.buffer);
}
function Rr(e) {
	if (typeof e != "object" || !e) return !1;
	let t = e;
	return Number.isSafeInteger(t.size) && t.size >= 0 && typeof t.usage == "number" && typeof t.destroy == "function" && typeof t.mapAsync == "function" && typeof t.getMappedRange == "function" && typeof t.unmap == "function";
}
//#endregion
//#region node_modules/vgpu/dist/bytes-equal.js
function zr(e, t) {
	let n = e instanceof Uint8Array ? e : new Uint8Array(e), r = t instanceof Uint8Array ? t : new Uint8Array(t);
	if (n.byteLength !== r.byteLength) return !1;
	for (let e = 0; e < n.byteLength; e++) if (n[e] !== r[e]) return !1;
	return !0;
}
//#endregion
//#region node_modules/vgpu/dist/set-packing.js
function Br(e, t) {
	Vr(e), Xr(e, t, "$", 0, e.size);
	let n = new ArrayBuffer(e.size);
	return Hr(new DataView(n), e, 0, t), n;
}
function Vr(e) {
	if (e.size === void 0) throw E("set", `No se puede inferir byteLength para layout runtime-sized '${e.name}'.`);
}
function Hr(e, t, n, r) {
	if (t.members) return Ur(e, t.members, n, r);
	Wr(e, t, n, r);
}
function Ur(e, t, n, r) {
	let i = r;
	for (let r of t) Hr(e, r.layout, n + r.offset, i?.[r.name]);
}
function Wr(e, t, n, r) {
	switch (t.type.kind) {
		case "scalar": return Gr(e, n, t.type.name, r);
		case "atomic": return Kr(e, n, t.type, r);
		case "vector": return qr(e, n, t.type, r);
		case "matrix": return Jr(e, t, n, r);
		case "array": return Yr(e, t, n, r);
		default: throw E("set", `No hay writer para layout ${t.type.kind}.`);
	}
}
function Gr(e, t, n, r) {
	n === "f32" ? e.setFloat32(t, r, !0) : n === "i32" ? e.setInt32(t, r, !0) : n === "u32" || n === "bool" ? e.setUint32(t, n === "bool" ? +!!r : r, !0) : e.setUint16(t, li(r), !0);
}
function Kr(e, t, n, r) {
	Gr(e, t, N(n.element), r);
}
function qr(e, t, n, r) {
	let i = r, a = ci(n.element);
	for (let r = 0; r < n.width; r++) Gr(e, t + r * a, N(n.element), i?.[r] ?? 0);
}
function Jr(e, t, n, r) {
	let i = t.type, a = r, o = ci(i.element), s = t.stride ?? 16;
	for (let t = 0; t < i.columns; t++) for (let r = 0; r < i.rows; r++) Gr(e, n + t * s + r * o, N(i.element), a?.[t * i.rows + r] ?? 0);
}
function Yr(e, t, n, r) {
	let i = r, a = t.stride ?? t.element?.size ?? 0;
	if (!t.element) throw E("set", "Array layout sin element layout.");
	for (let r = 0; r < i.length; r++) Hr(e, t.element, n + r * a, i[r]);
}
function Xr(e, t, n, r, i) {
	if (e.members) {
		Zr(e.members, t, n, r, i);
		return;
	}
	switch (e.type.kind) {
		case "scalar":
			ti(e.type.name, t, n), ii(n, r, ci(e.type), i);
			return;
		case "atomic":
			ti(N(e.type.element), t, n), ii(n, r, 4, i);
			return;
		case "vector":
			Qr(e.type, t, n, r, i);
			return;
		case "matrix":
			$r(e, t, n, r, i);
			return;
		case "array":
			ei(e, t, n, r, i);
			return;
		default: throw E("set", `No hay validator para layout ${e.type.kind}.`);
	}
}
function Zr(e, t, n, r, i) {
	oi(t) || M("type", n, "an object", si(t));
	let a = new Set(e.map((e) => e.name)), o = Object.keys(t).find((e) => !a.has(e));
	o !== void 0 && M("unknown-field", `${n}.${o}`, "a declared field", o);
	for (let a of e) {
		let e = `${n}.${a.name}`;
		Object.hasOwn(t, a.name) || M("missing-field", e, "a required field", "missing"), Xr(a.layout, t[a.name], e, r + a.offset, i);
	}
}
function Qr(e, t, n, r, i) {
	let a = ni(t, n, e.width), o = N(e.element), s = ci(e.element);
	for (let t = 0; t < e.width; t++) ti(o, a[t], `${n}[${t}]`), ii(`${n}[${t}]`, r + t * s, s, i);
}
function $r(e, t, n, r, i) {
	let a = e.type, o = ni(t, n, a.columns * a.rows), s = N(a.element), c = ci(a.element), l = e.stride;
	if (l === void 0) throw E("set", `Matrix layout '${e.name}' sin stride.`);
	for (let e = 0; e < a.columns; e++) for (let t = 0; t < a.rows; t++) {
		let u = e * a.rows + t, d = `${n}[${e}][${t}]`;
		ti(s, o[u], d), ii(d, r + e * l + t * c, c, i);
	}
}
function ei(e, t, n, r, i) {
	let a = ri(t, n), o = e.type;
	o.count !== void 0 && a.length !== o.count && M("shape", n, o.count, a.length);
	let s = e.stride;
	if (s === void 0 || !e.element) throw E("set", `Array layout '${e.name}' sin stride o element layout.`);
	if (e.runtimeSized) {
		let t = ai(s, a.length, n), o = e.size ?? i - r;
		o !== t && M("extent", n, t, o);
	}
	for (let t = 0; t < a.length; t++) Xr(e.element, a[t], `${n}[${t}]`, r + t * s, i);
}
function ti(e, t, n) {
	if (e === "bool") {
		typeof t != "boolean" && M("type", n, "bool", si(t), e);
		return;
	}
	typeof t != "number" && M("type", n, e, si(t), e), e === "i32" && (!Number.isInteger(t) || t < -2147483648 || t > 2147483647) && M("integer-range", n, "an integer in [-2147483648, 2147483647]", String(t), e), e === "u32" && (!Number.isInteger(t) || t < 0 || t > 4294967295) && M("integer-range", n, "an integer in [0, 4294967295]", String(t), e);
}
function ni(e, t, n) {
	let r = ri(e, t);
	return r.length !== n && M("shape", t, n, r.length), r;
}
function ri(e, t) {
	if (Array.isArray(e) || ArrayBuffer.isView(e) && !(e instanceof DataView) && "length" in e) return e;
	M("type", t, "an array or typed array", si(e));
}
function ii(e, t, n, r) {
	(!Number.isSafeInteger(t) || !Number.isSafeInteger(n) || t < 0 || n < 0 || t > r - n) && M("buffer-range", e, `${n} bytes inside ${r}`, t);
}
function ai(e, t, n) {
	let r = e * t;
	return (!Number.isSafeInteger(e) || e < 0 || !Number.isSafeInteger(r)) && M("extent", n, "a safe byte extent", String(r)), r;
}
function M(e, t, n, r, i) {
	let a = e === "shape" ? `expected exactly ${n} values, received ${r}` : e === "missing-field" ? "required field is missing" : e === "unknown-field" ? `field '${r}' is not declared by the layout` : e === "integer-range" ? `${r} is outside the exact ${i} range` : e === "extent" ? `runtime extent requires ${n} bytes, received ${r}` : e === "buffer-range" ? `write at byte ${r} exceeds ${n}` : `expected ${n}, received ${r}`;
	throw Yt(i === void 0 ? {
		reason: e,
		path: t,
		expected: n,
		actual: r
	} : {
		reason: e,
		path: t,
		expected: n,
		actual: r,
		type: i
	}, a);
}
function oi(e) {
	if (typeof e != "object" || !e || Array.isArray(e) || ArrayBuffer.isView(e)) return !1;
	let t = Object.getPrototypeOf(e);
	return t === Object.prototype || t === null;
}
function si(e) {
	return e === null ? "null" : Array.isArray(e) ? "array" : ArrayBuffer.isView(e) ? e.constructor.name : typeof e;
}
function ci(e) {
	return N(e) === "f16" ? 2 : 4;
}
function N(e) {
	if (e.kind !== "scalar") throw E("set", `Expected scalar, got ${e.kind}`);
	return e.name;
}
function li(e) {
	let t = /* @__PURE__ */ new Float32Array(1), n = new Uint32Array(t.buffer);
	t[0] = e;
	let r = n[0], i = r >> 16 & 32768, a = r & 8388607, o = r >> 23 & 255;
	if (o === 255) return i | (a ? 32256 : 31744);
	let s = o - 127 + 15;
	if (s >= 31) return i | 31744;
	if (s <= 0) return s < -10 ? i : i | ui(a | 8388608, 14 - s);
	let c = ui(a, 13);
	if (c === 1024) {
		let e = s + 1;
		return e >= 31 ? i | 31744 : i | e << 10;
	}
	return i | s << 10 | c;
}
function ui(e, t) {
	let n = e >>> t, r = e & (1 << t) - 1, i = 1 << t - 1;
	return r > i || r === i && (n & 1) == 1 ? n + 1 : n;
}
//#endregion
//#region node_modules/vgpu/dist/native-validation.js
function di(e, t) {
	let n = e.gpu, r = typeof n.pushErrorScope == "function" && typeof n.popErrorScope == "function";
	r && n.pushErrorScope("validation");
	let i = r, a = () => {
		if (!i) return Promise.resolve(null);
		i = !1;
		try {
			return n.popErrorScope().then((e) => e, (e) => e);
		} catch (e) {
			return Promise.resolve(e);
		}
	};
	try {
		return {
			value: t(),
			error: a()
		};
	} catch (e) {
		throw a(), e;
	}
}
var fi = /* @__PURE__ */ new WeakMap();
function pi(e, t, n = []) {
	let r;
	try {
		r = di(e, t);
	} catch (e) {
		throw e instanceof S ? e : At("pipeline.setup", e);
	}
	let { value: i, error: a } = r;
	return fi.set(i, {
		error: Promise.all([mi(n), a]).then((e) => e.find(Boolean) ?? null),
		claimed: !1
	}), i;
}
function mi(e) {
	return Promise.all(e.map((e) => {
		let t = fi.get(e);
		return t && (t.claimed = !0), t?.error;
	})).then((e) => e.find(Boolean) ?? null);
}
async function hi(e, t, n) {
	let r = fi.get(e), i = await r?.error;
	i && !r?.claimed && await n(At(t, i));
}
function gi(e, t, n, r, i) {
	try {
		let { value: a, error: o } = di(e, r);
		return t.push({
			error: o,
			where: n,
			origin: i
		}), a;
	} catch (e) {
		throw e instanceof S ? e : _i(n, e);
	}
}
function _i(e, t) {
	return new S({
		code: "VGPU-COMPUTE-VALIDATION",
		message: "WebGPU compute operation failed validation.",
		where: e,
		cause: t,
		fix: "Check pipeline compilation, resource compatibility, dispatch counts, and device limits."
	});
}
async function vi(e, t) {
	let n = await Promise.all(e.map((e) => e.origin?.())), r = !1;
	for (let [i, a] of e.entries()) {
		let e = await a.error;
		if (n[i]) {
			r = !0;
			continue;
		}
		e && (!r || a.origin) && (await t(_i(a.where, e)), r = !0);
	}
}
//#endregion
//#region node_modules/vgpu/dist/set-layouts.js
var yi = /* @__PURE__ */ new WeakMap();
function bi(e, t) {
	let n = /* @__PURE__ */ new Map(), r = /* @__PURE__ */ new Set(), i = /* @__PURE__ */ new Set(), a = new Set(e.filter((e) => e.bindingLayout?.kind === "texture" && e.bindingLayout.texture.sampleType === "depth").map((e) => `${e.group}:${e.binding}`));
	for (let e of t) {
		let t = e.stage === "vertex" ? 1 : e.stage === "fragment" ? 2 : 4;
		for (let r of Wn(e, "bindings", "visibility")) {
			let e = `${r.group}:${r.binding}`;
			n.set(e, (n.get(e) ?? 0) | t);
		}
		for (let t of Wn(e, "samplingPairs", "visibility")) {
			if (t.mode !== "filtering") continue;
			let e = `${t.texture.group}:${t.texture.binding}`;
			a.has(e) ? i.add(`${t.sampler.group}:${t.sampler.binding}`) : r.add(e);
		}
	}
	let o = (e) => n.get(`${e.group}:${e.binding}`) ?? 0;
	return Object.defineProperty(o, "filterable", { value: r }), Object.defineProperty(o, "nonFilteringSamplers", { value: i }), o;
}
function xi(e, t, n = Di) {
	return e.flatMap((e) => {
		if (e.group !== t) return [];
		let r = n(e), i = `${e.group}:${e.binding}`;
		return r === 0 ? [] : [{
			binding: e.binding,
			visibility: r,
			...Ti(e, n.filterable?.has(i) ?? !1, n.nonFilteringSamplers?.has(i) ?? !1)
		}];
	});
}
function Si(e, t, n, r = Di) {
	let i = /* @__PURE__ */ new Map(), a = n.bindings.filter((e) => r(e) !== 0).map((e) => e.group), o = Math.max(-1, ...a);
	for (let a = 0; a <= o; a++) i.set(a, Ci(e, t, n, a, r));
	return i;
}
function Ci(e, t, n, r, i = Di) {
	return wi(e, `${t}.group${r}.bgl`, xi(n.bindings, r, i));
}
function wi(e, t, n) {
	let r = yi.get(e.gpu);
	r || (r = /* @__PURE__ */ new Map(), yi.set(e.gpu, r));
	let i = JSON.stringify(n), a = r.get(i);
	if (a) return a;
	let o = He(pi(e, () => e.gpu.createBindGroupLayout({
		label: t,
		entries: n
	})), { entries: n });
	return r.set(i, o), o;
}
function Ti(e, t, n) {
	let r = e.bindingLayout;
	if (!r) throw E("bindGroupLayout", `Binding '${e.name}' does not have a reflected bindingLayout.`);
	return t && r.kind === "texture" && r.texture.sampleType === "unfilterable-float" && !r.texture.multisampled ? { texture: {
		...r.texture,
		sampleType: "float"
	} } : n && r.kind === "sampler" && r.sampler.type === "filtering" ? { sampler: { type: "non-filtering" } } : Ei(r);
}
function Ei(e) {
	switch (e.kind) {
		case "buffer": return { buffer: { ...e.buffer } };
		case "sampler": return { sampler: { ...e.sampler } };
		case "texture": return { texture: { ...e.texture } };
		case "storageTexture": return { storageTexture: { ...e.storageTexture } };
		case "externalTexture": return { externalTexture: {} };
	}
}
function Di(e) {
	let t = globalThis.GPUShaderStage, n = t?.VERTEX ?? 1, r = t?.FRAGMENT ?? 2, i = t?.COMPUTE ?? 4;
	return e.kind === "buffer" ? n | r | i : r | i;
}
//#endregion
//#region node_modules/vgpu/dist/set-core.js
var Oi = Object.freeze([]), ki = /* @__PURE__ */ new WeakMap(), Ai = Symbol("no cleanup failure");
function ji(e) {
	let t = e, n = e.label, r = e.disposedError, i = Ni(e.reflection), a = [...e.bindGroupLayouts.keys()].sort((e, t) => e - t), o = /* @__PURE__ */ new Map(), s = {}, c = /* @__PURE__ */ new Map(), l = {
		fullVerifications: 0,
		groupPlanBuilds: 0
	}, u = -1, d = [], f = /* @__PURE__ */ new Map();
	_();
	function p() {
		u = -1, f.clear();
	}
	function m(e) {
		if (!t) throw r(e);
		return t;
	}
	function h(e) {
		m("set");
		let t = [];
		for (let [n, r] of Object.entries(e)) t.push(...ee(n, r));
		return t;
	}
	function g(e) {
		return c.get(e.info.group)?.active.has(e.info.binding) ?? !1;
	}
	function _() {
		let e = m("layout");
		for (let [t, n] of e.bindGroupLayouts) {
			let r = c.get(t);
			if (r?.layout === n) continue;
			r && (e.cache.clearOwner(s, t), p());
			let i = new Set(Ue(n)?.entries.map((e) => e.binding) ?? []), a = e.reflection.bindings.filter((e) => e.group === t && i.has(e.binding));
			c.set(t, {
				layout: n,
				active: i,
				bindings: a
			});
		}
	}
	function ee(e, t) {
		let r = i.get(e);
		if (r) return v(r, e, t);
		let a = Pi(e, i, n);
		if (!a) throw E(`${n}.set`, `Binding '${e}' does not exist in '${n}'.`);
		return te(a, e, t);
	}
	function v(e, t, r) {
		hr(e.info, r, n), he(e.info.group);
		let i = Fi(e.info, r);
		Ii(e, t, i);
		let a = Ui(e.identity);
		return i === "lib" ? y(e, Wi(e.libValue, r)) : re(e, r), e.ownership ??= i, g(e) ? Hi(e, a) : [];
	}
	function te(e, t, r) {
		he(e.info.group);
		let i = Fi(e.info, r);
		if (Ii(e, t, i), Li(e, t, i), i !== "lib") throw E(`${n}.set`, `Member '${t}' needs a JS value; set resource '${e.info.name}' instead.`);
		let a = Ui(e.identity);
		return y(e, {
			...Gi(e.libValue ?? Ki(_e(e))),
			[t]: r
		}), e.ownership ??= i, e.memberOwnership.set(t, i), g(e) ? Hi(e, a) : [];
	}
	function y(e, t) {
		let n = _e(e), r = Br(n, t);
		e.libValue = t, e.buffer || ge(e, n.size), (!e.bytes || !zr(e.bytes, r)) && (e.bytes = r, e.revision = (e.revision ?? 0) + 1, e.dirtyUniform = !0), (e.liveUniform || e.info.addressSpace !== "uniform") && (e.dirtyUniform = !0, b(e, !1));
	}
	function b(e, t) {
		e.prepareUniform?.(t), e.dirtyUniform &&= (e.buffer.write(e.bytes, 0), !1), t && (e.liveUniform = !0);
	}
	function ne(e) {
		let t = m("set"), r = Ue(t.bindGroupLayouts.get(e.group))?.entries.find((t) => t.binding === e.binding), i = t.reflection.entryPoints.flatMap((e) => Wn(e, "samplingPairs", n)).find((t) => t.mode === "filtering" && t.texture.group === e.group && t.texture.binding === e.binding), a = i && t.reflection.bindings.find((e) => e.group === i.sampler.group && e.binding === i.sampler.binding);
		return {
			device: t.device,
			cache: t.cache,
			sourceHint: n,
			filterableTexture: r?.texture?.sampleType === "float",
			float32Filterable: t.device.features.has("float32-filterable"),
			pairedSampler: a
		};
	}
	function re(e, t) {
		ie(e, t, pr(e.info, t, ne(e.info)));
	}
	function ie(e, t, n) {
		let r = m("set");
		p(), e.resource = n.resource, e.uniformValue = n.uniformValue, e.prepareUniform = n.prepareUniform, e.identity = n.identity, e.cacheIdentity = n.cacheIdentity, e.resourceLabel = n.resourceLabel, e.sourceValue = t, e.followedTarget = n.followedTarget, e.markers = n.tracked?.map(({ resource: e, identity: t, subscribe: n }) => r.cache.marker(e, t, n)), e.dependencies = n.tracked?.map(({ identity: e }) => e) ?? [], e.underlyingBuffer = n.underlyingBuffer;
	}
	function ae(e, t, r) {
		ue(e), Ri(n, e, t, r);
		let i = o.has(e) ? `claimed-group:${e}` : void 0;
		return o.set(e, t), p(), i;
	}
	function oe(e) {
		let t = e.followedTarget;
		if (!t) return;
		if (e.markers?.[0]?.destroyed) throw qe(n, e.info, e.resourceLabel);
		let r = t.depth ? t.target.depth : t.target.color;
		r && Rn(r.resourceIdentity) !== Ui(e.identity) && ie(e, t.target, pr(e.info, t.target, ne(e.info)));
	}
	function se() {
		m("bindingState");
		let e = [];
		for (let t of i.values()) if (g(t) && !o.has(t.info.group) && t.resource && (oe(t), t.followedTarget && e.push(t), t.markers?.some((e) => e.destroyed))) throw qe(n, t.info, t.resourceLabel);
		return e;
	}
	function ce() {
		let e = m("preflight").cache.lifetime.destroyEpoch;
		if (u === e) {
			for (let e of d) oe(e);
			if (u === e) return;
		}
		l.fullVerifications++, d = se();
		for (let e of i.values()) g(e) && !o.has(e.info.group) && me(e.info);
		u = e;
	}
	function le() {
		let e = m("resourceSnapshots");
		ce();
		let t = [];
		for (let n of i.values()) g(n) && !o.has(n.info.group) && (n.info.addressSpace === "uniform" && b(n, !0), (n.markers?.length || n.followedTarget) && t.push({
			lifetime: e.cache.lifetime,
			markers: n.markers ?? [],
			group: n.info.group,
			binding: n.info.binding,
			bindingName: n.info.name,
			bindingKind: n.info.kind,
			capturedIdentity: Ui(n.identity),
			resourceLabel: n.resourceLabel,
			followedTarget: n.followedTarget
		}));
		return t;
	}
	function ue(e) {
		let t = m("layout").bindGroupLayouts.get(e);
		if (!t) throw E(`${n}.layout`, `@group(${e}) does not exist in '${n}'.`);
		return t;
	}
	function de(e) {
		return m("bindGroups"), ce(), a.map((t) => fe(t, e));
	}
	function fe(e, t) {
		let r = m("bindGroups"), i = o.get(e);
		if (i) return {
			group: e,
			bindGroup: i,
			offsets: Oi,
			claimValidation: pe(i, e)
		};
		let a = f.get(e);
		if (a) return a();
		l.groupPlanBuilds++;
		let u = c.get(e)?.bindings ?? [], d = [], p = [], h = [], g = !0;
		for (let e of u) {
			let n = me(e), i = n.uniformValue?.() ?? (n.bytes && e.addressSpace === "uniform" ? Mi(n) : void 0);
			g &&= !i && !n.uniformValue && !n.prepareUniform;
			let a = t && i ? t.capture(i, r.cache) : void 0;
			a || b(n, !1), !a && n.buffer && (n.mayHaveNativeConsumers = !0), d.push(a?.resource ?? n.resource), p.push({
				binding: e.binding,
				key: a?.identity ?? n.cacheIdentity ?? n.identity
			}), a ? h.push(a.identity) : n.dependencies && h.push(...n.dependencies);
		}
		let _ = ue(e), ee = () => r.device.gpu.createBindGroup({
			label: `${n}.group${e}`,
			layout: _,
			entries: u.map((e, t) => ({
				binding: e.binding,
				resource: d[t]
			}))
		}), v = Vn(p), te = () => ({
			group: e,
			bindGroup: r.cache.getOrCreate(s, e, _, p, h, ee, v),
			offsets: Oi
		});
		return g && f.set(e, te), te();
	}
	function pe(e, t) {
		return We(e) ? void 0 : {
			label: n,
			group: t
		};
	}
	function me(e) {
		let t = i.get(e.name);
		if (!t?.resource || !t.identity) throw Xe(n, e);
		return t;
	}
	function he(e) {
		if (o.has(e)) throw Qe(n, e);
	}
	function ge(e, t) {
		let r = m("set");
		p(), e.buffer = r.device.createBuffer({
			size: t,
			usage: ["uniform", "copy_dst"],
			label: `${n}.${e.info.name}`
		}), e.resource = {
			buffer: e.buffer.gpu,
			offset: 0,
			size: t
		}, e.identity = e.buffer.resourceIdentity, e.markers = [r.cache.marker(e.buffer, e.buffer.resourceIdentity, (t) => e.buffer.onDestroy(t))], e.dependencies = [e.buffer.resourceIdentity], e.underlyingBuffer = e.buffer.gpu;
	}
	function _e(e) {
		if (e.info.kind !== "buffer" || !e.info.layout?.size) throw E(`${n}.set`, `Binding '${e.info.name}' needs a compatible resource, not JS.`);
		return e.info.layout;
	}
	let ve = {
		dispose() {
			let e = t;
			if (!e) return;
			t = void 0, ki.set(ve, { disposedError: r });
			let n = Ai;
			try {
				e.cache.clearOwner(s);
			} catch (e) {
				n = e;
			}
			for (let e of i.values()) if (e.buffer && !e.mayHaveNativeConsumers) try {
				e.buffer.destroy();
			} catch (e) {
				n === Ai && (n = e);
			}
			if (i.clear(), o.clear(), c.clear(), f.clear(), d = [], n !== Ai) throw n;
		},
		assertUsable: se,
		preflight: ce,
		refreshLayouts: _,
		captureResources: le,
		get groups() {
			return m("groups"), a;
		},
		set: h,
		claimGroup: ae,
		layout: ue,
		bindGroups: de,
		bindingState(e) {
			m("bindingState");
			let t = i.get(e);
			if (t?.ownership && t.resource && t.identity) return t.buffer && (t.mayHaveNativeConsumers = !0), {
				info: t.info,
				ownership: t.ownership,
				resource: t.resource,
				identity: t.identity,
				underlyingBuffer: t.underlyingBuffer
			};
		}
	};
	return ki.set(ve, {
		cache: e.cache,
		owner: s,
		stats: l
	}), ve;
}
function Mi(e) {
	let t = e.ownedValue;
	return t && t.revision === e.revision ? t : e.ownedValue = {
		owner: e.captureToken,
		revision: e.revision,
		bytes: new Uint8Array(e.bytes)
	};
}
function Ni(e) {
	return new Map(e.bindings.map((e) => [e.name, {
		info: e,
		memberOwnership: /* @__PURE__ */ new Map(),
		captureToken: {}
	}]));
}
function Pi(e, t, n) {
	let r;
	for (let i of t.values()) if (i.info.layout?.members?.some((t) => t.name === e)) {
		if (r) throw E(`${n}.set`, `Binding member '${e}' is ambiguous in '${n}'; set the complete binding.`);
		r = i;
	}
	return r;
}
function Fi(e, t) {
	return e.bindingLayout?.kind === "buffer" && dr(t) ? "lib" : "user";
}
function Ii(e, t, n) {
	if (e.ownership && e.ownership !== n) throw Ze(t, e.ownership);
}
function Li(e, t, n) {
	let r = e.memberOwnership.get(t);
	if (r && r !== n) throw Ze(t, r);
}
function Ri(e, t, n, r) {
	let i = We(n);
	if (!i) return;
	let a = Ue(r);
	if (!a) return;
	let o = zi(a.entries, i.layout.entries);
	if (o) throw $e(e, t, o);
}
function zi(e, t) {
	if (e.length !== t.length) return `expected ${e.length} bindings and received ${t.length}`;
	let n = Bi(e), r = Bi(t);
	for (let [e, t] of n) {
		let n = r.get(e);
		if (!n) return `missing @binding(${e})`;
		if (Vi(t) !== Vi(n)) return `@binding(${e}) does not match the reflected layout`;
	}
}
function Bi(e) {
	return new Map(e.map((e) => [e.binding, e]));
}
function Vi(e) {
	return JSON.stringify({
		binding: e.binding,
		visibility: e.visibility,
		buffer: e.buffer,
		sampler: e.sampler,
		texture: e.texture,
		storageTexture: e.storageTexture,
		externalTexture: e.externalTexture ? {} : void 0
	});
}
function Hi(e, t) {
	let n = Ui(e.identity);
	return !n || t === n ? [] : [{
		group: e.info.group,
		binding: e.info.binding,
		bindingName: e.info.name,
		bindingKind: e.info.kind,
		previousIdentity: t,
		newIdentity: n
	}];
}
function Ui(e) {
	return e === void 0 ? void 0 : Rn(e);
}
function Wi(e, t) {
	return fr(e) && fr(t) ? {
		...e,
		...t
	} : t;
}
function Gi(e) {
	return fr(e) ? e : {};
}
function Ki(e) {
	if (e.members) return Object.fromEntries(e.members.map((e) => [e.name, Ki(e.layout)]));
	switch (e.type.kind) {
		case "scalar":
		case "atomic": return 0;
		case "vector": return Array.from({ length: e.type.width }, () => 0);
		case "matrix": return Array.from({ length: e.type.columns * e.type.rows }, () => 0);
		case "array": {
			let t = e.element;
			return e.type.count === void 0 || !t ? [] : Array.from({ length: e.type.count }, () => Ki(t));
		}
		default: return;
	}
}
var qi = Object.freeze([
	0,
	0,
	0,
	1
]);
function Ji(e, t) {
	let n = e, r = Array.isArray(e) ? e : [
		n?.r,
		n?.g,
		n?.b,
		n?.a
	];
	if (r.length !== 4 || !r.every((e) => typeof e == "number" && Number.isFinite(e))) throw Ut(t);
	return Yi(e);
}
function Yi(e) {
	let t = e;
	return Array.isArray(e) ? [
		e[0],
		e[1],
		e[2],
		e[3]
	] : {
		r: t.r,
		g: t.g,
		b: t.b,
		a: t.a
	};
}
function Xi(e) {
	return e.colors ?? [{ format: e.format ?? "rgba8unorm" }];
}
function Zi(e) {
	return e.depth === !0 ? "depth24plus" : e.depth || void 0;
}
function Qi(e) {
	let t = e.msaa;
	if (t === !0 || t === 4) return 4;
	if (t === void 0 || t === !1) return 1;
	let n = Pt();
	throw n.code = "VGPU-TARGET-MSAA-INVALID", n.message = `msaa received ${t}; WebGPU 1|4; use true`, n;
}
function $i(e, t) {
	if (!Array.isArray(e?.size) || e.size.length !== 2 || !Array.from(e.size).every((e) => Number.isSafeInteger(e) && e > 0)) throw Pt();
	let n = Zi(e);
	if (n === "stencil8") throw Nt(n);
	if (Qi(e) === 4) for (let n of Xi(e)) ea(n.format, t);
}
function ea(e, t) {
	if (t.isCompatibilityMode && e === "rgba16float") throw E("target", "Dawn compatibility mode does not support rgba16float+msaa.", "Use rgba8unorm for MSAA here, or disable msaa.");
}
function ta(e, t, n, r) {
	let i = {
		view: (t ?? e).createView(),
		resolveTarget: t ? e.createView() : void 0,
		loadOp: r ? "load" : "clear",
		storeOp: t ? "discard" : "store"
	};
	return r || (i.clearValue = ia(n)), i;
}
function na(e, t, n, r, i) {
	if (i) {
		let t = {
			view: e.createView(),
			depthReadOnly: !0
		};
		return ra(e.format) && (t.stencilReadOnly = !0), t;
	}
	let a = {
		view: e.createView(),
		depthLoadOp: t ? "load" : "clear",
		depthStoreOp: e.sampleCount > 1 ? "discard" : "store"
	};
	return t || (a.depthClearValue = n ?? 1), e.format && ra(e.format) && (a.stencilLoadOp = t ? "load" : "clear", a.stencilStoreOp = e.sampleCount > 1 ? "discard" : "store", t || (a.stencilClearValue = r ?? 0)), a;
}
function ra(e) {
	return !!e && e.includes("stencil");
}
function ia(e) {
	return Array.isArray(e) ? {
		r: e[0],
		g: e[1],
		b: e[2],
		a: e[3]
	} : e;
}
function aa(e, t) {
	return e[0] === t[0] && e[1] === t[1];
}
function oa(e) {
	return typeof e == "object" && !!e && typeof e.renderPassDescriptor == "function";
}
//#endregion
//#region node_modules/vgpu/dist/pipeline-store.js
var sa = 1, ca = 1, la = /* @__PURE__ */ new WeakMap(), ua = /* @__PURE__ */ new WeakMap();
function da(e) {
	let t = vn(e);
	return t ? {
		colors: [...t.colors],
		depth: t.depth,
		sampleCount: t.sampleCount ?? 1
	} : oa(e) ? {
		colors: e.colors.map((e) => e.format),
		depth: e.depth?.format,
		sampleCount: e.sampleCount
	} : typeof e != "object" || !e ? { colors: [] } : {
		colors: Array.isArray(e.colors) ? [...e.colors] : e.colors ?? [],
		depth: e.depth,
		sampleCount: e.sampleCount ?? 1
	};
}
function fa(e) {
	return `${e.colors.join(",")}:${e.depth ?? "none"}:${e.sampleCount ?? 1}`;
}
function pa(e, t) {
	if (!Array.isArray(e.colors) || e.colors.length === 0) throw Mt(t, "colors must be a non-empty array.");
	let n = e.colors.find((e) => typeof e != "string" || e.length === 0);
	if (n !== void 0) throw Mt(t, `colors must contain only GPUTextureFormat strings; received ${String(n)}.`);
	if (e.depth !== void 0 && (typeof e.depth != "string" || e.depth.length === 0)) throw Mt(t, "depth must be a GPUTextureFormat string.");
	let r = e.sampleCount ?? 1;
	if (r !== 1 && r !== 4) throw Mt(t, `sampleCount must be 1 or 4; received ${String(r)}.`);
}
function ma(e) {
	let t = `${Da(la, e.vertexModule, () => sa++)}|${Da(la, e.fragmentModule, () => sa++)}|${Da(ua, e.pipelineLayout, () => ca++)}|${Oa(e.vertexBufferLayouts ?? [])}|${fa(e.signature)}`;
	(e.topology || e.stripIndexFormat) && (t += `|${e.topology ?? "triangle-list"}|${e.stripIndexFormat ?? "none"}`), (e.cullMode || e.frontFace) && (t += `|${e.cullMode ?? "none"}|${e.frontFace ?? "ccw"}`), e.unclippedDepth && (t += "|unclipped");
	for (let n of [
		e.depthKey,
		e.stencilKey,
		e.multisampleKey,
		e.constantsKey,
		e.entryKey,
		e.fragmentKey
	]) n && (t += `|${n}`);
	return t;
}
function ha(e, t, n, r, i) {
	if (r === void 0) {
		let e = {
			vertex: "vs_main",
			fragment: "fs_main",
			compute: "cs_main"
		}[n], r;
		for (let i of t) if (i.stage === n && (r ??= i, i.name === e)) return i;
		return r;
	}
	if (typeof r != "string") throw ft(e, `${n} received ${xa(r)}; expected an entry point name string.`, i);
	let a = t.find((e) => e.name === r);
	if (!a) throw ft(e, `"${r}" matches no entry point in the shader; available entry points: ${ga(t)}.`, i);
	if (a.stage !== n) throw ft(e, `"${r}" is a @${a.stage} entry point, not @${n}; available entry points: ${ga(t)}.`, i);
	return a;
}
function ga(e) {
	return e.length ? e.map((e) => `"${e.name}" (@${e.stage})`).join(", ") : "none";
}
function _a(e, t, n, r) {
	if (t !== void 0 && (typeof t != "object" || !t || Array.isArray(t))) throw dt(e, `received ${xa(t)}; expected { overrideNameOrId: number | boolean }.`, r);
	let i = new Map(n.map((e) => [va(e), e])), a = {};
	for (let [o, s] of Object.entries(t ?? {})) {
		if (!i.has(o)) throw dt(e, `"${o}" matches no override in the shader; available overrides: ${ya(n)}.`, r);
		if (typeof s == "boolean") {
			a[o] = +!!s;
			continue;
		}
		if (typeof s != "number" || !Number.isFinite(s)) throw dt(e, `"${o}" received ${xa(s)}; use a finite number or a boolean (WebGPU converts the value to the override's WGSL type, and NaN/Infinity fail that conversion).`, r);
		a[o] = s;
	}
	for (let t of n) {
		let n = va(t);
		if (t.defaultValue === void 0 && !(n in a)) throw dt(e, `override '${t.name}' has no default value and must be provided; add constants: { "${n}": value }.`, r);
	}
	return Object.keys(a).length === 0 ? {} : {
		constants: a,
		constantsKey: ba(a)
	};
}
function va(e) {
	return e.id === void 0 ? e.name : String(e.id);
}
function ya(e) {
	return e.length ? e.map((e) => e.id === void 0 ? `"${e.name}"` : `"${e.id}" (@id of ${e.name})`).join(", ") : "none";
}
function ba(e) {
	return `cn~${Object.entries(e).sort(([e], [t]) => e < t ? -1 : +(e > t)).map(([e, t]) => `${e}=${t}`).join("~")}`;
}
function xa(e) {
	if (typeof e == "string") return `"${e}"`;
	try {
		return JSON.stringify(e) ?? String(e);
	} catch {
		return String(e);
	}
}
function Sa(e, t) {
	let n = /* @__PURE__ */ new Map();
	return {
		get(r, i) {
			let a = n.get(r);
			return a || (a = pi(e, () => e.gpu.createShaderModule({
				label: i,
				code: r
			})), n.set(r, a), t?.(a, i)), a;
		},
		dispose() {
			n.clear();
		}
	};
}
function Ca(e, t) {
	let n = /* @__PURE__ */ new Map();
	return {
		get(r) {
			let i = ka(r), a = n.get(i);
			return a || (a = pi(e, () => e.gpu.createPipelineLayout({ bindGroupLayouts: Aa(r) }), [...r.values()]), n.set(i, a), t?.(a, "pipeline.layout")), a;
		},
		dispose() {
			n.clear();
		}
	};
}
function wa(e, t = {}) {
	return new Ta(e, t);
}
var Ta = class {
	device;
	#e = /* @__PURE__ */ new Map();
	#t = /* @__PURE__ */ new Set();
	#n;
	#r;
	#i = !1;
	constructor(e, t) {
		this.device = e, this.#n = t.errorSink ?? (() => void 0), this.#r = t.registerSettledSource?.(() => [...this.#t]);
	}
	getReady(e) {
		return this.#e.get(e)?.pipeline;
	}
	async failure(e) {
		let t = this.#e.get(e);
		return await t?.validation, t?.failure ?? null;
	}
	getSync(e, t, n) {
		this.#a(n.where);
		let r = this.#e.get(e);
		if (r?.failure && !n.retry) throw r.failure;
		if (r?.pipeline) return r.pipeline;
		(!r || r.failure) && (r = { generation: 0 }, this.#e.set(e, r));
		let i = r, a = ++i.generation;
		try {
			let { value: e, error: r } = di(this.device, t);
			i.pipeline = e;
			let o = Promise.all([mi(n.dependencies ?? []), r]).then(async (t) => {
				if (this.#i || i.generation !== a) return;
				let r = t.find(Boolean);
				if (r) {
					let e = At(n.where, r, n.signature);
					i.failure = e, i.pipeline = void 0, i.pending?.reject(e), i.pending = void 0, await this.#n(e);
				} else i.validated = !0, i.pending?.resolve(e), i.pending = void 0;
			});
			return i.validation = o, this.#o(o), e;
		} catch (e) {
			let t = At(n.where, e, n.signature);
			throw i.failure = t, i.pending?.reject(t), i.pending = void 0, t;
		}
	}
	getAsync(e, t, n) {
		this.#a(n.where);
		let r = this.#e.get(e);
		if (r?.pipeline) return r.validated ? Promise.resolve(r.pipeline) : (r.pending ??= Ea(), r.pending.promise);
		if (r?.pending) return r.pending.promise;
		r = {
			generation: 0,
			pending: Ea()
		}, this.#e.set(e, r);
		let i = r, a = i.pending, o = ++i.generation, s, c;
		try {
			let e = di(this.device, t);
			s = e.value, c = e.error;
		} catch (e) {
			s = Promise.reject(e), c = Promise.resolve(null);
		}
		let l = Promise.all([
			s.then((e) => ({ value: e }), (e) => ({ cause: e })),
			mi(n.dependencies ?? []),
			c
		]).then(([e, t, r]) => {
			if (this.#i || i.generation !== o) return;
			let s = t ?? r ?? ("cause" in e ? e.cause : void 0);
			s || "cause" in e ? (i.failure = At(n.where, s, n.signature), a.reject(i.failure)) : (i.pipeline = e.value, i.validated = !0, a.resolve(i.pipeline)), i.pending = void 0;
		});
		return this.#o(l), a.promise;
	}
	dispose() {
		if (!this.#i) {
			this.#i = !0;
			for (let e of this.#e.values()) e.pending?.reject(jt("gpu.dispose"));
			this.#e.clear(), this.#t.clear(), this.#r?.();
		}
	}
	#a(e) {
		if (this.#i) throw jt(e);
	}
	#o(e) {
		this.#t.add(e), e.then(() => this.#t.delete(e), () => this.#t.delete(e));
	}
};
function Ea() {
	let e, t, n = new Promise((n, r) => {
		e = n, t = r;
	});
	return n.catch(() => void 0), {
		promise: n,
		resolve: e,
		reject: t
	};
}
function Da(e, t, n) {
	let r = e.get(t);
	return r || (r = n(), e.set(t, r)), r;
}
function Oa(e) {
	return JSON.stringify(e.map((e) => ({
		arrayStride: e.arrayStride,
		stepMode: e.stepMode ?? "vertex",
		attributes: [...e.attributes].map((e) => ({
			shaderLocation: e.shaderLocation,
			offset: e.offset,
			format: e.format
		}))
	})));
}
function ka(e) {
	return JSON.stringify([...e.entries()].map(([e, t]) => ({
		group: e,
		entries: Ma(t)
	})));
}
function Aa(e) {
	let t = Math.max(-1, ...e.keys()), n = [];
	for (let r = 0; r <= t; r++) n.push(ja(e, r));
	return n;
}
function ja(e, t) {
	let n = e.get(t);
	if (!n) throw kt(t);
	return n;
}
function Ma(e) {
	return (Ue(e)?.entries ?? []).map((e) => ({
		binding: e.binding,
		visibility: e.visibility,
		buffer: e.buffer ? { ...e.buffer } : void 0,
		sampler: e.sampler ? { ...e.sampler } : void 0,
		texture: e.texture ? { ...e.texture } : void 0,
		storageTexture: e.storageTexture ? { ...e.storageTexture } : void 0,
		externalTexture: e.externalTexture ? { ...e.externalTexture } : void 0
	}));
}
//#endregion
//#region node_modules/vgpu/dist/frame-state.js
var Na = rn("frame-state");
function Pa(e) {
	return e.service(Na, Fa);
}
function Fa() {
	let e = /* @__PURE__ */ new Set(), t = Ia(), n = !1, r = !1, i = {
		time: 0,
		deltaTime: 0,
		frameCount: 0,
		advanceBy(e) {
			i.deltaTime = e, i.time += e, r = !0;
		},
		tick() {
			if (n) throw Gt();
			n = !0;
			try {
				let n = Ia();
				r ? r = !1 : (i.deltaTime = Math.max(0, (n - t) / 1e3), i.time += i.deltaTime), t = n, i.frameCount += 1;
				for (let t of [...e]) t();
			} finally {
				n = !1;
			}
		},
		onAdvance(t) {
			return e.add(t), () => {
				e.delete(t);
			};
		}
	};
	return i;
}
function Ia() {
	return globalThis.performance?.now?.() ?? Date.now();
}
//#endregion
//#region node_modules/vgpu/dist/surface.js
function La(e, t, n = {}) {
	let r = Sn(e, "surface"), i = za(r), a = i.get(t);
	if (a && !a.disposed) throw zt(a.label);
	let o = new qa(r.device, t, n, (e) => {
		i.get(e.canvas) === e && i.delete(e.canvas), s(), c();
	}), s = Pa(r).onAdvance(() => o.applyAutoResize()), c = r.own("resource", () => o.dispose());
	return i.set(t, o), o;
}
var Ra = rn("surfaces");
function za(e) {
	return e.service(Ra, () => /* @__PURE__ */ new Map());
}
var Ba = 0, Va = 0;
function Ha() {
	return Ba > 0;
}
function Ua() {
	return Va > 0;
}
function Wa() {
	Va += 1;
}
function Ga() {
	--Va;
}
function Ka(e) {
	return e instanceof qa;
}
var qa = class {
	device;
	canvas;
	options;
	unregister;
	[hn] = !0;
	resourceIdentity = m("render-target");
	label;
	context;
	autoResize;
	layoutBacked;
	format;
	#e;
	#t;
	#n;
	#r = new h();
	#i = /* @__PURE__ */ new Set();
	#a = /* @__PURE__ */ new Set();
	#o;
	#s;
	#c;
	#l;
	#u = !1;
	#d = !1;
	constructor(e, t, n, r) {
		this.device = e, this.canvas = t, this.options = n, this.unregister = r, this.label = n.label, this.#s = n.clearColor === void 0 ? qi : Ji(n.clearColor, "surface.clearColor");
		let i = t.getContext("webgpu");
		if (!i) throw Rt();
		if (this.context = i, this.layoutBacked = Qa(t), n.autoResize === !0 && !this.layoutBacked) throw Vt();
		this.autoResize = n.autoResize ?? (!n.size && this.layoutBacked), this.#o = ro(n.dpr), this.format = n.format ?? io(), this.#t = Ya(n.depth), this.#n = Xa(n.msaa), this.#e = Object.freeze({
			colors: Object.freeze([this.format]),
			depth: this.#t,
			sampleCount: this.#n
		});
		let a = P(t), o = $a(t, n, this.layoutBacked, this.#o);
		(n.size || this.layoutBacked) && to(t, o);
		try {
			i.configure({
				device: e.gpu,
				format: this.format,
				alphaMode: n.alphaMode ?? "premultiplied",
				colorSpace: n.colorSpace ?? "srgb",
				usage: ao()
			}), this.#c = this.#_(o), this.#l = Object.freeze([...o]);
		} catch (e) {
			try {
				i.unconfigure?.();
			} catch {}
			if (n.size || this.layoutBacked) try {
				to(t, a);
			} catch {}
			throw e;
		}
	}
	get gpu() {
		return this.context;
	}
	get size() {
		return this.#g(), P(this.canvas);
	}
	get texelSize() {
		let e = this.size;
		return [1 / e[0], 1 / e[1]];
	}
	get color() {
		return this.#g(), new x(this.device, this.context.getCurrentTexture(), {
			kind: "2d",
			size: this.size,
			format: this.format,
			usage: [
				"render_attachment",
				"texture_binding",
				"copy_src"
			],
			label: this.options.label ? `${this.options.label}.color` : "surface.color"
		}, "external");
	}
	get colors() {
		return [this.color];
	}
	get depth() {
		return this.#g(), this.#c.depth;
	}
	get sampleCount() {
		return this.#g(), this.#n;
	}
	get dpr() {
		return this.#o;
	}
	get clearColor() {
		return Yi(this.#s);
	}
	set clearColor(e) {
		this.#s = Ji(e, "surface.clearColor");
	}
	get disposed() {
		return this.#u;
	}
	[_n]() {
		return this.#g(), this.#e;
	}
	resize(e) {
		if (this.#g(), this.#d) throw Ht(this.options.label);
		this.#f(no(e), this.#o, !0);
	}
	applyAutoResize() {
		if (this.#u) return;
		if (this.autoResize && this.layoutBacked) {
			let e = ro(this.options.dpr), t = eo(this.canvas, e);
			this.#f(t, e, !0);
			return;
		}
		let e = no(P(this.canvas));
		aa(this.#l, e) || this.#f(e, this.#o, !1);
	}
	onResize(e) {
		this.#g(), this.#i.add(e);
		let t = this.#d;
		this.#d = !0, Ba += 1;
		try {
			e(this.#h());
		} finally {
			--Ba, this.#d = t;
		}
		return () => {
			this.#i.delete(e);
		};
	}
	onDestroy(e) {
		return this.#g(), this.#r.onDestroy(this, e);
	}
	onTexturesRecreated(e) {
		return this.#g(), this.#a.add(e), () => {
			this.#a.delete(e);
		};
	}
	renderPassDescriptor(e = {}) {
		let { clear: t = [
			0,
			0,
			0,
			1
		], preserve: n, clearDepth: r, clearStencil: i, depthReadOnly: a } = e;
		this.#g();
		let o = no(P(this.canvas));
		return aa(this.#l, o) || this.#f(o, this.#o, !1), {
			colorAttachments: [ta(this.context.getCurrentTexture(), this.#c.msaaColor, t, n)],
			depthStencilAttachment: this.#c.depth ? na(this.#c.depth, n, r, i, a) : void 0
		};
	}
	dispose() {
		if (this.#u) return;
		this.#u = !0;
		try {
			this.context.unconfigure?.();
		} catch {}
		let e = [];
		try {
			this.unregister(this);
		} catch (t) {
			e.push(t);
		}
		this.#i.clear(), this.#a.clear();
		try {
			this.#r.emit(this);
		} catch (t) {
			e.push(t);
		}
		try {
			Za(this.#c.all);
		} catch (t) {
			e.push(t);
		}
		if (e.length) throw e[0];
	}
	#f(e, t, n) {
		let r = !aa(this.#l, e), i = !aa(P(this.canvas), e);
		if (!r && !i) {
			this.#o = t;
			return;
		}
		let a = Object.freeze([...e]), o = r ? this.#_(a) : this.#c, s = this.#c, c = n && (i || r && s.all.length > 0), l = this.#d;
		this.#d = !0, Ba += 1;
		try {
			i && to(this.canvas, a), this.#o = t, this.#l = a, this.#c = o;
			let e = [];
			try {
				this.#p();
			} catch (t) {
				e.push(t);
			}
			if (c) try {
				this.#m();
			} catch (t) {
				e.push(t);
			}
			if (r) try {
				Za(s.all);
			} catch (t) {
				e.push(t);
			}
			if (e.length) throw e[0];
		} finally {
			--Ba, this.#d = l;
		}
	}
	#p() {
		let e = [];
		for (let t of [...this.#a]) try {
			t();
		} catch (t) {
			e.push(t);
		}
		if (e.length) throw e[0];
	}
	#m() {
		let e = this.#h(), t = [];
		for (let n of [...this.#i]) try {
			n(e);
		} catch (e) {
			t.push(e);
		}
		if (t.length) throw t[0];
	}
	#h() {
		let e = P(this.canvas);
		return {
			width: e[0],
			height: e[1],
			dpr: this.#o,
			surface: this
		};
	}
	#g() {
		if (this.#u) throw Bt(this.options.label);
	}
	#_(e) {
		let t = [], n = (e) => {
			let n = this.device.createTexture(e);
			return t.push(n), n;
		};
		try {
			return {
				msaaColor: this.#n === 4 ? n({
					kind: "2d",
					size: e,
					format: this.format,
					usage: ["render_attachment"],
					sampleCount: 4,
					label: this.options.label ? `${this.options.label}.color.msaa` : "surface.color.msaa"
				}) : void 0,
				depth: this.#t ? n({
					kind: "2d",
					size: e,
					format: this.#t,
					usage: ["render_attachment", "texture_binding"],
					sampleCount: this.#n,
					label: this.options.label ? `${this.options.label}.depth` : "surface.depth"
				}) : void 0,
				all: t
			};
		} catch (e) {
			try {
				Za(t);
			} catch {}
			throw e;
		}
	}
}, Ja = /* @__PURE__ */ new Set([
	"depth16unorm",
	"depth24plus",
	"depth24plus-stencil8",
	"depth32float",
	"depth32float-stencil8"
]);
function Ya(e) {
	if (e !== void 0 && e !== !1) {
		if (e === !0) return "depth24plus";
		if (Ja.has(e)) return e;
		throw It(e);
	}
}
function Xa(e) {
	if (e === void 0 || e === !1) return 1;
	if (e === !0 || e === 4) return 4;
	throw Lt(e);
}
function Za(e) {
	let t = [];
	for (let n of e) try {
		n.destroy();
	} catch (e) {
		t.push(e);
	}
	if (t.length) throw t[0];
}
function Qa(e) {
	return typeof e.clientWidth == "number";
}
function $a(e, t, n, r) {
	return t.size ? no(t.size) : n ? eo(e, r) : no(P(e));
}
function eo(e, t) {
	let n = e;
	return no([Math.round(n.clientWidth * t), Math.round(n.clientHeight * t)]);
}
function P(e) {
	let t = e;
	return [t.width, t.height];
}
function to(e, t) {
	let n = e;
	n.width = t[0], n.height = t[1];
}
function no(e) {
	return [Math.max(1, Math.floor(e[0])), Math.max(1, Math.floor(e[1]))];
}
function ro(e) {
	let t = globalThis.devicePixelRatio ?? 1;
	return Array.isArray(e) ? Math.min(e[1], Math.max(e[0], t)) : typeof e == "number" ? e : t;
}
function io() {
	return globalThis.navigator?.gpu?.getPreferredCanvasFormat?.() ?? "bgra8unorm";
}
function ao() {
	let e = globalThis.GPUTextureUsage;
	return e ? e.RENDER_ATTACHMENT | e.TEXTURE_BINDING | e.COPY_SRC : void 0;
}
//#endregion
//#region node_modules/vgpu/dist/indirect.js
var oo = {
	drawIndirect: {
		bytes: 16,
		args: "4 u32 values: vertexCount, instanceCount, firstVertex, firstInstance"
	},
	drawIndexedIndirect: {
		bytes: 20,
		args: "5 32-bit values: indexCount, instanceCount, firstIndex, baseVertex (signed), firstInstance"
	},
	dispatchWorkgroupsIndirect: {
		bytes: 12,
		args: "3 u32 values: workgroupCountX, workgroupCountY, workgroupCountZ"
	}
};
function so(e, t, n, r, i) {
	let a = typeof n == "object" && n ? n.buffer : void 0, o = co(n) ? n : co(a) ? a : void 0;
	if (!o) throw pt(e, `received ${lo(n)}; expected a StorageBuffer or { buffer, offset? }.`, t);
	en(o.buffer, t, i);
	let s = o === n ? 0 : n.offset ?? 0;
	if (typeof s != "number" || !Number.isInteger(s) || s < 0) throw pt(e, `offset must be an integer >= 0; received ${lo(s)}.`, t);
	if (s % 4 != 0) throw pt(e, `offset must be a multiple of 4 (WebGPU requires "indirectOffset is a multiple of 4"); received ${s}.`, t);
	if (!o.buffer.options.usage.includes("indirect")) throw pt(e, `the buffer lacks the "indirect" usage (WebGPU requires "indirectBuffer.usage contains INDIRECT"); create it with storage(gpu, ${o.size}, { indirect: true }).`, t);
	let { bytes: c, args: l } = oo[r];
	if (s + c > o.size) throw pt(e, `${r} reads ${c} bytes (${l}) at offset ${s}, but offset + ${c} = ${s + c} exceeds the buffer size ${o.size}.`, t);
	return {
		buffer: o.gpu,
		offset: s
	};
}
function co(e) {
	return typeof e == "object" && !!e && "gpu" in e && "size" in e && e.buffer instanceof g;
}
function lo(e) {
	if (typeof e == "string") return `"${e}"`;
	try {
		return JSON.stringify(e) ?? String(e);
	} catch {
		return String(e);
	}
}
//#endregion
//#region node_modules/vgpu/dist/frame-protocols.js
var uo = Symbol("vgpu.frame.drawable");
function fo(e) {
	return e?.[uo];
}
var po = Symbol("vgpu.frame.bundle");
function mo(e) {
	return e?.[po];
}
var ho = Symbol("vgpu.frame.passAttachment");
function go(e) {
	return typeof e?.[ho] == "function" ? e : void 0;
}
var _o = Symbol("vgpu.frame.compute");
function vo(e) {
	return e?.[_o];
}
//#endregion
//#region node_modules/vgpu/dist/sampler.js
var yo = 1;
function bo(e) {
	let t = /* @__PURE__ */ new Map(), n = /* @__PURE__ */ new WeakMap();
	return {
		sampler(r = {}) {
			let i = xo(r), a = t.get(i);
			return a || (a = e.gpu.createSampler(r), t.set(i, a), n.set(a, {
				kind: "sampler",
				id: yo++
			})), a;
		},
		identity(e) {
			let t = n.get(e);
			return t || (t = {
				kind: "sampler",
				id: yo++
			}, n.set(e, t)), t;
		}
	};
}
function xo(e) {
	if (typeof e != "object" || !e) return JSON.stringify(e);
	if (Array.isArray(e)) return `[${e.map(xo).join(",")}]`;
	let t = e;
	return `{${Object.keys(t).sort().map((e) => `${JSON.stringify(e)}:${xo(t[e])}`).join(",")}}`;
}
//#endregion
//#region node_modules/vgpu/dist/render-service.js
var So = rn("render-service");
function Co(e) {
	return e.service(So, wo);
}
function wo(e) {
	let t = e.device, n = Fn(), r = wa(t, {
		errorSink: (t) => e.reportError(t),
		registerSettledSource: (t) => e.registerSettledSource(t)
	}), i = wa(t, {
		errorSink: (t) => e.reportError(t),
		registerSettledSource: (t) => e.registerSettledSource(t)
	}), a = /* @__PURE__ */ new Set(), o = e.registerSettledSource(() => [...a]), s = (t, n) => {
		let r = hi(t, n, (t) => e.reportError(t));
		a.add(r), r.then(() => a.delete(r), () => a.delete(r));
	}, c = Sa(t, s), l = Ca(t, s), u = bo(t);
	return e.own("service", () => {
		a.clear(), o(), r.dispose(), i.dispose(), c.dispose(), l.dispose(), n.dispose();
	}), {
		binds: n,
		pipelines: r,
		computePipelines: i,
		shaderModules: c,
		pipelineLayouts: l,
		sampler: (e) => u.sampler(e)
	};
}
//#endregion
//#region node_modules/vgpu/dist/shader-source-snapshot.js
var To = /* @__PURE__ */ new WeakSet(), Eo = !0;
function Do(e) {
	let t = Eo;
	Eo = !0;
	try {
		return [R(e, "shader", (e) => {
			let t = B(e, "functionExports", "functionExports"), n = Ao(z(e, "reflection", "reflection"), "reflection");
			return Go(n), {
				wgsl: V(e, "wgsl", "wgsl", !0),
				reflection: n,
				sourceChecksum: V(e, "sourceChecksum", "sourceChecksum"),
				producer: V(e, "producer", "producer"),
				...t.present ? { functionExports: L(t.value, "functionExports", Vo) } : {}
			};
		}), Eo];
	} finally {
		Eo = t;
	}
}
function Oo(e) {
	try {
		return Object.isFrozen(e);
	} catch {
		return !1;
	}
}
function ko(e) {
	Oo(e) || (Eo = !1);
}
function Ao(e, t) {
	return R(e, t, (e) => ({
		bindings: L(z(e, "bindings", `${t}.bindings`), `${t}.bindings`, jo),
		entryPoints: L(z(e, "entryPoints", `${t}.entryPoints`), `${t}.entryPoints`, Mo),
		overrides: L(z(e, "overrides", `${t}.overrides`), `${t}.overrides`, Lo),
		featuresRequired: L(z(e, "featuresRequired", `${t}.featuresRequired`), `${t}.featuresRequired`, is),
		aliases: L(z(e, "aliases", `${t}.aliases`), `${t}.aliases`, Ro),
		structs: L(z(e, "structs", `${t}.structs`), `${t}.structs`, zo),
		hostShareableLayouts: L(z(e, "hostShareableLayouts", `${t}.hostShareableLayouts`), `${t}.hostShareableLayouts`, Ho)
	}));
}
function jo(e, t) {
	return R(e, t, (e) => {
		let n = B(e, "addressSpace", `${t}.addressSpace`), r = B(e, "access", `${t}.access`), i = B(e, "struct", `${t}.struct`), a = B(e, "layout", `${t}.layout`), o = B(e, "bindingLayout", `${t}.bindingLayout`);
		return {
			group: U(z(e, "group", `${t}.group`), `${t}.group`),
			binding: U(z(e, "binding", `${t}.binding`), `${t}.binding`),
			name: V(e, "name", `${t}.name`),
			mangledName: V(e, "mangledName", `${t}.mangledName`),
			type: F(z(e, "type", `${t}.type`), `${t}.type`),
			kind: W(z(e, "kind", `${t}.kind`), `${t}.kind`, [
				"buffer",
				"texture",
				"sampler",
				"externalTexture",
				"unknown"
			]),
			...n.present ? { addressSpace: W(n.value, `${t}.addressSpace`, [
				"function",
				"private",
				"workgroup",
				"uniform",
				"storage",
				"handle"
			]) } : {},
			...r.present ? { access: W(r.value, `${t}.access`, [
				"read",
				"write",
				"read_write"
			]) } : {},
			...i.present ? { struct: zo(i.value, `${t}.struct`) } : {},
			...a.present ? { layout: Ho(a.value, `${t}.layout`) } : {},
			...o.present ? { bindingLayout: Wo(o.value, `${t}.bindingLayout`) } : {}
		};
	});
}
function Mo(e, t) {
	return R(e, t, (e) => {
		let n = W(z(e, "stage", `${t}.stage`), `${t}.stage`, [
			"vertex",
			"fragment",
			"compute"
		]), r = B(e, "workgroupSize", `${t}.workgroupSize`), i = B(e, "inputs", `${t}.inputs`);
		n === "vertex" && !i.present && G(`${t}.inputs`, "vertex entries require input metadata"), n !== "compute" && r.present && G(`${t}.workgroupSize`, "only compute entries may declare a workgroup size");
		let a = r.present ? No(r.value, `${t}.workgroupSize`) : void 0;
		return n === "compute" && a === void 0 && G(`${t}.workgroupSize`, "compute entries require workgroup metadata"), {
			name: V(e, "name", `${t}.name`),
			mangledName: V(e, "mangledName", `${t}.mangledName`),
			stage: n,
			...a ? { workgroupSize: a } : {},
			bindings: L(z(e, "bindings", `${t}.bindings`), `${t}.bindings`, Fo),
			samplingPairs: L(z(e, "samplingPairs", `${t}.samplingPairs`), `${t}.samplingPairs`, Io),
			...i.present ? { inputs: L(i.value, `${t}.inputs`, Po) } : {}
		};
	});
}
function No(e, t) {
	let n = L(e, t, (e, t) => e === "unresolved" ? NaN : as(e, t));
	return n.length !== 3 && G(t, "expected exactly three workgroup axes"), n;
}
function Po(e, t) {
	return R(e, t, (e) => ({
		name: V(e, "name", `${t}.name`),
		location: U(z(e, "location", `${t}.location`), `${t}.location`),
		type: F(z(e, "type", `${t}.type`), `${t}.type`)
	}));
}
function Fo(e, t) {
	return R(e, t, (e) => ({
		group: U(z(e, "group", `${t}.group`), `${t}.group`),
		binding: U(z(e, "binding", `${t}.binding`), `${t}.binding`)
	}));
}
function Io(e, t) {
	return R(e, t, (e) => ({
		texture: Fo(z(e, "texture", `${t}.texture`), `${t}.texture`),
		sampler: Fo(z(e, "sampler", `${t}.sampler`), `${t}.sampler`),
		mode: W(z(e, "mode", `${t}.mode`), `${t}.mode`, ["filtering", "comparison"])
	}));
}
function Lo(e, t) {
	return R(e, t, (e) => {
		let n = B(e, "id", `${t}.id`), r = B(e, "defaultValue", `${t}.defaultValue`);
		return {
			name: V(e, "name", `${t}.name`),
			mangledName: V(e, "mangledName", `${t}.mangledName`),
			...n.present ? { id: U(n.value, `${t}.id`) } : {},
			...r.present ? { defaultValue: H(r.value, `${t}.defaultValue`) } : {}
		};
	});
}
function Ro(e, t) {
	return R(e, t, (e) => ({
		name: V(e, "name", `${t}.name`),
		mangledName: V(e, "mangledName", `${t}.mangledName`),
		target: F(z(e, "target", `${t}.target`), `${t}.target`)
	}));
}
function zo(e, t) {
	return R(e, t, (e) => ({
		name: V(e, "name", `${t}.name`),
		mangledName: V(e, "mangledName", `${t}.mangledName`),
		members: L(z(e, "members", `${t}.members`), `${t}.members`, Bo)
	}));
}
function Bo(e, t) {
	return R(e, t, (e) => {
		let n = B(e, "align", `${t}.align`), r = B(e, "size", `${t}.size`);
		return {
			name: V(e, "name", `${t}.name`),
			type: F(z(e, "type", `${t}.type`), `${t}.type`),
			...n.present ? { align: ss(n.value, `${t}.align`) } : {},
			...r.present ? { size: U(r.value, `${t}.size`) } : {}
		};
	});
}
function Vo(e, t) {
	return R(e, t, (e) => ({
		name: V(e, "name", `${t}.name`),
		resolvedName: V(e, "resolvedName", `${t}.resolvedName`),
		parameterNames: L(z(e, "parameterNames", `${t}.parameterNames`), `${t}.parameterNames`, is)
	}));
}
function F(e, t) {
	return R(e, t, (e) => {
		let n = H(z(e, "kind", `${t}.kind`), `${t}.kind`);
		switch (n) {
			case "scalar": return {
				kind: n,
				name: W(z(e, "name", `${t}.name`), `${t}.name`, [
					"f32",
					"f16",
					"i32",
					"u32",
					"bool"
				])
			};
			case "atomic": return {
				kind: n,
				element: F(z(e, "element", `${t}.element`), `${t}.element`)
			};
			case "vector": return {
				kind: n,
				width: W(z(e, "width", `${t}.width`), `${t}.width`, [
					2,
					3,
					4
				]),
				element: F(z(e, "element", `${t}.element`), `${t}.element`)
			};
			case "matrix": return {
				kind: n,
				columns: W(z(e, "columns", `${t}.columns`), `${t}.columns`, [
					2,
					3,
					4
				]),
				rows: W(z(e, "rows", `${t}.rows`), `${t}.rows`, [
					2,
					3,
					4
				]),
				element: F(z(e, "element", `${t}.element`), `${t}.element`)
			};
			case "array": {
				let r = B(e, "count", `${t}.count`), i = B(e, "countExpression", `${t}.countExpression`);
				return {
					kind: n,
					element: F(z(e, "element", `${t}.element`), `${t}.element`),
					...r.present ? { count: os(r.value, `${t}.count`) } : {},
					...i.present ? { countExpression: H(i.value, `${t}.countExpression`) } : {}
				};
			}
			case "ptr": {
				let r = B(e, "access", `${t}.access`);
				return {
					kind: n,
					addressSpace: H(z(e, "addressSpace", `${t}.addressSpace`), `${t}.addressSpace`),
					element: F(z(e, "element", `${t}.element`), `${t}.element`),
					...r.present ? { access: H(r.value, `${t}.access`) } : {}
				};
			}
			case "sampler": return {
				kind: n,
				comparison: cs(z(e, "comparison", `${t}.comparison`), `${t}.comparison`)
			};
			case "texture": {
				let r = B(e, "dimension", `${t}.dimension`), i = B(e, "sampleType", `${t}.sampleType`), a = B(e, "texelFormat", `${t}.texelFormat`), o = B(e, "access", `${t}.access`);
				return {
					kind: n,
					textureKind: H(z(e, "textureKind", `${t}.textureKind`), `${t}.textureKind`),
					...r.present ? { dimension: W(r.value, `${t}.dimension`, [
						"1d",
						"2d",
						"2d_array",
						"3d",
						"cube",
						"cube_array",
						"multisampled_2d",
						"depth_2d",
						"depth_2d_array",
						"depth_cube",
						"depth_cube_array",
						"depth_multisampled_2d"
					]) } : {},
					...i.present ? { sampleType: F(i.value, `${t}.sampleType`) } : {},
					...a.present ? { texelFormat: H(a.value, `${t}.texelFormat`) } : {},
					...o.present ? { access: W(o.value, `${t}.access`, [
						"read",
						"write",
						"read_write"
					]) } : {}
				};
			}
			case "identifier": {
				let r = B(e, "mangledName", `${t}.mangledName`);
				return {
					kind: n,
					name: V(e, "name", `${t}.name`),
					...r.present ? { mangledName: H(r.value, `${t}.mangledName`) } : {}
				};
			}
			default: return G(`${t}.kind`, `unknown WGSL type '${n}'`);
		}
	});
}
function Ho(e, t) {
	return R(e, t, (e) => {
		let n = B(e, "size", `${t}.size`), r = B(e, "stride", `${t}.stride`), i = B(e, "members", `${t}.members`), a = B(e, "element", `${t}.element`), o = B(e, "runtimeSized", `${t}.runtimeSized`), s = {
			name: V(e, "name", `${t}.name`),
			mangledName: V(e, "mangledName", `${t}.mangledName`),
			layoutMode: W(z(e, "layoutMode", `${t}.layoutMode`), `${t}.layoutMode`, ["wgsl-host-shareable-v1"]),
			type: F(z(e, "type", `${t}.type`), `${t}.type`),
			align: ss(z(e, "align", `${t}.align`), `${t}.align`),
			...n.present ? { size: U(n.value, `${t}.size`) } : {},
			...r.present ? { stride: os(r.value, `${t}.stride`) } : {},
			...i.present ? { members: L(i.value, `${t}.members`, Uo) } : {},
			...a.present ? { element: Ho(a.value, `${t}.element`) } : {},
			...o.present ? { runtimeSized: cs(o.value, `${t}.runtimeSized`) } : {}
		};
		return Ko(s, t), s;
	});
}
function Uo(e, t) {
	return R(e, t, (e) => {
		let n = B(e, "size", `${t}.size`), r = B(e, "explicitAlign", `${t}.explicitAlign`), i = B(e, "explicitSize", `${t}.explicitSize`);
		return {
			name: V(e, "name", `${t}.name`),
			offset: U(z(e, "offset", `${t}.offset`), `${t}.offset`),
			align: ss(z(e, "align", `${t}.align`), `${t}.align`),
			...n.present ? { size: U(n.value, `${t}.size`) } : {},
			type: F(z(e, "type", `${t}.type`), `${t}.type`),
			layout: Ho(z(e, "layout", `${t}.layout`), `${t}.layout`),
			...r.present ? { explicitAlign: ss(r.value, `${t}.explicitAlign`) } : {},
			...i.present ? { explicitSize: U(i.value, `${t}.explicitSize`) } : {}
		};
	});
}
function Wo(e, t) {
	return R(e, t, (e) => {
		let n = H(z(e, "kind", `${t}.kind`), `${t}.kind`);
		switch (n) {
			case "buffer": return {
				kind: n,
				buffer: R(z(e, "buffer", `${t}.buffer`), `${t}.buffer`, (e) => {
					let n = B(e, "minBindingSize", `${t}.buffer.minBindingSize`);
					return z(e, "hasDynamicOffset", `${t}.buffer.hasDynamicOffset`) !== !1 && G(`${t}.buffer.hasDynamicOffset`, "prepared layouts require false"), {
						type: W(z(e, "type", `${t}.buffer.type`), `${t}.buffer.type`, [
							"uniform",
							"storage",
							"read-only-storage"
						]),
						hasDynamicOffset: !1,
						...n.present ? { minBindingSize: U(n.value, `${t}.buffer.minBindingSize`) } : {}
					};
				})
			};
			case "sampler": return {
				kind: n,
				sampler: R(z(e, "sampler", `${t}.sampler`), `${t}.sampler`, (e) => ({ type: W(z(e, "type", `${t}.sampler.type`), `${t}.sampler.type`, [
					"filtering",
					"non-filtering",
					"comparison"
				]) }))
			};
			case "texture": return {
				kind: n,
				texture: R(z(e, "texture", `${t}.texture`), `${t}.texture`, (e) => ({
					sampleType: W(z(e, "sampleType", `${t}.texture.sampleType`), `${t}.texture.sampleType`, [
						"float",
						"unfilterable-float",
						"depth",
						"sint",
						"uint"
					]),
					viewDimension: W(z(e, "viewDimension", `${t}.texture.viewDimension`), `${t}.texture.viewDimension`, [
						"1d",
						"2d",
						"2d-array",
						"cube",
						"cube-array",
						"3d"
					]),
					multisampled: cs(z(e, "multisampled", `${t}.texture.multisampled`), `${t}.texture.multisampled`)
				}))
			};
			case "storageTexture": return {
				kind: n,
				storageTexture: R(z(e, "storageTexture", `${t}.storageTexture`), `${t}.storageTexture`, (e) => ({
					access: W(z(e, "access", `${t}.storageTexture.access`), `${t}.storageTexture.access`, [
						"write-only",
						"read-only",
						"read-write"
					]),
					format: V(e, "format", `${t}.storageTexture.format`),
					viewDimension: W(z(e, "viewDimension", `${t}.storageTexture.viewDimension`), `${t}.storageTexture.viewDimension`, [
						"1d",
						"2d",
						"2d-array",
						"cube",
						"cube-array",
						"3d"
					])
				}))
			};
			case "externalTexture": return {
				kind: n,
				externalTexture: R(z(e, "externalTexture", `${t}.externalTexture`), `${t}.externalTexture`, () => ({}))
			};
			default: return G(`${t}.kind`, `unknown binding layout '${n}'`);
		}
	});
}
function Go(e) {
	let t = /* @__PURE__ */ new Map();
	for (let [n, r] of e.bindings.entries()) {
		let e = ts(r);
		if (t.has(e) && G(`reflection.bindings[${n}]`, `duplicate binding coordinate ${e}`), t.set(e, r), r.kind === "buffer") {
			let e = `reflection.bindings[${n}]`, t = r.bindingLayout;
			t?.kind !== "buffer" && G(`${e}.bindingLayout`, "does not match binding kind 'buffer'"), r.addressSpace !== "uniform" && r.addressSpace !== "storage" && G(`${e}.addressSpace`, "buffer bindings require a uniform or storage address space"), r.layout || G(`${e}.layout`, "buffer bindings require host-shareable packing metadata");
			let i = r.addressSpace === "uniform" ? "uniform" : r.access === "read" ? "read-only-storage" : "storage";
			t.buffer.type !== i && G(`${e}.bindingLayout.buffer.type`, `does not match ${r.addressSpace}${r.access ? `/${r.access}` : ""} buffer metadata`);
		} else {
			let e = r.kind === "sampler" ? "sampler" : r.kind === "externalTexture" ? "externalTexture" : void 0;
			e && r.bindingLayout?.kind !== e && G(`reflection.bindings[${n}].bindingLayout`, `does not match binding kind '${r.kind}'`), r.kind === "texture" && r.bindingLayout && r.bindingLayout.kind !== "texture" && r.bindingLayout.kind !== "storageTexture" && G(`reflection.bindings[${n}].bindingLayout`, "does not describe a texture binding");
		}
	}
	$o(e.structs, "reflection.structs"), $o(e.aliases, "reflection.aliases"), $o(e.overrides, "reflection.overrides"), es(e.featuresRequired, "reflection.featuresRequired");
	let n = /* @__PURE__ */ new Set();
	for (let [r, i] of e.entryPoints.entries()) {
		n.has(i.name) && G(`reflection.entryPoints[${r}].name`, `duplicate entry identity '${i.name}'`), n.add(i.name);
		let e = /* @__PURE__ */ new Set();
		for (let [n, a] of (i.bindings ?? []).entries()) {
			let i = ts(a);
			t.has(i) || G(`reflection.entryPoints[${r}].bindings[${n}]`, `dangling binding reference ${i}`), e.has(i) && G(`reflection.entryPoints[${r}].bindings[${n}]`, `duplicate binding reference ${i}`), e.add(i);
		}
		let a = /* @__PURE__ */ new Set();
		for (let [e, t] of (i.inputs ?? []).entries()) a.has(t.location) && G(`reflection.entryPoints[${r}].inputs[${e}].location`, `duplicate vertex input location ${t.location}`), a.add(t.location);
		let o = /* @__PURE__ */ new Set();
		for (let [n, a] of (i.samplingPairs ?? []).entries()) {
			let i = ts(a.texture), s = ts(a.sampler), c = t.get(i), l = t.get(s);
			(!e.has(i) || !c) && G(`reflection.entryPoints[${r}].samplingPairs[${n}].texture`, `dangling or inactive texture reference ${i}`), (!e.has(s) || !l) && G(`reflection.entryPoints[${r}].samplingPairs[${n}].sampler`, `dangling or inactive sampler reference ${s}`), c.bindingLayout?.kind !== "texture" && c.bindingLayout?.kind !== "externalTexture" && G(`reflection.entryPoints[${r}].samplingPairs[${n}].texture`, "reference is not a sampled texture"), l.bindingLayout?.kind !== "sampler" && G(`reflection.entryPoints[${r}].samplingPairs[${n}].sampler`, "reference is not a sampler"), a.mode === "comparison" != (l.bindingLayout.sampler.type === "comparison") && G(`reflection.entryPoints[${r}].samplingPairs[${n}].mode`, "does not match the referenced sampler type");
			let u = `${i}|${s}|${a.mode}`;
			o.has(u) && G(`reflection.entryPoints[${r}].samplingPairs[${n}]`, "duplicate sampling relationship"), o.add(u);
		}
	}
	let r = /* @__PURE__ */ new Map();
	for (let t of e.structs) r.set(t.name, t), r.set(t.mangledName, t);
	let i = /* @__PURE__ */ new Map();
	for (let t of e.aliases) i.set(t.name, t), i.set(t.mangledName, t);
	Qo(e, (e, t) => {
		e.kind === "identifier" && !r.has(e.mangledName ?? e.name) && !i.has(e.mangledName ?? e.name) && G(t, `unknown type reference '${e.mangledName ?? e.name}'`);
	});
	for (let [t, n] of e.bindings.entries()) {
		let a = `reflection.bindings[${t}]`, o = Jo(n.type, r, i, /* @__PURE__ */ new Set(), `${a}.type`);
		if (n.struct) {
			let e = r.get(n.struct.mangledName) ?? r.get(n.struct.name);
			(!e || !I(e, n.struct)) && G(`${a}.struct`, "does not match a canonical reflected struct");
			let t = o.kind === "identifier" ? r.get(o.mangledName ?? o.name) : void 0;
			(!t || !I(t, n.struct)) && G(`${a}.struct`, "does not match the alias-resolved binding type");
		}
		if (n.layout) {
			(n.layout.name !== n.name || n.layout.mangledName !== n.mangledName) && G(`${a}.layout`, "does not belong to the binding identity");
			let t = e.hostShareableLayouts.find((e) => e.name === n.layout.name && e.mangledName === n.layout.mangledName);
			(!t || !I(t, n.layout)) && G(`${a}.layout`, "does not match a canonical host-shareable layout"), I(o, n.layout.type) || G(`${a}.layout.type`, "does not match the alias-resolved binding type"), n.bindingLayout?.kind === "buffer" && n.bindingLayout.buffer.minBindingSize !== n.layout.size && G(`${a}.bindingLayout.buffer.minBindingSize`, "does not match the host-shareable layout size");
		}
	}
	e.hostShareableLayouts.forEach((e, t) => qo(e, `reflection.hostShareableLayouts[${t}]`, r, i));
}
function Ko(e, t) {
	let n = e.element !== void 0 || e.stride !== void 0 || e.members !== void 0;
	switch (e.stride !== void 0 && (e.element || G(`${t}.element`, "stride requires element metadata"), e.stride % e.element.align !== 0 && G(`${t}.stride`, "must be aligned to the element alignment"), e.element.size !== void 0 && e.stride < e.element.size && G(`${t}.stride`, "must not be smaller than the element size")), e.runtimeSized && (e.type.kind !== "array" || e.type.count !== void 0 || e.size !== void 0 || !e.element || e.stride === void 0) && G(`${t}.runtimeSized`, "is inconsistent with runtime-sized array metadata"), (e.type.kind === "array" || e.type.kind === "matrix") && ((!e.element || e.stride === void 0) && G(t, `${e.type.kind} layout requires element and stride metadata`), e.type.kind === "array" && e.type.count !== void 0 && e.size !== e.stride * e.type.count && G(`${t}.size`, "does not match array count and stride")), e.type.kind) {
		case "scalar": {
			e.type.name === "bool" && G(`${t}.type`, "bool is not host-shareable");
			let r = e.type.name === "f16" ? 2 : 4;
			Yo(e, t, r, r, n);
			break;
		}
		case "atomic":
			(e.type.element.kind !== "scalar" || e.type.element.name !== "i32" && e.type.element.name !== "u32") && G(`${t}.type.element`, "atomic layout requires i32 or u32 scalar storage"), Yo(e, t, 4, 4, n);
			break;
		case "vector": {
			let r = e.type.element;
			(r.kind !== "scalar" || r.name === "bool") && G(`${t}.type.element`, "vector layout requires a numeric scalar");
			let i = r.name === "f16" ? 2 : 4;
			Yo(e, t, e.type.width === 2 ? i * 2 : i * 4, i * e.type.width, n);
			break;
		}
		case "matrix": {
			let n = e.type.element;
			(n.kind !== "scalar" || n.name !== "f32" && n.name !== "f16") && G(`${t}.type.element`, "matrix layout requires an f32 or f16 scalar"), (!e.element || e.element.type.kind !== "vector" || e.element.type.width !== e.type.rows || !I(e.element.type.element, n)) && G(`${t}.element.type`, "does not match the matrix column vector");
			let r = Zo(e.element.align, Xo(e.element, `${t}.element`));
			e.align !== e.element.align && G(`${t}.align`, "does not match the matrix column alignment"), e.stride !== r && G(`${t}.stride`, "does not match the matrix column stride"), e.size !== r * e.type.columns && G(`${t}.size`, "does not match matrix columns and stride"), e.members && G(`${t}.members`, "matrix layouts cannot contain struct members");
			break;
		}
		case "array": {
			(!e.element || !I(e.element.type, e.type.element)) && G(`${t}.element.type`, "does not match the array element type");
			let n = Zo(e.element.align, Xo(e.element, `${t}.element`));
			e.align !== e.element.align && G(`${t}.align`, "does not match the array element alignment"), e.stride !== n && G(`${t}.stride`, "does not match the array element stride"), e.runtimeSized !== (e.type.count === void 0) && G(`${t}.runtimeSized`, "does not match the array count"), e.members && G(`${t}.members`, "array layouts cannot contain struct members");
			break;
		}
		case "identifier":
			(!e.members || e.element || e.stride !== void 0 || e.runtimeSized !== void 0) && G(t, "struct layout shape is incomplete or contains array metadata");
			break;
		default: G(`${t}.type`, `type '${e.type.kind}' cannot have a host-shareable layout`);
	}
	if (!e.members) return;
	let r = 0, i = 1;
	for (let [n, a] of e.members.entries()) {
		let o = `${t}.members[${n}]`, s = Math.max(a.layout.align, a.explicitAlign ?? 1), c = Math.max(a.layout.size ?? 0, a.explicitSize ?? 0);
		a.align !== s && G(`${o}.align`, "does not match intrinsic/explicit alignment"), a.size !== c && G(`${o}.size`, "does not match intrinsic/explicit size");
		let l = Zo(a.align, r);
		a.offset !== l && G(`${o}.offset`, "does not match the aligned preceding bound"), r = a.offset + (a.size ?? 0), a.layout.runtimeSized && n !== e.members.length - 1 && G(o, "runtime-sized arrays must be the final member"), i = Math.max(i, a.align);
	}
	e.align !== i && G(`${t}.align`, "does not match the maximum member alignment"), e.size !== Zo(i, r) && G(`${t}.size`, "does not match the rounded containing bound");
}
function qo(e, t, n, r) {
	let i = Jo(e.type, n, r, /* @__PURE__ */ new Set(), `${t}.type`);
	if (i.kind === "identifier") {
		let a = n.get(i.mangledName ?? i.name);
		a || G(`${t}.type`, `unknown struct '${i.mangledName ?? i.name}'`), (!e.members || e.members.length !== a.members.length) && G(`${t}.members`, "does not match the canonical struct member count");
		for (let i = 0; i < a.members.length; i++) {
			let o = a.members[i], s = e.members[i];
			(s.name !== o.name || !I(s.type, o.type)) && G(`${t}.members[${i}]`, "does not match the canonical struct member"), s.explicitAlign !== o.align && G(`${t}.members[${i}].explicitAlign`, "does not match the canonical struct member align attribute"), s.explicitSize !== o.size && G(`${t}.members[${i}].explicitSize`, "does not match the canonical struct member size attribute"), I(Jo(o.type, n, r, /* @__PURE__ */ new Set(), `${t}.members[${i}].type`), s.layout.type) || G(`${t}.members[${i}].layout.type`, "does not match the resolved member type");
		}
	}
	e.members?.forEach((e, i) => qo(e.layout, `${t}.members[${i}].layout`, n, r)), e.element && qo(e.element, `${t}.element`, n, r);
}
function Jo(e, t, n, r, i) {
	switch (e.kind) {
		case "identifier": {
			let a = e.mangledName ?? e.name;
			if (t.has(a)) return e;
			let o = n.get(a);
			o || G(i, `unknown type reference '${a}'`), r.has(a) && G(i, `cyclic alias reference '${a}'`), r.add(a);
			try {
				return Jo(o.target, t, n, r, i);
			} finally {
				r.delete(a);
			}
		}
		case "array":
		case "atomic":
		case "vector":
		case "matrix":
		case "ptr": return {
			...e,
			element: Jo(e.element, t, n, r, `${i}.element`)
		};
		case "texture": return {
			...e,
			...e.sampleType ? { sampleType: Jo(e.sampleType, t, n, r, `${i}.sampleType`) } : {}
		};
		default: return e;
	}
}
function Yo(e, t, n, r, i) {
	e.align !== n && G(`${t}.align`, `expected intrinsic alignment ${n}`), e.size !== r && G(`${t}.size`, `expected intrinsic size ${r}`), (i || e.runtimeSized !== void 0) && G(t, "leaf layout contains composite metadata");
}
function Xo(e, t) {
	return e.size === void 0 && G(`${t}.size`, "element layout must have a fixed size"), e.size;
}
function Zo(e, t) {
	return Math.ceil(t / e) * e;
}
function Qo(e, t) {
	let n = (e, r) => {
		t(e, r), "element" in e && n(e.element, `${r}.element`), e.kind === "texture" && e.sampleType && n(e.sampleType, `${r}.sampleType`);
	};
	e.bindings.forEach((e, t) => n(e.type, `reflection.bindings[${t}].type`)), e.entryPoints.forEach((e, t) => e.inputs?.forEach((e, r) => n(e.type, `reflection.entryPoints[${t}].inputs[${r}].type`))), e.aliases.forEach((e, t) => n(e.target, `reflection.aliases[${t}].target`)), e.structs.forEach((e, t) => e.members.forEach((e, r) => n(e.type, `reflection.structs[${t}].members[${r}].type`)));
	let r = (e, t) => {
		n(e.type, `${t}.type`), e.members?.forEach((e, i) => {
			n(e.type, `${t}.members[${i}].type`), r(e.layout, `${t}.members[${i}].layout`);
		}), e.element && r(e.element, `${t}.element`);
	};
	e.hostShareableLayouts.forEach((e, t) => r(e, `reflection.hostShareableLayouts[${t}]`));
}
function $o(e, t) {
	let n = /* @__PURE__ */ new Set(), r = /* @__PURE__ */ new Set();
	for (let [i, a] of e.entries()) n.has(a.name) && G(`${t}[${i}].name`, `duplicate identity '${a.name}'`), r.has(a.mangledName) && G(`${t}[${i}].mangledName`, `duplicate identity '${a.mangledName}'`), n.add(a.name), r.add(a.mangledName);
}
function es(e, t) {
	let n = /* @__PURE__ */ new Set();
	for (let [r, i] of e.entries()) n.has(i) && G(`${t}[${r}]`, `duplicate value '${i}'`), n.add(i);
}
function ts(e) {
	return `${e.group}:${e.binding}`;
}
function I(e, t) {
	if (Object.is(e, t)) return !0;
	if (typeof e != "object" || !e || typeof t != "object" || !t) return !1;
	if (Array.isArray(e) || Array.isArray(t)) return Array.isArray(e) && Array.isArray(t) && e.length === t.length && e.every((e, n) => I(e, t[n]));
	let n = Object.entries(e), r = Object.entries(t);
	return n.length === r.length && n.every(([e, n]) => Object.hasOwn(t, e) && I(n, t[e]));
}
function L(e, t, n) {
	return Array.isArray(e) || G(t, "expected an array"), ko(e), ns(e, t, () => {
		let r = [];
		for (let i = 0; i < e.length; i++) {
			let a = rs(e, String(i), `${t}[${i}]`);
			a || G(`${t}[${i}]`, "sparse arrays are not allowed"), "value" in a || G(`${t}[${i}]`, "accessor array elements are not allowed"), r.push(n(a.value, `${t}[${i}]`));
		}
		return r;
	});
}
function R(e, t, n) {
	(typeof e != "object" || !e || Array.isArray(e)) && G(t, "expected a plain data object"), ko(e);
	let r;
	try {
		r = Object.getPrototypeOf(e);
	} catch {
		return G(t, "could not inspect object prototype");
	}
	return r !== Object.prototype && r !== null && G(t, "expected a plain data object"), ns(e, t, () => n(e));
}
function ns(e, t, n) {
	To.has(e) && G(t, "cyclic metadata is not allowed"), To.add(e);
	try {
		return n();
	} finally {
		To.delete(e);
	}
}
function z(e, t, n) {
	let r = rs(e, t, n);
	return r || G(n, "missing required own data property"), "value" in r || G(n, "accessor properties are not allowed"), r.value === void 0 && G(n, "undefined is not JSON-compatible"), r.value;
}
function B(e, t, n) {
	let r = rs(e, t, n);
	return r ? ("value" in r || G(n, "accessor properties are not allowed"), r.value === void 0 && G(n, "optional undefined properties must be omitted"), {
		present: !0,
		value: r.value
	}) : { present: !1 };
}
function rs(e, t, n) {
	try {
		return Object.getOwnPropertyDescriptor(e, t);
	} catch {
		return G(n, "could not read its own property descriptor");
	}
}
function V(e, t, n, r = !1) {
	let i = z(e, t, n);
	return r && typeof i == "string" ? i : H(i, n);
}
function is(e, t) {
	return H(e, t);
}
function H(e, t) {
	return (typeof e != "string" || e.length === 0) && G(t, "expected a nonempty string"), e;
}
function as(e, t) {
	return (typeof e != "number" || !Number.isFinite(e)) && G(t, "expected a finite number or 'unresolved'"), e;
}
function U(e, t) {
	return (typeof e != "number" || !Number.isSafeInteger(e) || e < 0) && G(t, "expected a non-negative safe integer"), e;
}
function os(e, t) {
	let n = U(e, t);
	return n === 0 && G(t, "expected a positive integer"), n;
}
function ss(e, t) {
	let n = os(e, t);
	return Number.isInteger(Math.log2(n)) || G(t, "expected a positive power of two"), n;
}
function cs(e, t) {
	return typeof e != "boolean" && G(t, "expected a boolean"), e;
}
function W(e, t, n) {
	return n.includes(e) || G(t, `expected one of ${n.map(String).join(", ")}`), e;
}
function G(e, t) {
	throw D(e, t);
}
//#endregion
//#region node_modules/vgpu/dist/shader-source-checksum.js
var ls = 14695981039346656037n, us = 1099511628211n, ds = 18446744073709551615n;
function fs(e) {
	let t = ls;
	for (let n = 0; n < e.length; n++) {
		let r = e.charCodeAt(n);
		t = ps(t, r & 255), t = ps(t, r >>> 8);
	}
	return `fnv1a64-utf16le-v1:${t.toString(16).padStart(16, "0")}`;
}
function ps(e, t) {
	return (e ^ BigInt(t)) * us & ds;
}
//#endregion
//#region node_modules/vgpu/dist/shader-source.js
var ms = /* @__PURE__ */ new WeakMap();
function hs(e) {
	if (typeof e == "string") throw Xt();
	if (typeof e != "object" || !e || Array.isArray(e)) throw D("shader", "expected a prepared ShaderSource object");
	let t = ms.get(e);
	if (t?.snapshot) return t.snapshot;
	let n = Oo(e), r = gs(e, "version");
	if (r === 1) throw Xt();
	if (typeof r == "number" && Number.isInteger(r) && r !== 2) throw Zt(r, _s(e, "producer"));
	if (r !== 2) throw D("version", "expected integer artifact version 2");
	let [i, a] = Do(e);
	if (!/^fnv1a64-utf16le-v1:[0-9a-f]{16}$/.test(i.sourceChecksum)) throw D("sourceChecksum", "expected fnv1a64-utf16le-v1 followed by 16 lowercase hexadecimal digits");
	if (t?.wgsl !== i.wgsl && ms.set(e, t = {
		wgsl: i.wgsl,
		checksum: fs(i.wgsl)
	}), i.sourceChecksum !== t.checksum) throw D("sourceChecksum", "checksum does not match wgsl");
	let o = vs({
		wgsl: i.wgsl,
		reflection: i.reflection,
		...i.functionExports === void 0 ? {} : { functionExports: i.functionExports }
	});
	return n && a && (t.snapshot = o), o;
}
function gs(e, t) {
	let n;
	try {
		n = Object.getOwnPropertyDescriptor(e, t);
	} catch {
		throw D(t, "could not read its own property descriptor");
	}
	if (!n) throw D(t, "missing required own data property");
	if (!("value" in n)) throw D(t, "accessor properties are not allowed");
	return n.value;
}
function _s(e, t) {
	let n;
	try {
		n = Object.getOwnPropertyDescriptor(e, t);
	} catch {
		return;
	}
	return n && "value" in n && typeof n.value == "string" && n.value.length > 0 ? n.value : void 0;
}
function vs(e) {
	if (typeof e != "object" || !e || Object.isFrozen(e)) return e;
	for (let t of Object.values(e)) vs(t);
	return Object.freeze(e);
}
//#endregion
//#region node_modules/vgpu/dist/draw.js
var ys = 1, bs = /* @__PURE__ */ new WeakMap(), xs = Symbol("no cleanup failure"), Ss = class {
	label;
	#e = /* @__PURE__ */ new Map();
	constructor(e, t, n, r = Fn(), i, a = wa(e), o = Sa(e), s = Ca(e), c, l, u) {
		O(e, "Draw.constructor"), this.label = n.label ?? "draw";
		let d = ys++, f = t.reflection, p = Bs(this.label, n.entry), m = u?.entry ?? ha(this.label, f.entryPoints, "vertex", p.vertex, "draw"), h = ha(this.label, f.entryPoints, "fragment", p.fragment, "draw"), g = Vs(m, h), _ = [m, h].filter((e) => !!e), ee = bi(f.bindings, _);
		Cs(e, this.label, f.bindings, _, ee);
		let v = n.geometry, te = m ? Wn(m, "inputs", this.label) : [], y = v && yn in v ? v[yn](te, `${this.label}.geometry`) : v?.vertexBufferLayouts, b = new Map(Si(e, this.label, f, ee)), ne = s.get(b), re = o.get(t.wgsl, `${this.label}.shader`), ie = u ? o.get(u.source, `${this.label}.fullscreen.shader`) : re, ae = yc(), oe = {
			label: this.label,
			recordedIn: ae
		}, se = js(this.label, n), ce = Ls(this.label, n, se), le = Us(e, this.label, n), ue = Qs(e, this.label, n), de = nc(this.label, n), fe = cc(this.label, n), pe = _a(this.label, n.constants, f.overrides, "draw"), me = this.label, he = ji({
			device: e,
			label: this.label,
			reflection: f,
			bindGroupLayouts: b,
			cache: r,
			disposedError: (e) => rt(me, e)
		}), { set: ge, ..._e } = n;
		bs.set(this, {
			id: d,
			device: e,
			opts: _e,
			vertexBufferLayouts: y,
			cache: r,
			defaultTarget: i,
			reflection: f,
			visibility: ee,
			vertexEntry: m?.name ?? "vs_main",
			fragmentEntry: h?.name ?? "fs_main",
			entryKey: g,
			setCore: he,
			bindGroupLayouts: b,
			pipelineLayout: ne,
			vertexShaderModule: ie,
			fragmentShaderModule: re,
			pipelineStore: a,
			pipelineLayouts: s,
			errorSink: c,
			trackSettled: l,
			resolvedPipelineKeys: /* @__PURE__ */ new Set(),
			pipelineKeys: !y || yn in v ? /* @__PURE__ */ new WeakMap() : void 0,
			pipelineKeyDerivations: 0,
			lifecycle: oe,
			...se,
			...ce,
			...le,
			...ue,
			...de,
			...fe,
			...pe
		}), ge && this.set(ge);
		for (let e of n.targets ?? []) this.compileSync(e);
	}
	get gpu() {
		let e = Y(this, "gpu");
		for (let t of e.resolvedPipelineKeys) {
			let n = e.pipelineStore.getReady(t);
			if (n) return n;
		}
	}
	get targets() {
		return Y(this, "targets").opts.targets;
	}
	dispose() {
		let e = _c(this);
		if ("disposed" in e) return;
		bs.set(this, {
			disposed: !0,
			label: this.label
		});
		let t = xs;
		try {
			e.lifecycle.recordedIn.markStale({
				kind: "draw-disposed",
				drawLabel: e.lifecycle.label
			});
		} catch (e) {
			t = e;
		}
		this.#e.clear();
		try {
			e.setCore.dispose();
		} catch (e) {
			t === xs && (t = e);
		}
		if (t !== xs) throw t;
	}
	assertUsable(e) {
		Y(this, e);
	}
	get [uo]() {
		return Y(this, "drawable"), this;
	}
	writesDepth() {
		return mc(this);
	}
	stencilWritingOps() {
		return hc(this);
	}
	set(e) {
		let t = Y(this, "set");
		O(t.device, `${this.label}.set`);
		for (let n of t.setCore.set(e)) t.lifecycle.recordedIn.markStale({
			kind: "binding-identity",
			drawLabel: t.lifecycle.label,
			...n
		});
		return this;
	}
	group(e, t) {
		let n = Y(this, "group");
		O(n.device, `${this.label}.group`);
		let r = this.#e.get(e) ?? this.layout(e), i = n.setCore.claimGroup(e, t, r);
		return n.lifecycle.recordedIn.markStale({
			kind: "group-claim",
			drawLabel: n.lifecycle.label,
			group: e,
			previousIdentity: i,
			newIdentity: `claimed-group:${e}`
		}), this;
	}
	layout(e, t = {}) {
		let n = Y(this, "layout");
		return O(n.device, `${this.label}.layout`), t.dynamicOffsets ? this.#t(e) : n.setCore.layout(e);
	}
	#t(e) {
		let t = Y(this);
		t.setCore.layout(e);
		let n = this.#e.get(e);
		if (n) return n;
		let r = xc(this, e), i = wi(t.device, `${this.label}.group${e}.dynamic.bgl`, r);
		return this.#e.set(e, i), t.bindGroupLayouts.set(e, i), t.setCore.refreshLayouts(), t.pipelineLayout = t.pipelineLayouts.get(t.bindGroupLayouts), i;
	}
	draw(e = {}) {
		O(Y(this, "draw").device, `${this.label}.draw`);
		let t = oa(e) ? { target: e } : e, n = Y(this, "draw"), r = t.target ?? n.defaultTarget;
		if (!r) throw Et(`${this.label}.draw`);
		Cc(r, `${this.label}.draw`), n.setCore.preflight();
		let i = n.device.gpu.createCommandEncoder(), a = i.beginRenderPass(r.renderPassDescriptor()), o = [];
		try {
			this.encode(a, r, t, (e) => o.push(e));
		} catch (e) {
			A(o), Yn(n.device);
			try {
				a.end();
			} catch {}
			throw e;
		}
		nr(n.device, a, o, o[0]?.context);
		let s, c = o[0]?.context;
		c && Kn(n.device, c);
		try {
			s = i.finish();
		} catch (e) {
			let t = c ? k(n.device) : void 0;
			A(o), t && A([t]);
			let r = t?.context ?? c;
			if (r) {
				vc(n, r.label, r.group, e);
				return;
			}
			throw e;
		}
		if (c) {
			let e = k(n.device);
			e && (o[0] = o[0] ? Zn(e, o[0]) : e);
		}
		let l = o[0]?.context;
		l && Kn(n.device, l);
		try {
			n.device.gpu.queue.submit([s]);
		} catch (e) {
			let t = l ? k(n.device) : void 0;
			A(o), t && A([t]);
			let r = t?.context ?? l;
			if (r) {
				vc(n, r.label, r.group, e);
				return;
			}
			throw e;
		}
		if (l) {
			let e = k(n.device);
			e && (o[0] = o[0] ? Zn(e, o[0]) : e);
		}
		if (o.length) {
			let e = Xn(n.device, o, { errorSink: n.errorSink });
			n.trackSettled?.(e);
		}
	}
	encode(e, t, n = {}, r, i) {
		let a = Y(this, "encode");
		O(a.device, `${this.label}.encode`), a.setCore.preflight();
		let o = this.pipelineFor(t);
		if (o) {
			e.setPipeline(o), a.blendConstant && e.setBlendConstant(a.blendConstant), a.stencilRef !== void 0 && e.setStencilReference(a.stencilRef);
			for (let t of a.setCore.bindGroups(i)) this.#n(a, e, t, n, r);
			this.#c(a, e, n);
		}
	}
	#n(e, t, n, r, i) {
		let a = bc(r.offsets, n.group, n.offsets);
		if (!n.claimValidation || !i) {
			t.setBindGroup(n.group, n.bindGroup, a);
			return;
		}
		Kn(e.device, n.claimValidation);
		try {
			t.setBindGroup(n.group, n.bindGroup, a);
		} catch (t) {
			throw Jn(e.device), et(n.claimValidation.label, n.claimValidation.group, t);
		}
		let o = k(e.device);
		o && i(o);
	}
	compile(e) {
		return this.#r("compile", e, () => this);
	}
	#r(e, t, n) {
		let r = Y(this, e);
		O(r.device, `${this.label}.${e}`);
		let { key: i, signature: a, signatureKey: o } = this.#a(r, t, e);
		return r.pipelineStore.getAsync(i, () => r.device.gpu.createRenderPipelineAsync(this.#u(r, a)), {
			where: `${this.label}.${e}`,
			signature: o,
			dependencies: Hs(r)
		}).then((t) => {
			let r = Y(this, e);
			return O(r.device, `${this.label}.${e}`), r.resolvedPipelineKeys.add(i), n(t);
		}, (t) => {
			throw Y(this, e), t;
		});
	}
	compileSync(e) {
		return this.#i("compileSync", e, !0), this;
	}
	pipelineFor(e) {
		return this.#i("pipelineFor", e);
	}
	#i(e, t, n) {
		let r = Y(this, e);
		O(r.device, `${this.label}.${e}`);
		let { key: i, create: a, ctx: o } = this.#a(r, t, e), s = r.pipelineStore.getSync(i, a, n ? {
			...o,
			where: `${this.label}.${e}`,
			retry: n
		} : o);
		return s && r.resolvedPipelineKeys.add(i), s;
	}
	pipelineForAsync(e) {
		return this.#r("pipelineForAsync", e, (e) => e);
	}
	#a(e, t, n) {
		let r = t ?? e.defaultTarget, i = e.opts.geometry, a = r && e.pipelineKeys?.get(r);
		if (a && a.pipelineLayout === e.pipelineLayout && a.topology === i?.topology && a.stripIndexFormat === Os(i) && Ds(r, a.signature)) return a;
		e.pipelineKeyDerivations++;
		let o = this.#o(e, t, `${this.label}.${n}`), s = fa(o), c = {
			signature: o,
			signatureKey: s,
			key: this.#s(e, o),
			pipelineLayout: e.pipelineLayout,
			topology: i?.topology,
			stripIndexFormat: Os(i),
			create: () => e.device.gpu.createRenderPipeline(this.#u(e, o)),
			ctx: {
				where: `${this.label}.pipelineFor`,
				signature: s,
				dependencies: Hs(e)
			}
		};
		return e.pipelineKeys?.set(r, c), c;
	}
	#o(e, t, n) {
		let r = t ?? e.defaultTarget;
		if (!r) throw Et(n);
		let i = da(r);
		if (pa(i, n), e.colorStates && e.colorStates.length !== i.colors.length) throw at(this.label, `expected one entry per color attachment; colors has ${e.colorStates.length}, but the target signature has ${i.colors.length}.`, n);
		if (e.multisampleState?.alphaToCoverageEnabled && (i.sampleCount ?? 1) <= 1) throw ut(this.label, `alphaToCoverage requires a multisampled target, but the target signature has sampleCount ${i.sampleCount ?? 1}; create the target with msaa: true.`, n);
		if ((e.stencilState || e.stencilRef !== void 0) && !ra(i.depth)) throw lt(this.label, `stencil requires a depth format with a stencil aspect, but the target signature has ${i.depth ? `"${i.depth}"` : "no depth"}; create the target with depth: "depth24plus-stencil8".`, n);
		return i;
	}
	#s(e, t) {
		let n = e.opts.geometry;
		return ma({
			vertexModule: e.vertexShaderModule,
			fragmentModule: e.fragmentShaderModule,
			pipelineLayout: e.pipelineLayout,
			vertexBufferLayouts: e.vertexBufferLayouts,
			signature: t,
			fragmentKey: e.fragmentKey,
			topology: n?.topology,
			stripIndexFormat: Os(n),
			cullMode: e.cullMode,
			frontFace: e.frontFace,
			unclippedDepth: e.unclippedDepth,
			depthKey: e.depthKey,
			stencilKey: e.stencilKey,
			multisampleKey: e.multisampleKey,
			constantsKey: e.constantsKey,
			entryKey: e.entryKey
		});
	}
	#c(e, t, n) {
		let r = e.opts.geometry;
		if (xn(r)?.[bn](`${this.label}.geometry`), r?.vertexBuffers && r.vertexBuffers.forEach((e, n) => t.setVertexBuffer(n, e)), n.indirect !== void 0) return this.#l(t, r, n);
		let i = Es(this.label, r, e.opts, n);
		if (!r?.indexBuffer) return t.draw(i.vertexCount, i.instanceCount, i.firstVertex, i.firstInstance);
		t.setIndexBuffer(r.indexBuffer, r.indexFormat ?? "uint32"), t.drawIndexed(i.indexCount, i.instanceCount, i.firstIndex, i.baseVertex, i.firstInstance);
	}
	#l(e, t, n) {
		let r = `${this.label}.draw`, i = ws.find((e) => n[e] !== void 0);
		if (i !== void 0) throw pt(this.label, `indirect cannot be combined with ${i} in the same call; the GPU reads the draw arguments from the buffer, so the CPU-side value would be ignored.`, r);
		let a = !!t?.indexBuffer, { buffer: o, offset: s } = so(this.label, r, n.indirect, a ? "drawIndexedIndirect" : "drawIndirect");
		if (!a) return e.drawIndirect(o, s);
		e.setIndexBuffer(t.indexBuffer, t.indexFormat ?? "uint32"), e.drawIndexedIndirect(o, s);
	}
	#u(e, t) {
		return {
			label: `${this.label}.pipeline`,
			layout: e.pipelineLayout,
			vertex: {
				module: e.vertexShaderModule,
				entryPoint: e.vertexEntry,
				buffers: [...e.vertexBufferLayouts ?? []],
				...e.vertexShaderModule === e.fragmentShaderModule && e.constants ? { constants: e.constants } : {}
			},
			fragment: {
				module: e.fragmentShaderModule,
				entryPoint: e.fragmentEntry,
				targets: Ts(t, e),
				...e.constants ? { constants: e.constants } : {}
			},
			primitive: ks(e.opts.geometry, e.cullMode, e.frontFace, e.unclippedDepth),
			depthStencil: Zs(t, e),
			multisample: sc(t, e)
		};
	}
};
function Cs(e, t, n, r, i) {
	let a = e.limits;
	for (let [e, o, s] of [[
		"vertex",
		1,
		"maxStorageBuffersInVertexStage"
	], [
		"fragment",
		2,
		"maxStorageBuffersInFragmentStage"
	]]) {
		let c = r.find((t) => t.stage === e);
		if (!c) continue;
		let l = n.filter((e) => e.bindingLayout?.kind === "buffer" && e.bindingLayout.buffer.type !== "uniform" && i(e) & o), u = a[s] ?? a.maxStorageBuffersPerShaderStage;
		if (u !== void 0 && l.length > u) throw Je(t, e, c.name, l.length, u, l);
	}
}
var ws = [
	"vertices",
	"indices",
	"instances",
	"firstVertex",
	"firstIndex",
	"baseVertex",
	"firstInstance"
];
function Ts(e, t) {
	return e.colors.map((e, n) => {
		let r = t.colorStates?.[n], i = r?.blendState ?? t.blendState, a = r?.writeMask ?? t.writeMask, o = { format: e };
		return i && (o.blend = i), a !== void 0 && (o.writeMask = a), o;
	});
}
function Es(e, t, n, r) {
	q(e, "DrawOptions.instances", n.instances), q(e, "DrawOptions.vertices", n.vertices), q(e, "DrawOptions.firstInstance", n.firstInstance), q(e, "DrawCallOptions.instances", r.instances), K(e, "DrawCallOptions.vertices", r.vertices), K(e, "DrawCallOptions.indices", r.indices), K(e, "DrawCallOptions.firstVertex", r.firstVertex), K(e, "DrawCallOptions.firstIndex", r.firstIndex), K(e, "DrawCallOptions.baseVertex", r.baseVertex), q(e, "DrawCallOptions.firstInstance", r.firstInstance), q(e, "GeometryLike.vertexCount", t?.vertexCount), q(e, "GeometryLike.indexCount", t?.indexCount), q(e, "GeometryLike.instanceCount", t?.instanceCount), K(e, "GeometryLike.firstVertex", t?.firstVertex), K(e, "GeometryLike.firstIndex", t?.firstIndex), K(e, "GeometryLike.baseVertex", t?.baseVertex);
	let i = !!t?.indexBuffer, a = t?.geometry ?? (t && yn in t ? t : void 0), o = r.firstVertex ?? t?.firstVertex ?? 0, s = r.vertices ?? t?.vertexCount ?? n.vertices ?? 3, c = r.firstIndex ?? t?.firstIndex ?? 0, l = r.indices ?? t?.indexCount ?? 0, u = r.baseVertex ?? t?.baseVertex ?? 0;
	if (i) As(e, "index", c, l, a?.indexCount);
	else if (r.indices !== void 0 || r.firstIndex !== void 0 || r.baseVertex !== void 0) throw Ot(`${e}.draw`, "Index range needs an indexed geometry.");
	return i || As(e, "vertex", o, s, a?.vertexCount), {
		instanceCount: r.instances ?? n.instances ?? t?.instanceCount ?? 1,
		firstInstance: r.firstInstance ?? n.firstInstance ?? 0,
		vertexCount: s,
		firstVertex: o,
		indexCount: l,
		firstIndex: c,
		baseVertex: u
	};
}
function Ds(e, t) {
	let n = vn(e), r = n ?? e, i = !n && oa(e), a = r.colors;
	if (!Array.isArray(a) || a.length !== t.colors.length) return !1;
	for (let e = 0; e < a.length; e++) if ((i ? a[e]?.format : a[e]) !== t.colors[e]) return !1;
	return (i ? r.depth?.format : r.depth) === t.depth && (i ? r.sampleCount : r.sampleCount ?? 1) === t.sampleCount;
}
function Os(e) {
	let t = e?.topology ?? "triangle-list";
	return e?.stripIndexFormat ?? (t.endsWith("strip") ? e?.indexFormat : void 0);
}
function ks(e, t, n, r) {
	let i = e?.topology ?? "triangle-list", a = Os(e), o = a ? {
		topology: i,
		stripIndexFormat: a
	} : { topology: i };
	return t !== void 0 && (o.cullMode = t), n !== void 0 && (o.frontFace = n), r && (o.unclippedDepth = !0), o;
}
function As(e, t, n, r, i) {
	if (!(i === void 0 || n + r <= i)) throw Ot(`${e}.draw`, `${t} range [${n}, ${n + r}) exceeds parent geometry ${t} count ${i}.`);
}
function K(e, t, n) {
	if (!(n === void 0 || Number.isInteger(n) && n >= 0)) throw Ot(`${e}.draw`, `${t} must be an integer >= 0; received ${String(n)}.`);
}
function q(e, t, n) {
	if (n !== void 0 && !(Number.isInteger(n) && n >= 0)) throw new S({
		code: "VGPU-R1-DRAW-COUNT",
		message: `${t} of '${e}' must be an integer >= 0; received ${String(n)}. Use 0 only when you want to issue a valid draw with no vertices/instances.`,
		where: `${e}.draw`
	});
}
function js(e, t) {
	let n = t.blend === void 0 ? void 0 : Ns(e, t.blend), r = t.writeMask === void 0 ? void 0 : uc(e, t.writeMask), i = t.colors === void 0 ? void 0 : Ms(e, t.colors);
	return {
		blendState: n,
		writeMask: r,
		colorStates: i,
		fragmentKey: i ? `${dc(n, r)}@${i.map(pc).join("@")}` : n || r !== void 0 ? dc(n, r) : void 0
	};
}
function Ms(e, t) {
	if (!Array.isArray(t)) throw at(e, `colors must be an array; received ${J(t)}.`);
	return t.map((t, n) => {
		if (t == null) return null;
		if (typeof t != "object" || Array.isArray(t)) throw at(e, `colors[${n}] must be null or { blend?, writeMask? }; received ${J(t)}.`);
		let r = t.blend === void 0 ? void 0 : Ns(`${e}.colors[${n}]`, t.blend), i = t.writeMask === void 0 ? void 0 : uc(`${e}.colors[${n}]`, t.writeMask);
		return !r && i === void 0 ? null : {
			blendState: r,
			writeMask: i
		};
	});
}
function Ns(e, t) {
	if (t === "alpha") return Fs({
		src: "src-alpha",
		dst: "one-minus-src-alpha"
	}, {
		src: "one",
		dst: "one-minus-src-alpha"
	});
	if (t === "premultiplied") return Fs({
		src: "one",
		dst: "one-minus-src-alpha"
	}, {
		src: "one",
		dst: "one-minus-src-alpha"
	});
	if (t === "additive") return Fs({
		src: "one",
		dst: "one"
	}, {
		src: "one",
		dst: "one"
	});
	if (typeof t != "object" || !t || !Ps(t.color)) throw tt(e, t);
	let n = t.color, r = t.alpha;
	if (r !== void 0 && !Ps(r)) throw tt(e, t);
	return Fs(n, r ?? n);
}
function Ps(e) {
	return typeof e == "object" && !!e && typeof e.src == "string" && typeof e.dst == "string";
}
function Fs(e, t) {
	return {
		color: Is(e),
		alpha: Is(t)
	};
}
function Is(e) {
	return {
		srcFactor: e.src,
		dstFactor: e.dst,
		operation: e.op ?? "add"
	};
}
function Ls(e, t, n) {
	if (t.blendConstant === void 0) return {};
	let r = t.blendConstant;
	if (!Array.isArray(r) || r.length !== 4 || r.some((e) => typeof e != "number" || !Number.isFinite(e))) throw nt(e, `received ${J(r)}; expected [r, g, b, a] finite numbers.`);
	if (!Rs(n).some((e) => e && zs(e))) throw nt(e, "no color target's effective blend uses a \"constant\"/\"one-minus-constant\" factor (colors[i].blend replaces the top-level blend for that target), so blendConstant would have no effect.");
	return { blendConstant: {
		r: r[0],
		g: r[1],
		b: r[2],
		a: r[3]
	} };
}
function Rs(e) {
	return e.colorStates ? e.colorStates.map((t) => t?.blendState ?? e.blendState) : [e.blendState];
}
function zs(e) {
	return [
		e.color.srcFactor,
		e.color.dstFactor,
		e.alpha.srcFactor,
		e.alpha.dstFactor
	].some((e) => e === "constant" || e === "one-minus-constant");
}
function Bs(e, t) {
	if (t === void 0) return {};
	if (typeof t != "object" || !t || Array.isArray(t)) throw ft(e, `received ${J(t)}; expected { vertex?, fragment? } entry point names.`);
	return t;
}
function Vs(e, t) {
	return `en~${e?.name ?? ""}~${t?.name ?? ""}`;
}
function Hs(e) {
	return e.vertexShaderModule === e.fragmentShaderModule ? [e.vertexShaderModule, e.pipelineLayout] : [
		e.vertexShaderModule,
		e.fragmentShaderModule,
		e.pipelineLayout
	];
}
function Us(e, t, n) {
	return {
		cullMode: n.cull === void 0 ? void 0 : Gs(t, n.cull),
		frontFace: n.frontFace === void 0 ? void 0 : Ks(t, n.frontFace),
		unclippedDepth: n.unclippedDepth === void 0 ? void 0 : Ws(e, t, n.unclippedDepth)
	};
}
function Ws(e, t, n) {
	if (typeof n != "boolean") throw ct(t, `received ${J(n)}; expected a boolean.`);
	if (n) {
		if (!e.features.has("depth-clip-control")) throw ct(t, "the device lacks the \"depth-clip-control\" feature; request it at init: init({ requiredFeatures: [\"depth-clip-control\"] }) on an adapter that supports it.");
		return !0;
	}
}
function Gs(e, t) {
	if (t === "none" || t === "front" || t === "back") return t;
	throw ot(e, t);
}
function Ks(e, t) {
	if (t === "ccw" || t === "cw") return t;
	throw st(e, t);
}
var qs = {
	depthWriteEnabled: !0,
	depthCompare: "less-equal"
}, Js = [
	"never",
	"less",
	"equal",
	"less-equal",
	"greater",
	"not-equal",
	"greater-equal",
	"always"
], Ys = -2147483648, Xs = 2147483647;
function Zs(e, t) {
	if (e.depth) return {
		format: e.depth,
		...t.depthState ?? qs,
		...t.stencilState ?? {}
	};
}
function Qs(e, t, n) {
	if (n.depth === void 0) return {};
	let r = $s(e, t, n.depth, n.geometry?.topology ?? "triangle-list");
	return {
		depthState: r,
		depthKey: ec(r)
	};
}
function $s(e, t, n, r) {
	if (n === !1) return {
		depthWriteEnabled: !1,
		depthCompare: "always"
	};
	if (typeof n != "object" || !n) throw C(t, `received ${J(n)}.`);
	if (n.write !== void 0 && typeof n.write != "boolean") throw C(t, `write must be a boolean; received ${J(n.write)}.`);
	if (n.compare !== void 0 && !Js.includes(n.compare)) throw C(t, `compare must be a GPUCompareFunction; received ${J(n.compare)}.`);
	if (n.bias !== void 0 && !Number.isInteger(n.bias)) throw C(t, `bias must be an integer (WebGPU depthBias is i32); received ${J(n.bias)}.`);
	if (n.bias !== void 0 && (n.bias < Ys || n.bias > Xs)) throw C(t, `bias must fit in the i32 range [${Ys}, ${Xs}] (WebGPU depthBias is i32); received ${J(n.bias)}.`);
	if (n.biasSlopeScale !== void 0 && !Number.isFinite(n.biasSlopeScale)) throw C(t, `biasSlopeScale must be a finite number; received ${J(n.biasSlopeScale)}.`);
	if (n.biasClamp !== void 0 && !Number.isFinite(n.biasClamp)) throw C(t, `biasClamp must be a finite number; received ${J(n.biasClamp)}.`);
	let i = n.bias ?? 0, a = n.biasSlopeScale ?? 0, o = n.biasClamp ?? 0;
	if ((i !== 0 || a !== 0 || o !== 0) && !r.startsWith("triangle")) throw C(t, `bias, biasSlopeScale, and biasClamp must be 0 for "${r}" topology.`);
	if (o !== 0 && e.isCompatibilityMode) throw C(t, `biasClamp must be 0 on a compatibility-mode device; received ${J(n.biasClamp)}.`);
	return {
		depthWriteEnabled: n.write ?? !0,
		depthCompare: n.compare ?? "less-equal",
		...i === 0 ? {} : { depthBias: i },
		...a === 0 ? {} : { depthBiasSlopeScale: a },
		...o === 0 ? {} : { depthBiasClamp: o }
	};
}
function ec(e) {
	return `${+!!e.depthWriteEnabled}~${e.depthCompare}~${e.depthBias ?? 0}~${e.depthBiasSlopeScale ?? 0}~${e.depthBiasClamp ?? 0}`;
}
var tc = [
	"keep",
	"zero",
	"replace",
	"invert",
	"increment-clamp",
	"decrement-clamp",
	"increment-wrap",
	"decrement-wrap"
];
function nc(e, t) {
	if (t.stencil === void 0) return {};
	let n = t.stencil;
	if (typeof n != "object" || !n || Array.isArray(n)) throw lt(e, `received ${J(n)}; expected { front?, back?, readMask?, writeMask?, ref? }.`);
	let r = n.front === void 0 ? void 0 : rc(e, "front", n.front), i = n.back === void 0 ? void 0 : rc(e, "back", n.back);
	ic(e, "readMask", n.readMask), ic(e, "writeMask", n.writeMask), ic(e, "ref", n.ref);
	let a = {
		...r ? { stencilFront: r } : {},
		...i ?? r ? { stencilBack: i ?? { ...r } } : {},
		...n.readMask === void 0 ? {} : { stencilReadMask: n.readMask },
		...n.writeMask === void 0 ? {} : { stencilWriteMask: n.writeMask }
	}, o = a.stencilFront !== void 0 || a.stencilBack !== void 0 || a.stencilReadMask !== void 0 || a.stencilWriteMask !== void 0;
	return !o && n.ref === void 0 ? {} : {
		...o ? {
			stencilState: a,
			stencilKey: ac(a)
		} : {},
		...n.ref === void 0 ? {} : { stencilRef: n.ref }
	};
}
function rc(e, t, n) {
	if (typeof n != "object" || !n || Array.isArray(n)) throw lt(e, `${t} must be a { compare?, fail?, depthFail?, pass? } object; received ${J(n)}.`);
	if (n.compare !== void 0 && !Js.includes(n.compare)) throw lt(e, `${t}.compare must be a GPUCompareFunction; received ${J(n.compare)}.`);
	for (let [r, i] of [
		["fail", n.fail],
		["depthFail", n.depthFail],
		["pass", n.pass]
	]) if (i !== void 0 && !tc.includes(i)) throw lt(e, `${t}.${r} must be a GPUStencilOperation; received ${J(i)}.`);
	return {
		compare: n.compare ?? "always",
		failOp: n.fail ?? "keep",
		depthFailOp: n.depthFail ?? "keep",
		passOp: n.pass ?? "keep"
	};
}
function ic(e, t, n) {
	if (n !== void 0 && (typeof n != "number" || !Number.isInteger(n) || n < 0 || n > 4294967295)) throw lt(e, `${t} must be an integer in [0, 0xFFFFFFFF] (WebGPU GPUStencilValue is u32); received ${J(n)}.`);
}
function ac(e) {
	return `st~${oc(e.stencilFront)}~${oc(e.stencilBack)}~${e.stencilReadMask ?? 4294967295}~${e.stencilWriteMask ?? 4294967295}`;
}
function oc(e) {
	return e ? `${e.compare},${e.failOp},${e.depthFailOp},${e.passOp}` : "default";
}
function sc(e, t) {
	return {
		count: e.sampleCount ?? 1,
		...t.multisampleState ?? {}
	};
}
function cc(e, t) {
	if (t.multisample === void 0) return {};
	let n = t.multisample;
	if (typeof n != "object" || !n || Array.isArray(n)) throw ut(e, `received ${J(n)}; expected { alphaToCoverage?, mask? }.`);
	if (n.alphaToCoverage !== void 0 && typeof n.alphaToCoverage != "boolean") throw ut(e, `alphaToCoverage must be a boolean; received ${J(n.alphaToCoverage)}.`);
	if (n.mask !== void 0 && (typeof n.mask != "number" || !Number.isInteger(n.mask) || n.mask < 0 || n.mask > 4294967295)) throw ut(e, `mask must be an integer in [0, 0xFFFFFFFF] (WebGPU GPUSampleMask is u32); received ${J(n.mask)}.`);
	let r = {
		...n.alphaToCoverage === void 0 ? {} : { alphaToCoverageEnabled: n.alphaToCoverage },
		...n.mask === void 0 ? {} : { mask: n.mask }
	};
	return r.alphaToCoverageEnabled === void 0 && r.mask === void 0 ? {} : {
		multisampleState: r,
		multisampleKey: lc(r)
	};
}
function lc(e) {
	return `ms~${+!!e.alphaToCoverageEnabled}~${e.mask ?? 4294967295}`;
}
function uc(e, t) {
	if (!Array.isArray(t)) throw it(e, J(t));
	let n = 0;
	for (let r of t) if (r === "r") n |= 1;
	else if (r === "g") n |= 2;
	else if (r === "b") n |= 4;
	else if (r === "a") n |= 8;
	else throw it(e, J(r));
	return n;
}
function dc(e, t) {
	return `${fc(e)};${t ?? 15}`;
}
function fc(e) {
	if (!e) return "none;none";
	let t = e.color, n = e.alpha;
	return `${t.srcFactor},${t.dstFactor},${t.operation};${n.srcFactor},${n.dstFactor},${n.operation}`;
}
function pc(e) {
	return e ? `${e.blendState ? fc(e.blendState) : "inherit"};${e.writeMask ?? "inherit"}` : "inherit";
}
function J(e) {
	if (typeof e == "string") return `"${e}"`;
	try {
		return JSON.stringify(e) ?? String(e);
	} catch {
		return String(e);
	}
}
function mc(e) {
	return (Y(e, "writesDepth").depthState ?? qs).depthWriteEnabled;
}
function hc(e) {
	let t = Y(e, "stencilWritingOps"), n = t.stencilState;
	if (!n || n.stencilWriteMask === 0) return [];
	let r = t.cullMode ?? "none", i = [], a = (e, t) => {
		if (t) for (let [n, r] of [
			["fail", t.failOp],
			["depthFail", t.depthFailOp],
			["pass", t.passOp]
		]) r !== void 0 && r !== "keep" && i.push(`${e}.${n}: "${r}"`);
	};
	return r !== "front" && a("front", n.stencilFront), r !== "back" && a("back", n.stencilBack), i;
}
function gc(e, t, n, r = {}, i, a) {
	e.encode(t, n, r, i, a);
}
function _c(e) {
	let t = bs.get(e);
	if (!t) throw TypeError("Invalid Draw instance");
	return t;
}
function Y(e, t = "access") {
	let n = _c(e);
	if ("disposed" in n) throw rt(n.label, t);
	return n;
}
function vc(e, t, n, r) {
	let i = (async () => {
		await tn(e.device), O(e.device, `${t}.validation`);
		let i = et(t, n, r);
		e.errorSink ? await e.errorSink(i) : console.error(i);
	})();
	return e.trackSettled?.(i), i;
}
function yc() {
	let e = /* @__PURE__ */ new Set(), t = /* @__PURE__ */ new WeakMap(), n;
	function r(t = 16) {
		for (let r = 0; r < t; r += 1) {
			n ??= e.values();
			let t = n.next();
			if (t.done && (n = e.values(), t = n.next(), t.done)) return;
			t.value.deref() || e.delete(t.value);
		}
	}
	function i() {
		let t = [];
		for (let n of e) {
			let r = n.deref();
			r ? t.push(r) : e.delete(n);
		}
		return n = void 0, t;
	}
	return {
		add(n) {
			if (r(), t.has(n)) return;
			let i = new WeakRef(n);
			t.set(n, i), e.add(i);
		},
		delete(n) {
			let r = t.get(n);
			r && e.delete(r), t.delete(n);
		},
		list: i,
		markStale(e) {
			let t = xs;
			for (let n of i()) try {
				n.markStale(e);
			} catch (e) {
				t === xs && (t = e);
			}
			if (t !== xs) throw t;
		}
	};
}
function bc(e, t, n) {
	return e ? Array.isArray(e) ? e : e[t] ?? n : n;
}
function xc(e, t) {
	let n = Y(e);
	return xi(n.reflection.bindings, t, n.visibility).map(Sc);
}
function Sc(e) {
	return e.buffer ? {
		...e,
		buffer: {
			...e.buffer,
			hasDynamicOffset: !0
		}
	} : e;
}
function Cc(e, t) {
	if (Ka(e) && !Ua()) throw Ft(t);
}
//#endregion
//#region node_modules/vgpu/dist/fullscreen-stage.js
var wc = "\nstruct VgpuFullscreenVertexOut {\n  @builtin(position) position: vec4f,\n  @location(0) uv: vec2f,\n};\n@vertex fn vgpu_fullscreen_vs(@builtin(vertex_index) vi: u32) -> VgpuFullscreenVertexOut {\n  var pos = array<vec2f, 3>(vec2f(-1.0, -1.0), vec2f(3.0, -1.0), vec2f(-1.0, 3.0));\n  var uv = array<vec2f, 3>(vec2f(0.0, 1.0), vec2f(2.0, 1.0), vec2f(0.0, -1.0));\n  var out: VgpuFullscreenVertexOut;\n  out.position = vec4f(pos[vi], 0.0, 1.0);\n  out.uv = uv[vi];\n  return out;\n}\n", Tc = Ec({
	name: "vgpu_fullscreen_vs",
	mangledName: "vgpu_fullscreen_vs",
	stage: "vertex",
	bindings: [],
	samplingPairs: [],
	inputs: []
});
function Ec(e) {
	if (typeof e != "object" || !e || Object.isFrozen(e)) return e;
	for (let t of Object.values(e)) Ec(t);
	return Object.freeze(e);
}
//#endregion
//#region node_modules/vgpu/dist/effect.js
function Dc(e, t, n = {}) {
	if ("geometry" in n) throw E("effect", "effect() never accepts vertex buffers; use draw(gpu, { shader, geometry: geometry(gpu, descriptor) }).");
	let r = Sn(e, "effect"), i = Co(r);
	return new kc(r.device, hs(t), n, i.binds, void 0, i.pipelines, i.shaderModules, i.pipelineLayouts, (e) => r.reportError(e), (e) => {
		r.trackDelivery(e);
	});
}
var Oc = /* @__PURE__ */ new WeakMap(), kc = class {
	get gpu() {
		return X(this).gpu;
	}
	dispose() {
		X(this).dispose();
	}
	constructor(e, t, n = {}, r, i, a, o, s, c, l) {
		let u = n.entry;
		if (u && typeof u == "object" && "vertex" in u) throw ft(n.label ?? "effect", "effect does not support vertex entry overrides.", "effect");
		let d = t.reflection.entryPoints.some((e) => e.stage === "vertex") ? void 0 : {
			source: wc,
			entry: Tc
		}, f = new Ss(e, t, {
			entry: u,
			set: n.set,
			label: n.label ?? "effect",
			blend: n.blend,
			writeMask: n.writeMask
		}, r, i, a, o, s, c, l, d);
		Oc.set(this, f);
	}
	set(e) {
		return X(this).set(e), this;
	}
	draw(e = {}) {
		X(this).draw(e);
	}
	compile(e) {
		return X(this).compile(e).then(() => this);
	}
	compileSync(e) {
		return X(this).compileSync(e), this;
	}
	encode(e, t, n = {}, r) {
		gc(X(this), e, t, n, r);
	}
	get [uo]() {
		return X(this)[uo];
	}
};
function X(e) {
	let t = Oc.get(e);
	if (!t) throw TypeError("Invalid Effect instance");
	return t;
}
var Ac = /* @__PURE__ */ new WeakMap(), jc = /* @__PURE__ */ new WeakSet(), Mc = 1, Nc = class {
	device;
	#e = [];
	#t = /* @__PURE__ */ new Map();
	#n = !1;
	constructor(e) {
		this.device = e;
	}
	capture(e, t) {
		let n = this.#t.get(e.owner);
		return n?.revision !== e.revision && (n = this.#r(e), this.#t.set(e.owner, n)), n.page.caches.add(t), n;
	}
	flush() {
		for (let e of this.#e) this.device.gpu.queue.writeBuffer(e.buffer, 0, e.bytes.buffer, 0, Math.ceil(e.used / 4) * 4);
	}
	release() {
		if (this.#n) return;
		this.#n = !0;
		let e = jc.has(this.device) ? void 0 : Ac.get(this.device);
		for (let t of this.#e) if (e && e.pages.length < 256 && e.bytes + t.bytes.byteLength <= 16777216) {
			for (let e of t.caches) e.evictIdentity(Pc(t), t.taken);
			e.pages.push(t), e.bytes += t.bytes.byteLength;
		} else Fc(t);
		this.#e.length = 0, this.#t.clear();
	}
	#r(e) {
		let t = this.device.limits.minUniformBufferOffsetAlignment || 256, n = e.bytes.byteLength, r = this.#e.at(-1), i = Math.ceil((r?.used ?? 0) / t) * t;
		(!r || i + n > r.bytes.byteLength) && (r = this.#i(n), this.#e.push(r), i = 0), r.bytes.set(e.bytes, i), r.used = i + n;
		let a = r.ranges.get(i);
		return a?.identity.size !== n && (a = {
			resource: {
				buffer: r.buffer,
				offset: i,
				size: n
			},
			identity: {
				kind: An,
				id: r.id,
				offset: i,
				size: n
			}
		}, r.ranges.set(i, a)), {
			revision: e.revision,
			page: r,
			resource: a.resource,
			identity: a.identity
		};
	}
	#i(e) {
		let t = Ac.get(this.device);
		!t && !jc.has(this.device) && Ac.set(this.device, t = {
			pages: [],
			bytes: 0
		});
		let n = t?.pages.findIndex((t) => t.bytes.byteLength >= e) ?? -1, r = n >= 0 ? t.pages.splice(n, 1)[0] : this.#a(e);
		return n >= 0 && (t.bytes -= r.bytes.byteLength), r.used = 0, r.taken = Pn(), r;
	}
	#a(e) {
		let t = Math.min(this.device.limits.maxBufferSize, Math.max(65536, Math.ceil(e / 4) * 4)), n = this.device.gpu.createBuffer({
			label: "vgpu.frame.uniforms",
			size: t,
			usage: 72
		});
		return {
			id: Mc++,
			buffer: n,
			bytes: new Uint8Array(t),
			used: 0,
			taken: 0,
			caches: /* @__PURE__ */ new Set(),
			ranges: /* @__PURE__ */ new Map()
		};
	}
};
function Pc(e) {
	return {
		kind: An,
		id: e.id
	};
}
function Fc(e) {
	for (let t of e.caches) t.evictIdentity(Pc(e));
	e.caches.clear(), e.buffer.destroy();
}
function Ic(e) {
	jc.add(e);
	for (let t of Ac.get(e)?.pages ?? []) Fc(t);
	Ac.delete(e);
}
//#endregion
//#region node_modules/vgpu/dist/frame.js
function Lc(e, t) {
	return Bc(Sn(e, "frame")).frame(t);
}
var Rc, zc = rn("frame-runner");
function Bc(e) {
	return e.service(zc, (e) => {
		let t = Pa(e);
		return e.own("service", () => Ic(e.device)), new Zc(() => {
			let t = () => {}, n = new Vc(e.device, void 0, (t) => e.reportError(t), (t) => {
				e.trackDelivery(t);
			}, () => t());
			return t = e.own("scheduler", () => n.cancel()), n;
		}, () => t.tick(), (t) => {
			let n = e.own("scheduler", () => t.stop()), r = e.stopOnLoss(() => t.stop());
			return () => {
				n(), r();
			};
		}, (t) => O(e.device, t));
	});
}
var Vc = class {
	device;
	defaultTarget;
	errorSink;
	trackSettled;
	releaseLifecycle;
	done = Promise.resolve();
	#e;
	#t = [];
	#n = [];
	#r;
	#i = { capture: (e, t) => (this.#r ??= new Nc(this.device)).capture(e, t) };
	#a = /* @__PURE__ */ new Set();
	#o = /* @__PURE__ */ new Set();
	#s = !1;
	#c = !1;
	#l = !1;
	static {
		Rc = (e) => !(#s in e) || !e.#s && !e.#c;
	}
	constructor(e, t, n, r, i) {
		this.device = e, this.defaultTarget = t, this.errorSink = n, this.trackSettled = r, this.releaseLifecycle = i, O(e, "Frame.constructor"), this.#e = e.gpu.createCommandEncoder({ label: "vgpu.frame" });
	}
	computePass(e, t) {
		this.#u("Frame.computePass");
		let n = typeof e == "function" ? e : t;
		if (typeof n != "function") throw new S({
			code: "VGPU-COMPUTE-PASS-INVALID",
			message: "computePass requires a synchronous callback.",
			where: "Frame.computePass"
		});
		let r = typeof e == "function" ? "vgpu.computePass" : e.label ?? "vgpu.computePass", i = gi(this.device, this.#n, `${r}.begin`, () => this.#e.beginComputePass({ label: r }));
		this.#l = !0;
		let a = !0, o = { dispatch: (e, t, n, o) => {
			if (!a) throw new S({
				code: "VGPU-COMPUTE-PASS-CLOSED",
				message: "The compute pass callback has ended.",
				where: `${r}.dispatch`
			});
			O(this.device, `${r}.dispatch`);
			let s = vo(e);
			if (!s || s.device.gpu !== this.device.gpu) throw new S({
				code: "VGPU-COMPUTE-DEVICE-MISMATCH",
				message: "Expected a compute pipeline created for this frame's GPU device.",
				where: `${r}.dispatch`
			});
			s.encode(i, t, n, o, this.#n, this.#i);
		} }, s = !1;
		try {
			let e = n(o);
			if (e && typeof e.then == "function") throw Promise.resolve(e).catch(() => void 0), new S({
				code: "VGPU-COMPUTE-PASS-ASYNC",
				message: "computePass callbacks must be synchronous; await preparation before opening the frame.",
				where: "Frame.computePass"
			});
		} catch (e) {
			throw s = !0, e;
		} finally {
			a = !1, this.#l = !1;
			try {
				gi(this.device, this.#n, `${r}.end`, () => i.end());
			} catch (e) {
				if (!s) throw e;
			}
		}
	}
	#u(e) {
		if (this.#c) throw Kt(e);
		if (this.#s) throw Jt(e);
		if (O(this.device, e), this.#l) throw qt(e);
	}
	pass(e, t) {
		if (this.#c) throw Kt("Frame.pass");
		if (O(this.device, "Frame.pass"), this.#l) throw qt("Frame.pass");
		if (this.#s && !Ka(oa(e) ? e : e.target)) throw Jt("Frame.pass");
		let n = oa(e), r = typeof t == "function" ? t : (e) => e.draw(t), i = n ? e : e.target ?? this.defaultTarget;
		if (!i) throw Et("Frame.pass");
		if (Ka(i) && this.#s) throw Ft("Frame.pass");
		let a = n ? void 0 : e.clear, o = a === !1;
		if (o && i.sampleCount === 4) throw mt();
		let s = n ? void 0 : e.clearDepth;
		if (s !== void 0) {
			if (typeof s != "number" || !(s >= 0 && s <= 1)) throw ht(s);
			if (o) throw _t();
			if (!i.depth) throw ht(s, "but the target has no depth attachment, so clearDepth would have no effect.", "Create the target with depth: true (or a depth format), or drop clearDepth.");
		}
		let c = n ? void 0 : e.clearStencil;
		if (c !== void 0) {
			if (typeof c != "number" || !Number.isInteger(c) || c < 0 || c > 4294967295) throw vt(`received ${String(c)}; expected an integer in [0, 0xFFFFFFFF] (WebGPU GPUStencilValue).`);
			if (o) throw yt();
			let e = i.depth?.format;
			if (!ra(e)) throw vt(`received ${String(c)}, but the target's depth format ${e ? `"${e}"` : "(none)"} has no stencil aspect, so clearStencil would have no effect.`);
		}
		let l = n ? void 0 : e.depthReadOnly;
		if (l !== void 0 && typeof l != "boolean") throw bt(`received ${Z(l)}; expected a boolean.`, "Pass depthReadOnly: true to open the pass with a read-only depth attachment, or omit it.");
		if (l) {
			if (!i.depth) throw bt("is set, but the target has no depth attachment, so there is nothing to make read-only.", "Create the target with depth: true (or a depth format), or drop depthReadOnly.");
			if (i.sampleCount === 4) throw xt();
			if (s !== void 0) throw bt("cannot be combined with clearDepth; a read-only depth aspect omits its load/store ops and is never cleared.", "Remove clearDepth, or drop depthReadOnly.");
			if (c !== void 0) throw bt("cannot be combined with clearStencil; a read-only stencil aspect omits its load/store ops and is never cleared.", "Remove clearStencil, or drop depthReadOnly.");
		}
		let u = n ? void 0 : Jc(e.viewport, this.device.gpu.limits, i.size), d = n ? void 0 : Yc(e.scissor, i.size), f = [], p;
		try {
			let t = n || e.timer === void 0 ? void 0 : this.#h(e.timer, i, f, Kc), m = (n || e.visibility === void 0 ? void 0 : this.#h(e.visibility, i, f, qc))?.occlusion, h = i.renderPassDescriptor({
				clear: a === void 0 || a === !0 || a === !1 ? i.clearColor ?? qi : a,
				preserve: o,
				clearDepth: s,
				clearStencil: c,
				depthReadOnly: l
			});
			t?.timestampWrites && (h = {
				...h,
				timestampWrites: t.timestampWrites
			}), m && (h = {
				...h,
				occlusionQuerySet: m.querySet
			}), p = this.#e.beginRenderPass(h), u && p.setViewport(u.x, u.y, u.width, u.height, u.minDepth, u.maxDepth), d && p.setScissorRect(d[0], d[1], d[2], d[3]), this.#l = !0;
			try {
				r(new Hc(p, i, this.#t, l === !0, m, this, (e) => {
					if (O(this.device, e), this.#c) throw Kt(e);
					if (!this.#l) throw qt(e);
				}, this.#i));
			} finally {
				this.#l = !1;
			}
		} catch (e) {
			this.#p(f), A(this.#t), this.#t.length = 0, Yn(this.device);
			try {
				p?.end();
			} catch {}
			throw e;
		}
		nr(this.device, p, this.#t);
	}
	submit() {
		if (this.#s || this.#c) return;
		if (O(this.device, "Frame.submit"), this.#l) throw qt("Frame.submit");
		this.#s = !0, this.releaseLifecycle?.();
		try {
			for (let e of this.#m()) e.finalizeFrame(this, this.#e);
		} catch (e) {
			throw this.#r?.release(), this.#d(this.#f()), e;
		}
		try {
			this.#r?.flush();
		} catch (e) {
			throw this.#r?.release(), this.#d(this.#f()), e;
		}
		let e, t = this.#t[0]?.context;
		t && Kn(this.device, t);
		try {
			e = this.#n.length ? gi(this.device, this.#n, "Frame.finish", () => this.#e.finish()) : this.#e.finish();
		} catch (e) {
			this.#d(this.#f());
			let n = t ? k(this.device) : void 0;
			A(this.#t), n && A([n]);
			let r = n?.context ?? t;
			if (!r) throw this.#r?.release(), e;
			this.done = this.#_(this.#g(r.label, r.group, e));
			return;
		}
		if (t) {
			let e = k(this.device);
			e && (this.#t[0] = this.#t[0] ? Zn(e, this.#t[0]) : e);
		}
		let n = this.#t[0]?.context;
		n && Kn(this.device, n);
		try {
			this.#n.length ? gi(this.device, this.#n, "Frame.submit", () => this.device.gpu.queue.submit([e])) : this.device.gpu.queue.submit([e]);
		} catch (e) {
			this.#d(this.#f());
			let t = n ? k(this.device) : void 0;
			A(this.#t), t && A([t]);
			let r = t?.context ?? n;
			if (!r) throw this.#r?.release(), e;
			this.done = this.#_(this.#g(r.label, r.group, e));
			return;
		}
		if (n) {
			let e = k(this.device);
			e && (this.#t[0] = this.#t[0] ? Zn(e, this.#t[0]) : e);
		}
		for (let e of this.#m()) e.frameSubmitted(this);
		this.#d(this.#o), this.done = this.#_(Promise.all([Xn(this.device, this.#t, { errorSink: this.errorSink }), vi(this.#n, this.errorSink ?? ((e) => console.error(e)))]).then(() => void 0));
	}
	cancel() {
		if (!this.#c) {
			if (this.#s) throw Jt("Frame.cancel");
			if (this.#l) throw qt("Frame.cancel");
			this.#c = !0, this.#r?.release(), this.#n.length = 0, this.releaseLifecycle?.(), this.#d(this.#f()), this.#a.clear(), this.#o.clear(), A(this.#t), this.#t.length = 0;
		}
	}
	#d(e) {
		for (let t of [...e]) t.frameAbandoned(this);
	}
	#f() {
		return [...this.#a, ...this.#o];
	}
	#p(e) {
		for (let t of [...e]) this.#a.delete(t), this.#o.add(t);
	}
	#m() {
		return [...this.#a].filter((e) => !this.#o.has(e));
	}
	#h(e, t, n, r) {
		let i = go(e);
		if (!i) throw r(e);
		let a;
		try {
			a = i[ho]({
				frame: this,
				device: this.device,
				target: t
			});
		} catch (e) {
			throw this.#p(this.#a), e;
		}
		return this.#a.add(a.owner), n.push(a.owner), a;
	}
	async #g(e, t, n) {
		await tn(this.device), O(this.device, "Frame.validation");
		let r = et(e, t, n);
		this.errorSink ? await this.errorSink(r) : console.error(r);
	}
	#_(e) {
		let t = e.catch((e) => {
			let t = e instanceof S ? e : new S({
				code: "VGPU-FRAME-COMPLETION",
				message: "GPU frame completion failed.",
				where: "Frame.done",
				cause: e
			});
			return this.errorSink ? this.errorSink(t) : console.error(t);
		}).finally(() => this.#r?.release());
		return this.trackSettled?.(t), t;
	}
}, Hc = class {
	encoder;
	target;
	validations;
	depthReadOnly;
	occlusionSource;
	frame;
	assertFrameOpen;
	capture;
	#e = !1;
	constructor(e, t, n, r = !1, i, a, o, s) {
		this.encoder = e, this.target = t, this.validations = n, this.depthReadOnly = r, this.occlusionSource = i, this.frame = a, this.assertFrameOpen = o, this.capture = s;
	}
	draw(e, t = {}) {
		this.assertFrameOpen?.("FramePass.draw");
		let n = Wc(e);
		this.depthReadOnly && Uc(n, this.target), n.encode(this.encoder, this.target, t, (e) => this.validations.push(e), this.capture);
	}
	occlusion(e, t) {
		if (this.assertFrameOpen?.("FramePass.occlusion"), !this.occlusionSource) throw wt();
		if (this.#e) throw Tt();
		let n = this.occlusionSource.beginQuery(e, this.frame);
		this.encoder.beginOcclusionQuery(n), this.#e = !0;
		try {
			typeof t == "function" ? t() : this.draw(t);
		} finally {
			this.#e = !1, this.encoder.endOcclusionQuery();
		}
	}
	bundles(...e) {
		if (this.assertFrameOpen?.("FramePass.bundles"), this.depthReadOnly) throw bt("pass cannot replay bundles: bundle records bundles with writable depth/stencil, and WebGPU only executes read-only-recorded bundles in a read-only pass.", "Encode the draws directly with pass.draw(...) inside the depthReadOnly pass.", "FramePass.bundles");
		let t = e.map((e) => mo(e) ?? Gc());
		for (let e of t) e.assertReplayable(this.target);
		this.encoder.executeBundles(t.map((e) => e.gpu));
	}
};
function Uc(e, t) {
	if (e.writesDepth()) throw bt(`pass cannot encode draw '${e.label}': its depth state writes depth (the default is write: true). Give the draw depth: { write: false } (or depth: false to disable depth testing).`, "Use depth: { write: false } on the draw, or open the pass without depthReadOnly.", "FramePass.draw");
	if (ra(t.depth?.format)) {
		let t = e.stencilWritingOps();
		if (t.length) throw bt(`pass cannot encode draw '${e.label}': its stencil ops can write (${t.join(", ")}), and the pass's stencil aspect is read-only too.`, "Use \"keep\" for those ops or stencil writeMask: 0, or open the pass without depthReadOnly.", "FramePass.draw");
	}
}
function Wc(e) {
	let t = fo(e);
	if (!t) throw TypeError("Invalid Effect instance: pass.draw() expects a Draw or an Effect created by this library.");
	return t;
}
function Gc() {
	throw new S({
		code: "VGPU-R3-BUNDLE-INVALID",
		message: "p.bundles() expected bundles created by bundle(gpu, { target }, cb).",
		where: "FramePass.bundles"
	});
}
function Kc(e) {
	return St(`FramePassOptions.timer received ${Z(e)}; expected a TimerSpan from timer.span(name).`, "Create const passTimer = timer(gpu) once, then pass passTimer.span(\"name\") per pass.", "Frame.pass");
}
function qc(e) {
	return Ct(`FramePassOptions.visibility received ${Z(e)}; expected a Visibility from visibility(gpu).`, "Create const vis = visibility(gpu) once, then pass { target, visibility: vis } per pass.", "Frame.pass");
}
function Jc(e, t, n) {
	if (e === void 0) return;
	if (typeof e != "object" || !e || Array.isArray(e)) throw w(`received ${Z(e)}; expected { x?, y?, width, height, minDepth?, maxDepth? }.`);
	let { x: r = 0, y: i = 0, width: a, height: o, minDepth: s = 0, maxDepth: c = 1 } = e;
	for (let [e, t] of [
		["x", r],
		["y", i],
		["width", a],
		["height", o],
		["minDepth", s],
		["maxDepth", c]
	]) if (typeof t != "number" || !Number.isFinite(t)) throw w(`${e} received ${Z(t)}; expected a finite number.`);
	let l = t.maxTextureDimension2D, u = l * 2, d = `target is ${n[0]}x${n[1]}px, device maxTextureDimension2D is ${l}`;
	if (!(a >= 0 && a <= l)) throw w(`width ${a} is outside [0, ${l}] (${d}).`);
	if (!(o >= 0 && o <= l)) throw w(`height ${o} is outside [0, ${l}] (${d}).`);
	if (!(r >= -u && r + a <= u - 1)) throw w(`x ${r} with width ${a} is outside [${-u}, ${u - 1}] (${d}).`);
	if (!(i >= -u && i + o <= u - 1)) throw w(`y ${i} with height ${o} is outside [${-u}, ${u - 1}] (${d}).`);
	if (!(s >= 0 && s <= 1)) throw w(`minDepth ${s} is outside [0, 1].`);
	if (!(c >= 0 && c <= 1)) throw w(`maxDepth ${c} is outside [0, 1].`);
	if (!(s <= c)) throw w(`minDepth ${s} exceeds maxDepth ${c}.`);
	return {
		x: r,
		y: i,
		width: a,
		height: o,
		minDepth: s,
		maxDepth: c
	};
}
function Yc(e, t) {
	if (e === void 0) return;
	if (!Array.isArray(e) || e.length !== 4) throw gt(`received ${Z(e)}; expected [x, y, width, height].`);
	let [n, r, i, a] = e;
	for (let [e, t] of [
		["x", n],
		["y", r],
		["width", i],
		["height", a]
	]) if (typeof t != "number" || !Number.isInteger(t) || t < 0) throw gt(`${e} received ${Z(t)}; expected a non-negative integer.`);
	let [o, s] = t;
	if (n + i > o || r + a > s) throw gt(`[${n}, ${r}, ${i}, ${a}] exceeds the target's current size ${o}x${s}px (x + width <= ${o}, y + height <= ${s}).`);
	return [
		n,
		r,
		i,
		a
	];
}
function Z(e) {
	return typeof e == "string" ? `'${e}'` : Array.isArray(e) ? `[${e.map((e) => Z(e)).join(", ")}]` : typeof e == "object" && e ? "an object" : String(e);
}
function Xc(e) {
	return e !== null && (typeof e == "object" || typeof e == "function") && typeof e.then == "function";
}
var Zc = class {
	createFrame;
	advance;
	trackLoop;
	assertActive;
	#e = !1;
	constructor(e, t, n, r) {
		this.createFrame = e, this.advance = t, this.trackLoop = n, this.assertActive = r;
	}
	frame(e) {
		return this.#t(e, "frame");
	}
	#t(e, t) {
		if (this.#e || Ha()) throw Gt();
		this.assertActive?.(t), this.#e = !0, Wa();
		try {
			this.advance();
			let n = this.createFrame();
			if (e) {
				try {
					let r = e(n);
					if (Xc(r)) throw Promise.resolve(r).catch(() => void 0), Wt(t);
				} catch (e) {
					if (Rc(n)) try {
						n.cancel();
					} catch {}
					throw e;
				}
				n.submit();
			}
			return n;
		} finally {
			Ga(), this.#e = !1;
		}
	}
	loop(e, t = {}) {
		let n = !1, r = globalThis.requestAnimationFrame ?? ((e) => setTimeout(() => e(performance.now()), 16)), i = globalThis.cancelAnimationFrame ?? ((e) => clearTimeout(e)), a = t.fps && t.fps > 0 ? 1e3 / t.fps : 0, o, s = 0, c, l = () => {
			n = !0, i(s), c?.(), c = void 0;
		}, u = (t) => {
			if (!n) {
				if ($c(t, o, a)) {
					o = t;
					try {
						this.#t(e, "frameLoop");
					} catch (e) {
						throw l(), e;
					}
				}
				n || (s = r(u));
			}
		};
		s = r(u);
		let d = { stop: l };
		return c = this.trackLoop?.(d), d;
	}
}, Qc = 1;
function $c(e, t, n) {
	return t === void 0 || n <= 0 || e - t >= n - Qc;
}
//#endregion
//#region node_modules/vgpu/dist/target-offscreen.js
function el(e) {
	let t = [];
	for (let n of e) try {
		n.destroy();
	} catch (e) {
		t.push(e);
	}
	if (t.length) throw t[0];
}
function tl(e, t) {
	return new nl(Sn(e, "target").device, t);
}
var nl = class {
	device;
	resourceIdentity = m("render-target");
	#e = new h();
	#t = /* @__PURE__ */ new Set();
	#n;
	#r;
	#i;
	#a = !1;
	#o = !1;
	options;
	constructor(e, t) {
		this.device = e, $i(t, e), this.options = Object.freeze({
			...t,
			size: Object.freeze([...t.size]),
			...t.colors ? { colors: Object.freeze(t.colors.map((e) => Object.freeze({ ...e }))) } : {}
		}), this.#i = t.clearColor === void 0 ? qi : Ji(t.clearColor, "target.clearColor"), this.#n = this.options.size, this.#r = this.#l(this.#n);
	}
	get gpu() {
		return this.color.gpu;
	}
	get size() {
		return this.#n;
	}
	get texelSize() {
		return [1 / this.#n[0], 1 / this.#n[1]];
	}
	get color() {
		return this.#r.colors[0];
	}
	get colors() {
		return this.#r.colors;
	}
	get depth() {
		return this.#r.depth;
	}
	get format() {
		return Xi(this.options)[0]?.format ?? "rgba8unorm";
	}
	get clearColor() {
		return Yi(this.#i);
	}
	set clearColor(e) {
		this.#i = Ji(e, "target.clearColor");
	}
	get sampleCount() {
		return Qi(this.options);
	}
	resize(e) {
		if (this.#s("Target.resize"), this.#o) throw new S({
			code: "VGPU-TARGET-RESIZE-REENTRANT",
			message: "Cannot resize a target from its replacement callbacks.",
			where: "Target.resize"
		});
		if ($i({
			...this.options,
			size: e
		}, this.device), !aa(this.#n, e)) {
			this.#o = !0;
			try {
				let t = Object.freeze([...e]), n = this.#l(t), r = this.#r;
				this.#n = t, this.#r = n;
				try {
					this.#c();
				} finally {
					el(r.all);
				}
			} finally {
				this.#o = !1;
			}
		}
	}
	onDestroy(e) {
		return this.#e.onDestroy(this, e);
	}
	onTexturesRecreated(e) {
		return this.#s("Target.onTexturesRecreated"), this.#t.add(e), () => {
			this.#t.delete(e);
		};
	}
	destroy() {
		if (!this.#a) {
			this.#a = !0;
			try {
				this.#e.emit(this);
			} finally {
				this.#t.clear(), el(this.#r.all);
			}
		}
	}
	renderPassDescriptor(e = {}) {
		this.#s("Target.renderPassDescriptor");
		let { clear: t = [
			0,
			0,
			0,
			1
		], preserve: n, clearDepth: r, clearStencil: i, depthReadOnly: a } = e;
		return {
			colorAttachments: this.colors.map((e, r) => ta(e, this.#r.msaaColors?.[r], t, n)),
			depthStencilAttachment: this.depth ? na(this.depth, n, r, i, a) : void 0
		};
	}
	#s(e) {
		if (this.#a) throw new S({
			code: "VGPU-TARGET-DESTROYED",
			message: `Target '${this.options.label ?? "target"}' is destroyed.`,
			where: e,
			fix: "Create a new target; destroyed targets cannot be resized or rendered."
		});
		O(this.device, e);
	}
	#c() {
		let e = [];
		for (let t of [...this.#t]) try {
			t();
		} catch (t) {
			e.push(t);
		}
		if (e.length) throw e[0];
	}
	#l(e) {
		let t = [], n = (e) => {
			let n = this.device.createTexture(e);
			return t.push(n), n;
		};
		try {
			let r = this.#u(e, n), i = this.sampleCount === 4 ? this.#d(e, n) : void 0, a = this.#f(e, n);
			return {
				colors: Object.freeze(r),
				msaaColors: i && Object.freeze(i),
				depth: a,
				all: t
			};
		} catch (e) {
			try {
				el(t);
			} catch {}
			throw e;
		}
	}
	#u(e, t) {
		return Xi(this.options).map((n, r) => t({
			kind: "2d",
			size: e,
			format: n.format,
			usage: [
				"render_attachment",
				"texture_binding",
				"copy_src"
			],
			sampleCount: 1,
			label: this.options.label ? `${this.options.label}.color${r}.resolve` : void 0
		}));
	}
	#d(e, t) {
		return Xi(this.options).map((n, r) => t({
			kind: "2d",
			size: e,
			format: n.format,
			usage: ["render_attachment"],
			sampleCount: 4,
			label: this.options.label ? `${this.options.label}.color${r}` : void 0
		}));
	}
	#f(e, t) {
		let n = Zi(this.options);
		return n ? t({
			kind: "2d",
			size: e,
			format: n,
			usage: ["render_attachment", "texture_binding"],
			sampleCount: this.sampleCount,
			label: this.options.label ? `${this.options.label}.depth` : void 0
		}) : void 0;
	}
};
//#endregion
//#region node_modules/vgpu/dist/index.js
function rl(e) {
	return un("browser", e);
}
//#endregion
//#region src/shaders/glass.wgsl
var il = (e) => (typeof e == "object" && e && Object.values(Object.freeze(e)).forEach(il), e), al = /* @__PURE__ */ il({
	version: 2,
	wgsl: "// Rounded optical lenses traced in object space. All lighting is procedural;\n// the supplied image is a visual reference, never a texture on the 3D asset.\nconst PI: f32 = 3.14159265359;\nconst EPS: f32 = 0.00045;\nconst FAR: f32 = 50.0;\nconst RADIUS: f32 = 1.02;\n\nstruct Params {\n  resolution: vec2f,\n  zoom: f32,\n  iridescence: f32,\n  thickness: f32,\n  background: f32,\n  dispersion: f32,\n  padding: f32,\n}\nstruct Scene { lenses: array<mat4x4f, 8> }\n@group(0) @binding(0) var<uniform> params: Params;\n@group(0) @binding(1) var<uniform> scene: Scene;\n\nstruct Hit { distance: f32, id: i32 }\n\nfn fresnel(ior: f32, cosine: f32) -> f32 {\n  let r0 = (ior - 1.0) / (ior + 1.0);\n  return r0 * r0 + (1.0 - r0 * r0) * pow(1.0 - clamp(cosine, 0.0, 1.0), 5.0);\n}\n\nfn local_vector(v: vec3f, transform: mat4x4f) -> vec3f {\n  return vec3f(dot(v, transform[0].xyz), dot(v, transform[1].xyz), dot(v, transform[2].xyz));\n}\n\nfn lens_sdf(p: vec3f) -> f32 {\n  let radial = length(p.xy);\n  let bevel = 0.058;\n  // A gently convex optical face flows into a polished, rounded cylinder rim.\n  let crown = 0.09 * max(0.0, 1.0 - radial * radial / (RADIUS * RADIUS));\n  let half_depth = 0.105 * params.thickness + crown;\n  let q = vec2f(radial - RADIUS + bevel, abs(p.z) - half_depth + bevel);\n  return min(max(q.x, q.y), 0.0) + length(max(q, vec2f(0.0))) - bevel;\n}\n\nfn lens_normal(p: vec3f) -> vec3f {\n  let e = vec2f(0.0008, 0.0);\n  return normalize(vec3f(\n    lens_sdf(p + e.xyy) - lens_sdf(p - e.xyy),\n    lens_sdf(p + e.yxy) - lens_sdf(p - e.yxy),\n    lens_sdf(p + e.yyx) - lens_sdf(p - e.yyx)\n  ));\n}\n\nfn intersect_lens(origin: vec3f, direction: vec3f, id: i32, limit: f32) -> f32 {\n  let transform = scene.lenses[id];\n  let ro = local_vector(origin - transform[3].xyz, transform);\n  let rd = local_vector(direction, transform);\n  let b = dot(ro, rd);\n  let discriminant = b * b - dot(ro, ro) + 1.19;\n  if (discriminant < 0.0) { return FAR; }\n  let root = sqrt(discriminant);\n  let end = min(-b + root, limit);\n  var t = max(0.0, -b - root);\n  if (end < t) { return FAR; }\n  for (var step = 0; step < 56; step++) {\n    let d = abs(lens_sdf(ro + rd * t));\n    if (d < EPS) { return t; }\n    t += max(d * 0.88, EPS * 0.6);\n    if (t > end) { break; }\n  }\n  return FAR;\n}\n\nfn intersect_scene(origin: vec3f, direction: vec3f, inside_id: i32) -> Hit {\n  if (inside_id >= 0) {\n    return Hit(intersect_lens(origin, direction, inside_id, FAR), inside_id);\n  }\n  var hit = Hit(FAR, -1);\n  for (var id = 0; id < 8; id++) {\n    let distance = intersect_lens(origin, direction, id, hit.distance);\n    if (distance < hit.distance) { hit = Hit(distance, id); }\n  }\n  return hit;\n}\n\nfn world_normal(p: vec3f, id: i32) -> vec3f {\n  let transform = scene.lenses[id];\n  let n = lens_normal(local_vector(p - transform[3].xyz, transform));\n  return normalize((transform * vec4f(n, 0.0)).xyz);\n}\n\nfn backdrop() -> vec3f {\n  if (params.background > 1.5) { return vec3f(0.008, 0.012, 0.016); }\n  if (params.background > 0.5) { return vec3f(0.78, 0.85, 0.85); }\n  return vec3f(1.0);\n}\n\n// An infinite white photo studio, two black flags, and long strip softboxes.\nfn studio(direction: vec3f) -> vec3f {\n  let d = normalize(direction);\n  var color = mix(vec3f(0.57, 0.75, 0.74), vec3f(1.08, 1.12, 1.12), smoothstep(-0.65, 0.7, d.y));\n  let flag_a = smoothstep(0.52, 0.80, dot(d, normalize(vec3f(-0.9, -0.2, -0.55))));\n  let flag_b = smoothstep(0.66, 0.94, dot(d, normalize(vec3f(0.75, -0.65, 0.5))));\n  color = mix(color, vec3f(0.02, 0.05, 0.07), max(flag_a, flag_b) * 0.92);\n  let strip_a = pow(max(0.0, 1.0 - abs(dot(d, normalize(vec3f(0.7, 0.15, 0.7))))), 22.0) * smoothstep(-0.3, 0.35, d.y);\n  let strip_b = pow(max(0.0, 1.0 - abs(dot(d, normalize(vec3f(-0.35, 0.85, 0.38))))), 40.0) * smoothstep(-0.5, 0.7, d.z);\n  color += vec3f(0.85, 0.98, 0.95) * strip_a + vec3f(0.80, 0.74, 0.80) * strip_b;\n  let strip_phase = atan2(d.y, d.x);\n  let optical_delta = (d.z - (0.30 + 0.085 * sin(strip_phase * 3.0))) / 0.065;\n  let optical_strip = exp(-optical_delta * optical_delta) * (0.3 + 0.7 * smoothstep(-0.4, 0.5, sin(strip_phase + 0.5)));\n  color += vec3f(3.6, 4.4, 4.0) * optical_strip;\n  return color;\n}\n\nfn film_color(cosine: f32, point: vec3f, id: i32) -> vec3f {\n  let p = local_vector(point - scene.lenses[id][3].xyz, scene.lenses[id]);\n  let film_depth = 380.0 + 48.0 * sin(atan2(p.y, p.x) * 2.0 + f32(id) * 0.7) + p.x * 34.0;\n  let transmitted_cosine = sqrt(max(0.0, 1.0 - (1.0 - cosine * cosine) / (1.38 * 1.38)));\n  let phase = (4.0 * PI * 1.38 * film_depth * transmitted_cosine) / vec3f(650.0, 510.0, 475.0);\n  // Metal's fast cosine can overshoot [-1, 1] by a few ulps. Clamp before\n  // fractional pow: a negative base would produce isolated NaN color channels.\n  return pow(clamp(0.5 + 0.5 * cos(phase + vec3f(0.3, 0.0, 0.4)), vec3f(0.0), vec3f(1.0)), vec3f(1.25));\n}\n\nfn reflected_light(origin: vec3f, direction: vec3f, source_id: i32) -> vec3f {\n  var other = Hit(FAR, -1);\n  for (var id = 0; id < 8; id++) {\n    if (id == source_id) { continue; }\n    let distance = intersect_lens(origin, direction, id, other.distance);\n    if (distance < other.distance) { other = Hit(distance, id); }\n  }\n  if (other.id < 0) { return studio(direction); }\n  let point = origin + direction * other.distance;\n  let n = world_normal(point, other.id);\n  let facing = abs(dot(n, direction));\n  let rim = pow(1.0 - facing, 2.0);\n  let tint = mix(vec3f(0.46, 0.76, 0.73), vec3f(0.004, 0.10, 0.12), smoothstep(0.05, 0.6, rim));\n  let interference = film_color(facing, point, other.id);\n  return mix(tint, interference * 1.3, smoothstep(0.45, 0.75, rim) * params.iridescence) + studio(reflect(direction, n)) * 0.24;\n}\n\nfn trace(origin: vec3f, direction: vec3f) -> vec4f {\n  var ro = origin;\n  var rd = direction;\n  var color = vec3f(0.0);\n  var throughput = vec3f(1.0);\n  var inside_id = -1;\n  for (var bounce = 0; bounce < 7; bounce++) {\n    let hit = intersect_scene(ro, rd, inside_id);\n    if (hit.id < 0 || hit.distance >= FAR) {\n      if (bounce == 0) { return vec4f(0.0, 0.0, 0.0, 0.0); }\n      color += throughput * backdrop();\n      return vec4f(color, 1.0);\n    }\n    if (inside_id >= 0) {\n      throughput *= exp(-vec3f(0.68, 0.20, 0.16) * hit.distance);\n    }\n    let point = ro + rd * hit.distance;\n    let outward = world_normal(point, hit.id);\n    let exiting = inside_id >= 0;\n    let n = select(outward, -outward, exiting);\n    let cosine = clamp(-dot(rd, n), 0.0, 1.0);\n    let f = fresnel(1.48, cosine);\n    let film = film_color(cosine, point, hit.id);\n    let local_n = local_vector(outward, scene.lenses[hit.id]);\n    let rim = smoothstep(0.02, 0.62, 1.0 - abs(local_n.z));\n    let local_p = local_vector(point - scene.lenses[hit.id][3].xyz, scene.lenses[hit.id]);\n    let azimuth = atan2(local_p.y, local_p.x);\n    let color_patch = pow(clamp(0.5 + 0.5 * sin(azimuth * 3.0 + f32(hit.id) * 1.3), 0.0, 1.0), 4.0);\n    let spectrum_wave = clamp(0.5 + 0.5 * cos(azimuth * 5.0 + cosine * 10.0 + f32(hit.id) * 1.4 + vec3f(0.0, 2.094, 4.188)), vec3f(0.0), vec3f(1.0));\n    let spectral = 0.008 + 0.992 * spectrum_wave * spectrum_wave;\n    let prism_color = mix(vec3f(0.005, 0.95, 0.88), spectral, color_patch);\n    let coating = params.iridescence * (0.07 + 0.8 * pow(1.0 - cosine, 1.6));\n    let reflectance = clamp(vec3f(f) + film * coating + rim * 0.6, vec3f(0.0), vec3f(0.97));\n    let reflection = reflect(rd, n);\n    var lighting = studio(reflection);\n    if (bounce == 0) { lighting = reflected_light(point + n * EPS * 8.0, reflection, hit.id); }\n    lighting = mix(lighting, studio(reflection) * 1.5 + vec3f(0.12), rim);\n    // Thin-film interference varies reflectance by wavelength, strongest at the bevel.\n    let edge_coating = mix(vec3f(1.0), prism_color, rim * min(params.iridescence * 1.3, 1.0) * 0.98);\n    let eta = select(1.0 / 1.48, 1.48, exiting);\n    let transmission = refract(rd, n, eta);\n    if (dot(transmission, transmission) < 0.001) {\n      rd = reflection;\n      ro = point + n * EPS * 8.0;\n      // Total internal reflection has no outgoing branch: conserve its energy.\n      throughput *= mix(vec3f(0.99), edge_coating, 0.2);\n    } else {\n      color += throughput * reflectance * lighting * edge_coating;\n      throughput *= (1.0 - reflectance) * edge_coating;\n      // Slight spectral separation at silhouettes, with energy kept in the transmitted ray.\n      let prism = params.dispersion * pow(1.0 - cosine, 3.0);\n      throughput *= vec3f(1.0 - prism * 2.0, 1.0, 1.0 - prism);\n      rd = normalize(transmission);\n      ro = point - n * EPS * 8.0;\n      inside_id = select(hit.id, -1, exiting);\n    }\n    if (max(throughput.r, max(throughput.g, throughput.b)) < 0.015) { return vec4f(color, 1.0); }\n  }\n  return vec4f(color + throughput * studio(rd), 1.0);\n}\n\n// ENTRY_POINT — the headless verification harness also probes the live helpers above.\nfn sample_px(uv: vec2f) -> vec4f {\n  let aspect = params.resolution.x / params.resolution.y;\n  let screen = vec2f((uv.x - 0.5) * aspect, 0.5 - uv.y);\n  let portrait = aspect < 0.8;\n  let scale = select(6.9, 6.6 / aspect, portrait) / params.zoom;\n  let shifted = screen + vec2f(0.0, select(0.0, 0.025, portrait));\n  let origin = vec3f(shifted * scale, 9.5);\n  let direction = normalize(vec3f(shifted * 0.035, -1.0));\n  return trace(origin, direction);\n}\n\n@fragment fn fs_main(@location(0) uv: vec2f) -> @location(0) vec4f {\n  // 2x2 supersampling: four rays per pixel, averaged in linear light.\n  let px = 1.0 / params.resolution;\n  var acc = vec4f(0.0);\n  acc += sample_px(uv + vec2f(-0.25, -0.25) * px);\n  acc += sample_px(uv + vec2f(0.25, -0.25) * px);\n  acc += sample_px(uv + vec2f(-0.25, 0.25) * px);\n  acc += sample_px(uv + vec2f(0.25, 0.25) * px);\n  let traced = acc * 0.25;\n  let mapped = min(traced.rgb, vec3f(1.0));\n  let srgb = mix(mapped * 12.92, 1.055 * pow(max(mapped, vec3f(0.0)), vec3f(1.0 / 2.4)) - 0.055, step(vec3f(0.0031308), mapped));\n  return vec4f(srgb * traced.a, traced.a);\n}\n",
	reflection: {
		bindings: [{
			group: 0,
			binding: 0,
			name: "params",
			mangledName: "params",
			type: {
				kind: "identifier",
				name: "Params",
				mangledName: "_vgsl_274d7054__Params"
			},
			kind: "buffer",
			addressSpace: "uniform",
			struct: {
				name: "Params",
				mangledName: "_vgsl_274d7054__Params",
				members: [
					{
						name: "resolution",
						type: {
							kind: "vector",
							width: 2,
							element: {
								kind: "scalar",
								name: "f32"
							}
						}
					},
					{
						name: "zoom",
						type: {
							kind: "scalar",
							name: "f32"
						}
					},
					{
						name: "iridescence",
						type: {
							kind: "scalar",
							name: "f32"
						}
					},
					{
						name: "thickness",
						type: {
							kind: "scalar",
							name: "f32"
						}
					},
					{
						name: "background",
						type: {
							kind: "scalar",
							name: "f32"
						}
					},
					{
						name: "dispersion",
						type: {
							kind: "scalar",
							name: "f32"
						}
					},
					{
						name: "padding",
						type: {
							kind: "scalar",
							name: "f32"
						}
					}
				]
			},
			layout: {
				name: "params",
				mangledName: "params",
				layoutMode: "wgsl-host-shareable-v1",
				type: {
					kind: "identifier",
					name: "Params",
					mangledName: "_vgsl_274d7054__Params"
				},
				align: 8,
				size: 32,
				members: [
					{
						name: "resolution",
						offset: 0,
						align: 8,
						size: 8,
						type: {
							kind: "vector",
							width: 2,
							element: {
								kind: "scalar",
								name: "f32"
							}
						},
						layout: {
							name: "resolution",
							mangledName: "resolution",
							layoutMode: "wgsl-host-shareable-v1",
							type: {
								kind: "vector",
								width: 2,
								element: {
									kind: "scalar",
									name: "f32"
								}
							},
							align: 8,
							size: 8
						}
					},
					{
						name: "zoom",
						offset: 8,
						align: 4,
						size: 4,
						type: {
							kind: "scalar",
							name: "f32"
						},
						layout: {
							name: "zoom",
							mangledName: "zoom",
							layoutMode: "wgsl-host-shareable-v1",
							type: {
								kind: "scalar",
								name: "f32"
							},
							align: 4,
							size: 4
						}
					},
					{
						name: "iridescence",
						offset: 12,
						align: 4,
						size: 4,
						type: {
							kind: "scalar",
							name: "f32"
						},
						layout: {
							name: "iridescence",
							mangledName: "iridescence",
							layoutMode: "wgsl-host-shareable-v1",
							type: {
								kind: "scalar",
								name: "f32"
							},
							align: 4,
							size: 4
						}
					},
					{
						name: "thickness",
						offset: 16,
						align: 4,
						size: 4,
						type: {
							kind: "scalar",
							name: "f32"
						},
						layout: {
							name: "thickness",
							mangledName: "thickness",
							layoutMode: "wgsl-host-shareable-v1",
							type: {
								kind: "scalar",
								name: "f32"
							},
							align: 4,
							size: 4
						}
					},
					{
						name: "background",
						offset: 20,
						align: 4,
						size: 4,
						type: {
							kind: "scalar",
							name: "f32"
						},
						layout: {
							name: "background",
							mangledName: "background",
							layoutMode: "wgsl-host-shareable-v1",
							type: {
								kind: "scalar",
								name: "f32"
							},
							align: 4,
							size: 4
						}
					},
					{
						name: "dispersion",
						offset: 24,
						align: 4,
						size: 4,
						type: {
							kind: "scalar",
							name: "f32"
						},
						layout: {
							name: "dispersion",
							mangledName: "dispersion",
							layoutMode: "wgsl-host-shareable-v1",
							type: {
								kind: "scalar",
								name: "f32"
							},
							align: 4,
							size: 4
						}
					},
					{
						name: "padding",
						offset: 28,
						align: 4,
						size: 4,
						type: {
							kind: "scalar",
							name: "f32"
						},
						layout: {
							name: "padding",
							mangledName: "padding",
							layoutMode: "wgsl-host-shareable-v1",
							type: {
								kind: "scalar",
								name: "f32"
							},
							align: 4,
							size: 4
						}
					}
				]
			},
			bindingLayout: {
				kind: "buffer",
				buffer: {
					type: "uniform",
					hasDynamicOffset: !1,
					minBindingSize: 32
				}
			}
		}, {
			group: 0,
			binding: 1,
			name: "scene",
			mangledName: "scene",
			type: {
				kind: "identifier",
				name: "Scene",
				mangledName: "_vgsl_274d7054__Scene"
			},
			kind: "buffer",
			addressSpace: "uniform",
			struct: {
				name: "Scene",
				mangledName: "_vgsl_274d7054__Scene",
				members: [{
					name: "lenses",
					type: {
						kind: "array",
						element: {
							kind: "matrix",
							columns: 4,
							rows: 4,
							element: {
								kind: "scalar",
								name: "f32"
							}
						},
						count: 8,
						countExpression: "8"
					}
				}]
			},
			layout: {
				name: "scene",
				mangledName: "scene",
				layoutMode: "wgsl-host-shareable-v1",
				type: {
					kind: "identifier",
					name: "Scene",
					mangledName: "_vgsl_274d7054__Scene"
				},
				align: 16,
				size: 512,
				members: [{
					name: "lenses",
					offset: 0,
					align: 16,
					size: 512,
					type: {
						kind: "array",
						element: {
							kind: "matrix",
							columns: 4,
							rows: 4,
							element: {
								kind: "scalar",
								name: "f32"
							}
						},
						count: 8,
						countExpression: "8"
					},
					layout: {
						name: "lenses",
						mangledName: "lenses",
						layoutMode: "wgsl-host-shareable-v1",
						type: {
							kind: "array",
							element: {
								kind: "matrix",
								columns: 4,
								rows: 4,
								element: {
									kind: "scalar",
									name: "f32"
								}
							},
							count: 8,
							countExpression: "8"
						},
						align: 16,
						size: 512,
						stride: 64,
						element: {
							name: "lenses[]",
							mangledName: "lenses[]",
							layoutMode: "wgsl-host-shareable-v1",
							type: {
								kind: "matrix",
								columns: 4,
								rows: 4,
								element: {
									kind: "scalar",
									name: "f32"
								}
							},
							align: 16,
							size: 64,
							stride: 16,
							element: {
								name: "lenses[][]",
								mangledName: "lenses[][]",
								layoutMode: "wgsl-host-shareable-v1",
								type: {
									kind: "vector",
									width: 4,
									element: {
										kind: "scalar",
										name: "f32"
									}
								},
								align: 16,
								size: 16
							}
						},
						runtimeSized: !1
					}
				}]
			},
			bindingLayout: {
				kind: "buffer",
				buffer: {
					type: "uniform",
					hasDynamicOffset: !1,
					minBindingSize: 512
				}
			}
		}],
		entryPoints: [{
			name: "fs_main",
			mangledName: "fs_main",
			stage: "fragment",
			bindings: [{
				group: 0,
				binding: 0
			}, {
				group: 0,
				binding: 1
			}],
			samplingPairs: []
		}],
		overrides: [],
		featuresRequired: [],
		aliases: [],
		structs: [
			{
				name: "Params",
				mangledName: "_vgsl_274d7054__Params",
				members: [
					{
						name: "resolution",
						type: {
							kind: "vector",
							width: 2,
							element: {
								kind: "scalar",
								name: "f32"
							}
						}
					},
					{
						name: "zoom",
						type: {
							kind: "scalar",
							name: "f32"
						}
					},
					{
						name: "iridescence",
						type: {
							kind: "scalar",
							name: "f32"
						}
					},
					{
						name: "thickness",
						type: {
							kind: "scalar",
							name: "f32"
						}
					},
					{
						name: "background",
						type: {
							kind: "scalar",
							name: "f32"
						}
					},
					{
						name: "dispersion",
						type: {
							kind: "scalar",
							name: "f32"
						}
					},
					{
						name: "padding",
						type: {
							kind: "scalar",
							name: "f32"
						}
					}
				]
			},
			{
				name: "Scene",
				mangledName: "_vgsl_274d7054__Scene",
				members: [{
					name: "lenses",
					type: {
						kind: "array",
						element: {
							kind: "matrix",
							columns: 4,
							rows: 4,
							element: {
								kind: "scalar",
								name: "f32"
							}
						},
						count: 8,
						countExpression: "8"
					}
				}]
			},
			{
				name: "Hit",
				mangledName: "_vgsl_274d7054__Hit",
				members: [{
					name: "distance",
					type: {
						kind: "scalar",
						name: "f32"
					}
				}, {
					name: "id",
					type: {
						kind: "scalar",
						name: "i32"
					}
				}]
			}
		],
		hostShareableLayouts: [{
			name: "params",
			mangledName: "params",
			layoutMode: "wgsl-host-shareable-v1",
			type: {
				kind: "identifier",
				name: "Params",
				mangledName: "_vgsl_274d7054__Params"
			},
			align: 8,
			size: 32,
			members: [
				{
					name: "resolution",
					offset: 0,
					align: 8,
					size: 8,
					type: {
						kind: "vector",
						width: 2,
						element: {
							kind: "scalar",
							name: "f32"
						}
					},
					layout: {
						name: "resolution",
						mangledName: "resolution",
						layoutMode: "wgsl-host-shareable-v1",
						type: {
							kind: "vector",
							width: 2,
							element: {
								kind: "scalar",
								name: "f32"
							}
						},
						align: 8,
						size: 8
					}
				},
				{
					name: "zoom",
					offset: 8,
					align: 4,
					size: 4,
					type: {
						kind: "scalar",
						name: "f32"
					},
					layout: {
						name: "zoom",
						mangledName: "zoom",
						layoutMode: "wgsl-host-shareable-v1",
						type: {
							kind: "scalar",
							name: "f32"
						},
						align: 4,
						size: 4
					}
				},
				{
					name: "iridescence",
					offset: 12,
					align: 4,
					size: 4,
					type: {
						kind: "scalar",
						name: "f32"
					},
					layout: {
						name: "iridescence",
						mangledName: "iridescence",
						layoutMode: "wgsl-host-shareable-v1",
						type: {
							kind: "scalar",
							name: "f32"
						},
						align: 4,
						size: 4
					}
				},
				{
					name: "thickness",
					offset: 16,
					align: 4,
					size: 4,
					type: {
						kind: "scalar",
						name: "f32"
					},
					layout: {
						name: "thickness",
						mangledName: "thickness",
						layoutMode: "wgsl-host-shareable-v1",
						type: {
							kind: "scalar",
							name: "f32"
						},
						align: 4,
						size: 4
					}
				},
				{
					name: "background",
					offset: 20,
					align: 4,
					size: 4,
					type: {
						kind: "scalar",
						name: "f32"
					},
					layout: {
						name: "background",
						mangledName: "background",
						layoutMode: "wgsl-host-shareable-v1",
						type: {
							kind: "scalar",
							name: "f32"
						},
						align: 4,
						size: 4
					}
				},
				{
					name: "dispersion",
					offset: 24,
					align: 4,
					size: 4,
					type: {
						kind: "scalar",
						name: "f32"
					},
					layout: {
						name: "dispersion",
						mangledName: "dispersion",
						layoutMode: "wgsl-host-shareable-v1",
						type: {
							kind: "scalar",
							name: "f32"
						},
						align: 4,
						size: 4
					}
				},
				{
					name: "padding",
					offset: 28,
					align: 4,
					size: 4,
					type: {
						kind: "scalar",
						name: "f32"
					},
					layout: {
						name: "padding",
						mangledName: "padding",
						layoutMode: "wgsl-host-shareable-v1",
						type: {
							kind: "scalar",
							name: "f32"
						},
						align: 4,
						size: 4
					}
				}
			]
		}, {
			name: "scene",
			mangledName: "scene",
			layoutMode: "wgsl-host-shareable-v1",
			type: {
				kind: "identifier",
				name: "Scene",
				mangledName: "_vgsl_274d7054__Scene"
			},
			align: 16,
			size: 512,
			members: [{
				name: "lenses",
				offset: 0,
				align: 16,
				size: 512,
				type: {
					kind: "array",
					element: {
						kind: "matrix",
						columns: 4,
						rows: 4,
						element: {
							kind: "scalar",
							name: "f32"
						}
					},
					count: 8,
					countExpression: "8"
				},
				layout: {
					name: "lenses",
					mangledName: "lenses",
					layoutMode: "wgsl-host-shareable-v1",
					type: {
						kind: "array",
						element: {
							kind: "matrix",
							columns: 4,
							rows: 4,
							element: {
								kind: "scalar",
								name: "f32"
							}
						},
						count: 8,
						countExpression: "8"
					},
					align: 16,
					size: 512,
					stride: 64,
					element: {
						name: "lenses[]",
						mangledName: "lenses[]",
						layoutMode: "wgsl-host-shareable-v1",
						type: {
							kind: "matrix",
							columns: 4,
							rows: 4,
							element: {
								kind: "scalar",
								name: "f32"
							}
						},
						align: 16,
						size: 64,
						stride: 16,
						element: {
							name: "lenses[][]",
							mangledName: "lenses[][]",
							layoutMode: "wgsl-host-shareable-v1",
							type: {
								kind: "vector",
								width: 4,
								element: {
									kind: "scalar",
									name: "f32"
								}
							},
							align: 16,
							size: 16
						}
					},
					runtimeSized: !1
				}
			}]
		}]
	},
	sourceChecksum: "fnv1a64-utf16le-v1:4426dd655e8cb778",
	producer: "@vgpu/wgsl/prepare-v2",
	functionExports: []
}), Q = {
	iridescence: .85,
	thickness: 1,
	speed: 1,
	background: 0
}, $ = {
	ox: -.1,
	oy: 0,
	spin: 2.2,
	wobble: 2.25
};
function ol(e, t, n) {
	let r = e[0] * Math.cos(t) + e[2] * Math.sin(t), i = -e[0] * Math.sin(t) + e[2] * Math.cos(t);
	return [
		r,
		e[1] * Math.cos(n) - i * Math.sin(n),
		e[1] * Math.sin(n) + i * Math.cos(n)
	];
}
function sl(e = 0, t = 0, n = 0) {
	let r = e * .03 * $.spin, i = t + Math.sin(e * .17) * .075 * $.wobble, a = n + Math.sin(e * .13) * .055 * $.wobble;
	return Array.from({ length: 8 }, (t, n) => {
		let o = n * Math.PI / 4 + r, s = Math.sin(o), c = Math.cos(o), l = .82 + Math.sin(e * .37 + n * .62) * .085 * $.wobble, u = Math.cos(l), d = Math.sin(l), f = 1.66 + Math.sin(e * .33 + n * .8) * .042, p = ol([
			s,
			c,
			0
		], i, a), m = ol([
			-c * u,
			s * u,
			d
		], i, a), h = ol([
			c * d,
			-s * d,
			u
		], i, a), g = ol([
			f * s,
			f * c,
			Math.sin(o * 2 + e * .24) * .1 * $.wobble
		], i, a), _ = [
			g[0] + $.ox,
			g[1] + $.oy,
			g[2]
		];
		return [
			...p,
			0,
			...m,
			0,
			...h,
			0,
			..._,
			1
		];
	});
}
function cl(e, t, n = 0) {
	return {
		params: {
			resolution: [e, t],
			zoom: 1,
			iridescence: Q.iridescence,
			thickness: Q.thickness,
			background: Q.background,
			dispersion: .018,
			padding: 0
		},
		scene: { lenses: sl(n) }
	};
}
//#endregion
//#region src/renderer.ts
var ll = class {
	canvas;
	onError;
	onPlaybackChange;
	interactive;
	state;
	gpu;
	output;
	glass;
	raf = 0;
	previous = 0;
	disposed = !1;
	cleanup = new AbortController();
	resizeObserver;
	pose = {
		yaw: 0,
		pitch: 0,
		zoom: 1
	};
	dragging = null;
	dirty = !0;
	exporting = !1;
	reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
	dprCap = 1.5;
	emaDt = 0;
	constructor(e, t, n, r = !0) {
		this.canvas = e, this.onError = t, this.onPlaybackChange = n, this.interactive = r;
		let i = new URLSearchParams(location.search);
		this.state = {
			...Q,
			ready: !1,
			playing: !this.reducedMotion.matches && !i.has("still"),
			time: Math.max(0, Number(i.get("time")) || 0),
			frames: 0,
			yaw: 0,
			pitch: 0,
			zoom: 1,
			frameMs: 0
		};
	}
	async start() {
		if (this.gpu = await rl(), this.disposed) {
			this.gpu.dispose();
			return;
		}
		this.gpu.onError(this.onError), this.gpu.lost.then((e) => {
			this.disposed || this.onError(/* @__PURE__ */ Error(`Graphics device lost: ${e.message}`));
		}), this.output = La(this.gpu, this.canvas, {
			autoResize: !1,
			size: [1, 1],
			alphaMode: "premultiplied"
		}), this.glass = Dc(this.gpu, al, {
			label: "Datavant / refractive glass",
			set: cl(1, 1, this.state.time)
		}), this.resize(), await this.glass.compile(this.output), !this.disposed && (this.connectInput(), this.state.ready = !0, this.schedule(), this.onPlaybackChange());
	}
	resize = () => {
		if (!this.output || this.disposed) return;
		let { width: e, height: t } = this.canvas.getBoundingClientRect(), n = Math.min(devicePixelRatio || 1, this.dprCap);
		this.output.resize([Math.max(1, Math.round(e * n)), Math.max(1, Math.round(t * n))]), this.glass.set({ params: { resolution: this.output.size } }), this.invalidate();
	};
	connectInput() {
		let e = { signal: this.cleanup.signal };
		if (this.resizeObserver = new ResizeObserver(this.resize), this.resizeObserver.observe(this.canvas), window.addEventListener("resize", this.resize, e), document.addEventListener("visibilitychange", () => {
			document.hidden ? (cancelAnimationFrame(this.raf), this.raf = 0) : (this.previous = 0, this.invalidate());
		}, e), this.reducedMotion.addEventListener("change", (e) => {
			e.matches && this.setPlaying(!1);
		}, e), !this.interactive) return;
		this.canvas.addEventListener("pointerdown", (e) => {
			e.button === 0 && (this.dragging = {
				x: e.clientX,
				y: e.clientY,
				id: e.pointerId
			}, this.canvas.setPointerCapture(e.pointerId));
		}, e), this.canvas.addEventListener("pointermove", (e) => {
			this.dragging && this.dragging.id === e.pointerId && (this.pose.yaw += (e.clientX - this.dragging.x) * .006, this.pose.pitch = Math.max(-1.25, Math.min(1.25, this.pose.pitch + (e.clientY - this.dragging.y) * .006)), this.dragging.x = e.clientX, this.dragging.y = e.clientY, this.invalidate());
		}, e);
		let t = () => {
			this.dragging = null;
		};
		this.canvas.addEventListener("pointerup", t, e), this.canvas.addEventListener("pointercancel", t, e), this.canvas.addEventListener("lostpointercapture", t, e), this.canvas.addEventListener("wheel", (e) => {
			e.preventDefault(), this.pose.zoom = Math.max(.65, Math.min(1.5, this.pose.zoom * Math.exp(-e.deltaY * .001))), this.invalidate();
		}, {
			...e,
			passive: !1
		}), this.canvas.addEventListener("keydown", (e) => {
			e.key === " " && (e.preventDefault(), this.setPlaying(!this.state.playing)), e.key.startsWith("Arrow") && (e.preventDefault(), e.key === "ArrowLeft" && (this.pose.yaw -= .12), e.key === "ArrowRight" && (this.pose.yaw += .12), e.key === "ArrowUp" && (this.pose.pitch = Math.max(-1.25, this.pose.pitch - .12)), e.key === "ArrowDown" && (this.pose.pitch = Math.min(1.25, this.pose.pitch + .12)), this.invalidate()), e.key.toLowerCase() === "r" && this.reset();
		}, e);
	}
	schedule() {
		this.raf || this.disposed || document.hidden || !this.state.ready || (this.raf = requestAnimationFrame(this.tick));
	}
	tick = (e) => {
		if (this.raf = 0, this.disposed) return;
		let t = this.previous ? Math.min((e - this.previous) / 1e3, .06) : 0;
		if (this.previous = e, this.state.playing && t > 0 && (this.emaDt = this.emaDt ? this.emaDt * .95 + t * .05 : t, this.state.frames > 30 && this.emaDt > .028 && this.dprCap > .8 && (this.dprCap -= .3, this.emaDt = 0, this.resize())), this.exporting) {
			this.schedule();
			return;
		}
		this.state.playing && (this.state.time += t * this.state.speed);
		let n = this.reducedMotion.matches ? 1 : 1 - Math.exp(-t * 14), r = !1;
		for (let e of [
			"yaw",
			"pitch",
			"zoom"
		]) {
			let t = this.pose[e] - this.state[e];
			Math.abs(t) > 5e-5 ? (this.state[e] += t * n, r = !0) : this.state[e] = this.pose[e];
		}
		let i = performance.now();
		try {
			this.glass.set({
				scene: { lenses: sl(this.state.time, this.state.yaw, this.state.pitch) },
				params: { zoom: this.state.zoom }
			}), Lc(this.gpu, (e) => e.pass(this.output, this.glass)), this.state.frames++, this.state.frameMs = performance.now() - i, this.dirty = !1;
		} catch (e) {
			this.onError(e);
			return;
		}
		this.state.playing && this.state.speed > 0 || r || this.dirty ? this.schedule() : this.previous = 0;
	};
	invalidate() {
		this.dirty = !0, this.schedule();
	}
	setZoomTarget(e) {
		this.pose.zoom = Math.max(.5, Math.min(2.2, e)), this.invalidate();
	}
	setPoseTarget(e, t) {
		this.pose.yaw = e, this.pose.pitch = Math.max(-1.25, Math.min(1.25, t)), this.invalidate();
	}
	setPlaying(e) {
		this.state.playing = e, this.previous = 0, this.invalidate(), this.onPlaybackChange();
	}
	setMaterial(e, t) {
		this.state[e] = t, e !== "speed" && this.glass.set({ params: { [e]: t } }), this.invalidate();
	}
	reset() {
		Object.assign(this.state, Q, {
			time: 0,
			yaw: 0,
			pitch: 0,
			zoom: 1
		}), Object.assign(this.pose, {
			yaw: 0,
			pitch: 0,
			zoom: 1
		}), this.glass.set({ params: {
			iridescence: Q.iridescence,
			thickness: Q.thickness,
			background: Q.background
		} }), this.invalidate(), this.onPlaybackChange();
	}
	async exportPng() {
		if (this.exporting) return;
		this.exporting = !0;
		let e;
		try {
			e = await rl();
			let t = 1800, n = Math.round(t * this.output.size[1] / this.output.size[0]), r = tl(e, { size: [t, n] }), i = Dc(e, al, { set: {
				...cl(t, n, this.state.time),
				params: {
					...cl(t, n).params,
					zoom: this.state.zoom,
					iridescence: this.state.iridescence,
					thickness: this.state.thickness,
					background: this.state.background
				},
				scene: { lenses: sl(this.state.time, this.state.yaw, this.state.pitch) }
			} });
			await i.compile(r), i.draw(r);
			let a = await r.color.read({
				mipLevel: 0,
				region: "all"
			}), o = document.createElement("canvas");
			o.width = t, o.height = n, o.getContext("2d").putImageData(new ImageData(new Uint8ClampedArray(a), t, n), 0, 0);
			let s = await new Promise((e, t) => o.toBlob((n) => n ? e(n) : t(/* @__PURE__ */ Error("PNG export failed")), "image/png")), c = URL.createObjectURL(s), l = document.createElement("a");
			l.href = c, l.download = "datavant-glass.png", l.click(), setTimeout(() => URL.revokeObjectURL(c), 1e3);
		} finally {
			e?.dispose(), this.exporting = !1, this.invalidate();
		}
	}
	dispose() {
		this.disposed = !0, this.state.ready = !1, cancelAnimationFrame(this.raf), this.cleanup.abort(), this.resizeObserver?.disconnect(), this.output?.dispose(), this.gpu?.dispose();
	}
};
//#endregion
//#region src/embed.ts
async function ul(e) {
	let t = new ll(e, () => {}, () => {}, !1);
	if (await t.start(), !t.state.ready) throw Error("renderer not ready");
	t.setMaterial("speed", 1.3), t.setMaterial("iridescence", .77), t.setMaterial("thickness", .94), t.setZoomTarget(1.08);
	let n = matchMedia("(prefers-reduced-motion: reduce)"), r = {
		renderer: t,
		tune: $,
		parallax: 2.8
	};
	window.__dvGlass = r;
	let i = 0;
	return window.addEventListener("mousemove", (e) => {
		n.matches || i || (i = requestAnimationFrame(() => {
			i = 0;
			let n = e.clientX / innerWidth * 2 - 1, a = e.clientY / innerHeight * 2 - 1;
			t.setPoseTarget(n * .066 * r.parallax, a * .048 * r.parallax);
		}));
	}, { passive: !0 }), new IntersectionObserver((e) => {
		t.setPlaying(e[0].isIntersecting && !n.matches);
	}, { threshold: 0 }).observe(e), window.addEventListener("pagehide", () => t.dispose(), { once: !0 }), t;
}
//#endregion
export { ul as mountGlass };
