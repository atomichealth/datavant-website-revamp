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
	let n = Zt(e, t);
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
function T(e, t, n = "Frame.pass") {
	return new S({
		code: "VGPU-PASS-DEPTH-READONLY",
		message: `depthReadOnly ${e}`,
		fix: t,
		where: n
	});
}
function bt() {
	return new S({
		code: "VGPU-PASS-DEPTH-READONLY-MSAA",
		message: "depthReadOnly cannot read an MSAA target's depth: multisampled depth is stored with storeOp \"discard\", so a read-only pass tests against discarded contents.",
		fix: "Use a non-MSAA target for read-only depth, or drop depthReadOnly and let the pass own its depth.",
		where: "Frame.pass"
	});
}
function xt(e, t, n = "timer") {
	return new S({
		code: "VGPU-TIMER-INVALID",
		message: `Invalid timer use: ${e}`,
		fix: t,
		where: n
	});
}
function St(e, t, n = "visibility") {
	return new S({
		code: "VGPU-VIS-INVALID",
		message: `Invalid visibility use: ${e}`,
		fix: t,
		where: n
	});
}
function Ct() {
	return new S({
		code: "VGPU-QUERY-NO-VISIBILITY",
		message: "occlusion() needs the pass to be opened with a visibility instance; the render pass has no occlusionQuerySet to write into.",
		fix: "Open the pass with f.pass({ target, visibility: vis }, ...) using the visibility(gpu) instance that created the query handle.",
		where: "FramePass.occlusion"
	});
}
function wt() {
	return new S({
		code: "VGPU-QUERY-NESTED",
		message: "occlusion() cannot nest inside an active occlusion() body; WebGPU allows one active occlusion query per pass at a time.",
		fix: "Encode each occlusion scope sequentially: p.occlusion(a, ...); p.occlusion(b, ...).",
		where: "FramePass.occlusion"
	});
}
function Tt(e = "Frame.pass") {
	return new S({
		code: "VGPU-TARGET-REQUIRED",
		message: "Target required. Fix: pass surface(gpu, canvas) or target(gpu, { size }) as { target }.",
		where: e
	});
}
function Et(e, t, n, r) {
	return new S({
		code: e,
		message: `${e}: ${n}`,
		fix: r,
		where: t
	});
}
function Dt(e, t) {
	return Et("VGPU-MESH-RANGE-INVALID", e, t, "Use index ranges for indexed geometries, vertex ranges otherwise, within geometry counts.");
}
function Ot(e) {
	return new S({
		code: "VGPU-PIPELINE-LAYOUT-GAP",
		message: `Pipeline bind group ${e} is missing.`,
		fix: "Use consecutive @group() indices starting at 0.",
		where: "pipeline layout"
	});
}
function kt(e, t, n) {
	return new S({
		code: "VGPU-COMPILE-FAILED",
		message: "WebGPU pipeline compilation failed.",
		fix: "Check WGSL, pipeline bindings, device limits, and render target/vertex layouts when applicable.",
		where: e,
		cause: t,
		detail: n ? { signature: n } : void 0
	});
}
function At(e) {
	return new S({
		code: "VGPU-COMPILE-DISPOSED",
		message: "GPU disposed during pipeline compilation.",
		where: e
	});
}
function jt(e, t) {
	return new S({
		code: "VGPU-COMPILE-SIGNATURE-INVALID",
		message: `Invalid TargetSignature: ${t}`,
		fix: "Pass { colors, depth?, sampleCount?:1|4 } or a Target.",
		where: e
	});
}
function Mt(e) {
	return new S({
		code: "VGPU-TARGET-DEPTH-STENCIL-ONLY",
		message: `depth received '${e}'; stencil-only depth targets are not supported yet.`,
		fix: "Use a format with a depth aspect such as \"depth24plus\" or \"depth24plus-stencil8\".",
		where: "target"
	});
}
function Nt() {
	return new S({
		code: "VGPU-TARGET-SIZE-REQUIRED",
		message: "Target size required. Fix: target(gpu, { size: [w,h] }); update surface-derived targets in onResize.",
		where: "target"
	});
}
function Pt(e) {
	return new S({
		code: "VGPU-SURFACE-NOT-IN-FRAME",
		message: "Surface targets are only available inside frame(gpu).",
		fix: "Encode surface draws inside frame(gpu, ...); compile(surface) and bundle(gpu, { target: surface }, ...) can prepare outside a frame.",
		where: e
	});
}
function Ft(e) {
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
function It(e) {
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
function Lt() {
	return new S({
		code: "VGPU-SURFACE-CONTEXT",
		message: "Canvas WebGPU context failed. Fix: check navigator.gpu and remove any existing 2d/webgl context.",
		where: "surface"
	});
}
function Rt(e) {
	return new S({
		code: "VGPU-SURFACE-DUPLICATE",
		message: `Canvas already has surface${e ? ` '${e}'` : ""}. Fix: reuse or dispose it.`,
		where: "surface"
	});
}
function zt(e) {
	return new S({
		code: "VGPU-SURFACE-DISPOSED",
		message: `Surface '${e ?? "surface"}' is disposed. Fix: call surface(gpu, canvas).`,
		where: "surface"
	});
}
function Bt() {
	return new S({
		code: "VGPU-SURFACE-AUTORESIZE-UNSUPPORTED",
		message: "autoResize needs clientWidth. Fix: call surface.resize([w,h]) for OffscreenCanvas; onResize still fires.",
		where: "surface"
	});
}
function Vt(e) {
	return new S({
		code: "VGPU-SURFACE-RESIZE-REENTRANT",
		message: `Cannot resize this surface${e ? ` '${e}'` : ""} in onResize. Fix: resize derived targets only.`,
		where: "surface.resize"
	});
}
function Ht(e) {
	return new S({
		code: "VGPU-CLEAR-COLOR-INVALID",
		message: `Invalid ${e}: expected four finite numbers.`,
		fix: "Assign [r, g, b, a] or a GPUColor object ({ r, g, b, a }).",
		where: e
	});
}
function Ut(e) {
	return new S({
		code: "VGPU-ASYNC-FRAME-CALLBACK",
		message: `${e} callbacks must be synchronous.`,
		where: e,
		fix: "Await preparation before frame()/frameLoop(); keep the frame callback synchronous."
	});
}
function Wt() {
	return new S({
		code: "VGPU-FRAME-REENTRANT",
		message: "Nested frame(gpu) is invalid. Fix: queue work for the next frame.",
		where: "frame"
	});
}
function Gt(e) {
	return new S({
		code: "VGPU-FRAME-CANCELED",
		message: "the frame was canceled; its command encoder was dropped and nothing more can be encoded or submitted on it.",
		fix: "Open a new frame(gpu) for further work; cancel() is the last operation on a frame.",
		where: e
	});
}
function Kt(e) {
	return new S({
		code: "VGPU-FRAME-PASS-ACTIVE",
		message: "the frame cannot be canceled while a pass callback is active.",
		fix: "Return from the frame.pass(...) callback first, then call frame.cancel(); this keeps pass descriptor resources alive until the pass is closed.",
		where: e
	});
}
function qt(e) {
	return new S({
		code: "VGPU-FRAME-SUBMITTED",
		message: "the frame was already submitted; submitted GPU work cannot be canceled.",
		fix: "Call cancel() only on a frame you decided not to submit; the frame you did submit needs no cleanup.",
		where: e
	});
}
function E(e, t, n) {
	return new S({
		code: "VGPU-R1-BINDING-INCOMPATIBLE-RESOURCE",
		message: `binding \`${e.name}\` @group(${e.group}) @binding(${e.binding}) needs ${t}.`,
		fix: n,
		where: "set"
	});
}
function D(e, t, n) {
	return new S({
		code: "VGPU-RING1-UNSUPPORTED",
		message: t,
		fix: n,
		where: e
	});
}
function Jt(e, t) {
	return new S({
		code: "VGPU-SET-VALUE-INVALID",
		message: `Invalid WGSL value at '${e.path}': ${t}.`,
		fix: "Pass the exact reflected structure, vector, matrix, and array shapes; use integral in-range values for i32/u32.",
		where: "set",
		detail: e
	});
}
function Yt() {
	return new S({
		code: "VGPU-SHADER-SOURCE-UNPREPARED",
		message: "The renderer requires a prepared ShaderSource v2, but received raw WGSL or a v1 artifact.",
		fix: "Use a compatible @vgpu/wgsl loader, rebuild shader assets, or call prepareShader() from @vgpu/wgsl/prepare.",
		where: "shader source"
	});
}
function Xt(e, t) {
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
function O(e, t) {
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
function Zt(e, t) {
	switch (t.kind) {
		case "sampler": return `${e}.set({${t.name}:sampler(gpu)})`;
		case "texture": return `${e}.set({${t.name}:scene.color})`;
		case "buffer": return t.addressSpace === "uniform" ? `${e}.set({${t.name}:{ /* values */ }})` : `${e}.set({${t.name}:buffer})`;
		default: return `${e}.set({${t.name}:resource})`;
	}
}
//#endregion
//#region node_modules/vgpu/dist/lifecycle.js
function k(e, t) {
	e.assertUsable(t);
}
function Qt(e) {
	try {
		return k(e, "Device"), !0;
	} catch {
		return !1;
	}
}
function $t(e, t, n) {
	e.assertUsable(t, n);
}
//#endregion
//#region node_modules/vgpu/dist/submitted-work-done.js
function en(e) {
	try {
		return e.gpu.queue.onSubmittedWorkDone?.() ?? Promise.resolve();
	} catch (e) {
		return Promise.reject(e);
	}
}
//#endregion
//#region node_modules/vgpu/dist/kernel.js
var tn = [
	"scheduler",
	"resource",
	"service"
];
function nn(e) {
	return { name: e };
}
var rn = /* @__PURE__ */ new WeakMap();
function an(e) {
	let t = rn.get(e);
	if (!t) throw new S({
		code: "VGPU-GPU-FOREIGN",
		message: "This object was not created by init(); it has no vgpu kernel.",
		fix: "Pass the gpu returned by init() from vgpu, vgpu/node or vgpu/mock.",
		where: "gpu"
	});
	return t;
}
var on = class {
	device;
	#e = /* @__PURE__ */ new Map();
	#t = new Map(tn.map((e) => [e, /* @__PURE__ */ new Set()]));
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
		}), this.#s = t, this.#o = cn(e, (e) => {
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
		let e = !this.#c && Qt(this.device) ? en(this.device) : void 0, t = [...this.#i], n = [...this.#r, ...t.flatMap((e) => {
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
			for (let e of tn) {
				let t = this.#t.get(e);
				for (let e of [...t]) e();
				t.clear();
			}
			this.#e.clear(), this.#i.clear(), this.#a.clear(), this.#n.clear(), this.device.dispose();
		}
	}
};
function sn(e) {
	let t = new on(e), n = {
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
	return rn.set(n, t), n;
}
function cn(e, t) {
	return e.onObservedLoss(t);
}
async function ln(e, t = {}, n) {
	return sn(await un(e, t, n));
}
async function un(e, t, n) {
	if (t.adapter || n) return (t.adapter ?? n()).requestDevice(t);
	if (e === "browser") return dn(t);
	throw D("init", `init(${e}) requires adapterFactory.`);
}
async function dn(e) {
	let t = await globalThis.navigator.gpu?.requestAdapter({ powerPreference: e.powerPreference });
	if (!t) throw D("init", "navigator.gpu.requestAdapter() returned null.");
	return r(t.features, e.requiredFeatures), new Me(await t.requestDevice({
		requiredFeatures: e.requiredFeatures,
		requiredLimits: e.requiredLimits
	}), t.info ?? null);
}
//#endregion
//#region node_modules/vgpu/dist/draw-protocols.js
var fn = Symbol("vgpu.bindingResource");
function pn(e) {
	return typeof (typeof e == "object" && e ? e[fn] : void 0) == "function" ? e : void 0;
}
var mn = Symbol("vgpu.surfaceTarget");
function hn(e) {
	return typeof e == "object" && !!e && e[mn] === !0;
}
var gn = Symbol("vgpu.targetSignature");
function _n(e) {
	let t = typeof e == "object" && e ? e[gn] : void 0;
	return typeof t == "function" ? t.call(e) : void 0;
}
var vn = Symbol("vgpu.geometry.layoutResolver"), yn = Symbol("vgpu.geometry.liveness");
function bn(e) {
	return typeof (typeof e == "object" && e ? e[yn] : void 0) == "function" ? e : void 0;
}
//#endregion
//#region node_modules/vgpu/dist/live-kernel.js
function xn(e, t) {
	let n = an(e);
	if (n.disposed) throw Sn(t);
	return k(n.device, t), n;
}
function Sn(e) {
	return new S({
		code: "VGPU-GPU-DISPOSED",
		message: `${e}() ran after gpu.dispose(); the device and everything it owned are gone.`,
		fix: "Create resources before disposing the gpu, or init() a new one.",
		where: e
	});
}
//#endregion
//#region node_modules/vgpu/dist/binding-lifetime.js
var Cn = 16, wn = /* @__PURE__ */ new WeakMap();
function Tn() {
	let e = /* @__PURE__ */ new WeakMap(), t = {
		records: /* @__PURE__ */ new Map(),
		dependencies: /* @__PURE__ */ new Map(),
		markerRefs: /* @__PURE__ */ new Map(),
		markerFinalizer: new FinalizationRegistry((e) => t.markerRefs.delete(e)),
		finalizer: new FinalizationRegistry((e) => On(t, e)),
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
			return o.unsubscribe = En(a, o, s, c, l), o;
		},
		register(e, r) {
			if (t.disposed || (n.maintain(), r.length === 0)) return;
			let i = t.nextRecord++, a = {
				id: i,
				target: new WeakRef(e),
				dependencies: [...new Set(r)],
				token: {}
			};
			Dn(t, a);
			for (let e of a.dependencies) {
				let n = t.dependencies.get(e);
				n || t.dependencies.set(e, n = /* @__PURE__ */ new Set()), n.add(i);
			}
			return t.finalizer.register(e, i, a.token), i;
		},
		unregister(e) {
			e !== void 0 && On(t, e);
		},
		invalidate(e, r) {
			n.maintain();
			let i = t.dependencies.get(e);
			if (i) for (let n of [...i]) {
				t.targetedVisits += 1;
				let i = t.records.get(n);
				if (!i) continue;
				let a = i.target.deref();
				a && r && !r(a) || (a && a.invalidateLifetime(n, e), On(t, n));
			}
		},
		maintain() {
			if (t.disposed || t.head === void 0) return;
			let e = t.cursor ?? t.head;
			for (let n = 0; n < Cn && t.head !== void 0; n += 1) {
				let n = t.records.get(e);
				if (!n) {
					e = t.head;
					continue;
				}
				t.maintenanceVisits += 1;
				let r = n.next ?? t.head;
				if (n.target.deref() || On(t, e), t.head === void 0) break;
				e = t.records.has(r) ? r : t.head;
			}
			t.cursor = t.head === void 0 ? void 0 : e;
		},
		dispose() {
			if (!t.disposed) {
				t.disposed = !0, n.destroyEpoch++;
				for (let e of t.markerRefs.values()) t.markerFinalizer.unregister(e), e.deref()?.unsubscribe?.();
				t.markerRefs.clear();
				for (let e of [...t.records.keys()]) On(t, e);
				t.dependencies.clear(), t.head = void 0, t.cursor = void 0;
			}
		}
	};
	return wn.set(n, t), n;
}
function En(e, t, n, r, i) {
	return e(() => {
		if (t.destroyed) return;
		t.destroyed = !0;
		let e = i.deref(), a = e && wn.get(e);
		e && a && (a.markerFinalizer.unregister(r), a.markerRefs.delete(n), e.destroyEpoch++, e.invalidate(t.dependency));
	});
}
function Dn(e, t) {
	if (e.head === void 0) t.previous = t.id, t.next = t.id, e.head = t.id, e.cursor = t.id;
	else {
		let n = e.records.get(e.head), r = e.records.get(n.previous);
		t.previous = r.id, t.next = n.id, r.next = t.id, n.previous = t.id;
	}
	e.records.set(t.id, t);
}
function On(e, t) {
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
var kn = "uniform-page", An = class {
	cache;
	shard;
	group;
	layout;
	key;
	capture;
	bindGroup;
	record;
	used = ++Mn;
	constructor(e, t, n, r, i, a, o) {
		this.cache = e, this.shard = t, this.group = n, this.layout = r, this.key = i, this.capture = a, this.bindGroup = o;
	}
	invalidateLifetime() {
		Hn(this.cache, this);
	}
}, jn = /* @__PURE__ */ new WeakMap(), Mn = 0;
function Nn() {
	return Mn;
}
function Pn() {
	let e = {
		lifetime: Tn(),
		shards: /* @__PURE__ */ new WeakMap(),
		disposed: !1
	}, t = {
		lifetime: e.lifetime,
		getOrCreate(t, n, r, i, a, o, s = Bn(i)) {
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
			if (d) return d.used = ++Mn, d.bindGroup;
			let f = i.some(({ key: e }) => Vn(e)), p = new An(e, new WeakRef(c), n, r, s, f, o());
			if (u.set(s, p), c.lru.set(p, !0), p.record = e.lifetime.register(p, a.map(Rn)), f) {
				let t = c.captures.get(n);
				t || c.captures.set(n, t = /* @__PURE__ */ new Map()), t.set(p, !0), t.size > 16 && Hn(e, zn(t));
			}
			return c.lru.size > 64 && Hn(e, zn(c.lru)), p.bindGroup;
		},
		marker(t, n, r) {
			return e.lifetime.marker(t, Rn(n), r);
		},
		evictIdentity(t, n) {
			e.lifetime.invalidate(Rn(t), n === void 0 ? void 0 : (e) => !(e instanceof An) || e.used <= n);
		},
		clearOwner(t, n) {
			e.lifetime.maintain();
			let r = e.shards.get(t);
			if (r) {
				for (let t of [...r.lru.keys()]) (n === void 0 || t.group === n) && Hn(e, t);
				n === void 0 && e.shards.delete(t);
			}
		},
		dispose() {
			e.disposed || (e.disposed = !0, e.shards = /* @__PURE__ */ new WeakMap(), e.lifetime.dispose());
		}
	};
	return jn.set(t, e), t;
}
var Fn = /* @__PURE__ */ new WeakMap(), In = 0;
function Ln(e) {
	if (typeof e == "string" || typeof e == "number") return `${typeof e}:${String(e)}`;
	let t = Fn.get(e);
	return t === void 0 && (t = `${e.kind}:${e.id}`, "offset" in e && (t += `@${e.offset}+${e.size}`), Fn.set(e, t)), t;
}
function Rn(e) {
	return typeof e == "string" || typeof e == "number" ? `${typeof e}:${String(e)}` : `${e.kind}:${e.id}`;
}
function zn(e) {
	let t;
	for (let n of e.keys()) (!t || n.used < t.used) && (t = n);
	return t;
}
function Bn(e) {
	In++;
	let t = !0;
	for (let n = 1; n < e.length; n++) e[n - 1].binding > e[n].binding && (t = !1);
	let n = t ? e : [...e].sort((e, t) => e.binding - t.binding), r = "";
	for (let { binding: e, key: t } of n) {
		let n = Ln(t);
		r += `${e}:${n.length}:${n}`;
	}
	return r;
}
function Vn(e) {
	return typeof e == "object" && e.kind === "uniform-page";
}
function Hn(e, t) {
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
function Un(e, t, n) {
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
var Wn = /* @__PURE__ */ new WeakMap();
function Gn(e, t) {
	if (!e.gpu.pushErrorScope || !e.gpu.popErrorScope) return;
	e.gpu.pushErrorScope("validation");
	let n = Wn.get(e.gpu);
	n ? n.push(t) : Wn.set(e.gpu, [t]);
}
function A(e) {
	let t = Wn.get(e.gpu);
	if (!t?.length || !e.gpu.popErrorScope) return;
	let n = t.pop();
	return t.length || Wn.delete(e.gpu), {
		context: n,
		error: e.gpu.popErrorScope()
	};
}
function Kn(e) {
	let t = [], n = A(e);
	for (; n;) t.push(n), n = A(e);
	return t;
}
function qn(e) {
	let t = A(e);
	t && $n(t);
}
function Jn(e) {
	for (let t of Kn(e)) $n(t);
}
function j(e) {
	for (let t of e) $n(t);
}
function Yn(e, t = [], n = {}) {
	return Qn(e, t, n.errorSink ?? er);
}
function Xn(e, t) {
	return {
		context: e.context,
		error: Zn(e.error, t.error)
	};
}
async function Zn(e, t) {
	let n = await Promise.allSettled([e, t]);
	for (let e of n) if (e.status === "fulfilled" && e.value) return e.value;
	let r = n.find((e) => e.status === "rejected");
	if (r?.status === "rejected") throw r.reason;
	return null;
}
async function Qn(e, t, n) {
	await en(e);
	for (let e of t) try {
		let t = await e.error;
		t && await n(et(e.context.label, e.context.group, t));
	} catch (t) {
		await n(et(e.context.label, e.context.group, t));
	}
}
function $n(e) {
	e.error.catch(() => void 0);
}
function er(e) {
	console.error(e);
}
//#endregion
//#region node_modules/vgpu/dist/claim-validation-encode.js
function tr(e, t, n, r) {
	try {
		t.end();
	} catch (t) {
		let i = Kn(e);
		j(n), j(i), n.length = 0;
		let a = i[0]?.context ?? r;
		throw a ? et(a.label, a.group, t) : t;
	}
}
//#endregion
//#region node_modules/vgpu/dist/binding-views.js
var nr = class {
	views = /* @__PURE__ */ new Map();
	registered = /* @__PURE__ */ new WeakSet();
	destroyed = !1;
	invalidateLifetime() {
		this.destroyed = !0, this.views.clear();
	}
}, rr = /* @__PURE__ */ new WeakMap();
function ir(e, t, n, r) {
	let i = ar(e, t);
	if (i.defaultEquivalent) return {
		view: e.view,
		key: i.key
	};
	e.view, r.limits;
	let a = rr.get(e);
	if (a || (a = new nr(), rr.set(e, a)), !a.registered.has(n.lifetime)) {
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
function ar(e, t) {
	let n = t?.dimension ?? or(e), r = t?.baseMipLevel ?? 0, i = t?.mipLevelCount ?? e.mipLevelCount - r, a = t?.baseArrayLayer ?? 0, o = t?.arrayLayerCount ?? sr(e, n, a), s = t?.aspect ?? "all", c = t?.usage === void 0 || t.usage === 0 ? e.gpu.usage : t.usage, l = t?.swizzle ?? "rgba", u = {
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
		dimension: or(e),
		aspect: "all",
		baseMipLevel: 0,
		mipLevelCount: e.mipLevelCount,
		baseArrayLayer: 0,
		arrayLayerCount: sr(e, or(e), 0),
		usage: e.gpu.usage,
		swizzle: "rgba"
	};
	return {
		key: JSON.stringify(u),
		defaultEquivalent: JSON.stringify(u) === JSON.stringify(d)
	};
}
function or(e) {
	return e.kind === "2d-array" ? "2d-array" : e.kind;
}
function sr(e, t, n) {
	return t === "2d-array" || t === "cube" || t === "cube-array" ? e.layers - n : 1;
}
//#endregion
//#region node_modules/vgpu/dist/set-resources.js
var cr = 1, lr = /* @__PURE__ */ new WeakMap();
function ur(e) {
	return typeof e != "object" || !e || ArrayBuffer.isView(e) || e instanceof ArrayBuffer || Array.isArray(e) ? !0 : e instanceof g || e instanceof x || pn(e) || Lr(e) || Ir(e) ? !1 : !Mr(e);
}
function dr(e) {
	return typeof e != "object" || !e || Array.isArray(e) || ArrayBuffer.isView(e) || e instanceof ArrayBuffer || e instanceof g || e instanceof x || pn(e) || Lr(e) || Ir(e) ? !1 : !Mr(e);
}
function fr(e, t, n) {
	mr(e, t, n.sourceHint);
	try {
		return pr(e, t, n);
	} catch (r) {
		let i = r?.code;
		if (i === "VGPU-CORE-TEXTURE-DESTROYED" || i === "VGPU-BUFFER-DISPOSED") {
			let r = i === "VGPU-BUFFER-DISPOSED" ? Ar(t) : t instanceof x ? t.label : jr(t)?.color.label;
			throw qe(n.sourceHint, e, r);
		}
		throw r;
	}
}
function pr(e, t, n) {
	switch (mr(e, t, n.sourceHint), e.bindingLayout?.kind) {
		case "buffer": return hr(e, t, n);
		case "texture": return yr(e, t, n);
		case "sampler": return wr(e, t);
		case "storageTexture": return br(e, t, n);
		case "externalTexture": throw E(e, "external texture", "Pass a compatible GPUExternalTexture.");
		default: throw E(e, "reflected resource", "Fix shader reflection bindingLayout.");
	}
}
function mr(e, t, n) {
	if (hn(t)) throw Ke(n, e);
}
function hr(e, t, n) {
	let r = pn(t);
	if (r) return gr(e, r[fn](e, n.sourceHint), n);
	if (t instanceof g) return $t(t, `${n.sourceHint}.set`), gr(e, {
		resourceLabel: t.options.label ?? t.gpu.label,
		resource: { buffer: t.gpu },
		identity: t.resourceIdentity,
		tracked: [kr(t, t.resourceIdentity)]
	}, n);
	if (Pr(t)) return $t(t.buffer, `${n.sourceHint}.set`), gr(e, {
		resourceLabel: t.buffer.options.label ?? t.buffer.gpu.label,
		resource: {
			buffer: t.gpu,
			offset: 0,
			size: t.size
		},
		identity: t.buffer.resourceIdentity,
		tracked: [kr(t.buffer, t.buffer.resourceIdentity)]
	}, n);
	if (Ir(t)) return gr(e, {
		resource: t,
		identity: M(t.buffer)
	}, n);
	if (Lr(t)) return gr(e, {
		resource: { buffer: t },
		identity: M(t)
	}, n);
	throw E(e, "buffer", `Pass a compatible Buffer/Uniform: ${e.name}.set({ ${e.name}: gpu.device.createBuffer(...) }).`);
}
function gr(e, t, n) {
	if (!Ir(t.resource)) return t;
	let { buffer: r } = t.resource, i = t.resource.offset === void 0 ? 0 : t.resource.offset, a = t.resource.size === void 0 ? r.size - i : t.resource.size;
	return _r(e, r, i, a, n.device.limits, t.tracked !== void 0), {
		...t,
		resource: {
			buffer: r,
			offset: i,
			size: a
		},
		identity: vr(r, i, a),
		underlyingBuffer: r
	};
}
function _r(e, t, n, r, i, a) {
	let o = e.bindingLayout?.kind === "buffer" ? e.bindingLayout.buffer : void 0, s = o?.type === "storage" || o?.type === "read-only-storage", c = s ? "storage" : "uniform", l = globalThis.GPUBufferUsage?.[s ? "STORAGE" : "UNIFORM"] ?? (s ? 128 : 64), u = s ? i.minStorageBufferOffsetAlignment : i.minUniformBufferOffsetAlignment, d = s ? i.maxStorageBufferBindingSize : i.maxUniformBufferBindingSize, f = Math.max(o?.minBindingSize ?? 0, e.layout?.size ?? 0), p = `Create the buffer with ${c} usage and use a safe integer offset aligned to ${u} bytes plus a positive size from ${Math.max(1, f)} to ${d} bytes within buffer.size.`, m = (t) => {
		throw E(e, `a valid ${c} buffer range (${t})`, p);
	};
	if ((t.usage & l) === 0) {
		let t = a ? `Create with usage: ['${c}','copy_dst'].` : p;
		throw E(e, `a valid ${c} buffer range (buffer usage is missing ${c})`, t);
	}
	(!Number.isFinite(n) || !Number.isSafeInteger(n) || n < 0) && m("offset must be a non-negative safe integer"), (!Number.isFinite(r) || !Number.isSafeInteger(r) || r <= 0) && m("size must be a positive safe integer"), n > t.size && m("offset exceeds buffer.size"), r > t.size - n && m("offset + size exceeds buffer.size"), n % u !== 0 && m(`offset must be aligned to ${u} bytes`), r < f && m(`size is below the reflected minimum of ${f} bytes`), r > d && m(`size exceeds the granted maximum of ${d} bytes`), s && r % 4 != 0 && m("storage size must be a multiple of 4 bytes");
}
function vr(e, t, n) {
	return `buffer-range:${JSON.stringify([
		Ln(M(e)),
		t,
		n
	])}`;
}
function yr(e, t, n) {
	let r = e.bindingLayout?.kind === "texture" && e.bindingLayout.texture.sampleType === "depth", i = jr(t);
	if (i) {
		if (r && !i.depth) throw E(e, "a target with a depth attachment", `Create it with target(gpu, { size, depth: true }) or bind a Texture: set({ ${e.name}: scene.depth }).`);
		let t = r ? i.depth : i.color;
		Dr(e, t, n);
		let a = ir(t, Or(t), n.cache, n.device);
		return {
			resourceLabel: t.label,
			resource: a.view,
			identity: t.resourceIdentity,
			cacheIdentity: Nr(t.resourceIdentity, a.key),
			tracked: [kr(i, i.resourceIdentity), kr(t, t.resourceIdentity)],
			followedTarget: {
				target: i,
				depth: r
			}
		};
	}
	if (t instanceof x) {
		Er(e, t.usage), Dr(e, t, n);
		let r = ir(t, Or(t), n.cache, n.device);
		return {
			resourceLabel: t.label,
			resource: r.view,
			identity: t.resourceIdentity,
			cacheIdentity: Nr(t.resourceIdentity, r.key),
			tracked: [kr(t, t.resourceIdentity)]
		};
	}
	if (Fr(t)) return {
		resource: t.createView(),
		identity: t.resourceIdentity ?? M(t)
	};
	if (typeof t == "object" && t) return {
		resource: t,
		identity: M(t)
	};
	throw E(e, "texture/target", `Pass a Texture or Target: ${e.name}.set({ ${e.name}: scene.color }) or set({ ${e.name}: scene }).`);
}
function br(e, t, n) {
	let r = e.bindingLayout?.kind === "storageTexture" ? e.bindingLayout.storageTexture : void 0, i = {
		format: r?.format,
		viewDimension: r?.viewDimension ?? "2d"
	}, a = `texture(gpu, { kind: "${i.viewDimension}", size${i.viewDimension === "2d-array" ? ", layers" : ""}, format: "${i.format ?? "rgba8unorm"}", usage: ["storage_binding"] })`;
	if (jr(t)) throw E(e, "a storage texture, not a Target", `Render targets are not storage textures. Create one with ${a} and set({ ${e.name}: texture }).`);
	if (t instanceof x) {
		xr(e, t, i, a);
		let r = ir(t, Sr(i.viewDimension), n.cache, n.device);
		return {
			resourceLabel: t.label,
			resource: r.view,
			identity: t.resourceIdentity,
			cacheIdentity: Nr(t.resourceIdentity, r.key),
			tracked: [kr(t, t.resourceIdentity)]
		};
	}
	if (Fr(t)) return {
		resource: t.createView(Sr(i.viewDimension)),
		identity: t.resourceIdentity ?? M(t)
	};
	if (typeof t == "object" && t) return {
		resource: t,
		identity: M(t)
	};
	throw E(e, "a storage texture", `Pass a Texture from ${a}: set({ ${e.name}: texture }).`);
}
function xr(e, t, n, r) {
	let i = t.label ?? "texture";
	if (!t.usage.includes("storage_binding")) throw E(e, "a texture with storage_binding usage", `Create it with ${r}; include texture_binding too if you also sample it.`);
	if (n.format && t.format !== n.format) throw E(e, `format ${n.format}`, `Texture '${i}' is ${t.format}. Create it with ${r} or declare texture_storage_${n.viewDimension.replace("-", "_")}<${t.format}, ...> in WGSL.`);
	let a = Cr(n.viewDimension);
	if (a && t.dimension !== a) throw E(e, `dimension "${a}"`, `Texture '${i}' has kind "${t.kind}". Create it with ${r}.`);
}
function Sr(e) {
	return {
		dimension: e,
		baseMipLevel: 0,
		mipLevelCount: 1
	};
}
function Cr(e) {
	switch (e) {
		case "1d": return "1d";
		case "2d":
		case "2d-array": return "2d";
		case "3d": return "3d";
		default: return;
	}
}
function wr(e, t) {
	if (Tr(t)) return {
		resource: t,
		identity: M(t)
	};
	throw E(e, "sampler", `Use the cached sampler: set({ ${e.name}: sampler(gpu) }).`);
}
function Tr(e) {
	return typeof e != "object" || !e || e instanceof g || e instanceof x ? !1 : !Lr(e) && !Ir(e) && !Fr(e) && !jr(e);
}
function Er(e, t) {
	if (!t.includes("texture_binding") && !t.includes("render_attachment")) throw E(e, "sampled texture", "Use texture_binding usage or a sampleable Target.");
}
function Dr(e, t, n) {
	if (n.filterableTexture && !n.float32Filterable && (t.format === "r32float" || t.format === "rg32float" || t.format === "rgba32float")) throw Ye(n.sourceHint, e, t.format, t.label ?? "texture", n.pairedSampler);
}
function Or(e) {
	return e.format.includes("stencil") ? { aspect: "depth-only" } : void 0;
}
function kr(e, t) {
	return {
		resource: e,
		identity: t,
		subscribe: (t) => e.onDestroy(t)
	};
}
function Ar(e) {
	try {
		let t = e instanceof g ? e : typeof e == "object" && e && "buffer" in e ? e.buffer : void 0;
		return t instanceof g ? t.options.label ?? t.gpu.label : void 0;
	} catch {
		return;
	}
}
function jr(e) {
	if (typeof e != "object" || !e) return;
	let t = e;
	if (t.resourceIdentity && t.color && typeof t.onDestroy == "function") return t;
}
function Mr(e) {
	let t = e;
	return "gpu" in t || "bindGroup" in t || "createView" in t || "resourceIdentity" in t;
}
function M(e) {
	if (typeof e != "object" || !e) return `value:${String(e)}`;
	let t = lr.get(e);
	return t || (t = {
		kind: "external",
		id: cr++
	}, lr.set(e, t)), t;
}
function Nr(e, t) {
	return `texture-view:${JSON.stringify([Ln(e), t])}`;
}
function Pr(e) {
	return typeof e == "object" && !!e && "gpu" in e && "size" in e && "buffer" in e && e.buffer instanceof g;
}
function Fr(e) {
	return typeof e == "object" && !!e && typeof e.createView == "function";
}
function Ir(e) {
	return typeof e == "object" && !!e && "buffer" in e && Lr(e.buffer);
}
function Lr(e) {
	if (typeof e != "object" || !e) return !1;
	let t = e;
	return Number.isSafeInteger(t.size) && t.size >= 0 && typeof t.usage == "number" && typeof t.destroy == "function" && typeof t.mapAsync == "function" && typeof t.getMappedRange == "function" && typeof t.unmap == "function";
}
//#endregion
//#region node_modules/vgpu/dist/bytes-equal.js
function Rr(e, t) {
	let n = e instanceof Uint8Array ? e : new Uint8Array(e), r = t instanceof Uint8Array ? t : new Uint8Array(t);
	if (n.byteLength !== r.byteLength) return !1;
	for (let e = 0; e < n.byteLength; e++) if (n[e] !== r[e]) return !1;
	return !0;
}
//#endregion
//#region node_modules/vgpu/dist/set-packing.js
function zr(e, t) {
	Br(e), Yr(e, t, "$", 0, e.size);
	let n = new ArrayBuffer(e.size);
	return Vr(new DataView(n), e, 0, t), n;
}
function Br(e) {
	if (e.size === void 0) throw D("set", `No se puede inferir byteLength para layout runtime-sized '${e.name}'.`);
}
function Vr(e, t, n, r) {
	if (t.members) return Hr(e, t.members, n, r);
	Ur(e, t, n, r);
}
function Hr(e, t, n, r) {
	let i = r;
	for (let r of t) Vr(e, r.layout, n + r.offset, i?.[r.name]);
}
function Ur(e, t, n, r) {
	switch (t.type.kind) {
		case "scalar": return Wr(e, n, t.type.name, r);
		case "atomic": return Gr(e, n, t.type, r);
		case "vector": return Kr(e, n, t.type, r);
		case "matrix": return qr(e, t, n, r);
		case "array": return Jr(e, t, n, r);
		default: throw D("set", `No hay writer para layout ${t.type.kind}.`);
	}
}
function Wr(e, t, n, r) {
	n === "f32" ? e.setFloat32(t, r, !0) : n === "i32" ? e.setInt32(t, r, !0) : n === "u32" || n === "bool" ? e.setUint32(t, n === "bool" ? +!!r : r, !0) : e.setUint16(t, ci(r), !0);
}
function Gr(e, t, n, r) {
	Wr(e, t, P(n.element), r);
}
function Kr(e, t, n, r) {
	let i = r, a = si(n.element);
	for (let r = 0; r < n.width; r++) Wr(e, t + r * a, P(n.element), i?.[r] ?? 0);
}
function qr(e, t, n, r) {
	let i = t.type, a = r, o = si(i.element), s = t.stride ?? 16;
	for (let t = 0; t < i.columns; t++) for (let r = 0; r < i.rows; r++) Wr(e, n + t * s + r * o, P(i.element), a?.[t * i.rows + r] ?? 0);
}
function Jr(e, t, n, r) {
	let i = r, a = t.stride ?? t.element?.size ?? 0;
	if (!t.element) throw D("set", "Array layout sin element layout.");
	for (let r = 0; r < i.length; r++) Vr(e, t.element, n + r * a, i[r]);
}
function Yr(e, t, n, r, i) {
	if (e.members) {
		Xr(e.members, t, n, r, i);
		return;
	}
	switch (e.type.kind) {
		case "scalar":
			ei(e.type.name, t, n), ri(n, r, si(e.type), i);
			return;
		case "atomic":
			ei(P(e.type.element), t, n), ri(n, r, 4, i);
			return;
		case "vector":
			Zr(e.type, t, n, r, i);
			return;
		case "matrix":
			Qr(e, t, n, r, i);
			return;
		case "array":
			$r(e, t, n, r, i);
			return;
		default: throw D("set", `No hay validator para layout ${e.type.kind}.`);
	}
}
function Xr(e, t, n, r, i) {
	ai(t) || N("type", n, "an object", oi(t));
	let a = new Set(e.map((e) => e.name)), o = Object.keys(t).find((e) => !a.has(e));
	o !== void 0 && N("unknown-field", `${n}.${o}`, "a declared field", o);
	for (let a of e) {
		let e = `${n}.${a.name}`;
		Object.hasOwn(t, a.name) || N("missing-field", e, "a required field", "missing"), Yr(a.layout, t[a.name], e, r + a.offset, i);
	}
}
function Zr(e, t, n, r, i) {
	let a = ti(t, n, e.width), o = P(e.element), s = si(e.element);
	for (let t = 0; t < e.width; t++) ei(o, a[t], `${n}[${t}]`), ri(`${n}[${t}]`, r + t * s, s, i);
}
function Qr(e, t, n, r, i) {
	let a = e.type, o = ti(t, n, a.columns * a.rows), s = P(a.element), c = si(a.element), l = e.stride;
	if (l === void 0) throw D("set", `Matrix layout '${e.name}' sin stride.`);
	for (let e = 0; e < a.columns; e++) for (let t = 0; t < a.rows; t++) {
		let u = e * a.rows + t, d = `${n}[${e}][${t}]`;
		ei(s, o[u], d), ri(d, r + e * l + t * c, c, i);
	}
}
function $r(e, t, n, r, i) {
	let a = ni(t, n), o = e.type;
	o.count !== void 0 && a.length !== o.count && N("shape", n, o.count, a.length);
	let s = e.stride;
	if (s === void 0 || !e.element) throw D("set", `Array layout '${e.name}' sin stride o element layout.`);
	if (e.runtimeSized) {
		let t = ii(s, a.length, n), o = e.size ?? i - r;
		o !== t && N("extent", n, t, o);
	}
	for (let t = 0; t < a.length; t++) Yr(e.element, a[t], `${n}[${t}]`, r + t * s, i);
}
function ei(e, t, n) {
	if (e === "bool") {
		typeof t != "boolean" && N("type", n, "bool", oi(t), e);
		return;
	}
	typeof t != "number" && N("type", n, e, oi(t), e), e === "i32" && (!Number.isInteger(t) || t < -2147483648 || t > 2147483647) && N("integer-range", n, "an integer in [-2147483648, 2147483647]", String(t), e), e === "u32" && (!Number.isInteger(t) || t < 0 || t > 4294967295) && N("integer-range", n, "an integer in [0, 4294967295]", String(t), e);
}
function ti(e, t, n) {
	let r = ni(e, t);
	return r.length !== n && N("shape", t, n, r.length), r;
}
function ni(e, t) {
	if (Array.isArray(e) || ArrayBuffer.isView(e) && !(e instanceof DataView) && "length" in e) return e;
	N("type", t, "an array or typed array", oi(e));
}
function ri(e, t, n, r) {
	(!Number.isSafeInteger(t) || !Number.isSafeInteger(n) || t < 0 || n < 0 || t > r - n) && N("buffer-range", e, `${n} bytes inside ${r}`, t);
}
function ii(e, t, n) {
	let r = e * t;
	return (!Number.isSafeInteger(e) || e < 0 || !Number.isSafeInteger(r)) && N("extent", n, "a safe byte extent", String(r)), r;
}
function N(e, t, n, r, i) {
	let a = e === "shape" ? `expected exactly ${n} values, received ${r}` : e === "missing-field" ? "required field is missing" : e === "unknown-field" ? `field '${r}' is not declared by the layout` : e === "integer-range" ? `${r} is outside the exact ${i} range` : e === "extent" ? `runtime extent requires ${n} bytes, received ${r}` : e === "buffer-range" ? `write at byte ${r} exceeds ${n}` : `expected ${n}, received ${r}`;
	throw Jt(i === void 0 ? {
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
function ai(e) {
	if (typeof e != "object" || !e || Array.isArray(e) || ArrayBuffer.isView(e)) return !1;
	let t = Object.getPrototypeOf(e);
	return t === Object.prototype || t === null;
}
function oi(e) {
	return e === null ? "null" : Array.isArray(e) ? "array" : ArrayBuffer.isView(e) ? e.constructor.name : typeof e;
}
function si(e) {
	return P(e) === "f16" ? 2 : 4;
}
function P(e) {
	if (e.kind !== "scalar") throw D("set", `Expected scalar, got ${e.kind}`);
	return e.name;
}
function ci(e) {
	let t = /* @__PURE__ */ new Float32Array(1), n = new Uint32Array(t.buffer);
	t[0] = e;
	let r = n[0], i = r >> 16 & 32768, a = r & 8388607, o = r >> 23 & 255;
	if (o === 255) return i | (a ? 32256 : 31744);
	let s = o - 127 + 15;
	if (s >= 31) return i | 31744;
	if (s <= 0) return s < -10 ? i : i | li(a | 8388608, 14 - s);
	let c = li(a, 13);
	if (c === 1024) {
		let e = s + 1;
		return e >= 31 ? i | 31744 : i | e << 10;
	}
	return i | s << 10 | c;
}
function li(e, t) {
	let n = e >>> t, r = e & (1 << t) - 1, i = 1 << t - 1;
	return r > i || r === i && (n & 1) == 1 ? n + 1 : n;
}
//#endregion
//#region node_modules/vgpu/dist/native-validation.js
function ui(e, t) {
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
var di = /* @__PURE__ */ new WeakMap();
function fi(e, t, n = []) {
	let r;
	try {
		r = ui(e, t);
	} catch (e) {
		throw e instanceof S ? e : kt("pipeline.setup", e);
	}
	let { value: i, error: a } = r;
	return di.set(i, {
		error: Promise.all([pi(n), a]).then((e) => e.find(Boolean) ?? null),
		claimed: !1
	}), i;
}
function pi(e) {
	return Promise.all(e.map((e) => {
		let t = di.get(e);
		return t && (t.claimed = !0), t?.error;
	})).then((e) => e.find(Boolean) ?? null);
}
async function mi(e, t, n) {
	let r = di.get(e), i = await r?.error;
	i && !r?.claimed && await n(kt(t, i));
}
function hi(e, t, n, r, i) {
	try {
		let { value: a, error: o } = ui(e, r);
		return t.push({
			error: o,
			where: n,
			origin: i
		}), a;
	} catch (e) {
		throw e instanceof S ? e : gi(n, e);
	}
}
function gi(e, t) {
	return new S({
		code: "VGPU-COMPUTE-VALIDATION",
		message: "WebGPU compute operation failed validation.",
		where: e,
		cause: t,
		fix: "Check pipeline compilation, resource compatibility, dispatch counts, and device limits."
	});
}
async function _i(e, t) {
	let n = await Promise.all(e.map((e) => e.origin?.())), r = !1;
	for (let [i, a] of e.entries()) {
		let e = await a.error;
		if (n[i]) {
			r = !0;
			continue;
		}
		e && (!r || a.origin) && (await t(gi(a.where, e)), r = !0);
	}
}
//#endregion
//#region node_modules/vgpu/dist/set-layouts.js
var vi = /* @__PURE__ */ new WeakMap();
function yi(e, t) {
	let n = /* @__PURE__ */ new Map(), r = /* @__PURE__ */ new Set(), i = /* @__PURE__ */ new Set(), a = new Set(e.filter((e) => e.bindingLayout?.kind === "texture" && e.bindingLayout.texture.sampleType === "depth").map((e) => `${e.group}:${e.binding}`));
	for (let e of t) {
		let t = e.stage === "vertex" ? 1 : e.stage === "fragment" ? 2 : 4;
		for (let r of Un(e, "bindings", "visibility")) {
			let e = `${r.group}:${r.binding}`;
			n.set(e, (n.get(e) ?? 0) | t);
		}
		for (let t of Un(e, "samplingPairs", "visibility")) {
			if (t.mode !== "filtering") continue;
			let e = `${t.texture.group}:${t.texture.binding}`;
			a.has(e) ? i.add(`${t.sampler.group}:${t.sampler.binding}`) : r.add(e);
		}
	}
	let o = (e) => n.get(`${e.group}:${e.binding}`) ?? 0;
	return Object.defineProperty(o, "filterable", { value: r }), Object.defineProperty(o, "nonFilteringSamplers", { value: i }), o;
}
function bi(e, t, n = Ei) {
	return e.flatMap((e) => {
		if (e.group !== t) return [];
		let r = n(e), i = `${e.group}:${e.binding}`;
		return r === 0 ? [] : [{
			binding: e.binding,
			visibility: r,
			...wi(e, n.filterable?.has(i) ?? !1, n.nonFilteringSamplers?.has(i) ?? !1)
		}];
	});
}
function xi(e, t, n, r = Ei) {
	let i = /* @__PURE__ */ new Map(), a = n.bindings.filter((e) => r(e) !== 0).map((e) => e.group), o = Math.max(-1, ...a);
	for (let a = 0; a <= o; a++) i.set(a, Si(e, t, n, a, r));
	return i;
}
function Si(e, t, n, r, i = Ei) {
	return Ci(e, `${t}.group${r}.bgl`, bi(n.bindings, r, i));
}
function Ci(e, t, n) {
	let r = vi.get(e.gpu);
	r || (r = /* @__PURE__ */ new Map(), vi.set(e.gpu, r));
	let i = JSON.stringify(n), a = r.get(i);
	if (a) return a;
	let o = He(fi(e, () => e.gpu.createBindGroupLayout({
		label: t,
		entries: n
	})), { entries: n });
	return r.set(i, o), o;
}
function wi(e, t, n) {
	let r = e.bindingLayout;
	if (!r) throw D("bindGroupLayout", `Binding '${e.name}' does not have a reflected bindingLayout.`);
	return t && r.kind === "texture" && r.texture.sampleType === "unfilterable-float" && !r.texture.multisampled ? { texture: {
		...r.texture,
		sampleType: "float"
	} } : n && r.kind === "sampler" && r.sampler.type === "filtering" ? { sampler: { type: "non-filtering" } } : Ti(r);
}
function Ti(e) {
	switch (e.kind) {
		case "buffer": return { buffer: { ...e.buffer } };
		case "sampler": return { sampler: { ...e.sampler } };
		case "texture": return { texture: { ...e.texture } };
		case "storageTexture": return { storageTexture: { ...e.storageTexture } };
		case "externalTexture": return { externalTexture: {} };
	}
}
function Ei(e) {
	let t = globalThis.GPUShaderStage, n = t?.VERTEX ?? 1, r = t?.FRAGMENT ?? 2, i = t?.COMPUTE ?? 4;
	return e.kind === "buffer" ? n | r | i : r | i;
}
//#endregion
//#region node_modules/vgpu/dist/set-core.js
var Di = Object.freeze([]), Oi = /* @__PURE__ */ new WeakMap(), ki = Symbol("no cleanup failure");
function Ai(e) {
	let t = e, n = e.label, r = e.disposedError, i = Mi(e.reflection), a = [...e.bindGroupLayouts.keys()].sort((e, t) => e - t), o = /* @__PURE__ */ new Map(), s = {}, c = /* @__PURE__ */ new Map(), l = {
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
		let a = Ni(e, i, n);
		if (!a) throw D(`${n}.set`, `Binding '${e}' does not exist in '${n}'.`);
		return te(a, e, t);
	}
	function v(e, t, r) {
		mr(e.info, r, n), he(e.info.group);
		let i = Pi(e.info, r);
		Fi(e, t, i);
		let a = Hi(e.identity);
		return i === "lib" ? y(e, Ui(e.libValue, r)) : re(e, r), e.ownership ??= i, g(e) ? Vi(e, a) : [];
	}
	function te(e, t, r) {
		he(e.info.group);
		let i = Pi(e.info, r);
		if (Fi(e, t, i), Ii(e, t, i), i !== "lib") throw D(`${n}.set`, `Member '${t}' needs a JS value; set resource '${e.info.name}' instead.`);
		let a = Hi(e.identity);
		return y(e, {
			...Wi(e.libValue ?? Gi(_e(e))),
			[t]: r
		}), e.ownership ??= i, e.memberOwnership.set(t, i), g(e) ? Vi(e, a) : [];
	}
	function y(e, t) {
		let n = _e(e), r = zr(n, t);
		e.libValue = t, e.buffer || ge(e, n.size), (!e.bytes || !Rr(e.bytes, r)) && (e.bytes = r, e.revision = (e.revision ?? 0) + 1, e.dirtyUniform = !0), (e.liveUniform || e.info.addressSpace !== "uniform") && (e.dirtyUniform = !0, b(e, !1));
	}
	function b(e, t) {
		e.prepareUniform?.(t), e.dirtyUniform &&= (e.buffer.write(e.bytes, 0), !1), t && (e.liveUniform = !0);
	}
	function ne(e) {
		let t = m("set"), r = Ue(t.bindGroupLayouts.get(e.group))?.entries.find((t) => t.binding === e.binding), i = t.reflection.entryPoints.flatMap((e) => Un(e, "samplingPairs", n)).find((t) => t.mode === "filtering" && t.texture.group === e.group && t.texture.binding === e.binding), a = i && t.reflection.bindings.find((e) => e.group === i.sampler.group && e.binding === i.sampler.binding);
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
		ie(e, t, fr(e.info, t, ne(e.info)));
	}
	function ie(e, t, n) {
		let r = m("set");
		p(), e.resource = n.resource, e.uniformValue = n.uniformValue, e.prepareUniform = n.prepareUniform, e.identity = n.identity, e.cacheIdentity = n.cacheIdentity, e.resourceLabel = n.resourceLabel, e.sourceValue = t, e.followedTarget = n.followedTarget, e.markers = n.tracked?.map(({ resource: e, identity: t, subscribe: n }) => r.cache.marker(e, t, n)), e.dependencies = n.tracked?.map(({ identity: e }) => e) ?? [], e.underlyingBuffer = n.underlyingBuffer;
	}
	function ae(e, t, r) {
		ue(e), Li(n, e, t, r);
		let i = o.has(e) ? `claimed-group:${e}` : void 0;
		return o.set(e, t), p(), i;
	}
	function oe(e) {
		let t = e.followedTarget;
		if (!t) return;
		if (e.markers?.[0]?.destroyed) throw qe(n, e.info, e.resourceLabel);
		let r = t.depth ? t.target.depth : t.target.color;
		r && Ln(r.resourceIdentity) !== Hi(e.identity) && ie(e, t.target, fr(e.info, t.target, ne(e.info)));
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
			capturedIdentity: Hi(n.identity),
			resourceLabel: n.resourceLabel,
			followedTarget: n.followedTarget
		}));
		return t;
	}
	function ue(e) {
		let t = m("layout").bindGroupLayouts.get(e);
		if (!t) throw D(`${n}.layout`, `@group(${e}) does not exist in '${n}'.`);
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
			offsets: Di,
			claimValidation: pe(i, e)
		};
		let a = f.get(e);
		if (a) return a();
		l.groupPlanBuilds++;
		let u = c.get(e)?.bindings ?? [], d = [], p = [], h = [], g = !0;
		for (let e of u) {
			let n = me(e), i = n.uniformValue?.() ?? (n.bytes && e.addressSpace === "uniform" ? ji(n) : void 0);
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
		}), v = Bn(p), te = () => ({
			group: e,
			bindGroup: r.cache.getOrCreate(s, e, _, p, h, ee, v),
			offsets: Di
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
		if (e.info.kind !== "buffer" || !e.info.layout?.size) throw D(`${n}.set`, `Binding '${e.info.name}' needs a compatible resource, not JS.`);
		return e.info.layout;
	}
	let ve = {
		dispose() {
			let e = t;
			if (!e) return;
			t = void 0, Oi.set(ve, { disposedError: r });
			let n = ki;
			try {
				e.cache.clearOwner(s);
			} catch (e) {
				n = e;
			}
			for (let e of i.values()) if (e.buffer && !e.mayHaveNativeConsumers) try {
				e.buffer.destroy();
			} catch (e) {
				n === ki && (n = e);
			}
			if (i.clear(), o.clear(), c.clear(), f.clear(), d = [], n !== ki) throw n;
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
	return Oi.set(ve, {
		cache: e.cache,
		owner: s,
		stats: l
	}), ve;
}
function ji(e) {
	let t = e.ownedValue;
	return t && t.revision === e.revision ? t : e.ownedValue = {
		owner: e.captureToken,
		revision: e.revision,
		bytes: new Uint8Array(e.bytes)
	};
}
function Mi(e) {
	return new Map(e.bindings.map((e) => [e.name, {
		info: e,
		memberOwnership: /* @__PURE__ */ new Map(),
		captureToken: {}
	}]));
}
function Ni(e, t, n) {
	let r;
	for (let i of t.values()) if (i.info.layout?.members?.some((t) => t.name === e)) {
		if (r) throw D(`${n}.set`, `Binding member '${e}' is ambiguous in '${n}'; set the complete binding.`);
		r = i;
	}
	return r;
}
function Pi(e, t) {
	return e.bindingLayout?.kind === "buffer" && ur(t) ? "lib" : "user";
}
function Fi(e, t, n) {
	if (e.ownership && e.ownership !== n) throw Ze(t, e.ownership);
}
function Ii(e, t, n) {
	let r = e.memberOwnership.get(t);
	if (r && r !== n) throw Ze(t, r);
}
function Li(e, t, n, r) {
	let i = We(n);
	if (!i) return;
	let a = Ue(r);
	if (!a) return;
	let o = Ri(a.entries, i.layout.entries);
	if (o) throw $e(e, t, o);
}
function Ri(e, t) {
	if (e.length !== t.length) return `expected ${e.length} bindings and received ${t.length}`;
	let n = zi(e), r = zi(t);
	for (let [e, t] of n) {
		let n = r.get(e);
		if (!n) return `missing @binding(${e})`;
		if (Bi(t) !== Bi(n)) return `@binding(${e}) does not match the reflected layout`;
	}
}
function zi(e) {
	return new Map(e.map((e) => [e.binding, e]));
}
function Bi(e) {
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
function Vi(e, t) {
	let n = Hi(e.identity);
	return !n || t === n ? [] : [{
		group: e.info.group,
		binding: e.info.binding,
		bindingName: e.info.name,
		bindingKind: e.info.kind,
		previousIdentity: t,
		newIdentity: n
	}];
}
function Hi(e) {
	return e === void 0 ? void 0 : Ln(e);
}
function Ui(e, t) {
	return dr(e) && dr(t) ? {
		...e,
		...t
	} : t;
}
function Wi(e) {
	return dr(e) ? e : {};
}
function Gi(e) {
	if (e.members) return Object.fromEntries(e.members.map((e) => [e.name, Gi(e.layout)]));
	switch (e.type.kind) {
		case "scalar":
		case "atomic": return 0;
		case "vector": return Array.from({ length: e.type.width }, () => 0);
		case "matrix": return Array.from({ length: e.type.columns * e.type.rows }, () => 0);
		case "array": {
			let t = e.element;
			return e.type.count === void 0 || !t ? [] : Array.from({ length: e.type.count }, () => Gi(t));
		}
		default: return;
	}
}
var Ki = Object.freeze([
	0,
	0,
	0,
	1
]);
function qi(e, t) {
	let n = e, r = Array.isArray(e) ? e : [
		n?.r,
		n?.g,
		n?.b,
		n?.a
	];
	if (r.length !== 4 || !r.every((e) => typeof e == "number" && Number.isFinite(e))) throw Ht(t);
	return Ji(e);
}
function Ji(e) {
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
function Yi(e) {
	return e.colors ?? [{ format: e.format ?? "rgba8unorm" }];
}
function Xi(e) {
	return e.depth === !0 ? "depth24plus" : e.depth || void 0;
}
function Zi(e) {
	let t = e.msaa;
	if (t === !0 || t === 4) return 4;
	if (t === void 0 || t === !1) return 1;
	let n = Nt();
	throw n.code = "VGPU-TARGET-MSAA-INVALID", n.message = `msaa received ${t}; WebGPU 1|4; use true`, n;
}
function Qi(e, t) {
	if (!Array.isArray(e?.size) || e.size.length !== 2 || !Array.from(e.size).every((e) => Number.isSafeInteger(e) && e > 0)) throw Nt();
	let n = Xi(e);
	if (n === "stencil8") throw Mt(n);
	if (Zi(e) === 4) for (let n of Yi(e)) $i(n.format, t);
}
function $i(e, t) {
	if (t.isCompatibilityMode && e === "rgba16float") throw D("target", "Dawn compatibility mode does not support rgba16float+msaa.", "Use rgba8unorm for MSAA here, or disable msaa.");
}
function ea(e, t, n, r) {
	let i = {
		view: (t ?? e).createView(),
		resolveTarget: t ? e.createView() : void 0,
		loadOp: r ? "load" : "clear",
		storeOp: t ? "discard" : "store"
	};
	return r || (i.clearValue = ra(n)), i;
}
function ta(e, t, n, r, i) {
	if (i) {
		let t = {
			view: e.createView(),
			depthReadOnly: !0
		};
		return na(e.format) && (t.stencilReadOnly = !0), t;
	}
	let a = {
		view: e.createView(),
		depthLoadOp: t ? "load" : "clear",
		depthStoreOp: e.sampleCount > 1 ? "discard" : "store"
	};
	return t || (a.depthClearValue = n ?? 1), e.format && na(e.format) && (a.stencilLoadOp = t ? "load" : "clear", a.stencilStoreOp = e.sampleCount > 1 ? "discard" : "store", t || (a.stencilClearValue = r ?? 0)), a;
}
function na(e) {
	return !!e && e.includes("stencil");
}
function ra(e) {
	return Array.isArray(e) ? {
		r: e[0],
		g: e[1],
		b: e[2],
		a: e[3]
	} : e;
}
function ia(e, t) {
	return e[0] === t[0] && e[1] === t[1];
}
function aa(e) {
	return typeof e == "object" && !!e && typeof e.renderPassDescriptor == "function";
}
//#endregion
//#region node_modules/vgpu/dist/pipeline-store.js
var oa = 1, sa = 1, ca = /* @__PURE__ */ new WeakMap(), la = /* @__PURE__ */ new WeakMap();
function ua(e) {
	let t = _n(e);
	return t ? {
		colors: [...t.colors],
		depth: t.depth,
		sampleCount: t.sampleCount ?? 1
	} : aa(e) ? {
		colors: e.colors.map((e) => e.format),
		depth: e.depth?.format,
		sampleCount: e.sampleCount
	} : typeof e != "object" || !e ? { colors: [] } : {
		colors: Array.isArray(e.colors) ? [...e.colors] : e.colors ?? [],
		depth: e.depth,
		sampleCount: e.sampleCount ?? 1
	};
}
function da(e) {
	return `${e.colors.join(",")}:${e.depth ?? "none"}:${e.sampleCount ?? 1}`;
}
function fa(e, t) {
	if (!Array.isArray(e.colors) || e.colors.length === 0) throw jt(t, "colors must be a non-empty array.");
	let n = e.colors.find((e) => typeof e != "string" || e.length === 0);
	if (n !== void 0) throw jt(t, `colors must contain only GPUTextureFormat strings; received ${String(n)}.`);
	if (e.depth !== void 0 && (typeof e.depth != "string" || e.depth.length === 0)) throw jt(t, "depth must be a GPUTextureFormat string.");
	let r = e.sampleCount ?? 1;
	if (r !== 1 && r !== 4) throw jt(t, `sampleCount must be 1 or 4; received ${String(r)}.`);
}
function pa(e) {
	let t = `${Ea(ca, e.vertexModule, () => oa++)}|${Ea(ca, e.fragmentModule, () => oa++)}|${Ea(la, e.pipelineLayout, () => sa++)}|${Da(e.vertexBufferLayouts ?? [])}|${da(e.signature)}`;
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
function ma(e, t, n, r, i) {
	if (r === void 0) {
		let e = {
			vertex: "vs_main",
			fragment: "fs_main",
			compute: "cs_main"
		}[n], r;
		for (let i of t) if (i.stage === n && (r ??= i, i.name === e)) return i;
		return r;
	}
	if (typeof r != "string") throw ft(e, `${n} received ${ba(r)}; expected an entry point name string.`, i);
	let a = t.find((e) => e.name === r);
	if (!a) throw ft(e, `"${r}" matches no entry point in the shader; available entry points: ${ha(t)}.`, i);
	if (a.stage !== n) throw ft(e, `"${r}" is a @${a.stage} entry point, not @${n}; available entry points: ${ha(t)}.`, i);
	return a;
}
function ha(e) {
	return e.length ? e.map((e) => `"${e.name}" (@${e.stage})`).join(", ") : "none";
}
function ga(e, t, n, r) {
	if (t !== void 0 && (typeof t != "object" || !t || Array.isArray(t))) throw dt(e, `received ${ba(t)}; expected { overrideNameOrId: number | boolean }.`, r);
	let i = new Map(n.map((e) => [_a(e), e])), a = {};
	for (let [o, s] of Object.entries(t ?? {})) {
		if (!i.has(o)) throw dt(e, `"${o}" matches no override in the shader; available overrides: ${va(n)}.`, r);
		if (typeof s == "boolean") {
			a[o] = +!!s;
			continue;
		}
		if (typeof s != "number" || !Number.isFinite(s)) throw dt(e, `"${o}" received ${ba(s)}; use a finite number or a boolean (WebGPU converts the value to the override's WGSL type, and NaN/Infinity fail that conversion).`, r);
		a[o] = s;
	}
	for (let t of n) {
		let n = _a(t);
		if (t.defaultValue === void 0 && !(n in a)) throw dt(e, `override '${t.name}' has no default value and must be provided; add constants: { "${n}": value }.`, r);
	}
	return Object.keys(a).length === 0 ? {} : {
		constants: a,
		constantsKey: ya(a)
	};
}
function _a(e) {
	return e.id === void 0 ? e.name : String(e.id);
}
function va(e) {
	return e.length ? e.map((e) => e.id === void 0 ? `"${e.name}"` : `"${e.id}" (@id of ${e.name})`).join(", ") : "none";
}
function ya(e) {
	return `cn~${Object.entries(e).sort(([e], [t]) => e < t ? -1 : +(e > t)).map(([e, t]) => `${e}=${t}`).join("~")}`;
}
function ba(e) {
	if (typeof e == "string") return `"${e}"`;
	try {
		return JSON.stringify(e) ?? String(e);
	} catch {
		return String(e);
	}
}
function xa(e, t) {
	let n = /* @__PURE__ */ new Map();
	return {
		get(r, i) {
			let a = n.get(r);
			return a || (a = fi(e, () => e.gpu.createShaderModule({
				label: i,
				code: r
			})), n.set(r, a), t?.(a, i)), a;
		},
		dispose() {
			n.clear();
		}
	};
}
function Sa(e, t) {
	let n = /* @__PURE__ */ new Map();
	return {
		get(r) {
			let i = Oa(r), a = n.get(i);
			return a || (a = fi(e, () => e.gpu.createPipelineLayout({ bindGroupLayouts: ka(r) }), [...r.values()]), n.set(i, a), t?.(a, "pipeline.layout")), a;
		},
		dispose() {
			n.clear();
		}
	};
}
function Ca(e, t = {}) {
	return new wa(e, t);
}
var wa = class {
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
			let { value: e, error: r } = ui(this.device, t);
			i.pipeline = e;
			let o = Promise.all([pi(n.dependencies ?? []), r]).then(async (t) => {
				if (this.#i || i.generation !== a) return;
				let r = t.find(Boolean);
				if (r) {
					let e = kt(n.where, r, n.signature);
					i.failure = e, i.pipeline = void 0, i.pending?.reject(e), i.pending = void 0, await this.#n(e);
				} else i.validated = !0, i.pending?.resolve(e), i.pending = void 0;
			});
			return i.validation = o, this.#o(o), e;
		} catch (e) {
			let t = kt(n.where, e, n.signature);
			throw i.failure = t, i.pending?.reject(t), i.pending = void 0, t;
		}
	}
	getAsync(e, t, n) {
		this.#a(n.where);
		let r = this.#e.get(e);
		if (r?.pipeline) return r.validated ? Promise.resolve(r.pipeline) : (r.pending ??= Ta(), r.pending.promise);
		if (r?.pending) return r.pending.promise;
		r = {
			generation: 0,
			pending: Ta()
		}, this.#e.set(e, r);
		let i = r, a = i.pending, o = ++i.generation, s, c;
		try {
			let e = ui(this.device, t);
			s = e.value, c = e.error;
		} catch (e) {
			s = Promise.reject(e), c = Promise.resolve(null);
		}
		let l = Promise.all([
			s.then((e) => ({ value: e }), (e) => ({ cause: e })),
			pi(n.dependencies ?? []),
			c
		]).then(([e, t, r]) => {
			if (this.#i || i.generation !== o) return;
			let s = t ?? r ?? ("cause" in e ? e.cause : void 0);
			s || "cause" in e ? (i.failure = kt(n.where, s, n.signature), a.reject(i.failure)) : (i.pipeline = e.value, i.validated = !0, a.resolve(i.pipeline)), i.pending = void 0;
		});
		return this.#o(l), a.promise;
	}
	dispose() {
		if (!this.#i) {
			this.#i = !0;
			for (let e of this.#e.values()) e.pending?.reject(At("gpu.dispose"));
			this.#e.clear(), this.#t.clear(), this.#r?.();
		}
	}
	#a(e) {
		if (this.#i) throw At(e);
	}
	#o(e) {
		this.#t.add(e), e.then(() => this.#t.delete(e), () => this.#t.delete(e));
	}
};
function Ta() {
	let e, t, n = new Promise((n, r) => {
		e = n, t = r;
	});
	return n.catch(() => void 0), {
		promise: n,
		resolve: e,
		reject: t
	};
}
function Ea(e, t, n) {
	let r = e.get(t);
	return r || (r = n(), e.set(t, r)), r;
}
function Da(e) {
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
function Oa(e) {
	return JSON.stringify([...e.entries()].map(([e, t]) => ({
		group: e,
		entries: ja(t)
	})));
}
function ka(e) {
	let t = Math.max(-1, ...e.keys()), n = [];
	for (let r = 0; r <= t; r++) n.push(Aa(e, r));
	return n;
}
function Aa(e, t) {
	let n = e.get(t);
	if (!n) throw Ot(t);
	return n;
}
function ja(e) {
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
var Ma = nn("frame-state");
function Na(e) {
	return e.service(Ma, Pa);
}
function Pa() {
	let e = /* @__PURE__ */ new Set(), t = Fa(), n = !1, r = !1, i = {
		time: 0,
		deltaTime: 0,
		frameCount: 0,
		advanceBy(e) {
			i.deltaTime = e, i.time += e, r = !0;
		},
		tick() {
			if (n) throw Wt();
			n = !0;
			try {
				let n = Fa();
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
function Fa() {
	return globalThis.performance?.now?.() ?? Date.now();
}
//#endregion
//#region node_modules/vgpu/dist/surface.js
function Ia(e, t, n = {}) {
	let r = xn(e, "surface"), i = Ra(r), a = i.get(t);
	if (a && !a.disposed) throw Rt(a.label);
	let o = new Ka(r.device, t, n, (e) => {
		i.get(e.canvas) === e && i.delete(e.canvas), s(), c();
	}), s = Na(r).onAdvance(() => o.applyAutoResize()), c = r.own("resource", () => o.dispose());
	return i.set(t, o), o;
}
var La = nn("surfaces");
function Ra(e) {
	return e.service(La, () => /* @__PURE__ */ new Map());
}
var za = 0, Ba = 0;
function Va() {
	return za > 0;
}
function Ha() {
	return Ba > 0;
}
function Ua() {
	Ba += 1;
}
function Wa() {
	--Ba;
}
function Ga(e) {
	return e instanceof Ka;
}
var Ka = class {
	device;
	canvas;
	options;
	unregister;
	[mn] = !0;
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
		this.device = e, this.canvas = t, this.options = n, this.unregister = r, this.label = n.label, this.#s = n.clearColor === void 0 ? Ki : qi(n.clearColor, "surface.clearColor");
		let i = t.getContext("webgpu");
		if (!i) throw Lt();
		if (this.context = i, this.layoutBacked = Za(t), n.autoResize === !0 && !this.layoutBacked) throw Bt();
		this.autoResize = n.autoResize ?? (!n.size && this.layoutBacked), this.#o = no(n.dpr), this.format = n.format ?? ro(), this.#t = Ja(n.depth), this.#n = Ya(n.msaa), this.#e = Object.freeze({
			colors: Object.freeze([this.format]),
			depth: this.#t,
			sampleCount: this.#n
		});
		let a = F(t), o = Qa(t, n, this.layoutBacked, this.#o);
		(n.size || this.layoutBacked) && eo(t, o);
		try {
			i.configure({
				device: e.gpu,
				format: this.format,
				alphaMode: n.alphaMode ?? "premultiplied",
				colorSpace: n.colorSpace ?? "srgb",
				usage: io()
			}), this.#c = this.#_(o), this.#l = Object.freeze([...o]);
		} catch (e) {
			try {
				i.unconfigure?.();
			} catch {}
			if (n.size || this.layoutBacked) try {
				eo(t, a);
			} catch {}
			throw e;
		}
	}
	get gpu() {
		return this.context;
	}
	get size() {
		return this.#g(), F(this.canvas);
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
		return Ji(this.#s);
	}
	set clearColor(e) {
		this.#s = qi(e, "surface.clearColor");
	}
	get disposed() {
		return this.#u;
	}
	[gn]() {
		return this.#g(), this.#e;
	}
	resize(e) {
		if (this.#g(), this.#d) throw Vt(this.options.label);
		this.#f(to(e), this.#o, !0);
	}
	applyAutoResize() {
		if (this.#u) return;
		if (this.autoResize && this.layoutBacked) {
			let e = no(this.options.dpr), t = $a(this.canvas, e);
			this.#f(t, e, !0);
			return;
		}
		let e = to(F(this.canvas));
		ia(this.#l, e) || this.#f(e, this.#o, !1);
	}
	onResize(e) {
		this.#g(), this.#i.add(e);
		let t = this.#d;
		this.#d = !0, za += 1;
		try {
			e(this.#h());
		} finally {
			--za, this.#d = t;
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
		let o = to(F(this.canvas));
		return ia(this.#l, o) || this.#f(o, this.#o, !1), {
			colorAttachments: [ea(this.context.getCurrentTexture(), this.#c.msaaColor, t, n)],
			depthStencilAttachment: this.#c.depth ? ta(this.#c.depth, n, r, i, a) : void 0
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
			Xa(this.#c.all);
		} catch (t) {
			e.push(t);
		}
		if (e.length) throw e[0];
	}
	#f(e, t, n) {
		let r = !ia(this.#l, e), i = !ia(F(this.canvas), e);
		if (!r && !i) {
			this.#o = t;
			return;
		}
		let a = Object.freeze([...e]), o = r ? this.#_(a) : this.#c, s = this.#c, c = n && (i || r && s.all.length > 0), l = this.#d;
		this.#d = !0, za += 1;
		try {
			i && eo(this.canvas, a), this.#o = t, this.#l = a, this.#c = o;
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
				Xa(s.all);
			} catch (t) {
				e.push(t);
			}
			if (e.length) throw e[0];
		} finally {
			--za, this.#d = l;
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
		let e = F(this.canvas);
		return {
			width: e[0],
			height: e[1],
			dpr: this.#o,
			surface: this
		};
	}
	#g() {
		if (this.#u) throw zt(this.options.label);
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
				Xa(t);
			} catch {}
			throw e;
		}
	}
}, qa = /* @__PURE__ */ new Set([
	"depth16unorm",
	"depth24plus",
	"depth24plus-stencil8",
	"depth32float",
	"depth32float-stencil8"
]);
function Ja(e) {
	if (e !== void 0 && e !== !1) {
		if (e === !0) return "depth24plus";
		if (qa.has(e)) return e;
		throw Ft(e);
	}
}
function Ya(e) {
	if (e === void 0 || e === !1) return 1;
	if (e === !0 || e === 4) return 4;
	throw It(e);
}
function Xa(e) {
	let t = [];
	for (let n of e) try {
		n.destroy();
	} catch (e) {
		t.push(e);
	}
	if (t.length) throw t[0];
}
function Za(e) {
	return typeof e.clientWidth == "number";
}
function Qa(e, t, n, r) {
	return t.size ? to(t.size) : n ? $a(e, r) : to(F(e));
}
function $a(e, t) {
	let n = e;
	return to([Math.round(n.clientWidth * t), Math.round(n.clientHeight * t)]);
}
function F(e) {
	let t = e;
	return [t.width, t.height];
}
function eo(e, t) {
	let n = e;
	n.width = t[0], n.height = t[1];
}
function to(e) {
	return [Math.max(1, Math.floor(e[0])), Math.max(1, Math.floor(e[1]))];
}
function no(e) {
	let t = globalThis.devicePixelRatio ?? 1;
	return Array.isArray(e) ? Math.min(e[1], Math.max(e[0], t)) : typeof e == "number" ? e : t;
}
function ro() {
	return globalThis.navigator?.gpu?.getPreferredCanvasFormat?.() ?? "bgra8unorm";
}
function io() {
	let e = globalThis.GPUTextureUsage;
	return e ? e.RENDER_ATTACHMENT | e.TEXTURE_BINDING | e.COPY_SRC : void 0;
}
//#endregion
//#region node_modules/vgpu/dist/indirect.js
var ao = {
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
function oo(e, t, n, r, i) {
	let a = typeof n == "object" && n ? n.buffer : void 0, o = so(n) ? n : so(a) ? a : void 0;
	if (!o) throw pt(e, `received ${co(n)}; expected a StorageBuffer or { buffer, offset? }.`, t);
	$t(o.buffer, t, i);
	let s = o === n ? 0 : n.offset ?? 0;
	if (typeof s != "number" || !Number.isInteger(s) || s < 0) throw pt(e, `offset must be an integer >= 0; received ${co(s)}.`, t);
	if (s % 4 != 0) throw pt(e, `offset must be a multiple of 4 (WebGPU requires "indirectOffset is a multiple of 4"); received ${s}.`, t);
	if (!o.buffer.options.usage.includes("indirect")) throw pt(e, `the buffer lacks the "indirect" usage (WebGPU requires "indirectBuffer.usage contains INDIRECT"); create it with storage(gpu, ${o.size}, { indirect: true }).`, t);
	let { bytes: c, args: l } = ao[r];
	if (s + c > o.size) throw pt(e, `${r} reads ${c} bytes (${l}) at offset ${s}, but offset + ${c} = ${s + c} exceeds the buffer size ${o.size}.`, t);
	return {
		buffer: o.gpu,
		offset: s
	};
}
function so(e) {
	return typeof e == "object" && !!e && "gpu" in e && "size" in e && e.buffer instanceof g;
}
function co(e) {
	if (typeof e == "string") return `"${e}"`;
	try {
		return JSON.stringify(e) ?? String(e);
	} catch {
		return String(e);
	}
}
//#endregion
//#region node_modules/vgpu/dist/frame-protocols.js
var lo = Symbol("vgpu.frame.drawable");
function uo(e) {
	return e?.[lo];
}
var fo = Symbol("vgpu.frame.bundle");
function po(e) {
	return e?.[fo];
}
var mo = Symbol("vgpu.frame.passAttachment");
function ho(e) {
	return typeof e?.[mo] == "function" ? e : void 0;
}
var go = Symbol("vgpu.frame.compute");
function _o(e) {
	return e?.[go];
}
//#endregion
//#region node_modules/vgpu/dist/sampler.js
var vo = 1;
function yo(e) {
	let t = /* @__PURE__ */ new Map(), n = /* @__PURE__ */ new WeakMap();
	return {
		sampler(r = {}) {
			let i = bo(r), a = t.get(i);
			return a || (a = e.gpu.createSampler(r), t.set(i, a), n.set(a, {
				kind: "sampler",
				id: vo++
			})), a;
		},
		identity(e) {
			let t = n.get(e);
			return t || (t = {
				kind: "sampler",
				id: vo++
			}, n.set(e, t)), t;
		}
	};
}
function bo(e) {
	if (typeof e != "object" || !e) return JSON.stringify(e);
	if (Array.isArray(e)) return `[${e.map(bo).join(",")}]`;
	let t = e;
	return `{${Object.keys(t).sort().map((e) => `${JSON.stringify(e)}:${bo(t[e])}`).join(",")}}`;
}
//#endregion
//#region node_modules/vgpu/dist/render-service.js
var xo = nn("render-service");
function So(e) {
	return e.service(xo, Co);
}
function Co(e) {
	let t = e.device, n = Pn(), r = Ca(t, {
		errorSink: (t) => e.reportError(t),
		registerSettledSource: (t) => e.registerSettledSource(t)
	}), i = Ca(t, {
		errorSink: (t) => e.reportError(t),
		registerSettledSource: (t) => e.registerSettledSource(t)
	}), a = /* @__PURE__ */ new Set(), o = e.registerSettledSource(() => [...a]), s = (t, n) => {
		let r = mi(t, n, (t) => e.reportError(t));
		a.add(r), r.then(() => a.delete(r), () => a.delete(r));
	}, c = xa(t, s), l = Sa(t, s), u = yo(t);
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
var wo = /* @__PURE__ */ new WeakSet(), To = !0;
function Eo(e) {
	let t = To;
	To = !0;
	try {
		return [z(e, "shader", (e) => {
			let t = V(e, "functionExports", "functionExports"), n = ko(B(e, "reflection", "reflection"), "reflection");
			return Wo(n), {
				wgsl: H(e, "wgsl", "wgsl", !0),
				reflection: n,
				sourceChecksum: H(e, "sourceChecksum", "sourceChecksum"),
				producer: H(e, "producer", "producer"),
				...t.present ? { functionExports: R(t.value, "functionExports", Bo) } : {}
			};
		}), To];
	} finally {
		To = t;
	}
}
function Do(e) {
	try {
		return Object.isFrozen(e);
	} catch {
		return !1;
	}
}
function Oo(e) {
	Do(e) || (To = !1);
}
function ko(e, t) {
	return z(e, t, (e) => ({
		bindings: R(B(e, "bindings", `${t}.bindings`), `${t}.bindings`, Ao),
		entryPoints: R(B(e, "entryPoints", `${t}.entryPoints`), `${t}.entryPoints`, jo),
		overrides: R(B(e, "overrides", `${t}.overrides`), `${t}.overrides`, Io),
		featuresRequired: R(B(e, "featuresRequired", `${t}.featuresRequired`), `${t}.featuresRequired`, rs),
		aliases: R(B(e, "aliases", `${t}.aliases`), `${t}.aliases`, Lo),
		structs: R(B(e, "structs", `${t}.structs`), `${t}.structs`, Ro),
		hostShareableLayouts: R(B(e, "hostShareableLayouts", `${t}.hostShareableLayouts`), `${t}.hostShareableLayouts`, Vo)
	}));
}
function Ao(e, t) {
	return z(e, t, (e) => {
		let n = V(e, "addressSpace", `${t}.addressSpace`), r = V(e, "access", `${t}.access`), i = V(e, "struct", `${t}.struct`), a = V(e, "layout", `${t}.layout`), o = V(e, "bindingLayout", `${t}.bindingLayout`);
		return {
			group: W(B(e, "group", `${t}.group`), `${t}.group`),
			binding: W(B(e, "binding", `${t}.binding`), `${t}.binding`),
			name: H(e, "name", `${t}.name`),
			mangledName: H(e, "mangledName", `${t}.mangledName`),
			type: I(B(e, "type", `${t}.type`), `${t}.type`),
			kind: G(B(e, "kind", `${t}.kind`), `${t}.kind`, [
				"buffer",
				"texture",
				"sampler",
				"externalTexture",
				"unknown"
			]),
			...n.present ? { addressSpace: G(n.value, `${t}.addressSpace`, [
				"function",
				"private",
				"workgroup",
				"uniform",
				"storage",
				"handle"
			]) } : {},
			...r.present ? { access: G(r.value, `${t}.access`, [
				"read",
				"write",
				"read_write"
			]) } : {},
			...i.present ? { struct: Ro(i.value, `${t}.struct`) } : {},
			...a.present ? { layout: Vo(a.value, `${t}.layout`) } : {},
			...o.present ? { bindingLayout: Uo(o.value, `${t}.bindingLayout`) } : {}
		};
	});
}
function jo(e, t) {
	return z(e, t, (e) => {
		let n = G(B(e, "stage", `${t}.stage`), `${t}.stage`, [
			"vertex",
			"fragment",
			"compute"
		]), r = V(e, "workgroupSize", `${t}.workgroupSize`), i = V(e, "inputs", `${t}.inputs`);
		n === "vertex" && !i.present && K(`${t}.inputs`, "vertex entries require input metadata"), n !== "compute" && r.present && K(`${t}.workgroupSize`, "only compute entries may declare a workgroup size");
		let a = r.present ? Mo(r.value, `${t}.workgroupSize`) : void 0;
		return n === "compute" && a === void 0 && K(`${t}.workgroupSize`, "compute entries require workgroup metadata"), {
			name: H(e, "name", `${t}.name`),
			mangledName: H(e, "mangledName", `${t}.mangledName`),
			stage: n,
			...a ? { workgroupSize: a } : {},
			bindings: R(B(e, "bindings", `${t}.bindings`), `${t}.bindings`, Po),
			samplingPairs: R(B(e, "samplingPairs", `${t}.samplingPairs`), `${t}.samplingPairs`, Fo),
			...i.present ? { inputs: R(i.value, `${t}.inputs`, No) } : {}
		};
	});
}
function Mo(e, t) {
	let n = R(e, t, (e, t) => e === "unresolved" ? NaN : is(e, t));
	return n.length !== 3 && K(t, "expected exactly three workgroup axes"), n;
}
function No(e, t) {
	return z(e, t, (e) => ({
		name: H(e, "name", `${t}.name`),
		location: W(B(e, "location", `${t}.location`), `${t}.location`),
		type: I(B(e, "type", `${t}.type`), `${t}.type`)
	}));
}
function Po(e, t) {
	return z(e, t, (e) => ({
		group: W(B(e, "group", `${t}.group`), `${t}.group`),
		binding: W(B(e, "binding", `${t}.binding`), `${t}.binding`)
	}));
}
function Fo(e, t) {
	return z(e, t, (e) => ({
		texture: Po(B(e, "texture", `${t}.texture`), `${t}.texture`),
		sampler: Po(B(e, "sampler", `${t}.sampler`), `${t}.sampler`),
		mode: G(B(e, "mode", `${t}.mode`), `${t}.mode`, ["filtering", "comparison"])
	}));
}
function Io(e, t) {
	return z(e, t, (e) => {
		let n = V(e, "id", `${t}.id`), r = V(e, "defaultValue", `${t}.defaultValue`);
		return {
			name: H(e, "name", `${t}.name`),
			mangledName: H(e, "mangledName", `${t}.mangledName`),
			...n.present ? { id: W(n.value, `${t}.id`) } : {},
			...r.present ? { defaultValue: U(r.value, `${t}.defaultValue`) } : {}
		};
	});
}
function Lo(e, t) {
	return z(e, t, (e) => ({
		name: H(e, "name", `${t}.name`),
		mangledName: H(e, "mangledName", `${t}.mangledName`),
		target: I(B(e, "target", `${t}.target`), `${t}.target`)
	}));
}
function Ro(e, t) {
	return z(e, t, (e) => ({
		name: H(e, "name", `${t}.name`),
		mangledName: H(e, "mangledName", `${t}.mangledName`),
		members: R(B(e, "members", `${t}.members`), `${t}.members`, zo)
	}));
}
function zo(e, t) {
	return z(e, t, (e) => {
		let n = V(e, "align", `${t}.align`), r = V(e, "size", `${t}.size`);
		return {
			name: H(e, "name", `${t}.name`),
			type: I(B(e, "type", `${t}.type`), `${t}.type`),
			...n.present ? { align: os(n.value, `${t}.align`) } : {},
			...r.present ? { size: W(r.value, `${t}.size`) } : {}
		};
	});
}
function Bo(e, t) {
	return z(e, t, (e) => ({
		name: H(e, "name", `${t}.name`),
		resolvedName: H(e, "resolvedName", `${t}.resolvedName`),
		parameterNames: R(B(e, "parameterNames", `${t}.parameterNames`), `${t}.parameterNames`, rs)
	}));
}
function I(e, t) {
	return z(e, t, (e) => {
		let n = U(B(e, "kind", `${t}.kind`), `${t}.kind`);
		switch (n) {
			case "scalar": return {
				kind: n,
				name: G(B(e, "name", `${t}.name`), `${t}.name`, [
					"f32",
					"f16",
					"i32",
					"u32",
					"bool"
				])
			};
			case "atomic": return {
				kind: n,
				element: I(B(e, "element", `${t}.element`), `${t}.element`)
			};
			case "vector": return {
				kind: n,
				width: G(B(e, "width", `${t}.width`), `${t}.width`, [
					2,
					3,
					4
				]),
				element: I(B(e, "element", `${t}.element`), `${t}.element`)
			};
			case "matrix": return {
				kind: n,
				columns: G(B(e, "columns", `${t}.columns`), `${t}.columns`, [
					2,
					3,
					4
				]),
				rows: G(B(e, "rows", `${t}.rows`), `${t}.rows`, [
					2,
					3,
					4
				]),
				element: I(B(e, "element", `${t}.element`), `${t}.element`)
			};
			case "array": {
				let r = V(e, "count", `${t}.count`), i = V(e, "countExpression", `${t}.countExpression`);
				return {
					kind: n,
					element: I(B(e, "element", `${t}.element`), `${t}.element`),
					...r.present ? { count: as(r.value, `${t}.count`) } : {},
					...i.present ? { countExpression: U(i.value, `${t}.countExpression`) } : {}
				};
			}
			case "ptr": {
				let r = V(e, "access", `${t}.access`);
				return {
					kind: n,
					addressSpace: U(B(e, "addressSpace", `${t}.addressSpace`), `${t}.addressSpace`),
					element: I(B(e, "element", `${t}.element`), `${t}.element`),
					...r.present ? { access: U(r.value, `${t}.access`) } : {}
				};
			}
			case "sampler": return {
				kind: n,
				comparison: ss(B(e, "comparison", `${t}.comparison`), `${t}.comparison`)
			};
			case "texture": {
				let r = V(e, "dimension", `${t}.dimension`), i = V(e, "sampleType", `${t}.sampleType`), a = V(e, "texelFormat", `${t}.texelFormat`), o = V(e, "access", `${t}.access`);
				return {
					kind: n,
					textureKind: U(B(e, "textureKind", `${t}.textureKind`), `${t}.textureKind`),
					...r.present ? { dimension: G(r.value, `${t}.dimension`, [
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
					...i.present ? { sampleType: I(i.value, `${t}.sampleType`) } : {},
					...a.present ? { texelFormat: U(a.value, `${t}.texelFormat`) } : {},
					...o.present ? { access: G(o.value, `${t}.access`, [
						"read",
						"write",
						"read_write"
					]) } : {}
				};
			}
			case "identifier": {
				let r = V(e, "mangledName", `${t}.mangledName`);
				return {
					kind: n,
					name: H(e, "name", `${t}.name`),
					...r.present ? { mangledName: U(r.value, `${t}.mangledName`) } : {}
				};
			}
			default: return K(`${t}.kind`, `unknown WGSL type '${n}'`);
		}
	});
}
function Vo(e, t) {
	return z(e, t, (e) => {
		let n = V(e, "size", `${t}.size`), r = V(e, "stride", `${t}.stride`), i = V(e, "members", `${t}.members`), a = V(e, "element", `${t}.element`), o = V(e, "runtimeSized", `${t}.runtimeSized`), s = {
			name: H(e, "name", `${t}.name`),
			mangledName: H(e, "mangledName", `${t}.mangledName`),
			layoutMode: G(B(e, "layoutMode", `${t}.layoutMode`), `${t}.layoutMode`, ["wgsl-host-shareable-v1"]),
			type: I(B(e, "type", `${t}.type`), `${t}.type`),
			align: os(B(e, "align", `${t}.align`), `${t}.align`),
			...n.present ? { size: W(n.value, `${t}.size`) } : {},
			...r.present ? { stride: as(r.value, `${t}.stride`) } : {},
			...i.present ? { members: R(i.value, `${t}.members`, Ho) } : {},
			...a.present ? { element: Vo(a.value, `${t}.element`) } : {},
			...o.present ? { runtimeSized: ss(o.value, `${t}.runtimeSized`) } : {}
		};
		return Go(s, t), s;
	});
}
function Ho(e, t) {
	return z(e, t, (e) => {
		let n = V(e, "size", `${t}.size`), r = V(e, "explicitAlign", `${t}.explicitAlign`), i = V(e, "explicitSize", `${t}.explicitSize`);
		return {
			name: H(e, "name", `${t}.name`),
			offset: W(B(e, "offset", `${t}.offset`), `${t}.offset`),
			align: os(B(e, "align", `${t}.align`), `${t}.align`),
			...n.present ? { size: W(n.value, `${t}.size`) } : {},
			type: I(B(e, "type", `${t}.type`), `${t}.type`),
			layout: Vo(B(e, "layout", `${t}.layout`), `${t}.layout`),
			...r.present ? { explicitAlign: os(r.value, `${t}.explicitAlign`) } : {},
			...i.present ? { explicitSize: W(i.value, `${t}.explicitSize`) } : {}
		};
	});
}
function Uo(e, t) {
	return z(e, t, (e) => {
		let n = U(B(e, "kind", `${t}.kind`), `${t}.kind`);
		switch (n) {
			case "buffer": return {
				kind: n,
				buffer: z(B(e, "buffer", `${t}.buffer`), `${t}.buffer`, (e) => {
					let n = V(e, "minBindingSize", `${t}.buffer.minBindingSize`);
					return B(e, "hasDynamicOffset", `${t}.buffer.hasDynamicOffset`) !== !1 && K(`${t}.buffer.hasDynamicOffset`, "prepared layouts require false"), {
						type: G(B(e, "type", `${t}.buffer.type`), `${t}.buffer.type`, [
							"uniform",
							"storage",
							"read-only-storage"
						]),
						hasDynamicOffset: !1,
						...n.present ? { minBindingSize: W(n.value, `${t}.buffer.minBindingSize`) } : {}
					};
				})
			};
			case "sampler": return {
				kind: n,
				sampler: z(B(e, "sampler", `${t}.sampler`), `${t}.sampler`, (e) => ({ type: G(B(e, "type", `${t}.sampler.type`), `${t}.sampler.type`, [
					"filtering",
					"non-filtering",
					"comparison"
				]) }))
			};
			case "texture": return {
				kind: n,
				texture: z(B(e, "texture", `${t}.texture`), `${t}.texture`, (e) => ({
					sampleType: G(B(e, "sampleType", `${t}.texture.sampleType`), `${t}.texture.sampleType`, [
						"float",
						"unfilterable-float",
						"depth",
						"sint",
						"uint"
					]),
					viewDimension: G(B(e, "viewDimension", `${t}.texture.viewDimension`), `${t}.texture.viewDimension`, [
						"1d",
						"2d",
						"2d-array",
						"cube",
						"cube-array",
						"3d"
					]),
					multisampled: ss(B(e, "multisampled", `${t}.texture.multisampled`), `${t}.texture.multisampled`)
				}))
			};
			case "storageTexture": return {
				kind: n,
				storageTexture: z(B(e, "storageTexture", `${t}.storageTexture`), `${t}.storageTexture`, (e) => ({
					access: G(B(e, "access", `${t}.storageTexture.access`), `${t}.storageTexture.access`, [
						"write-only",
						"read-only",
						"read-write"
					]),
					format: H(e, "format", `${t}.storageTexture.format`),
					viewDimension: G(B(e, "viewDimension", `${t}.storageTexture.viewDimension`), `${t}.storageTexture.viewDimension`, [
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
				externalTexture: z(B(e, "externalTexture", `${t}.externalTexture`), `${t}.externalTexture`, () => ({}))
			};
			default: return K(`${t}.kind`, `unknown binding layout '${n}'`);
		}
	});
}
function Wo(e) {
	let t = /* @__PURE__ */ new Map();
	for (let [n, r] of e.bindings.entries()) {
		let e = es(r);
		if (t.has(e) && K(`reflection.bindings[${n}]`, `duplicate binding coordinate ${e}`), t.set(e, r), r.kind === "buffer") {
			let e = `reflection.bindings[${n}]`, t = r.bindingLayout;
			t?.kind !== "buffer" && K(`${e}.bindingLayout`, "does not match binding kind 'buffer'"), r.addressSpace !== "uniform" && r.addressSpace !== "storage" && K(`${e}.addressSpace`, "buffer bindings require a uniform or storage address space"), r.layout || K(`${e}.layout`, "buffer bindings require host-shareable packing metadata");
			let i = r.addressSpace === "uniform" ? "uniform" : r.access === "read" ? "read-only-storage" : "storage";
			t.buffer.type !== i && K(`${e}.bindingLayout.buffer.type`, `does not match ${r.addressSpace}${r.access ? `/${r.access}` : ""} buffer metadata`);
		} else {
			let e = r.kind === "sampler" ? "sampler" : r.kind === "externalTexture" ? "externalTexture" : void 0;
			e && r.bindingLayout?.kind !== e && K(`reflection.bindings[${n}].bindingLayout`, `does not match binding kind '${r.kind}'`), r.kind === "texture" && r.bindingLayout && r.bindingLayout.kind !== "texture" && r.bindingLayout.kind !== "storageTexture" && K(`reflection.bindings[${n}].bindingLayout`, "does not describe a texture binding");
		}
	}
	Qo(e.structs, "reflection.structs"), Qo(e.aliases, "reflection.aliases"), Qo(e.overrides, "reflection.overrides"), $o(e.featuresRequired, "reflection.featuresRequired");
	let n = /* @__PURE__ */ new Set();
	for (let [r, i] of e.entryPoints.entries()) {
		n.has(i.name) && K(`reflection.entryPoints[${r}].name`, `duplicate entry identity '${i.name}'`), n.add(i.name);
		let e = /* @__PURE__ */ new Set();
		for (let [n, a] of (i.bindings ?? []).entries()) {
			let i = es(a);
			t.has(i) || K(`reflection.entryPoints[${r}].bindings[${n}]`, `dangling binding reference ${i}`), e.has(i) && K(`reflection.entryPoints[${r}].bindings[${n}]`, `duplicate binding reference ${i}`), e.add(i);
		}
		let a = /* @__PURE__ */ new Set();
		for (let [e, t] of (i.inputs ?? []).entries()) a.has(t.location) && K(`reflection.entryPoints[${r}].inputs[${e}].location`, `duplicate vertex input location ${t.location}`), a.add(t.location);
		let o = /* @__PURE__ */ new Set();
		for (let [n, a] of (i.samplingPairs ?? []).entries()) {
			let i = es(a.texture), s = es(a.sampler), c = t.get(i), l = t.get(s);
			(!e.has(i) || !c) && K(`reflection.entryPoints[${r}].samplingPairs[${n}].texture`, `dangling or inactive texture reference ${i}`), (!e.has(s) || !l) && K(`reflection.entryPoints[${r}].samplingPairs[${n}].sampler`, `dangling or inactive sampler reference ${s}`), c.bindingLayout?.kind !== "texture" && c.bindingLayout?.kind !== "externalTexture" && K(`reflection.entryPoints[${r}].samplingPairs[${n}].texture`, "reference is not a sampled texture"), l.bindingLayout?.kind !== "sampler" && K(`reflection.entryPoints[${r}].samplingPairs[${n}].sampler`, "reference is not a sampler"), a.mode === "comparison" != (l.bindingLayout.sampler.type === "comparison") && K(`reflection.entryPoints[${r}].samplingPairs[${n}].mode`, "does not match the referenced sampler type");
			let u = `${i}|${s}|${a.mode}`;
			o.has(u) && K(`reflection.entryPoints[${r}].samplingPairs[${n}]`, "duplicate sampling relationship"), o.add(u);
		}
	}
	let r = /* @__PURE__ */ new Map();
	for (let t of e.structs) r.set(t.name, t), r.set(t.mangledName, t);
	let i = /* @__PURE__ */ new Map();
	for (let t of e.aliases) i.set(t.name, t), i.set(t.mangledName, t);
	Zo(e, (e, t) => {
		e.kind === "identifier" && !r.has(e.mangledName ?? e.name) && !i.has(e.mangledName ?? e.name) && K(t, `unknown type reference '${e.mangledName ?? e.name}'`);
	});
	for (let [t, n] of e.bindings.entries()) {
		let a = `reflection.bindings[${t}]`, o = qo(n.type, r, i, /* @__PURE__ */ new Set(), `${a}.type`);
		if (n.struct) {
			let e = r.get(n.struct.mangledName) ?? r.get(n.struct.name);
			(!e || !L(e, n.struct)) && K(`${a}.struct`, "does not match a canonical reflected struct");
			let t = o.kind === "identifier" ? r.get(o.mangledName ?? o.name) : void 0;
			(!t || !L(t, n.struct)) && K(`${a}.struct`, "does not match the alias-resolved binding type");
		}
		if (n.layout) {
			(n.layout.name !== n.name || n.layout.mangledName !== n.mangledName) && K(`${a}.layout`, "does not belong to the binding identity");
			let t = e.hostShareableLayouts.find((e) => e.name === n.layout.name && e.mangledName === n.layout.mangledName);
			(!t || !L(t, n.layout)) && K(`${a}.layout`, "does not match a canonical host-shareable layout"), L(o, n.layout.type) || K(`${a}.layout.type`, "does not match the alias-resolved binding type"), n.bindingLayout?.kind === "buffer" && n.bindingLayout.buffer.minBindingSize !== n.layout.size && K(`${a}.bindingLayout.buffer.minBindingSize`, "does not match the host-shareable layout size");
		}
	}
	e.hostShareableLayouts.forEach((e, t) => Ko(e, `reflection.hostShareableLayouts[${t}]`, r, i));
}
function Go(e, t) {
	let n = e.element !== void 0 || e.stride !== void 0 || e.members !== void 0;
	switch (e.stride !== void 0 && (e.element || K(`${t}.element`, "stride requires element metadata"), e.stride % e.element.align !== 0 && K(`${t}.stride`, "must be aligned to the element alignment"), e.element.size !== void 0 && e.stride < e.element.size && K(`${t}.stride`, "must not be smaller than the element size")), e.runtimeSized && (e.type.kind !== "array" || e.type.count !== void 0 || e.size !== void 0 || !e.element || e.stride === void 0) && K(`${t}.runtimeSized`, "is inconsistent with runtime-sized array metadata"), (e.type.kind === "array" || e.type.kind === "matrix") && ((!e.element || e.stride === void 0) && K(t, `${e.type.kind} layout requires element and stride metadata`), e.type.kind === "array" && e.type.count !== void 0 && e.size !== e.stride * e.type.count && K(`${t}.size`, "does not match array count and stride")), e.type.kind) {
		case "scalar": {
			e.type.name === "bool" && K(`${t}.type`, "bool is not host-shareable");
			let r = e.type.name === "f16" ? 2 : 4;
			Jo(e, t, r, r, n);
			break;
		}
		case "atomic":
			(e.type.element.kind !== "scalar" || e.type.element.name !== "i32" && e.type.element.name !== "u32") && K(`${t}.type.element`, "atomic layout requires i32 or u32 scalar storage"), Jo(e, t, 4, 4, n);
			break;
		case "vector": {
			let r = e.type.element;
			(r.kind !== "scalar" || r.name === "bool") && K(`${t}.type.element`, "vector layout requires a numeric scalar");
			let i = r.name === "f16" ? 2 : 4;
			Jo(e, t, e.type.width === 2 ? i * 2 : i * 4, i * e.type.width, n);
			break;
		}
		case "matrix": {
			let n = e.type.element;
			(n.kind !== "scalar" || n.name !== "f32" && n.name !== "f16") && K(`${t}.type.element`, "matrix layout requires an f32 or f16 scalar"), (!e.element || e.element.type.kind !== "vector" || e.element.type.width !== e.type.rows || !L(e.element.type.element, n)) && K(`${t}.element.type`, "does not match the matrix column vector");
			let r = Xo(e.element.align, Yo(e.element, `${t}.element`));
			e.align !== e.element.align && K(`${t}.align`, "does not match the matrix column alignment"), e.stride !== r && K(`${t}.stride`, "does not match the matrix column stride"), e.size !== r * e.type.columns && K(`${t}.size`, "does not match matrix columns and stride"), e.members && K(`${t}.members`, "matrix layouts cannot contain struct members");
			break;
		}
		case "array": {
			(!e.element || !L(e.element.type, e.type.element)) && K(`${t}.element.type`, "does not match the array element type");
			let n = Xo(e.element.align, Yo(e.element, `${t}.element`));
			e.align !== e.element.align && K(`${t}.align`, "does not match the array element alignment"), e.stride !== n && K(`${t}.stride`, "does not match the array element stride"), e.runtimeSized !== (e.type.count === void 0) && K(`${t}.runtimeSized`, "does not match the array count"), e.members && K(`${t}.members`, "array layouts cannot contain struct members");
			break;
		}
		case "identifier":
			(!e.members || e.element || e.stride !== void 0 || e.runtimeSized !== void 0) && K(t, "struct layout shape is incomplete or contains array metadata");
			break;
		default: K(`${t}.type`, `type '${e.type.kind}' cannot have a host-shareable layout`);
	}
	if (!e.members) return;
	let r = 0, i = 1;
	for (let [n, a] of e.members.entries()) {
		let o = `${t}.members[${n}]`, s = Math.max(a.layout.align, a.explicitAlign ?? 1), c = Math.max(a.layout.size ?? 0, a.explicitSize ?? 0);
		a.align !== s && K(`${o}.align`, "does not match intrinsic/explicit alignment"), a.size !== c && K(`${o}.size`, "does not match intrinsic/explicit size");
		let l = Xo(a.align, r);
		a.offset !== l && K(`${o}.offset`, "does not match the aligned preceding bound"), r = a.offset + (a.size ?? 0), a.layout.runtimeSized && n !== e.members.length - 1 && K(o, "runtime-sized arrays must be the final member"), i = Math.max(i, a.align);
	}
	e.align !== i && K(`${t}.align`, "does not match the maximum member alignment"), e.size !== Xo(i, r) && K(`${t}.size`, "does not match the rounded containing bound");
}
function Ko(e, t, n, r) {
	let i = qo(e.type, n, r, /* @__PURE__ */ new Set(), `${t}.type`);
	if (i.kind === "identifier") {
		let a = n.get(i.mangledName ?? i.name);
		a || K(`${t}.type`, `unknown struct '${i.mangledName ?? i.name}'`), (!e.members || e.members.length !== a.members.length) && K(`${t}.members`, "does not match the canonical struct member count");
		for (let i = 0; i < a.members.length; i++) {
			let o = a.members[i], s = e.members[i];
			(s.name !== o.name || !L(s.type, o.type)) && K(`${t}.members[${i}]`, "does not match the canonical struct member"), s.explicitAlign !== o.align && K(`${t}.members[${i}].explicitAlign`, "does not match the canonical struct member align attribute"), s.explicitSize !== o.size && K(`${t}.members[${i}].explicitSize`, "does not match the canonical struct member size attribute"), L(qo(o.type, n, r, /* @__PURE__ */ new Set(), `${t}.members[${i}].type`), s.layout.type) || K(`${t}.members[${i}].layout.type`, "does not match the resolved member type");
		}
	}
	e.members?.forEach((e, i) => Ko(e.layout, `${t}.members[${i}].layout`, n, r)), e.element && Ko(e.element, `${t}.element`, n, r);
}
function qo(e, t, n, r, i) {
	switch (e.kind) {
		case "identifier": {
			let a = e.mangledName ?? e.name;
			if (t.has(a)) return e;
			let o = n.get(a);
			o || K(i, `unknown type reference '${a}'`), r.has(a) && K(i, `cyclic alias reference '${a}'`), r.add(a);
			try {
				return qo(o.target, t, n, r, i);
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
			element: qo(e.element, t, n, r, `${i}.element`)
		};
		case "texture": return {
			...e,
			...e.sampleType ? { sampleType: qo(e.sampleType, t, n, r, `${i}.sampleType`) } : {}
		};
		default: return e;
	}
}
function Jo(e, t, n, r, i) {
	e.align !== n && K(`${t}.align`, `expected intrinsic alignment ${n}`), e.size !== r && K(`${t}.size`, `expected intrinsic size ${r}`), (i || e.runtimeSized !== void 0) && K(t, "leaf layout contains composite metadata");
}
function Yo(e, t) {
	return e.size === void 0 && K(`${t}.size`, "element layout must have a fixed size"), e.size;
}
function Xo(e, t) {
	return Math.ceil(t / e) * e;
}
function Zo(e, t) {
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
function Qo(e, t) {
	let n = /* @__PURE__ */ new Set(), r = /* @__PURE__ */ new Set();
	for (let [i, a] of e.entries()) n.has(a.name) && K(`${t}[${i}].name`, `duplicate identity '${a.name}'`), r.has(a.mangledName) && K(`${t}[${i}].mangledName`, `duplicate identity '${a.mangledName}'`), n.add(a.name), r.add(a.mangledName);
}
function $o(e, t) {
	let n = /* @__PURE__ */ new Set();
	for (let [r, i] of e.entries()) n.has(i) && K(`${t}[${r}]`, `duplicate value '${i}'`), n.add(i);
}
function es(e) {
	return `${e.group}:${e.binding}`;
}
function L(e, t) {
	if (Object.is(e, t)) return !0;
	if (typeof e != "object" || !e || typeof t != "object" || !t) return !1;
	if (Array.isArray(e) || Array.isArray(t)) return Array.isArray(e) && Array.isArray(t) && e.length === t.length && e.every((e, n) => L(e, t[n]));
	let n = Object.entries(e), r = Object.entries(t);
	return n.length === r.length && n.every(([e, n]) => Object.hasOwn(t, e) && L(n, t[e]));
}
function R(e, t, n) {
	return Array.isArray(e) || K(t, "expected an array"), Oo(e), ts(e, t, () => {
		let r = [];
		for (let i = 0; i < e.length; i++) {
			let a = ns(e, String(i), `${t}[${i}]`);
			a || K(`${t}[${i}]`, "sparse arrays are not allowed"), "value" in a || K(`${t}[${i}]`, "accessor array elements are not allowed"), r.push(n(a.value, `${t}[${i}]`));
		}
		return r;
	});
}
function z(e, t, n) {
	(typeof e != "object" || !e || Array.isArray(e)) && K(t, "expected a plain data object"), Oo(e);
	let r;
	try {
		r = Object.getPrototypeOf(e);
	} catch {
		return K(t, "could not inspect object prototype");
	}
	return r !== Object.prototype && r !== null && K(t, "expected a plain data object"), ts(e, t, () => n(e));
}
function ts(e, t, n) {
	wo.has(e) && K(t, "cyclic metadata is not allowed"), wo.add(e);
	try {
		return n();
	} finally {
		wo.delete(e);
	}
}
function B(e, t, n) {
	let r = ns(e, t, n);
	return r || K(n, "missing required own data property"), "value" in r || K(n, "accessor properties are not allowed"), r.value === void 0 && K(n, "undefined is not JSON-compatible"), r.value;
}
function V(e, t, n) {
	let r = ns(e, t, n);
	return r ? ("value" in r || K(n, "accessor properties are not allowed"), r.value === void 0 && K(n, "optional undefined properties must be omitted"), {
		present: !0,
		value: r.value
	}) : { present: !1 };
}
function ns(e, t, n) {
	try {
		return Object.getOwnPropertyDescriptor(e, t);
	} catch {
		return K(n, "could not read its own property descriptor");
	}
}
function H(e, t, n, r = !1) {
	let i = B(e, t, n);
	return r && typeof i == "string" ? i : U(i, n);
}
function rs(e, t) {
	return U(e, t);
}
function U(e, t) {
	return (typeof e != "string" || e.length === 0) && K(t, "expected a nonempty string"), e;
}
function is(e, t) {
	return (typeof e != "number" || !Number.isFinite(e)) && K(t, "expected a finite number or 'unresolved'"), e;
}
function W(e, t) {
	return (typeof e != "number" || !Number.isSafeInteger(e) || e < 0) && K(t, "expected a non-negative safe integer"), e;
}
function as(e, t) {
	let n = W(e, t);
	return n === 0 && K(t, "expected a positive integer"), n;
}
function os(e, t) {
	let n = as(e, t);
	return Number.isInteger(Math.log2(n)) || K(t, "expected a positive power of two"), n;
}
function ss(e, t) {
	return typeof e != "boolean" && K(t, "expected a boolean"), e;
}
function G(e, t, n) {
	return n.includes(e) || K(t, `expected one of ${n.map(String).join(", ")}`), e;
}
function K(e, t) {
	throw O(e, t);
}
//#endregion
//#region node_modules/vgpu/dist/shader-source-checksum.js
var cs = 14695981039346656037n, ls = 1099511628211n, us = 18446744073709551615n;
function ds(e) {
	let t = cs;
	for (let n = 0; n < e.length; n++) {
		let r = e.charCodeAt(n);
		t = fs(t, r & 255), t = fs(t, r >>> 8);
	}
	return `fnv1a64-utf16le-v1:${t.toString(16).padStart(16, "0")}`;
}
function fs(e, t) {
	return (e ^ BigInt(t)) * ls & us;
}
//#endregion
//#region node_modules/vgpu/dist/shader-source.js
var ps = /* @__PURE__ */ new WeakMap();
function ms(e) {
	if (typeof e == "string") throw Yt();
	if (typeof e != "object" || !e || Array.isArray(e)) throw O("shader", "expected a prepared ShaderSource object");
	let t = ps.get(e);
	if (t?.snapshot) return t.snapshot;
	let n = Do(e), r = hs(e, "version");
	if (r === 1) throw Yt();
	if (typeof r == "number" && Number.isInteger(r) && r !== 2) throw Xt(r, gs(e, "producer"));
	if (r !== 2) throw O("version", "expected integer artifact version 2");
	let [i, a] = Eo(e);
	if (!/^fnv1a64-utf16le-v1:[0-9a-f]{16}$/.test(i.sourceChecksum)) throw O("sourceChecksum", "expected fnv1a64-utf16le-v1 followed by 16 lowercase hexadecimal digits");
	if (t?.wgsl !== i.wgsl && ps.set(e, t = {
		wgsl: i.wgsl,
		checksum: ds(i.wgsl)
	}), i.sourceChecksum !== t.checksum) throw O("sourceChecksum", "checksum does not match wgsl");
	let o = _s({
		wgsl: i.wgsl,
		reflection: i.reflection,
		...i.functionExports === void 0 ? {} : { functionExports: i.functionExports }
	});
	return n && a && (t.snapshot = o), o;
}
function hs(e, t) {
	let n;
	try {
		n = Object.getOwnPropertyDescriptor(e, t);
	} catch {
		throw O(t, "could not read its own property descriptor");
	}
	if (!n) throw O(t, "missing required own data property");
	if (!("value" in n)) throw O(t, "accessor properties are not allowed");
	return n.value;
}
function gs(e, t) {
	let n;
	try {
		n = Object.getOwnPropertyDescriptor(e, t);
	} catch {
		return;
	}
	return n && "value" in n && typeof n.value == "string" && n.value.length > 0 ? n.value : void 0;
}
function _s(e) {
	if (typeof e != "object" || !e || Object.isFrozen(e)) return e;
	for (let t of Object.values(e)) _s(t);
	return Object.freeze(e);
}
//#endregion
//#region node_modules/vgpu/dist/draw.js
var vs = 1, ys = /* @__PURE__ */ new WeakMap(), bs = Symbol("no cleanup failure"), xs = class {
	label;
	#e = /* @__PURE__ */ new Map();
	constructor(e, t, n, r = Pn(), i, a = Ca(e), o = xa(e), s = Sa(e), c, l, u) {
		k(e, "Draw.constructor"), this.label = n.label ?? "draw";
		let d = vs++, f = t.reflection, p = zs(this.label, n.entry), m = u?.entry ?? ma(this.label, f.entryPoints, "vertex", p.vertex, "draw"), h = ma(this.label, f.entryPoints, "fragment", p.fragment, "draw"), g = Bs(m, h), _ = [m, h].filter((e) => !!e), ee = yi(f.bindings, _);
		Ss(e, this.label, f.bindings, _, ee);
		let v = n.geometry, te = m ? Un(m, "inputs", this.label) : [], y = v && vn in v ? v[vn](te, `${this.label}.geometry`) : v?.vertexBufferLayouts, b = new Map(xi(e, this.label, f, ee)), ne = s.get(b), re = o.get(t.wgsl, `${this.label}.shader`), ie = u ? o.get(u.source, `${this.label}.fullscreen.shader`) : re, ae = vc(), oe = {
			label: this.label,
			recordedIn: ae
		}, se = As(this.label, n), ce = Is(this.label, n, se), le = Hs(e, this.label, n), ue = Zs(e, this.label, n), de = tc(this.label, n), fe = sc(this.label, n), pe = ga(this.label, n.constants, f.overrides, "draw"), me = this.label, he = Ai({
			device: e,
			label: this.label,
			reflection: f,
			bindGroupLayouts: b,
			cache: r,
			disposedError: (e) => rt(me, e)
		}), { set: ge, ..._e } = n;
		ys.set(this, {
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
			pipelineKeys: !y || vn in v ? /* @__PURE__ */ new WeakMap() : void 0,
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
		let e = X(this, "gpu");
		for (let t of e.resolvedPipelineKeys) {
			let n = e.pipelineStore.getReady(t);
			if (n) return n;
		}
	}
	get targets() {
		return X(this, "targets").opts.targets;
	}
	dispose() {
		let e = gc(this);
		if ("disposed" in e) return;
		ys.set(this, {
			disposed: !0,
			label: this.label
		});
		let t = bs;
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
			t === bs && (t = e);
		}
		if (t !== bs) throw t;
	}
	assertUsable(e) {
		X(this, e);
	}
	get [lo]() {
		return X(this, "drawable"), this;
	}
	writesDepth() {
		return pc(this);
	}
	stencilWritingOps() {
		return mc(this);
	}
	set(e) {
		let t = X(this, "set");
		k(t.device, `${this.label}.set`);
		for (let n of t.setCore.set(e)) t.lifecycle.recordedIn.markStale({
			kind: "binding-identity",
			drawLabel: t.lifecycle.label,
			...n
		});
		return this;
	}
	group(e, t) {
		let n = X(this, "group");
		k(n.device, `${this.label}.group`);
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
		let n = X(this, "layout");
		return k(n.device, `${this.label}.layout`), t.dynamicOffsets ? this.#t(e) : n.setCore.layout(e);
	}
	#t(e) {
		let t = X(this);
		t.setCore.layout(e);
		let n = this.#e.get(e);
		if (n) return n;
		let r = bc(this, e), i = Ci(t.device, `${this.label}.group${e}.dynamic.bgl`, r);
		return this.#e.set(e, i), t.bindGroupLayouts.set(e, i), t.setCore.refreshLayouts(), t.pipelineLayout = t.pipelineLayouts.get(t.bindGroupLayouts), i;
	}
	draw(e = {}) {
		k(X(this, "draw").device, `${this.label}.draw`);
		let t = aa(e) ? { target: e } : e, n = X(this, "draw"), r = t.target ?? n.defaultTarget;
		if (!r) throw Tt(`${this.label}.draw`);
		Sc(r, `${this.label}.draw`), n.setCore.preflight();
		let i = n.device.gpu.createCommandEncoder(), a = i.beginRenderPass(r.renderPassDescriptor()), o = [];
		try {
			this.encode(a, r, t, (e) => o.push(e));
		} catch (e) {
			j(o), Jn(n.device);
			try {
				a.end();
			} catch {}
			throw e;
		}
		tr(n.device, a, o, o[0]?.context);
		let s, c = o[0]?.context;
		c && Gn(n.device, c);
		try {
			s = i.finish();
		} catch (e) {
			let t = c ? A(n.device) : void 0;
			j(o), t && j([t]);
			let r = t?.context ?? c;
			if (r) {
				_c(n, r.label, r.group, e);
				return;
			}
			throw e;
		}
		if (c) {
			let e = A(n.device);
			e && (o[0] = o[0] ? Xn(e, o[0]) : e);
		}
		let l = o[0]?.context;
		l && Gn(n.device, l);
		try {
			n.device.gpu.queue.submit([s]);
		} catch (e) {
			let t = l ? A(n.device) : void 0;
			j(o), t && j([t]);
			let r = t?.context ?? l;
			if (r) {
				_c(n, r.label, r.group, e);
				return;
			}
			throw e;
		}
		if (l) {
			let e = A(n.device);
			e && (o[0] = o[0] ? Xn(e, o[0]) : e);
		}
		if (o.length) {
			let e = Yn(n.device, o, { errorSink: n.errorSink });
			n.trackSettled?.(e);
		}
	}
	encode(e, t, n = {}, r, i) {
		let a = X(this, "encode");
		k(a.device, `${this.label}.encode`), a.setCore.preflight();
		let o = this.pipelineFor(t);
		if (o) {
			e.setPipeline(o), a.blendConstant && e.setBlendConstant(a.blendConstant), a.stencilRef !== void 0 && e.setStencilReference(a.stencilRef);
			for (let t of a.setCore.bindGroups(i)) this.#n(a, e, t, n, r);
			this.#c(a, e, n);
		}
	}
	#n(e, t, n, r, i) {
		let a = yc(r.offsets, n.group, n.offsets);
		if (!n.claimValidation || !i) {
			t.setBindGroup(n.group, n.bindGroup, a);
			return;
		}
		Gn(e.device, n.claimValidation);
		try {
			t.setBindGroup(n.group, n.bindGroup, a);
		} catch (t) {
			throw qn(e.device), et(n.claimValidation.label, n.claimValidation.group, t);
		}
		let o = A(e.device);
		o && i(o);
	}
	compile(e) {
		return this.#r("compile", e, () => this);
	}
	#r(e, t, n) {
		let r = X(this, e);
		k(r.device, `${this.label}.${e}`);
		let { key: i, signature: a, signatureKey: o } = this.#a(r, t, e);
		return r.pipelineStore.getAsync(i, () => r.device.gpu.createRenderPipelineAsync(this.#u(r, a)), {
			where: `${this.label}.${e}`,
			signature: o,
			dependencies: Vs(r)
		}).then((t) => {
			let r = X(this, e);
			return k(r.device, `${this.label}.${e}`), r.resolvedPipelineKeys.add(i), n(t);
		}, (t) => {
			throw X(this, e), t;
		});
	}
	compileSync(e) {
		return this.#i("compileSync", e, !0), this;
	}
	pipelineFor(e) {
		return this.#i("pipelineFor", e);
	}
	#i(e, t, n) {
		let r = X(this, e);
		k(r.device, `${this.label}.${e}`);
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
		if (a && a.pipelineLayout === e.pipelineLayout && a.topology === i?.topology && a.stripIndexFormat === Ds(i) && Es(r, a.signature)) return a;
		e.pipelineKeyDerivations++;
		let o = this.#o(e, t, `${this.label}.${n}`), s = da(o), c = {
			signature: o,
			signatureKey: s,
			key: this.#s(e, o),
			pipelineLayout: e.pipelineLayout,
			topology: i?.topology,
			stripIndexFormat: Ds(i),
			create: () => e.device.gpu.createRenderPipeline(this.#u(e, o)),
			ctx: {
				where: `${this.label}.pipelineFor`,
				signature: s,
				dependencies: Vs(e)
			}
		};
		return e.pipelineKeys?.set(r, c), c;
	}
	#o(e, t, n) {
		let r = t ?? e.defaultTarget;
		if (!r) throw Tt(n);
		let i = ua(r);
		if (fa(i, n), e.colorStates && e.colorStates.length !== i.colors.length) throw at(this.label, `expected one entry per color attachment; colors has ${e.colorStates.length}, but the target signature has ${i.colors.length}.`, n);
		if (e.multisampleState?.alphaToCoverageEnabled && (i.sampleCount ?? 1) <= 1) throw ut(this.label, `alphaToCoverage requires a multisampled target, but the target signature has sampleCount ${i.sampleCount ?? 1}; create the target with msaa: true.`, n);
		if ((e.stencilState || e.stencilRef !== void 0) && !na(i.depth)) throw lt(this.label, `stencil requires a depth format with a stencil aspect, but the target signature has ${i.depth ? `"${i.depth}"` : "no depth"}; create the target with depth: "depth24plus-stencil8".`, n);
		return i;
	}
	#s(e, t) {
		let n = e.opts.geometry;
		return pa({
			vertexModule: e.vertexShaderModule,
			fragmentModule: e.fragmentShaderModule,
			pipelineLayout: e.pipelineLayout,
			vertexBufferLayouts: e.vertexBufferLayouts,
			signature: t,
			fragmentKey: e.fragmentKey,
			topology: n?.topology,
			stripIndexFormat: Ds(n),
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
		if (bn(r)?.[yn](`${this.label}.geometry`), r?.vertexBuffers && r.vertexBuffers.forEach((e, n) => t.setVertexBuffer(n, e)), n.indirect !== void 0) return this.#l(t, r, n);
		let i = Ts(this.label, r, e.opts, n);
		if (!r?.indexBuffer) return t.draw(i.vertexCount, i.instanceCount, i.firstVertex, i.firstInstance);
		t.setIndexBuffer(r.indexBuffer, r.indexFormat ?? "uint32"), t.drawIndexed(i.indexCount, i.instanceCount, i.firstIndex, i.baseVertex, i.firstInstance);
	}
	#l(e, t, n) {
		let r = `${this.label}.draw`, i = Cs.find((e) => n[e] !== void 0);
		if (i !== void 0) throw pt(this.label, `indirect cannot be combined with ${i} in the same call; the GPU reads the draw arguments from the buffer, so the CPU-side value would be ignored.`, r);
		let a = !!t?.indexBuffer, { buffer: o, offset: s } = oo(this.label, r, n.indirect, a ? "drawIndexedIndirect" : "drawIndirect");
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
				targets: ws(t, e),
				...e.constants ? { constants: e.constants } : {}
			},
			primitive: Os(e.opts.geometry, e.cullMode, e.frontFace, e.unclippedDepth),
			depthStencil: Xs(t, e),
			multisample: oc(t, e)
		};
	}
};
function Ss(e, t, n, r, i) {
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
var Cs = [
	"vertices",
	"indices",
	"instances",
	"firstVertex",
	"firstIndex",
	"baseVertex",
	"firstInstance"
];
function ws(e, t) {
	return e.colors.map((e, n) => {
		let r = t.colorStates?.[n], i = r?.blendState ?? t.blendState, a = r?.writeMask ?? t.writeMask, o = { format: e };
		return i && (o.blend = i), a !== void 0 && (o.writeMask = a), o;
	});
}
function Ts(e, t, n, r) {
	J(e, "DrawOptions.instances", n.instances), J(e, "DrawOptions.vertices", n.vertices), J(e, "DrawOptions.firstInstance", n.firstInstance), J(e, "DrawCallOptions.instances", r.instances), q(e, "DrawCallOptions.vertices", r.vertices), q(e, "DrawCallOptions.indices", r.indices), q(e, "DrawCallOptions.firstVertex", r.firstVertex), q(e, "DrawCallOptions.firstIndex", r.firstIndex), q(e, "DrawCallOptions.baseVertex", r.baseVertex), J(e, "DrawCallOptions.firstInstance", r.firstInstance), J(e, "GeometryLike.vertexCount", t?.vertexCount), J(e, "GeometryLike.indexCount", t?.indexCount), J(e, "GeometryLike.instanceCount", t?.instanceCount), q(e, "GeometryLike.firstVertex", t?.firstVertex), q(e, "GeometryLike.firstIndex", t?.firstIndex), q(e, "GeometryLike.baseVertex", t?.baseVertex);
	let i = !!t?.indexBuffer, a = t?.geometry ?? (t && vn in t ? t : void 0), o = r.firstVertex ?? t?.firstVertex ?? 0, s = r.vertices ?? t?.vertexCount ?? n.vertices ?? 3, c = r.firstIndex ?? t?.firstIndex ?? 0, l = r.indices ?? t?.indexCount ?? 0, u = r.baseVertex ?? t?.baseVertex ?? 0;
	if (i) ks(e, "index", c, l, a?.indexCount);
	else if (r.indices !== void 0 || r.firstIndex !== void 0 || r.baseVertex !== void 0) throw Dt(`${e}.draw`, "Index range needs an indexed geometry.");
	return i || ks(e, "vertex", o, s, a?.vertexCount), {
		instanceCount: r.instances ?? n.instances ?? t?.instanceCount ?? 1,
		firstInstance: r.firstInstance ?? n.firstInstance ?? 0,
		vertexCount: s,
		firstVertex: o,
		indexCount: l,
		firstIndex: c,
		baseVertex: u
	};
}
function Es(e, t) {
	let n = _n(e), r = n ?? e, i = !n && aa(e), a = r.colors;
	if (!Array.isArray(a) || a.length !== t.colors.length) return !1;
	for (let e = 0; e < a.length; e++) if ((i ? a[e]?.format : a[e]) !== t.colors[e]) return !1;
	return (i ? r.depth?.format : r.depth) === t.depth && (i ? r.sampleCount : r.sampleCount ?? 1) === t.sampleCount;
}
function Ds(e) {
	let t = e?.topology ?? "triangle-list";
	return e?.stripIndexFormat ?? (t.endsWith("strip") ? e?.indexFormat : void 0);
}
function Os(e, t, n, r) {
	let i = e?.topology ?? "triangle-list", a = Ds(e), o = a ? {
		topology: i,
		stripIndexFormat: a
	} : { topology: i };
	return t !== void 0 && (o.cullMode = t), n !== void 0 && (o.frontFace = n), r && (o.unclippedDepth = !0), o;
}
function ks(e, t, n, r, i) {
	if (!(i === void 0 || n + r <= i)) throw Dt(`${e}.draw`, `${t} range [${n}, ${n + r}) exceeds parent geometry ${t} count ${i}.`);
}
function q(e, t, n) {
	if (!(n === void 0 || Number.isInteger(n) && n >= 0)) throw Dt(`${e}.draw`, `${t} must be an integer >= 0; received ${String(n)}.`);
}
function J(e, t, n) {
	if (n !== void 0 && !(Number.isInteger(n) && n >= 0)) throw new S({
		code: "VGPU-R1-DRAW-COUNT",
		message: `${t} of '${e}' must be an integer >= 0; received ${String(n)}. Use 0 only when you want to issue a valid draw with no vertices/instances.`,
		where: `${e}.draw`
	});
}
function As(e, t) {
	let n = t.blend === void 0 ? void 0 : Ms(e, t.blend), r = t.writeMask === void 0 ? void 0 : lc(e, t.writeMask), i = t.colors === void 0 ? void 0 : js(e, t.colors);
	return {
		blendState: n,
		writeMask: r,
		colorStates: i,
		fragmentKey: i ? `${uc(n, r)}@${i.map(fc).join("@")}` : n || r !== void 0 ? uc(n, r) : void 0
	};
}
function js(e, t) {
	if (!Array.isArray(t)) throw at(e, `colors must be an array; received ${Y(t)}.`);
	return t.map((t, n) => {
		if (t == null) return null;
		if (typeof t != "object" || Array.isArray(t)) throw at(e, `colors[${n}] must be null or { blend?, writeMask? }; received ${Y(t)}.`);
		let r = t.blend === void 0 ? void 0 : Ms(`${e}.colors[${n}]`, t.blend), i = t.writeMask === void 0 ? void 0 : lc(`${e}.colors[${n}]`, t.writeMask);
		return !r && i === void 0 ? null : {
			blendState: r,
			writeMask: i
		};
	});
}
function Ms(e, t) {
	if (t === "alpha") return Ps({
		src: "src-alpha",
		dst: "one-minus-src-alpha"
	}, {
		src: "one",
		dst: "one-minus-src-alpha"
	});
	if (t === "premultiplied") return Ps({
		src: "one",
		dst: "one-minus-src-alpha"
	}, {
		src: "one",
		dst: "one-minus-src-alpha"
	});
	if (t === "additive") return Ps({
		src: "one",
		dst: "one"
	}, {
		src: "one",
		dst: "one"
	});
	if (typeof t != "object" || !t || !Ns(t.color)) throw tt(e, t);
	let n = t.color, r = t.alpha;
	if (r !== void 0 && !Ns(r)) throw tt(e, t);
	return Ps(n, r ?? n);
}
function Ns(e) {
	return typeof e == "object" && !!e && typeof e.src == "string" && typeof e.dst == "string";
}
function Ps(e, t) {
	return {
		color: Fs(e),
		alpha: Fs(t)
	};
}
function Fs(e) {
	return {
		srcFactor: e.src,
		dstFactor: e.dst,
		operation: e.op ?? "add"
	};
}
function Is(e, t, n) {
	if (t.blendConstant === void 0) return {};
	let r = t.blendConstant;
	if (!Array.isArray(r) || r.length !== 4 || r.some((e) => typeof e != "number" || !Number.isFinite(e))) throw nt(e, `received ${Y(r)}; expected [r, g, b, a] finite numbers.`);
	if (!Ls(n).some((e) => e && Rs(e))) throw nt(e, "no color target's effective blend uses a \"constant\"/\"one-minus-constant\" factor (colors[i].blend replaces the top-level blend for that target), so blendConstant would have no effect.");
	return { blendConstant: {
		r: r[0],
		g: r[1],
		b: r[2],
		a: r[3]
	} };
}
function Ls(e) {
	return e.colorStates ? e.colorStates.map((t) => t?.blendState ?? e.blendState) : [e.blendState];
}
function Rs(e) {
	return [
		e.color.srcFactor,
		e.color.dstFactor,
		e.alpha.srcFactor,
		e.alpha.dstFactor
	].some((e) => e === "constant" || e === "one-minus-constant");
}
function zs(e, t) {
	if (t === void 0) return {};
	if (typeof t != "object" || !t || Array.isArray(t)) throw ft(e, `received ${Y(t)}; expected { vertex?, fragment? } entry point names.`);
	return t;
}
function Bs(e, t) {
	return `en~${e?.name ?? ""}~${t?.name ?? ""}`;
}
function Vs(e) {
	return e.vertexShaderModule === e.fragmentShaderModule ? [e.vertexShaderModule, e.pipelineLayout] : [
		e.vertexShaderModule,
		e.fragmentShaderModule,
		e.pipelineLayout
	];
}
function Hs(e, t, n) {
	return {
		cullMode: n.cull === void 0 ? void 0 : Ws(t, n.cull),
		frontFace: n.frontFace === void 0 ? void 0 : Gs(t, n.frontFace),
		unclippedDepth: n.unclippedDepth === void 0 ? void 0 : Us(e, t, n.unclippedDepth)
	};
}
function Us(e, t, n) {
	if (typeof n != "boolean") throw ct(t, `received ${Y(n)}; expected a boolean.`);
	if (n) {
		if (!e.features.has("depth-clip-control")) throw ct(t, "the device lacks the \"depth-clip-control\" feature; request it at init: init({ requiredFeatures: [\"depth-clip-control\"] }) on an adapter that supports it.");
		return !0;
	}
}
function Ws(e, t) {
	if (t === "none" || t === "front" || t === "back") return t;
	throw ot(e, t);
}
function Gs(e, t) {
	if (t === "ccw" || t === "cw") return t;
	throw st(e, t);
}
var Ks = {
	depthWriteEnabled: !0,
	depthCompare: "less-equal"
}, qs = [
	"never",
	"less",
	"equal",
	"less-equal",
	"greater",
	"not-equal",
	"greater-equal",
	"always"
], Js = -2147483648, Ys = 2147483647;
function Xs(e, t) {
	if (e.depth) return {
		format: e.depth,
		...t.depthState ?? Ks,
		...t.stencilState ?? {}
	};
}
function Zs(e, t, n) {
	if (n.depth === void 0) return {};
	let r = Qs(e, t, n.depth, n.geometry?.topology ?? "triangle-list");
	return {
		depthState: r,
		depthKey: $s(r)
	};
}
function Qs(e, t, n, r) {
	if (n === !1) return {
		depthWriteEnabled: !1,
		depthCompare: "always"
	};
	if (typeof n != "object" || !n) throw C(t, `received ${Y(n)}.`);
	if (n.write !== void 0 && typeof n.write != "boolean") throw C(t, `write must be a boolean; received ${Y(n.write)}.`);
	if (n.compare !== void 0 && !qs.includes(n.compare)) throw C(t, `compare must be a GPUCompareFunction; received ${Y(n.compare)}.`);
	if (n.bias !== void 0 && !Number.isInteger(n.bias)) throw C(t, `bias must be an integer (WebGPU depthBias is i32); received ${Y(n.bias)}.`);
	if (n.bias !== void 0 && (n.bias < Js || n.bias > Ys)) throw C(t, `bias must fit in the i32 range [${Js}, ${Ys}] (WebGPU depthBias is i32); received ${Y(n.bias)}.`);
	if (n.biasSlopeScale !== void 0 && !Number.isFinite(n.biasSlopeScale)) throw C(t, `biasSlopeScale must be a finite number; received ${Y(n.biasSlopeScale)}.`);
	if (n.biasClamp !== void 0 && !Number.isFinite(n.biasClamp)) throw C(t, `biasClamp must be a finite number; received ${Y(n.biasClamp)}.`);
	let i = n.bias ?? 0, a = n.biasSlopeScale ?? 0, o = n.biasClamp ?? 0;
	if ((i !== 0 || a !== 0 || o !== 0) && !r.startsWith("triangle")) throw C(t, `bias, biasSlopeScale, and biasClamp must be 0 for "${r}" topology.`);
	if (o !== 0 && e.isCompatibilityMode) throw C(t, `biasClamp must be 0 on a compatibility-mode device; received ${Y(n.biasClamp)}.`);
	return {
		depthWriteEnabled: n.write ?? !0,
		depthCompare: n.compare ?? "less-equal",
		...i === 0 ? {} : { depthBias: i },
		...a === 0 ? {} : { depthBiasSlopeScale: a },
		...o === 0 ? {} : { depthBiasClamp: o }
	};
}
function $s(e) {
	return `${+!!e.depthWriteEnabled}~${e.depthCompare}~${e.depthBias ?? 0}~${e.depthBiasSlopeScale ?? 0}~${e.depthBiasClamp ?? 0}`;
}
var ec = [
	"keep",
	"zero",
	"replace",
	"invert",
	"increment-clamp",
	"decrement-clamp",
	"increment-wrap",
	"decrement-wrap"
];
function tc(e, t) {
	if (t.stencil === void 0) return {};
	let n = t.stencil;
	if (typeof n != "object" || !n || Array.isArray(n)) throw lt(e, `received ${Y(n)}; expected { front?, back?, readMask?, writeMask?, ref? }.`);
	let r = n.front === void 0 ? void 0 : nc(e, "front", n.front), i = n.back === void 0 ? void 0 : nc(e, "back", n.back);
	rc(e, "readMask", n.readMask), rc(e, "writeMask", n.writeMask), rc(e, "ref", n.ref);
	let a = {
		...r ? { stencilFront: r } : {},
		...i ?? r ? { stencilBack: i ?? { ...r } } : {},
		...n.readMask === void 0 ? {} : { stencilReadMask: n.readMask },
		...n.writeMask === void 0 ? {} : { stencilWriteMask: n.writeMask }
	}, o = a.stencilFront !== void 0 || a.stencilBack !== void 0 || a.stencilReadMask !== void 0 || a.stencilWriteMask !== void 0;
	return !o && n.ref === void 0 ? {} : {
		...o ? {
			stencilState: a,
			stencilKey: ic(a)
		} : {},
		...n.ref === void 0 ? {} : { stencilRef: n.ref }
	};
}
function nc(e, t, n) {
	if (typeof n != "object" || !n || Array.isArray(n)) throw lt(e, `${t} must be a { compare?, fail?, depthFail?, pass? } object; received ${Y(n)}.`);
	if (n.compare !== void 0 && !qs.includes(n.compare)) throw lt(e, `${t}.compare must be a GPUCompareFunction; received ${Y(n.compare)}.`);
	for (let [r, i] of [
		["fail", n.fail],
		["depthFail", n.depthFail],
		["pass", n.pass]
	]) if (i !== void 0 && !ec.includes(i)) throw lt(e, `${t}.${r} must be a GPUStencilOperation; received ${Y(i)}.`);
	return {
		compare: n.compare ?? "always",
		failOp: n.fail ?? "keep",
		depthFailOp: n.depthFail ?? "keep",
		passOp: n.pass ?? "keep"
	};
}
function rc(e, t, n) {
	if (n !== void 0 && (typeof n != "number" || !Number.isInteger(n) || n < 0 || n > 4294967295)) throw lt(e, `${t} must be an integer in [0, 0xFFFFFFFF] (WebGPU GPUStencilValue is u32); received ${Y(n)}.`);
}
function ic(e) {
	return `st~${ac(e.stencilFront)}~${ac(e.stencilBack)}~${e.stencilReadMask ?? 4294967295}~${e.stencilWriteMask ?? 4294967295}`;
}
function ac(e) {
	return e ? `${e.compare},${e.failOp},${e.depthFailOp},${e.passOp}` : "default";
}
function oc(e, t) {
	return {
		count: e.sampleCount ?? 1,
		...t.multisampleState ?? {}
	};
}
function sc(e, t) {
	if (t.multisample === void 0) return {};
	let n = t.multisample;
	if (typeof n != "object" || !n || Array.isArray(n)) throw ut(e, `received ${Y(n)}; expected { alphaToCoverage?, mask? }.`);
	if (n.alphaToCoverage !== void 0 && typeof n.alphaToCoverage != "boolean") throw ut(e, `alphaToCoverage must be a boolean; received ${Y(n.alphaToCoverage)}.`);
	if (n.mask !== void 0 && (typeof n.mask != "number" || !Number.isInteger(n.mask) || n.mask < 0 || n.mask > 4294967295)) throw ut(e, `mask must be an integer in [0, 0xFFFFFFFF] (WebGPU GPUSampleMask is u32); received ${Y(n.mask)}.`);
	let r = {
		...n.alphaToCoverage === void 0 ? {} : { alphaToCoverageEnabled: n.alphaToCoverage },
		...n.mask === void 0 ? {} : { mask: n.mask }
	};
	return r.alphaToCoverageEnabled === void 0 && r.mask === void 0 ? {} : {
		multisampleState: r,
		multisampleKey: cc(r)
	};
}
function cc(e) {
	return `ms~${+!!e.alphaToCoverageEnabled}~${e.mask ?? 4294967295}`;
}
function lc(e, t) {
	if (!Array.isArray(t)) throw it(e, Y(t));
	let n = 0;
	for (let r of t) if (r === "r") n |= 1;
	else if (r === "g") n |= 2;
	else if (r === "b") n |= 4;
	else if (r === "a") n |= 8;
	else throw it(e, Y(r));
	return n;
}
function uc(e, t) {
	return `${dc(e)};${t ?? 15}`;
}
function dc(e) {
	if (!e) return "none;none";
	let t = e.color, n = e.alpha;
	return `${t.srcFactor},${t.dstFactor},${t.operation};${n.srcFactor},${n.dstFactor},${n.operation}`;
}
function fc(e) {
	return e ? `${e.blendState ? dc(e.blendState) : "inherit"};${e.writeMask ?? "inherit"}` : "inherit";
}
function Y(e) {
	if (typeof e == "string") return `"${e}"`;
	try {
		return JSON.stringify(e) ?? String(e);
	} catch {
		return String(e);
	}
}
function pc(e) {
	return (X(e, "writesDepth").depthState ?? Ks).depthWriteEnabled;
}
function mc(e) {
	let t = X(e, "stencilWritingOps"), n = t.stencilState;
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
function hc(e, t, n, r = {}, i, a) {
	e.encode(t, n, r, i, a);
}
function gc(e) {
	let t = ys.get(e);
	if (!t) throw TypeError("Invalid Draw instance");
	return t;
}
function X(e, t = "access") {
	let n = gc(e);
	if ("disposed" in n) throw rt(n.label, t);
	return n;
}
function _c(e, t, n, r) {
	let i = (async () => {
		await en(e.device), k(e.device, `${t}.validation`);
		let i = et(t, n, r);
		e.errorSink ? await e.errorSink(i) : console.error(i);
	})();
	return e.trackSettled?.(i), i;
}
function vc() {
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
			let t = bs;
			for (let n of i()) try {
				n.markStale(e);
			} catch (e) {
				t === bs && (t = e);
			}
			if (t !== bs) throw t;
		}
	};
}
function yc(e, t, n) {
	return e ? Array.isArray(e) ? e : e[t] ?? n : n;
}
function bc(e, t) {
	let n = X(e);
	return bi(n.reflection.bindings, t, n.visibility).map(xc);
}
function xc(e) {
	return e.buffer ? {
		...e,
		buffer: {
			...e.buffer,
			hasDynamicOffset: !0
		}
	} : e;
}
function Sc(e, t) {
	if (Ga(e) && !Ha()) throw Pt(t);
}
//#endregion
//#region node_modules/vgpu/dist/fullscreen-stage.js
var Cc = "\nstruct VgpuFullscreenVertexOut {\n  @builtin(position) position: vec4f,\n  @location(0) uv: vec2f,\n};\n@vertex fn vgpu_fullscreen_vs(@builtin(vertex_index) vi: u32) -> VgpuFullscreenVertexOut {\n  var pos = array<vec2f, 3>(vec2f(-1.0, -1.0), vec2f(3.0, -1.0), vec2f(-1.0, 3.0));\n  var uv = array<vec2f, 3>(vec2f(0.0, 1.0), vec2f(2.0, 1.0), vec2f(0.0, -1.0));\n  var out: VgpuFullscreenVertexOut;\n  out.position = vec4f(pos[vi], 0.0, 1.0);\n  out.uv = uv[vi];\n  return out;\n}\n", wc = Tc({
	name: "vgpu_fullscreen_vs",
	mangledName: "vgpu_fullscreen_vs",
	stage: "vertex",
	bindings: [],
	samplingPairs: [],
	inputs: []
});
function Tc(e) {
	if (typeof e != "object" || !e || Object.isFrozen(e)) return e;
	for (let t of Object.values(e)) Tc(t);
	return Object.freeze(e);
}
//#endregion
//#region node_modules/vgpu/dist/effect.js
function Ec(e, t, n = {}) {
	if ("geometry" in n) throw D("effect", "effect() never accepts vertex buffers; use draw(gpu, { shader, geometry: geometry(gpu, descriptor) }).");
	let r = xn(e, "effect"), i = So(r);
	return new Oc(r.device, ms(t), n, i.binds, void 0, i.pipelines, i.shaderModules, i.pipelineLayouts, (e) => r.reportError(e), (e) => {
		r.trackDelivery(e);
	});
}
var Dc = /* @__PURE__ */ new WeakMap(), Oc = class {
	get gpu() {
		return Z(this).gpu;
	}
	dispose() {
		Z(this).dispose();
	}
	constructor(e, t, n = {}, r, i, a, o, s, c, l) {
		let u = n.entry;
		if (u && typeof u == "object" && "vertex" in u) throw ft(n.label ?? "effect", "effect does not support vertex entry overrides.", "effect");
		let d = t.reflection.entryPoints.some((e) => e.stage === "vertex") ? void 0 : {
			source: Cc,
			entry: wc
		}, f = new xs(e, t, {
			entry: u,
			set: n.set,
			label: n.label ?? "effect",
			blend: n.blend,
			writeMask: n.writeMask
		}, r, i, a, o, s, c, l, d);
		Dc.set(this, f);
	}
	set(e) {
		return Z(this).set(e), this;
	}
	draw(e = {}) {
		Z(this).draw(e);
	}
	compile(e) {
		return Z(this).compile(e).then(() => this);
	}
	compileSync(e) {
		return Z(this).compileSync(e), this;
	}
	encode(e, t, n = {}, r) {
		hc(Z(this), e, t, n, r);
	}
	get [lo]() {
		return Z(this)[lo];
	}
};
function Z(e) {
	let t = Dc.get(e);
	if (!t) throw TypeError("Invalid Effect instance");
	return t;
}
var kc = /* @__PURE__ */ new WeakMap(), Ac = /* @__PURE__ */ new WeakSet(), jc = 1, Mc = class {
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
		let e = Ac.has(this.device) ? void 0 : kc.get(this.device);
		for (let t of this.#e) if (e && e.pages.length < 256 && e.bytes + t.bytes.byteLength <= 16777216) {
			for (let e of t.caches) e.evictIdentity(Nc(t), t.taken);
			e.pages.push(t), e.bytes += t.bytes.byteLength;
		} else Pc(t);
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
				kind: kn,
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
		let t = kc.get(this.device);
		!t && !Ac.has(this.device) && kc.set(this.device, t = {
			pages: [],
			bytes: 0
		});
		let n = t?.pages.findIndex((t) => t.bytes.byteLength >= e) ?? -1, r = n >= 0 ? t.pages.splice(n, 1)[0] : this.#a(e);
		return n >= 0 && (t.bytes -= r.bytes.byteLength), r.used = 0, r.taken = Nn(), r;
	}
	#a(e) {
		let t = Math.min(this.device.limits.maxBufferSize, Math.max(65536, Math.ceil(e / 4) * 4)), n = this.device.gpu.createBuffer({
			label: "vgpu.frame.uniforms",
			size: t,
			usage: 72
		});
		return {
			id: jc++,
			buffer: n,
			bytes: new Uint8Array(t),
			used: 0,
			taken: 0,
			caches: /* @__PURE__ */ new Set(),
			ranges: /* @__PURE__ */ new Map()
		};
	}
};
function Nc(e) {
	return {
		kind: kn,
		id: e.id
	};
}
function Pc(e) {
	for (let t of e.caches) t.evictIdentity(Nc(e));
	e.caches.clear(), e.buffer.destroy();
}
function Fc(e) {
	Ac.add(e);
	for (let t of kc.get(e)?.pages ?? []) Pc(t);
	kc.delete(e);
}
//#endregion
//#region node_modules/vgpu/dist/frame.js
function Ic(e, t) {
	return zc(xn(e, "frame")).frame(t);
}
var Lc, Rc = nn("frame-runner");
function zc(e) {
	return e.service(Rc, (e) => {
		let t = Na(e);
		return e.own("service", () => Fc(e.device)), new Xc(() => {
			let t = () => {}, n = new Bc(e.device, void 0, (t) => e.reportError(t), (t) => {
				e.trackDelivery(t);
			}, () => t());
			return t = e.own("scheduler", () => n.cancel()), n;
		}, () => t.tick(), (t) => {
			let n = e.own("scheduler", () => t.stop()), r = e.stopOnLoss(() => t.stop());
			return () => {
				n(), r();
			};
		}, (t) => k(e.device, t));
	});
}
var Bc = class {
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
	#i = { capture: (e, t) => (this.#r ??= new Mc(this.device)).capture(e, t) };
	#a = /* @__PURE__ */ new Set();
	#o = /* @__PURE__ */ new Set();
	#s = !1;
	#c = !1;
	#l = !1;
	static {
		Lc = (e) => !(#s in e) || !e.#s && !e.#c;
	}
	constructor(e, t, n, r, i) {
		this.device = e, this.defaultTarget = t, this.errorSink = n, this.trackSettled = r, this.releaseLifecycle = i, k(e, "Frame.constructor"), this.#e = e.gpu.createCommandEncoder({ label: "vgpu.frame" });
	}
	computePass(e, t) {
		this.#u("Frame.computePass");
		let n = typeof e == "function" ? e : t;
		if (typeof n != "function") throw new S({
			code: "VGPU-COMPUTE-PASS-INVALID",
			message: "computePass requires a synchronous callback.",
			where: "Frame.computePass"
		});
		let r = typeof e == "function" ? "vgpu.computePass" : e.label ?? "vgpu.computePass", i = hi(this.device, this.#n, `${r}.begin`, () => this.#e.beginComputePass({ label: r }));
		this.#l = !0;
		let a = !0, o = { dispatch: (e, t, n, o) => {
			if (!a) throw new S({
				code: "VGPU-COMPUTE-PASS-CLOSED",
				message: "The compute pass callback has ended.",
				where: `${r}.dispatch`
			});
			k(this.device, `${r}.dispatch`);
			let s = _o(e);
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
				hi(this.device, this.#n, `${r}.end`, () => i.end());
			} catch (e) {
				if (!s) throw e;
			}
		}
	}
	#u(e) {
		if (this.#c) throw Gt(e);
		if (this.#s) throw qt(e);
		if (k(this.device, e), this.#l) throw Kt(e);
	}
	pass(e, t) {
		if (this.#c) throw Gt("Frame.pass");
		if (k(this.device, "Frame.pass"), this.#l) throw Kt("Frame.pass");
		if (this.#s && !Ga(aa(e) ? e : e.target)) throw qt("Frame.pass");
		let n = aa(e), r = typeof t == "function" ? t : (e) => e.draw(t), i = n ? e : e.target ?? this.defaultTarget;
		if (!i) throw Tt("Frame.pass");
		if (Ga(i) && this.#s) throw Pt("Frame.pass");
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
			if (!na(e)) throw vt(`received ${String(c)}, but the target's depth format ${e ? `"${e}"` : "(none)"} has no stencil aspect, so clearStencil would have no effect.`);
		}
		let l = n ? void 0 : e.depthReadOnly;
		if (l !== void 0 && typeof l != "boolean") throw T(`received ${Q(l)}; expected a boolean.`, "Pass depthReadOnly: true to open the pass with a read-only depth attachment, or omit it.");
		if (l) {
			if (!i.depth) throw T("is set, but the target has no depth attachment, so there is nothing to make read-only.", "Create the target with depth: true (or a depth format), or drop depthReadOnly.");
			if (i.sampleCount === 4) throw bt();
			if (s !== void 0) throw T("cannot be combined with clearDepth; a read-only depth aspect omits its load/store ops and is never cleared.", "Remove clearDepth, or drop depthReadOnly.");
			if (c !== void 0) throw T("cannot be combined with clearStencil; a read-only stencil aspect omits its load/store ops and is never cleared.", "Remove clearStencil, or drop depthReadOnly.");
		}
		let u = n ? void 0 : qc(e.viewport, this.device.gpu.limits, i.size), d = n ? void 0 : Jc(e.scissor, i.size), f = [], p;
		try {
			let t = n || e.timer === void 0 ? void 0 : this.#h(e.timer, i, f, Gc), m = (n || e.visibility === void 0 ? void 0 : this.#h(e.visibility, i, f, Kc))?.occlusion, h = i.renderPassDescriptor({
				clear: a === void 0 || a === !0 || a === !1 ? i.clearColor ?? Ki : a,
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
				r(new Vc(p, i, this.#t, l === !0, m, this, (e) => {
					if (k(this.device, e), this.#c) throw Gt(e);
					if (!this.#l) throw Kt(e);
				}, this.#i));
			} finally {
				this.#l = !1;
			}
		} catch (e) {
			this.#p(f), j(this.#t), this.#t.length = 0, Jn(this.device);
			try {
				p?.end();
			} catch {}
			throw e;
		}
		tr(this.device, p, this.#t);
	}
	submit() {
		if (this.#s || this.#c) return;
		if (k(this.device, "Frame.submit"), this.#l) throw Kt("Frame.submit");
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
		t && Gn(this.device, t);
		try {
			e = this.#n.length ? hi(this.device, this.#n, "Frame.finish", () => this.#e.finish()) : this.#e.finish();
		} catch (e) {
			this.#d(this.#f());
			let n = t ? A(this.device) : void 0;
			j(this.#t), n && j([n]);
			let r = n?.context ?? t;
			if (!r) throw this.#r?.release(), e;
			this.done = this.#_(this.#g(r.label, r.group, e));
			return;
		}
		if (t) {
			let e = A(this.device);
			e && (this.#t[0] = this.#t[0] ? Xn(e, this.#t[0]) : e);
		}
		let n = this.#t[0]?.context;
		n && Gn(this.device, n);
		try {
			this.#n.length ? hi(this.device, this.#n, "Frame.submit", () => this.device.gpu.queue.submit([e])) : this.device.gpu.queue.submit([e]);
		} catch (e) {
			this.#d(this.#f());
			let t = n ? A(this.device) : void 0;
			j(this.#t), t && j([t]);
			let r = t?.context ?? n;
			if (!r) throw this.#r?.release(), e;
			this.done = this.#_(this.#g(r.label, r.group, e));
			return;
		}
		if (n) {
			let e = A(this.device);
			e && (this.#t[0] = this.#t[0] ? Xn(e, this.#t[0]) : e);
		}
		for (let e of this.#m()) e.frameSubmitted(this);
		this.#d(this.#o), this.done = this.#_(Promise.all([Yn(this.device, this.#t, { errorSink: this.errorSink }), _i(this.#n, this.errorSink ?? ((e) => console.error(e)))]).then(() => void 0));
	}
	cancel() {
		if (!this.#c) {
			if (this.#s) throw qt("Frame.cancel");
			if (this.#l) throw Kt("Frame.cancel");
			this.#c = !0, this.#r?.release(), this.#n.length = 0, this.releaseLifecycle?.(), this.#d(this.#f()), this.#a.clear(), this.#o.clear(), j(this.#t), this.#t.length = 0;
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
		let i = ho(e);
		if (!i) throw r(e);
		let a;
		try {
			a = i[mo]({
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
		await en(this.device), k(this.device, "Frame.validation");
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
}, Vc = class {
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
		let n = Uc(e);
		this.depthReadOnly && Hc(n, this.target), n.encode(this.encoder, this.target, t, (e) => this.validations.push(e), this.capture);
	}
	occlusion(e, t) {
		if (this.assertFrameOpen?.("FramePass.occlusion"), !this.occlusionSource) throw Ct();
		if (this.#e) throw wt();
		let n = this.occlusionSource.beginQuery(e, this.frame);
		this.encoder.beginOcclusionQuery(n), this.#e = !0;
		try {
			typeof t == "function" ? t() : this.draw(t);
		} finally {
			this.#e = !1, this.encoder.endOcclusionQuery();
		}
	}
	bundles(...e) {
		if (this.assertFrameOpen?.("FramePass.bundles"), this.depthReadOnly) throw T("pass cannot replay bundles: bundle records bundles with writable depth/stencil, and WebGPU only executes read-only-recorded bundles in a read-only pass.", "Encode the draws directly with pass.draw(...) inside the depthReadOnly pass.", "FramePass.bundles");
		let t = e.map((e) => po(e) ?? Wc());
		for (let e of t) e.assertReplayable(this.target);
		this.encoder.executeBundles(t.map((e) => e.gpu));
	}
};
function Hc(e, t) {
	if (e.writesDepth()) throw T(`pass cannot encode draw '${e.label}': its depth state writes depth (the default is write: true). Give the draw depth: { write: false } (or depth: false to disable depth testing).`, "Use depth: { write: false } on the draw, or open the pass without depthReadOnly.", "FramePass.draw");
	if (na(t.depth?.format)) {
		let t = e.stencilWritingOps();
		if (t.length) throw T(`pass cannot encode draw '${e.label}': its stencil ops can write (${t.join(", ")}), and the pass's stencil aspect is read-only too.`, "Use \"keep\" for those ops or stencil writeMask: 0, or open the pass without depthReadOnly.", "FramePass.draw");
	}
}
function Uc(e) {
	let t = uo(e);
	if (!t) throw TypeError("Invalid Effect instance: pass.draw() expects a Draw or an Effect created by this library.");
	return t;
}
function Wc() {
	throw new S({
		code: "VGPU-R3-BUNDLE-INVALID",
		message: "p.bundles() expected bundles created by bundle(gpu, { target }, cb).",
		where: "FramePass.bundles"
	});
}
function Gc(e) {
	return xt(`FramePassOptions.timer received ${Q(e)}; expected a TimerSpan from timer.span(name).`, "Create const passTimer = timer(gpu) once, then pass passTimer.span(\"name\") per pass.", "Frame.pass");
}
function Kc(e) {
	return St(`FramePassOptions.visibility received ${Q(e)}; expected a Visibility from visibility(gpu).`, "Create const vis = visibility(gpu) once, then pass { target, visibility: vis } per pass.", "Frame.pass");
}
function qc(e, t, n) {
	if (e === void 0) return;
	if (typeof e != "object" || !e || Array.isArray(e)) throw w(`received ${Q(e)}; expected { x?, y?, width, height, minDepth?, maxDepth? }.`);
	let { x: r = 0, y: i = 0, width: a, height: o, minDepth: s = 0, maxDepth: c = 1 } = e;
	for (let [e, t] of [
		["x", r],
		["y", i],
		["width", a],
		["height", o],
		["minDepth", s],
		["maxDepth", c]
	]) if (typeof t != "number" || !Number.isFinite(t)) throw w(`${e} received ${Q(t)}; expected a finite number.`);
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
function Jc(e, t) {
	if (e === void 0) return;
	if (!Array.isArray(e) || e.length !== 4) throw gt(`received ${Q(e)}; expected [x, y, width, height].`);
	let [n, r, i, a] = e;
	for (let [e, t] of [
		["x", n],
		["y", r],
		["width", i],
		["height", a]
	]) if (typeof t != "number" || !Number.isInteger(t) || t < 0) throw gt(`${e} received ${Q(t)}; expected a non-negative integer.`);
	let [o, s] = t;
	if (n + i > o || r + a > s) throw gt(`[${n}, ${r}, ${i}, ${a}] exceeds the target's current size ${o}x${s}px (x + width <= ${o}, y + height <= ${s}).`);
	return [
		n,
		r,
		i,
		a
	];
}
function Q(e) {
	return typeof e == "string" ? `'${e}'` : Array.isArray(e) ? `[${e.map((e) => Q(e)).join(", ")}]` : typeof e == "object" && e ? "an object" : String(e);
}
function Yc(e) {
	return e !== null && (typeof e == "object" || typeof e == "function") && typeof e.then == "function";
}
var Xc = class {
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
		if (this.#e || Va()) throw Wt();
		this.assertActive?.(t), this.#e = !0, Ua();
		try {
			this.advance();
			let n = this.createFrame();
			if (e) {
				try {
					let r = e(n);
					if (Yc(r)) throw Promise.resolve(r).catch(() => void 0), Ut(t);
				} catch (e) {
					if (Lc(n)) try {
						n.cancel();
					} catch {}
					throw e;
				}
				n.submit();
			}
			return n;
		} finally {
			Wa(), this.#e = !1;
		}
	}
	loop(e, t = {}) {
		let n = !1, r = globalThis.requestAnimationFrame ?? ((e) => setTimeout(() => e(performance.now()), 16)), i = globalThis.cancelAnimationFrame ?? ((e) => clearTimeout(e)), a = t.fps && t.fps > 0 ? 1e3 / t.fps : 0, o, s = 0, c, l = () => {
			n = !0, i(s), c?.(), c = void 0;
		}, u = (t) => {
			if (!n) {
				if (Qc(t, o, a)) {
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
}, Zc = 1;
function Qc(e, t, n) {
	return t === void 0 || n <= 0 || e - t >= n - Zc;
}
//#endregion
//#region node_modules/vgpu/dist/target-offscreen.js
function $c(e) {
	let t = [];
	for (let n of e) try {
		n.destroy();
	} catch (e) {
		t.push(e);
	}
	if (t.length) throw t[0];
}
function el(e, t) {
	return new tl(xn(e, "target").device, t);
}
var tl = class {
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
		this.device = e, Qi(t, e), this.options = Object.freeze({
			...t,
			size: Object.freeze([...t.size]),
			...t.colors ? { colors: Object.freeze(t.colors.map((e) => Object.freeze({ ...e }))) } : {}
		}), this.#i = t.clearColor === void 0 ? Ki : qi(t.clearColor, "target.clearColor"), this.#n = this.options.size, this.#r = this.#l(this.#n);
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
		return Yi(this.options)[0]?.format ?? "rgba8unorm";
	}
	get clearColor() {
		return Ji(this.#i);
	}
	set clearColor(e) {
		this.#i = qi(e, "target.clearColor");
	}
	get sampleCount() {
		return Zi(this.options);
	}
	resize(e) {
		if (this.#s("Target.resize"), this.#o) throw new S({
			code: "VGPU-TARGET-RESIZE-REENTRANT",
			message: "Cannot resize a target from its replacement callbacks.",
			where: "Target.resize"
		});
		if (Qi({
			...this.options,
			size: e
		}, this.device), !ia(this.#n, e)) {
			this.#o = !0;
			try {
				let t = Object.freeze([...e]), n = this.#l(t), r = this.#r;
				this.#n = t, this.#r = n;
				try {
					this.#c();
				} finally {
					$c(r.all);
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
				this.#t.clear(), $c(this.#r.all);
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
			colorAttachments: this.colors.map((e, r) => ea(e, this.#r.msaaColors?.[r], t, n)),
			depthStencilAttachment: this.depth ? ta(this.depth, n, r, i, a) : void 0
		};
	}
	#s(e) {
		if (this.#a) throw new S({
			code: "VGPU-TARGET-DESTROYED",
			message: `Target '${this.options.label ?? "target"}' is destroyed.`,
			where: e,
			fix: "Create a new target; destroyed targets cannot be resized or rendered."
		});
		k(this.device, e);
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
				$c(t);
			} catch {}
			throw e;
		}
	}
	#u(e, t) {
		return Yi(this.options).map((n, r) => t({
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
		return Yi(this.options).map((n, r) => t({
			kind: "2d",
			size: e,
			format: n.format,
			usage: ["render_attachment"],
			sampleCount: 4,
			label: this.options.label ? `${this.options.label}.color${r}` : void 0
		}));
	}
	#f(e, t) {
		let n = Xi(this.options);
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
function nl(e) {
	return ln("browser", e);
}
//#endregion
//#region src/shaders/glass.wgsl
var rl = (e) => (typeof e == "object" && e && Object.values(Object.freeze(e)).forEach(rl), e), il = /* @__PURE__ */ rl({
	version: 2,
	wgsl: "// One continuous glass helix ribbon, ray-marched. All lighting procedural.\nconst PI: f32 = 3.14159265359;\nconst EPS: f32 = 0.0009;\nconst FAR: f32 = 50.0;\n\nstruct Params {\n  resolution: vec2f,\n  zoom: f32,\n  iridescence: f32,\n  thickness: f32,\n  background: f32,\n  dispersion: f32,\n  time: f32,\n  yaw: f32,\n  pitch: f32,\n  roll: f32,\n  ox: f32,\n  oy: f32,\n  pad1: f32,\n}\n@group(0) @binding(0) var<uniform> params: Params;\n\nfn fresnel(ior: f32, cosine: f32) -> f32 {\n  let r0 = (ior - 1.0) / (ior + 1.0);\n  return r0 * r0 + (1.0 - r0 * r0) * pow(1.0 - clamp(cosine, 0.0, 1.0), 5.0);\n}\n\nfn rot2(v: vec2f, ang: f32) -> vec2f {\n  let c = cos(ang); let s = sin(ang);\n  return vec2f(v.x * c - v.y * s, v.x * s + v.y * c);\n}\n\nfn to_object(p0: vec3f) -> vec3f {\n  var p = p0;\n  let yz = rot2(p.yz, params.pitch);\n  p = vec3f(p.x, yz.x, yz.y);\n  let xz = rot2(p.xz, -params.yaw);\n  return vec3f(xz.x, p.y, xz.y);\n}\n\n/* Flowing twisted ribbon: a wide thin band sweeping in slow S-curves,\n   twisting around its own tangent so faces and bright edges alternate. */\nfn coil(p: vec3f) -> f32 {\n  let t = params.time;\n  let u = p.x;\n  // serpentine centerline (two incommensurate waves, slowly drifting)\n  let yc = 1.25 * sin(u * 0.42 + t * 0.10) + 0.5 * sin(u * 0.19 - t * 0.06 + 1.7);\n  let zc = 0.35 * sin(u * 0.31 + t * 0.07 + 0.8);\n  // twist angle along the band\n  let th = 1.45 * sin(u * 0.27 - t * 0.08 + 0.6) + u * 0.08;\n  let ct = cos(th);\n  let st = sin(th);\n  let d = vec3f(0.0, p.y - yc, p.z - zc);\n  let w = d.y * ct + d.z * st;          // along band width\n  let n = -d.y * st + d.z * ct;         // along band thickness\n  let halfw = 1.8 * params.thickness;\n  let e = vec2f(max(abs(w) - halfw, 0.0), abs(n)) ;\n  return (length(vec2f(e.x, e.y)) - 0.085) * 0.55;\n}\n\nfn map(p0: vec3f) -> f32 {\n  // Tunable diagonal roll and offset (live-controlled from the host page).\n  let cr = cos(params.roll);\n  let sr = sin(params.roll);\n  var p = to_object(p0);\n  p = vec3f(p.x * cr - p.y * sr, p.x * sr + p.y * cr, p.z);\n  return coil(p + vec3f(-params.ox, -params.oy, 0.0));\n}\n\nfn normal_at(p: vec3f) -> vec3f {\n  let e = vec2f(0.0012, 0.0);\n  return normalize(vec3f(\n    map(p + e.xyy) - map(p - e.xyy),\n    map(p + e.yxy) - map(p - e.yxy),\n    map(p + e.yyx) - map(p - e.yyx)));\n}\n\nfn march(ro: vec3f, rd: vec3f) -> f32 {\n  // The coil is infinite along x; bound only by depth (camera looks down -z,\n  // the ribbon lives inside |z| ~ 1.8), so it spans the full viewport width.\n  var t = 0.0;\n  if (ro.z > 2.2 && rd.z < 0.0) { t = (ro.z - 2.2) / -rd.z; }\n  let end = select(FAR, t + 4.6 / max(-rd.z, 0.2), ro.z > 2.2);\n  for (var i = 0; i < 200; i++) {\n    let d = abs(map(ro + rd * t));\n    if (d < EPS) { return t; }\n    t += max(d * 0.7, EPS * 0.5);\n    if (t > end) { break; }\n  }\n  return FAR;\n}\n\nfn backdrop() -> vec3f {\n  if (params.background > 1.5) { return vec3f(0.008, 0.012, 0.016); }\n  if (params.background > 0.5) { return vec3f(0.78, 0.85, 0.85); }\n  return vec3f(1.0);\n}\n\n// An infinite white photo studio, two black flags, and long strip softboxes.\nfn studio(direction: vec3f) -> vec3f {\n  let d = normalize(direction);\n  var color = mix(vec3f(0.57, 0.75, 0.74), vec3f(1.08, 1.12, 1.12), smoothstep(-0.65, 0.7, d.y));\n  let flag_a = smoothstep(0.63, 0.70, dot(d, normalize(vec3f(-0.9, -0.2, -0.55))));\n  let flag_b = smoothstep(0.75, 0.86, dot(d, normalize(vec3f(0.75, -0.65, 0.5))));\n  color = mix(color, vec3f(0.005, 0.025, 0.04), max(flag_a, flag_b) * 0.985);\n  let strip_a = pow(max(0.0, 1.0 - abs(dot(d, normalize(vec3f(0.7, 0.15, 0.7))))), 90.0) * smoothstep(-0.3, 0.35, d.y);\n  let strip_b = pow(max(0.0, 1.0 - abs(dot(d, normalize(vec3f(-0.35, 0.85, 0.38))))), 150.0) * smoothstep(-0.5, 0.7, d.z);\n  color += vec3f(1.35, 1.55, 1.5) * strip_a + vec3f(1.25, 1.15, 1.25) * strip_b;\n  let strip_phase = atan2(d.y, d.x);\n  let optical_delta = (d.z - (0.30 + 0.085 * sin(strip_phase * 3.0))) / 0.018;\n  let optical_strip = exp(-optical_delta * optical_delta) * (0.3 + 0.7 * smoothstep(-0.4, 0.5, sin(strip_phase + 0.5)));\n  color += vec3f(6.5, 8.0, 7.0) * optical_strip;\n  return color;\n}\n\nfn film_color(cosine: f32, pobj: vec3f) -> vec3f {\n  let a = atan2(pobj.z, pobj.y);\n  let film_depth = 380.0 + 48.0 * sin(a * 2.0 + pobj.x * 1.4);\n  let transmitted_cosine = sqrt(max(0.0, 1.0 - (1.0 - cosine * cosine) / (1.38 * 1.38)));\n  let phase = (4.0 * PI * 1.38 * film_depth * transmitted_cosine) / vec3f(650.0, 510.0, 475.0);\n  return pow(clamp(0.5 + 0.5 * cos(phase + vec3f(0.3, 0.0, 0.4)), vec3f(0.0), vec3f(1.0)), vec3f(1.25));\n}\n\nfn trace(origin: vec3f, direction: vec3f) -> vec3f {\n  var ro = origin;\n  var rd = direction;\n  var color = vec3f(0.0);\n  var throughput = vec3f(1.0);\n  var inside = false;\n  for (var bounce = 0; bounce < 7; bounce++) {\n    let dist = march(ro, rd);\n    if (dist >= FAR) {\n      color += throughput * backdrop();\n      return color;\n    }\n    if (inside) { throughput *= exp(-vec3f(1.9, 0.30, 0.22) * dist); }\n    let point = ro + rd * dist;\n    var n = normal_at(point);\n    if (inside) { n = -n; }\n    let cosine = clamp(-dot(rd, n), 0.0, 1.0);\n    let f = fresnel(1.48, cosine);\n    let pobj = to_object(point);\n    let film = film_color(cosine, pobj) * vec3f(1.30, 0.36, 1.18);\n    let rim = pow(1.0 - cosine, 2.0);\n    let a = atan2(pobj.z, pobj.y);\n    let spectrum_wave = clamp(0.5 + 0.5 * cos(a * 5.0 + cosine * 10.0 + vec3f(0.0, 2.094, 4.188)), vec3f(0.0), vec3f(1.0));\n    let spectral = (0.008 + 0.992 * spectrum_wave * spectrum_wave) * vec3f(1.32, 0.34, 1.20);\n    let color_patch = pow(clamp(0.5 + 0.5 * sin(a * 3.0 + pobj.x * 1.1), 0.0, 1.0), 4.0);\n    let prism_color = mix(vec3f(0.16, 0.38, 0.98), spectral, color_patch);\n    let coating = params.iridescence * (0.10 + 0.95 * pow(1.0 - cosine, 1.5));\n    let reflectance = clamp(vec3f(f) + film * coating + rim * 0.35, vec3f(0.0), vec3f(0.97));\n    let reflection = reflect(rd, n);\n    var lighting = studio(reflection);\n    lighting = mix(lighting, studio(reflection) * 1.4 + vec3f(0.1), rim * 0.6);\n    let edge_coating = mix(vec3f(1.0), prism_color, rim * min(params.iridescence * 1.4, 1.0));\n    let eta = select(1.0 / 1.48, 1.48, inside);\n    let transmission = refract(rd, n, eta);\n    if (dot(transmission, transmission) < 0.001) {\n      rd = reflection;\n      ro = point + n * EPS * 20.0;\n      throughput *= mix(vec3f(0.99), edge_coating, 0.2);\n    } else {\n      color += throughput * reflectance * lighting * edge_coating;\n      throughput *= (1.0 - reflectance) * edge_coating;\n      let prism = params.dispersion * pow(1.0 - cosine, 3.0);\n      throughput *= vec3f(1.0 - prism * 2.0, 1.0, 1.0 - prism);\n      rd = normalize(transmission);\n      ro = point - n * EPS * 20.0;\n      inside = !inside;\n    }\n    if (max(throughput.r, max(throughput.g, throughput.b)) < 0.015) { return color; }\n  }\n  return color + throughput * studio(rd);\n}\n\n// ENTRY_POINT\nfn sample_px(uv: vec2f) -> vec4f {\n  let aspect = params.resolution.x / params.resolution.y;\n  let screen = vec2f((uv.x - 0.5) * aspect, 0.5 - uv.y);\n  let portrait = aspect < 0.8;\n  let scale = 15.5 / aspect / params.zoom;\n  let shifted = screen + vec2f(0.0, select(0.0, 0.025, portrait));\n  let origin = vec3f(shifted * scale, 9.5);\n  let direction = normalize(vec3f(shifted * 0.035, -1.0));\n  return vec4f(trace(origin, direction), 1.0);\n}\n\n@fragment fn fs_main(@location(0) uv: vec2f) -> @location(0) vec4f {\n  // 2x2 supersampling: four rays per pixel, averaged in linear light.\n  let px = 1.0 / params.resolution;\n  var acc = vec4f(0.0);\n  acc += sample_px(uv + vec2f(-0.25, -0.25) * px);\n  acc += sample_px(uv + vec2f(0.25, -0.25) * px);\n  acc += sample_px(uv + vec2f(-0.25, 0.25) * px);\n  acc += sample_px(uv + vec2f(0.25, 0.25) * px);\n  let traced = acc * 0.25;\n  let mapped = min(traced.rgb, vec3f(1.0));\n  let srgb = mix(mapped * 12.92, 1.055 * pow(max(mapped, vec3f(0.0)), vec3f(1.0 / 2.4)) - 0.055, step(vec3f(0.0031308), mapped));\n  return vec4f(srgb * traced.a, traced.a);\n}\n",
	reflection: {
		bindings: [{
			group: 0,
			binding: 0,
			name: "params",
			mangledName: "params",
			type: {
				kind: "identifier",
				name: "Params",
				mangledName: "_vgsl_128c8389__Params"
			},
			kind: "buffer",
			addressSpace: "uniform",
			struct: {
				name: "Params",
				mangledName: "_vgsl_128c8389__Params",
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
						name: "time",
						type: {
							kind: "scalar",
							name: "f32"
						}
					},
					{
						name: "yaw",
						type: {
							kind: "scalar",
							name: "f32"
						}
					},
					{
						name: "pitch",
						type: {
							kind: "scalar",
							name: "f32"
						}
					},
					{
						name: "roll",
						type: {
							kind: "scalar",
							name: "f32"
						}
					},
					{
						name: "ox",
						type: {
							kind: "scalar",
							name: "f32"
						}
					},
					{
						name: "oy",
						type: {
							kind: "scalar",
							name: "f32"
						}
					},
					{
						name: "pad1",
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
					mangledName: "_vgsl_128c8389__Params"
				},
				align: 8,
				size: 56,
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
						name: "time",
						offset: 28,
						align: 4,
						size: 4,
						type: {
							kind: "scalar",
							name: "f32"
						},
						layout: {
							name: "time",
							mangledName: "time",
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
						name: "yaw",
						offset: 32,
						align: 4,
						size: 4,
						type: {
							kind: "scalar",
							name: "f32"
						},
						layout: {
							name: "yaw",
							mangledName: "yaw",
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
						name: "pitch",
						offset: 36,
						align: 4,
						size: 4,
						type: {
							kind: "scalar",
							name: "f32"
						},
						layout: {
							name: "pitch",
							mangledName: "pitch",
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
						name: "roll",
						offset: 40,
						align: 4,
						size: 4,
						type: {
							kind: "scalar",
							name: "f32"
						},
						layout: {
							name: "roll",
							mangledName: "roll",
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
						name: "ox",
						offset: 44,
						align: 4,
						size: 4,
						type: {
							kind: "scalar",
							name: "f32"
						},
						layout: {
							name: "ox",
							mangledName: "ox",
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
						name: "oy",
						offset: 48,
						align: 4,
						size: 4,
						type: {
							kind: "scalar",
							name: "f32"
						},
						layout: {
							name: "oy",
							mangledName: "oy",
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
						name: "pad1",
						offset: 52,
						align: 4,
						size: 4,
						type: {
							kind: "scalar",
							name: "f32"
						},
						layout: {
							name: "pad1",
							mangledName: "pad1",
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
					minBindingSize: 56
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
			}],
			samplingPairs: []
		}],
		overrides: [],
		featuresRequired: [],
		aliases: [],
		structs: [{
			name: "Params",
			mangledName: "_vgsl_128c8389__Params",
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
					name: "time",
					type: {
						kind: "scalar",
						name: "f32"
					}
				},
				{
					name: "yaw",
					type: {
						kind: "scalar",
						name: "f32"
					}
				},
				{
					name: "pitch",
					type: {
						kind: "scalar",
						name: "f32"
					}
				},
				{
					name: "roll",
					type: {
						kind: "scalar",
						name: "f32"
					}
				},
				{
					name: "ox",
					type: {
						kind: "scalar",
						name: "f32"
					}
				},
				{
					name: "oy",
					type: {
						kind: "scalar",
						name: "f32"
					}
				},
				{
					name: "pad1",
					type: {
						kind: "scalar",
						name: "f32"
					}
				}
			]
		}],
		hostShareableLayouts: [{
			name: "params",
			mangledName: "params",
			layoutMode: "wgsl-host-shareable-v1",
			type: {
				kind: "identifier",
				name: "Params",
				mangledName: "_vgsl_128c8389__Params"
			},
			align: 8,
			size: 56,
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
					name: "time",
					offset: 28,
					align: 4,
					size: 4,
					type: {
						kind: "scalar",
						name: "f32"
					},
					layout: {
						name: "time",
						mangledName: "time",
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
					name: "yaw",
					offset: 32,
					align: 4,
					size: 4,
					type: {
						kind: "scalar",
						name: "f32"
					},
					layout: {
						name: "yaw",
						mangledName: "yaw",
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
					name: "pitch",
					offset: 36,
					align: 4,
					size: 4,
					type: {
						kind: "scalar",
						name: "f32"
					},
					layout: {
						name: "pitch",
						mangledName: "pitch",
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
					name: "roll",
					offset: 40,
					align: 4,
					size: 4,
					type: {
						kind: "scalar",
						name: "f32"
					},
					layout: {
						name: "roll",
						mangledName: "roll",
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
					name: "ox",
					offset: 44,
					align: 4,
					size: 4,
					type: {
						kind: "scalar",
						name: "f32"
					},
					layout: {
						name: "ox",
						mangledName: "ox",
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
					name: "oy",
					offset: 48,
					align: 4,
					size: 4,
					type: {
						kind: "scalar",
						name: "f32"
					},
					layout: {
						name: "oy",
						mangledName: "oy",
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
					name: "pad1",
					offset: 52,
					align: 4,
					size: 4,
					type: {
						kind: "scalar",
						name: "f32"
					},
					layout: {
						name: "pad1",
						mangledName: "pad1",
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
		}]
	},
	sourceChecksum: "fnv1a64-utf16le-v1:f62899cd9f84b2b1",
	producer: "@vgpu/wgsl/prepare-v2",
	functionExports: []
}), $ = {
	iridescence: .85,
	thickness: 1,
	speed: 1,
	background: 0
};
function al(e, t, n = 0) {
	return { params: {
		resolution: [e, t],
		zoom: 1,
		iridescence: $.iridescence,
		thickness: $.thickness,
		background: $.background,
		dispersion: .018,
		time: n,
		yaw: 0,
		pitch: 0,
		roll: .64,
		ox: 2.25,
		oy: 5,
		pad1: 0
	} };
}
//#endregion
//#region src/renderer.ts
var ol = class {
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
			...$,
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
		if (this.gpu = await nl(), this.disposed) {
			this.gpu.dispose();
			return;
		}
		this.gpu.onError(this.onError), this.gpu.lost.then((e) => {
			this.disposed || this.onError(/* @__PURE__ */ Error(`Graphics device lost: ${e.message}`));
		}), this.output = Ia(this.gpu, this.canvas, {
			autoResize: !1,
			size: [1, 1],
			alphaMode: "opaque"
		}), this.glass = Ec(this.gpu, il, {
			label: "Datavant / refractive glass",
			set: al(1, 1, this.state.time)
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
		if (this.previous = e, this.state.playing && t > 0 && (this.emaDt = this.emaDt ? this.emaDt * .95 + t * .05 : t, this.state.frames > 90 && this.emaDt > .03 && this.dprCap > 1.2 && (this.dprCap -= .25, this.emaDt = 0, this.resize())), this.exporting) {
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
			this.glass.set({ params: {
				zoom: this.state.zoom,
				time: this.state.time,
				yaw: this.state.yaw,
				pitch: this.state.pitch
			} }), Ic(this.gpu, (e) => e.pass(this.output, this.glass)), this.state.frames++, this.state.frameMs = performance.now() - i, this.dirty = !1;
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
		Object.assign(this.state, $, {
			time: 0,
			yaw: 0,
			pitch: 0,
			zoom: 1
		}), Object.assign(this.pose, {
			yaw: 0,
			pitch: 0,
			zoom: 1
		}), this.glass.set({ params: {
			iridescence: $.iridescence,
			thickness: $.thickness,
			background: $.background
		} }), this.invalidate(), this.onPlaybackChange();
	}
	async exportPng() {
		if (this.exporting) return;
		this.exporting = !0;
		let e;
		try {
			e = await nl();
			let t = 1800, n = Math.round(t * this.output.size[1] / this.output.size[0]), r = el(e, { size: [t, n] }), i = Ec(e, il, { set: { params: {
				...al(t, n, this.state.time).params,
				zoom: this.state.zoom,
				iridescence: this.state.iridescence,
				thickness: this.state.thickness,
				background: this.state.background,
				yaw: this.state.yaw,
				pitch: this.state.pitch
			} } });
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
async function sl(e) {
	let t = new ol(e, () => {}, () => {}, !1);
	if (await t.start(), !t.state.ready) throw Error("renderer not ready");
	t.setMaterial("speed", .85), t.setZoomTarget(.6);
	let n = matchMedia("(prefers-reduced-motion: reduce)"), r = {
		renderer: t,
		parallax: 1
	};
	window.__dvRibbon = r;
	let i = 0;
	return window.addEventListener("mousemove", (e) => {
		n.matches || i || (i = requestAnimationFrame(() => {
			i = 0;
			let n = e.clientX / innerWidth * 2 - 1, a = e.clientY / innerHeight * 2 - 1;
			t.setPoseTarget(n * .066 * r.parallax, a * .048 * r.parallax);
		}));
	}, { passive: !0 }), window.addEventListener("pagehide", () => t.dispose(), { once: !0 }), t;
}
//#endregion
export { sl as mountGlass };
