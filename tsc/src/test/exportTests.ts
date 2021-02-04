/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import * as assert from 'assert';
import * as os from 'os';

import { lsif } from './lsifs';
import * as ts from 'typescript';
import { Element, ElementTypes, VertexLabels } from 'lsif-protocol';

suite('Export Tests', () => {
	const compilerOptions: ts.CompilerOptions = {
		module: ts.ModuleKind.CommonJS,
		target: ts.ScriptTarget.ES5,
		esModuleInterop: true,
		rootDir: '/@test'
	};
	test('Simple export', async () => {
		const emitter = await lsif('/@test', new Map([
			[
				'/@test/a.ts',
				[
					'export function foo(): void { }',
				].join(os.EOL)
			],
			[
				'/@test/b.ts',
				[
					'import { foo } from "./a";',
					'foo()'
				].join(os.EOL)
			]
		]), compilerOptions);
		const validate: Element[] = [
			JSON.parse('{"id":15,"type":"vertex","label":"resultSet"}'),
			JSON.parse('{"id":16,"type":"vertex","label":"moniker","scheme":"tsc","identifier":"a:foo","unique":"group","kind":"export"}'),
			JSON.parse('{"id":17,"type":"edge","label":"moniker","outV":15,"inV":16}'),
			JSON.parse('{"id":18,"type":"vertex","label":"range","start":{"line":0,"character":16},"end":{"line":0,"character":19},"tag":{"type":"definition","text":"foo","kind":12,"fullRange":{"start":{"line":0,"character":0},"end":{"line":0,"character":31}}}}')
		];
		for (const elem of validate) {
			assert.deepEqual(emitter.elements.get(elem.id), elem);
		}
	});
	test('Const export', async () => {
		const emitter = await lsif('/@test', new Map([
			[
				'/@test/a.ts',
				[
					'export const x: number | string = 10;',
				].join(os.EOL)
			],
			[
				'/@test/b.ts',
				[
					'import { x } from "./a";',
					'x;'
				].join(os.EOL)
			]
		]), compilerOptions);
		const validate: Element[] = [
			JSON.parse('{"id":11,"type":"vertex","label":"moniker","scheme":"tsc","identifier":"a:","unique":"group","kind":"export"}'),
			JSON.parse('{"id":16,"type":"vertex","label":"moniker","scheme":"tsc","identifier":"a:x","unique":"group","kind":"export"}')
		];
		for (const elem of validate) {
			assert.deepEqual(emitter.elements.get(elem.id), elem);
		}
	});
	test('Namespace export', async () => {
		const emitter = await lsif('/@test', new Map([
			[
				'/@test/a.ts',
				[
					'export namespace N { export const a: number = 10; }',
				].join(os.EOL)
			],
			[
				'/@test/b.ts',
				[
					'import { N } from "./a";',
					'let x = N.a;'
				].join(os.EOL)
			]
		]), compilerOptions);
		const validate: Element[] = [
			JSON.parse('{"id":16,"type":"vertex","label":"moniker","scheme":"tsc","identifier":"a:N","unique":"group","kind":"export"}'),
			JSON.parse('{"id":23,"type":"vertex","label":"moniker","scheme":"tsc","identifier":"a:N.a","unique":"group","kind":"export"}')
		];
		for (const elem of validate) {
			assert.deepEqual(emitter.elements.get(elem.id), elem);
		}
	});
	test('Export { foo }', async () => {
		const emitter = await lsif('/@test', new Map([
			[
				'/@test/a.ts',
				[
					'function foo() { }',
					'export { foo };'
				].join(os.EOL)
			],
			[
				'/@test/b.ts',
				[
					'import { foo } from "./a";',
					'foo();'
				].join(os.EOL)
			]
		]), compilerOptions);
		const validate: Element[] = [
			JSON.parse('{"id":15,"type":"vertex","label":"resultSet"}'),
			JSON.parse('{"id":16,"type":"vertex","label":"moniker","scheme":"tsc","identifier":"YMJQRLr/qZiUrOskF3looA==","unique":"document","kind":"local"}'),
			JSON.parse('{"id":17,"type":"edge","label":"moniker","outV":15,"inV":16}'),
			JSON.parse('{"id":22,"type":"vertex","label":"resultSet"}'),
			JSON.parse('{"id":23,"type":"edge","label":"next","outV":22,"inV":15}'),
			JSON.parse('{"id":24,"type":"vertex","label":"moniker","scheme":"tsc","identifier":"a:foo","unique":"group","kind":"export"}'),
			JSON.parse('{"id":25,"type":"edge","label":"moniker","outV":22,"inV":24}')
		];
		for (const elem of validate) {
			assert.deepEqual(emitter.elements.get(elem.id), elem);
		}
	});
	test('Export { foo } with children', async () => {
		const emitter = await lsif('/@test', new Map([
			[
				'/@test/a.ts',
				[
					'namespace Foo { export const x = 10; }',
					'export { Foo };'
				].join(os.EOL)
			],
			[
				'/@test/b.ts',
				[
					'import { Foo } from "./a";',
					'Foo.x;'
				].join(os.EOL)
			]
		]), compilerOptions);
		assert.deepEqual(emitter.lastId, 97);
		const validate: Element[] = [
			JSON.parse('{"id":16,"type":"vertex","label":"moniker","scheme":"tsc","identifier":"1LlCpvFOQRTIFLWhB5+QPw==","unique":"document","kind":"local"}'),
			JSON.parse('{"id":23,"type":"vertex","label":"moniker","scheme":"tsc","identifier":"YF1/MlZ3n0Ah8oRIIBxt2A==","unique":"document","kind":"local"}'),
			// This needs its own result set since we have a different hover.
			JSON.parse('{"id":29,"type":"vertex","label":"resultSet"}'),
			JSON.parse('{"id":30,"type":"edge","label":"next","outV":29,"inV":15}'),
			JSON.parse('{"id":31,"type":"vertex","label":"moniker","scheme":"tsc","identifier":"a:Foo","unique":"group","kind":"export"}'),
			JSON.parse('{"id":32,"type":"edge","label":"moniker","outV":29,"inV":31}'),
			// JSON.parse('{"id":35,"type":"vertex","label":"hoverResult","result":{"contents":[{"language":"typescript","value":"(alias) namespace foo\\nexport foo"}]}}'),
			JSON.parse('{"id":36,"type":"edge","label":"textDocument/hover","outV":29,"inV":35}'),
			JSON.parse('{"id":37,"type":"vertex","label":"moniker","scheme":"tsc","identifier":"a:Foo.x","unique":"group","kind":"export"}'),
			JSON.parse('{"id":38,"type":"edge","label":"attach","outV":37,"inV":23}')
		];
		for (const elem of validate) {
			assert.deepEqual(emitter.elements.get(elem.id), elem);
		}
	});
	test('Export { foo } with import', async () => {
		const emitter = await lsif('/@test', new Map([
			[
				'/@test/a.ts',
				[
					'function foo() { }',
					'export { foo };'
				].join(os.EOL)
			],
			[
				'/@test/b.ts',
				[
					'import { foo } from "./a";',
					'foo();'
				].join(os.EOL)
			]
		]), compilerOptions);
		const validate: Element[] = [
			JSON.parse('{"id":15,"type":"vertex","label":"resultSet"}'),
			JSON.parse('{"id":16,"type":"vertex","label":"moniker","scheme":"tsc","identifier":"YMJQRLr/qZiUrOskF3looA==","unique":"document","kind":"local"}'),
			JSON.parse('{"id":39,"type":"vertex","label":"referenceResult"}'),
			JSON.parse('{"id":40,"type":"edge","label":"textDocument/references","outV":15,"inV":39}'),
			JSON.parse('{"id":60,"type":"vertex","label":"range","start":{"line":0,"character":9},"end":{"line":0,"character":12},"tag":{"type":"definition","text":"foo","kind":7,"fullRange":{"start":{"line":0,"character":9},"end":{"line":0,"character":12}}}}'),
			JSON.parse('{"id":66,"type":"vertex","label":"range","start":{"line":1,"character":0},"end":{"line":1,"character":3},"tag":{"type":"reference","text":"foo"}}'),
			JSON.parse('{"id":74,"type":"edge","label":"item","outV":39,"inVs":[60,66],"shard":49,"property":"references"}')
		];
		for (const elem of validate) {
			assert.deepEqual(emitter.elements.get(elem.id), elem);
		}
	});
	test('Export { _foo as foo }', async () => {
		const emitter = await lsif('/@test', new Map([
			[
				'/@test/a.ts',
				[
					'function _foo() { }',
					'export { _foo as foo };'
				].join(os.EOL)
			],
			[
				'/@test/b.ts',
				[
					'import { foo } from "./a";',
					'foo();'
				].join(os.EOL)
			]
		]), compilerOptions);
		const validate: Element[] = [
			// _foo
			JSON.parse('{"id":15,"type":"vertex","label":"resultSet"}'),
			JSON.parse('{"id":16,"type":"vertex","label":"moniker","scheme":"tsc","identifier":"YeBaOlHI3V6HYvNguYaW9Q==","unique":"document","kind":"local"}'),
			JSON.parse('{"id":17,"type":"edge","label":"moniker","outV":15,"inV":16}'),
			JSON.parse('{"id":18,"type":"vertex","label":"range","start":{"line":0,"character":9},"end":{"line":0,"character":13},"tag":{"type":"definition","text":"_foo","kind":12,"fullRange":{"start":{"line":0,"character":0},"end":{"line":0,"character":19}}}}'),
			JSON.parse('{"id":19,"type":"edge","label":"next","outV":18,"inV":15}'),
			// Alias foo with reference result since it is a rename
			JSON.parse('{"id":24,"type":"vertex","label":"resultSet"}'),
			JSON.parse('{"id":25,"type":"vertex","label":"moniker","scheme":"tsc","identifier":"a:foo","unique":"group","kind":"export"}'),
			JSON.parse('{"id":26,"type":"edge","label":"moniker","outV":24,"inV":25}'),
			JSON.parse('{"id":27,"type":"vertex","label":"range","start":{"line":1,"character":17},"end":{"line":1,"character":20},"tag":{"type":"definition","text":"foo","kind":7,"fullRange":{"start":{"line":1,"character":9},"end":{"line":1,"character":20}}}}'),
			JSON.parse('{"id":28,"type":"vertex","label":"referenceResult"}'),
			JSON.parse('{"id":29,"type":"edge","label":"textDocument/references","outV":24,"inV":28}'),
			// The reference result for _foo
			JSON.parse('{"id":42,"type":"vertex","label":"referenceResult"}'),
			JSON.parse('{"id":43,"type":"edge","label":"textDocument/references","outV":15,"inV":42}'),
			JSON.parse('{"id":46,"type":"edge","label":"item","outV":42,"inVs":[28],"shard":8,"property":"referenceResults"}')
		];
		for (const elem of validate) {
			assert.deepEqual(emitter.elements.get(elem.id), elem);
		}
	});
	test('Export = function', async () => {
		const emitter = await lsif('/@test', new Map([
			[
				'/@test/a.ts',
				[
					'function foo(): void { }',
					'export = foo;'
				].join(os.EOL)
			],
			[
				'/@test/b.ts',
				[
					'import foo from "./a";',
					'foo();'
				].join(os.EOL)
			]
		]), compilerOptions);
		const validate: Element[] = [
			JSON.parse('{"id":15,"type":"vertex","label":"resultSet"}'),
			JSON.parse('{"id":22,"type":"vertex","label":"resultSet"}'),
			JSON.parse('{"id":23,"type":"edge","label":"next","outV":22,"inV":15}'),
			JSON.parse('{"id":24,"type":"vertex","label":"moniker","scheme":"tsc","identifier":"a:export=","unique":"group","kind":"export"}'),
			JSON.parse('{"id":25,"type":"edge","label":"moniker","outV":22,"inV":24}')
		];
		for (const elem of validate) {
			assert.deepEqual(emitter.elements.get(elem.id), elem);
		}
	});
	test('Export = Interface', async () => {
		const emitter = await lsif('/@test', new Map([
			[
				'/@test/a.ts',
				[
					'interface I { foo(): void; }',
					'export = I;'
				].join(os.EOL)
			],
			[
				'/@test/b.ts',
				[
					'import I from "./a";',
					'let i: I;',
					'i.foo();'
				].join(os.EOL)
			]
		]), compilerOptions);
		const validate: Element[] = [
			JSON.parse('{"id":22,"type":"vertex","label":"resultSet"}'),
			JSON.parse('{"id":23,"type":"vertex","label":"moniker","scheme":"tsc","identifier":"WzmMfsn1pdjmwBw/mXw4bw==","unique":"document","kind":"local"}'),
			JSON.parse('{"id":24,"type":"edge","label":"moniker","outV":22,"inV":23}'),
			JSON.parse('{"id":25,"type":"vertex","label":"range","start":{"line":0,"character":14},"end":{"line":0,"character":17},"tag":{"type":"definition","text":"foo","kind":7,"fullRange":{"start":{"line":0,"character":14},"end":{"line":0,"character":26}}}}'),
			JSON.parse('{"id":26,"type":"edge","label":"next","outV":25,"inV":22}'),
			JSON.parse('{"id":35,"type":"vertex","label":"moniker","scheme":"tsc","identifier":"a:export=.foo","unique":"group","kind":"export"}'),
			JSON.parse('{"id":36,"type":"edge","label":"attach","outV":35,"inV":23}')
		];
		for (const elem of validate) {
			assert.deepEqual(emitter.elements.get(elem.id), elem);
		}
	});
	test('Export default function', async () => {
		const emitter = await lsif('/@test', new Map([
			[
				'/@test/a.ts',
				[
					'function foo(): void { }',
					'export default foo;'
				].join(os.EOL)
			],
			[
				'/@test/b.ts',
				[
					'import foo from "./a";',
					'foo();'
				].join(os.EOL)
			]
		]), compilerOptions);
		const validate: Element[] = [
			JSON.parse('{"id":15,"type":"vertex","label":"resultSet"}'),
			JSON.parse('{"id":22,"type":"vertex","label":"resultSet"}'),
			JSON.parse('{"id":23,"type":"edge","label":"next","outV":22,"inV":15}'),
			JSON.parse('{"id":24,"type":"vertex","label":"moniker","scheme":"tsc","identifier":"a:default","unique":"group","kind":"export"}'),
			JSON.parse('{"id":25,"type":"edge","label":"moniker","outV":22,"inV":24}')
		];
		for (const elem of validate) {
			assert.deepEqual(emitter.elements.get(elem.id), elem);
		}
	});
	test('Export default Interface', async () => {
		const emitter = await lsif('/@test', new Map([
			[
				'/@test/a.ts',
				[
					'interface I { foo(): void; }',
					'export default I;'
				].join(os.EOL)
			],
			[
				'/@test/b.ts',
				[
					'import I from "./a";',
					'let i: I;',
					'i.foo();'
				].join(os.EOL)
			]
		]), compilerOptions);
		const validate: Element[] = [
			JSON.parse('{"id":22,"type":"vertex","label":"resultSet"}'),
			JSON.parse('{"id":23,"type":"vertex","label":"moniker","scheme":"tsc","identifier":"WzmMfsn1pdjmwBw/mXw4bw==","unique":"document","kind":"local"}'),
			JSON.parse('{"id":24,"type":"edge","label":"moniker","outV":22,"inV":23}'),
			JSON.parse('{"id":25,"type":"vertex","label":"range","start":{"line":0,"character":14},"end":{"line":0,"character":17},"tag":{"type":"definition","text":"foo","kind":7,"fullRange":{"start":{"line":0,"character":14},"end":{"line":0,"character":26}}}}'),
			JSON.parse('{"id":26,"type":"edge","label":"next","outV":25,"inV":22}'),
			JSON.parse('{"id":35,"type":"vertex","label":"moniker","scheme":"tsc","identifier":"a:default.foo","unique":"group","kind":"export"}'),
			JSON.parse('{"id":36,"type":"edge","label":"attach","outV":35,"inV":23}')
		];
		for (const elem of validate) {
			assert.deepEqual(emitter.elements.get(elem.id), elem);
		}
	});
	test('Export variable declaration', async () => {
		const emitter = await lsif('/@test', new Map([
			[
				'/@test/a.ts',
				[
					'export let foo: { touch: boolean };'
				].join(os.EOL)
			],
			[
				'/@test/b.ts',
				[
					'import { foo } from "./a";',
					'foo.touch;'
				].join(os.EOL)
			]
		]), compilerOptions);
		assert.deepEqual(emitter.lastId, 86);
		const validate: Element[] = [
			JSON.parse('{"id":16,"type":"vertex","label":"moniker","scheme":"tsc","identifier":"a:foo","unique":"group","kind":"export"}'),
			JSON.parse('{"id":29,"type":"vertex","label":"moniker","scheme":"tsc","identifier":"a:foo.touch","unique":"group","kind":"export"}')
		];
		for (const elem of validate) {
			assert.deepEqual(emitter.elements.get(elem.id), elem);
		}
	});
	test('Export variable declaration with inferred type', async () => {
		const emitter = await lsif('/@test', new Map([
			[
				'/@test/a.ts',
				[
					'export const foo = { touch: true };'
				].join(os.EOL)
			],
			[
				'/@test/b.ts',
				[
					'import { foo } from "./a";',
					'foo.touch;'
				].join(os.EOL)
			]
		]), compilerOptions);
		assert.deepEqual(emitter.lastId, 96);
		const validate: Element[] = [
			JSON.parse('{"id":16,"type":"vertex","label":"moniker","scheme":"tsc","identifier":"a:foo","unique":"group","kind":"export"}'),
			JSON.parse('{"id":29,"type":"vertex","label":"moniker","scheme":"tsc","identifier":"a:foo.touch","unique":"group","kind":"export"}')
		];
		for (const elem of validate) {
			assert.deepEqual(emitter.elements.get(elem.id), elem);
		}
	});
	test('Export inferred function return type', async () => {
		const emitter = await lsif('/@test', new Map([
			[
				'/@test/a.ts',
				[
					'export function foo() { return { touch: true }; }'
				].join(os.EOL)
			],
			[
				'/@test/b.ts',
				[
					'import { foo } from "./a";',
					'foo().touch;'
				].join(os.EOL)
			]
		]), compilerOptions);
		assert.deepEqual(emitter.lastId, 98);
		const validate: Element[] = [
			JSON.parse('{"id":16,"type":"vertex","label":"moniker","scheme":"tsc","identifier":"a:foo","unique":"group","kind":"export"}'),
			JSON.parse('{"id":23,"type":"vertex","label":"moniker","scheme":"tsc","identifier":"lvWOeIaS+OEaVbiuAAY5gQ==","unique":"document","kind":"local"}'),
			JSON.parse('{"id":29,"type":"vertex","label":"moniker","scheme":"tsc","identifier":"a:foo.__rt.touch","unique":"group","kind":"export"}')
		];
		for (const elem of validate) {
			assert.deepEqual(emitter.elements.get(elem.id), elem);
		}
	});
	test('Export inferred method return type', async () => {
		const emitter = await lsif('/@test', new Map([
			[
				'/@test/a.ts',
				[
					'export class Foo { public bar() { return { touch: true }; } }'
				].join(os.EOL)
			],
			[
				'/@test/b.ts',
				[
					'import { Foo } from "./a";',
					'let foo: Foo;',
					'foo.bar().touch;'
				].join(os.EOL)
			]
		]), compilerOptions);
		assert.deepEqual(emitter.lastId, 137);
		const validate: Element[] = [
			JSON.parse('{"id":23,"type":"vertex","label":"moniker","scheme":"tsc","identifier":"a:Foo.bar","unique":"group","kind":"export"}'),
			JSON.parse('{"id":30,"type":"vertex","label":"moniker","scheme":"tsc","identifier":"Af/0LRnO44z0Y0dy9TkkPg==","unique":"document","kind":"local"}'),
			JSON.parse('{"id":36,"type":"vertex","label":"moniker","scheme":"tsc","identifier":"a:Foo.bar.__rt.touch","unique":"group","kind":"export"}'),
			JSON.parse('{"id":37,"type":"edge","label":"attach","outV":36,"inV":30}')
		];
		for (const elem of validate) {
			assert.deepEqual(emitter.elements.get(elem.id), elem);
		}
	});
	test('Export composite return type', async () => {
		const emitter = await lsif('/@test', new Map([
			[
				'/@test/a.ts',
				[
					'export interface Foo { bar(): { toString(): string } | { toString(): number }; }'
				].join(os.EOL)
			],
			[
				'/@test/b.ts',
				[
					'import { Foo } from "./a";',
					'let foo: Foo;',
					'foo.bar().toString();'
				].join(os.EOL)
			]
		]), compilerOptions);
		assert.deepEqual(emitter.lastId, 146);
		const validate: Element[] = [
			JSON.parse('{"id":43,"type":"vertex","label":"moniker","scheme":"tsc","identifier":"a:Foo.bar.__rt.toString","unique":"group","kind":"export"}'),
			JSON.parse('{"id":44,"type":"edge","label":"attach","outV":43,"inV":30}'),
			JSON.parse('{"id":45,"type":"vertex","label":"moniker","scheme":"tsc","identifier":"a:Foo.bar.__rt.toString","unique":"group","kind":"export"}'),
			JSON.parse('{"id":46,"type":"edge","label":"attach","outV":45,"inV":37}')
		];
		for (const elem of validate) {
			assert.deepEqual(emitter.elements.get(elem.id), elem);
		}
	});
	test('Export type via property', async () => {
		const emitter = await lsif('/@test', new Map([
			[
				'/@test/a.ts',
				[
					'interface Foo { touch: boolean; }',
					'export class Bar { foo: Foo; }'
				].join(os.EOL)
			],
			[
				'/@test/b.ts',
				[
					'import { Bar } from "./a";',
					'let bar: Bar = new Bar();',
					'bar.foo.touch;'
				].join(os.EOL)
			]
		]), compilerOptions);
		// There will not be a moniker for a:Bar.foo.touch since interface Foo is named.
		// However symbol data must survive for b.ts
		assert.deepEqual(emitter.lastId, 136);
	});
	test('Export type via property signature', async () => {
		const emitter = await lsif('/@test', new Map([
			[
				'/@test/a.ts',
				[
					'interface Foo { touch: boolean; }',
					'export interface Bar { foo: Foo; }'
				].join(os.EOL)
			],
			[
				'/@test/b.ts',
				[
					'import { Bar } from "./a";',
					'let bar: Bar;',
					'bar.foo.touch;'
				].join(os.EOL)
			]
		]), compilerOptions);
		assert.deepEqual(emitter.lastId, 134);
		// There will not be a moniker for a:Bar.foo.touch since interface Foo is named.
		// However symbol data must survive for b.ts
	});
	test('Export type via variable declaration in namespace', async () => {
		const emitter = await lsif('/@test', new Map([
			[
				'/@test/a.ts',
				[
					'interface Foo { touch: boolean; }',
					'export namespace Bar { export let foo: Foo; }'
				].join(os.EOL)
			],
			[
				'/@test/b.ts',
				[
					'import { Bar } from "./a";',
					'Bar.foo.touch;'
				].join(os.EOL)
			]
		]), compilerOptions);
		assert.deepEqual(emitter.lastId, 118);
		// There will not be a moniker for a:Bar.foo.touch since interface Foo is named.
		// However symbol data must survive for b.ts
	});
	test('Export type via variable declaration with anonymous class declaration', async () => {
		const emitter = await lsif('/@test', new Map([
			[
				'/@test/a.ts',
				[
					'abstract class Foo { public abstract doIt(): boolean; }',
					'export namespace Bar { export const foo: Foo = new class extends Foo { public doIt(): boolean { return true; } } ; }'
				].join(os.EOL)
			],
			[
				'/@test/b.ts',
				[
					'import { Bar } from "./a";',
					'Bar.foo.doIt();'
				].join(os.EOL)
			]
		]), compilerOptions);
		assert.deepEqual(emitter.lastId, 133);
		// There will not be a moniker for a:Bar.foo.touch since interface Foo is named.
		// However symbol data must survive for b.ts
	});
	test('Export function with literal param', async () => {
		const emitter = await lsif('/@test', new Map([
			[
				'/@test/a.ts',
				[
					'export function foo(arg: { key: number; value: number }): void { }'
				].join(os.EOL)
			],
			[
				'/@test/b.ts',
				[
					'import { foo } from "./a";',
					'foo({ key: 10, value: 20 });'
				].join(os.EOL)
			]
		]), compilerOptions);
		// Tests that the LSIF tool doesn't throw due to data recreation.
		assert.deepEqual(emitter.lastId, 141);
	});
	test('Export function with callback signature', async () => {
		const emitter = await lsif('/@test', new Map([
			[
				'/@test/a.ts',
				[
					'export function foo(callback: (entry: { key: string; value: number; }, remove: () => void) => void): void { }'
				].join(os.EOL)
			],
			[
				'/@test/b.ts',
				[
					'import { foo } from "./a";',
					'foo((e, r) => { e.key; r.value });'
				].join(os.EOL)
			]
		]), compilerOptions);
		assert.deepEqual(emitter.lastId, 178);
		const validate: Element[] = [
			JSON.parse('{"id":36,"type":"vertex","label":"moniker","scheme":"tsc","identifier":"a:foo.__arg.callback.__arg.entry.key","unique":"group","kind":"export"}'),
			JSON.parse('{"id":37,"type":"edge","label":"attach","outV":36,"inV":23}'),
			JSON.parse('{"id":38,"type":"vertex","label":"moniker","scheme":"tsc","identifier":"a:foo.__arg.callback.__arg.entry.value","unique":"group","kind":"export"}'),
			JSON.parse('{"id":39,"type":"edge","label":"attach","outV":38,"inV":30}')
		];
		for (const elem of validate) {
			assert.deepEqual(emitter.elements.get(elem.id), elem);
		}
	});
	test('Export function type with callback signature', async () => {
		const emitter = await lsif('/@test', new Map([
			[
				'/@test/a.ts',
				[
					'export interface Func { (callback: (entry: { key: string; value: number; }) => void); }'
				].join(os.EOL)
			],
			[
				'/@test/b.ts',
				[
					'import { Func } from "./a";',
					'let f: Func;',
					'f(e => { e.key; e.value; });'
				].join(os.EOL)
			]
		]), compilerOptions);
		assert.deepEqual(emitter.lastId, 168);
		const validate: Element[] = [
			JSON.parse('{"id":36,"type":"vertex","label":"moniker","scheme":"tsc","identifier":"a:Func.__arg.callback.__arg.entry.key","unique":"group","kind":"export"}'),
			JSON.parse('{"id":37,"type":"edge","label":"attach","outV":36,"inV":23}'),
			JSON.parse('{"id":38,"type":"vertex","label":"moniker","scheme":"tsc","identifier":"a:Func.__arg.callback.__arg.entry.value","unique":"group","kind":"export"}'),
			JSON.parse('{"id":39,"type":"edge","label":"attach","outV":38,"inV":30}')
		];
		for (const elem of validate) {
			assert.deepEqual(emitter.elements.get(elem.id), elem);
		}
	});
	test('Export function with callback signature as return value', async () => {
		const emitter = await lsif('/@test', new Map([
			[
				'/@test/a.ts',
				[
					'export function foo(): (entry: { key: number; value: number; }) => void { return (entry: { key: number; value: number; }) => { return; }}'
				].join(os.EOL)
			],
			[
				'/@test/b.ts',
				[
					'import { foo } from "./a";',
					'foo()({ key: 10, value: 20});'
				].join(os.EOL)
			]
		]), compilerOptions);
		assert.deepEqual(emitter.lastId, 180);
		const validate: Element[] = [
			JSON.parse('{"id":36,"type":"vertex","label":"moniker","scheme":"tsc","identifier":"a:foo.__rt.__arg.entry.key","unique":"group","kind":"export"}'),
			JSON.parse('{"id":37,"type":"edge","label":"attach","outV":36,"inV":23}'),
			JSON.parse('{"id":38,"type":"vertex","label":"moniker","scheme":"tsc","identifier":"a:foo.__rt.__arg.entry.value","unique":"group","kind":"export"}'),
			JSON.parse('{"id":39,"type":"edge","label":"attach","outV":38,"inV":30}')
		];
		for (const elem of validate) {
			assert.deepEqual(emitter.elements.get(elem.id), elem);
		}
	});
	test('Extend private class', async () => {
		const emitter = await lsif('/@test', new Map([
			[
				'/@test/a.ts',
				[
					'abstract class Foo {',
					'    run(): void { }',
					'}',
					'export class Bar extends Foo {',
					'    do(): void { }',
					'}'
				].join(os.EOL)
			],
			[
				'/@test/b.ts',
				[
					'import { Bar } from "./a"',
					'let bar: Bar = new Bar();',
					'bar.run();'
				].join(os.EOL)
			]
		]), compilerOptions);
		const validate: Element[] = [
		];
		for (const elem of validate) {
			assert.deepEqual(emitter.elements.get(elem.id), elem);
		}
	});
	test('Export computed property name', async () => {
		const emitter = await lsif('/@test', new Map([
			[
				'/@test/a.ts',
				[
					'export class Foo {',
					'	get [Symbol.toStringTag](): string {',
					'		return "Foo";',
					'	}',
					'}'
				].join(os.EOL)
			],
			[
				'/@test/b.ts',
				[
					'import { Foo } from "./a"',
					'let foo: Foo = new Foo();'
				].join(os.EOL)
			]
		]), compilerOptions);
		assert.deepEqual(emitter.lastId, 100);
		const validate: Element[] = [
			JSON.parse('{"id":22,"type":"vertex","label":"resultSet"}'),
			JSON.parse('{"id":23,"type":"vertex","label":"moniker","scheme":"tsc","identifier":"a:Foo.__@toStringTag","unique":"group","kind":"export"}'),
			JSON.parse('{"id":24,"type":"edge","label":"moniker","outV":22,"inV":23}'),
			JSON.parse('{"id":25,"type":"vertex","label":"range","start":{"line":1,"character":5},"end":{"line":1,"character":25},"tag":{"type":"definition","text":"[Symbol.toStringTag]","kind":7,"fullRange":{"start":{"line":1,"character":1},"end":{"line":3,"character":2}}}}'),
			JSON.parse('{"id":26,"type":"edge","label":"next","outV":25,"inV":22}')
		];
		for (const elem of validate) {
			assert.deepEqual(emitter.elements.get(elem.id), elem);
		}
	});
	test('Class constructor', async () => {
		const emitter = await lsif('/@test', new Map([
			[
				'/@test/a.ts',
				[
					'export class Foo {',
					'    constructor(callback: (entry: { key: string; value: number; }) => void) { }',
					'}'
				].join(os.EOL)
			],
			[
				'/@test/b.ts',
				[
					'import { Foo } from "./a"',
					'let foo: Foo = new Foo((entry) => { entry.key; });'
				].join(os.EOL)
			]
		]), compilerOptions);
		assert.deepEqual(emitter.lastId, 165);
		const validate: Element[] = [
			JSON.parse('{"id":36,"type":"vertex","label":"moniker","scheme":"tsc","identifier":"a:Foo.__arg.callback.__arg.entry.key","unique":"group","kind":"export"}'),
			JSON.parse('{"id":37,"type":"edge","label":"attach","outV":36,"inV":23}'),
			JSON.parse('{"id":38,"type":"vertex","label":"moniker","scheme":"tsc","identifier":"a:Foo.__arg.callback.__arg.entry.value","unique":"group","kind":"export"}'),
			JSON.parse('{"id":39,"type":"edge","label":"attach","outV":38,"inV":30}')
		];
		for (const elem of validate) {
			assert.deepEqual(emitter.elements.get(elem.id), elem);
		}
	});
	test('Export class as default', async () => {
		const emitter = await lsif('/@test', new Map([
			[
				'/@test/a.ts',
				[
					'export default class {',
					'    constructor(callback: (entry: { key: string; value: number; }) => void) { }',
					'}'
				].join(os.EOL)
			],
			[
				'/@test/b.ts',
				[
					'import Foo from "./a"',
					'let foo: Foo = new Foo((entry) => { entry.key; });'
				].join(os.EOL)
			]
		]), compilerOptions);
		assert.deepEqual(emitter.lastId, 158);
		const validate: Element[] = [
			JSON.parse('{"id":32,"type":"vertex","label":"moniker","scheme":"tsc","identifier":"a:default.__arg.callback.__arg.entry.key","unique":"group","kind":"export"}'),
			JSON.parse('{"id":33,"type":"edge","label":"attach","outV":32,"inV":19}'),
			JSON.parse('{"id":34,"type":"vertex","label":"moniker","scheme":"tsc","identifier":"a:default.__arg.callback.__arg.entry.value","unique":"group","kind":"export"}'),
			JSON.parse('{"id":35,"type":"edge","label":"attach","outV":34,"inV":26}')
		];
		for (const elem of validate) {
			assert.deepEqual(emitter.elements.get(elem.id), elem);
		}
	});
	test('Export * from', async () => {
		const emitter = await lsif('/@test', new Map([
			[
				'/@test/a.ts',
				[
					'export function foo(): void {};',
					'export function bar(): { value: number; } { return { value: 10 }; };'
				].join(os.EOL)
			],
			[
				'/@test/b.ts',
				[
					'export * from "./a";'
				].join(os.EOL)
			],
			[
				'/@test/c.ts',
				[
					'import { foo, bar } from "./b";',
					'foo();',
					'bar();'
				].join(os.EOL)
			]
		]), compilerOptions);
		assert.deepEqual(emitter.lastId, 149);
		const validate: Element[] = [
			JSON.parse('{"id":15,"type":"vertex","label":"resultSet"}'),
			JSON.parse('{"id":16,"type":"vertex","label":"moniker","scheme":"tsc","identifier":"a:foo","unique":"group","kind":"export"}'),
			JSON.parse('{"id":17,"type":"edge","label":"moniker","outV":15,"inV":16}'),
			JSON.parse('{"id":22,"type":"vertex","label":"resultSet"}'),
			JSON.parse('{"id":23,"type":"vertex","label":"moniker","scheme":"tsc","identifier":"a:bar","unique":"group","kind":"export"}'),
			JSON.parse('{"id":24,"type":"edge","label":"moniker","outV":22,"inV":23}'),
			JSON.parse('{"id":30,"type":"vertex","label":"moniker","scheme":"tsc","identifier":"F2J3JxC7HxVdRqlV9CVRfQ==","unique":"document","kind":"local"}'),
			JSON.parse('{"id":36,"type":"vertex","label":"moniker","scheme":"tsc","identifier":"a:bar.__rt.value","unique":"group","kind":"export"}'),
			JSON.parse('{"id":37,"type":"edge","label":"attach","outV":36,"inV":30}'),
			JSON.parse('{"id":60,"type":"vertex","label":"referenceResult"}'),
			JSON.parse('{"id":61,"type":"edge","label":"textDocument/references","outV":15,"inV":60}'),
			JSON.parse('{"id":66,"type":"vertex","label":"referenceResult"}'),
			JSON.parse('{"id":67,"type":"edge","label":"textDocument/references","outV":22,"inV":66}'),
			JSON.parse('{"id":93,"type":"vertex","label":"moniker","scheme":"tsc","identifier":"b:foo","unique":"group","kind":"export"}'),
			JSON.parse('{"id":94,"type":"edge","label":"attach","outV":93,"inV":16}'),
			JSON.parse('{"id":95,"type":"vertex","label":"moniker","scheme":"tsc","identifier":"b:bar","unique":"group","kind":"export"}'),
			JSON.parse('{"id":96,"type":"edge","label":"attach","outV":95,"inV":23}'),
			JSON.parse('{"id":97,"type":"vertex","label":"moniker","scheme":"tsc","identifier":"b:bar.__rt.value","unique":"group","kind":"export"}'),
			JSON.parse('{"id":98,"type":"edge","label":"attach","outV":97,"inV":30}'),
			JSON.parse('{"id":143,"type":"edge","label":"item","outV":60,"inVs":[119,133],"shard":108,"property":"references"}'),
			JSON.parse('{"id":144,"type":"edge","label":"item","outV":66,"inVs":[127,135],"shard":108,"property":"references"}')
		];
		for (const elem of validate) {
			assert.deepEqual(emitter.elements.get(elem.id), elem);
		}
	});
});

suite('Export use cases', () => {
	const compilerOptions: ts.CompilerOptions = {
		module: ts.ModuleKind.CommonJS,
		target: ts.ScriptTarget.ES5,
		esModuleInterop: true,
		rootDir: '/@test'
	};
	test('Export default RAL with multiple declarations', async () => {
		const emitter = await lsif('/@test', new Map([
			[
				'/@test/a.ts',
				[
					'interface RAL { readonly y: number; }',
					'namespace RAL { export const x = 10; }',
					'function RAL() { }',
					'export default RAL;'
				].join(os.EOL)
			],
			[
				'/@test/b.ts',
				[
					'import RAL from "./a";',
					'RAL();'
				].join(os.EOL)
			]
		]), compilerOptions);
		assert.deepEqual(emitter.lastId, 113);
		const validate: Element[] = [
			JSON.parse('{"id":46,"type":"vertex","label":"moniker","scheme":"tsc","identifier":"a:default.x","unique":"group","kind":"export"}'),
			JSON.parse('{"id":47,"type":"edge","label":"attach","outV":46,"inV":34}'),
			JSON.parse('{"id":48,"type":"vertex","label":"moniker","scheme":"tsc","identifier":"a:default.y","unique":"group","kind":"export"}'),
			JSON.parse('{"id":49,"type":"edge","label":"attach","outV":48,"inV":27}')
		];
		for (const elem of validate) {
			assert.deepEqual(emitter.elements.get(elem.id), elem);
		}
	});
	test('Export default RAL with nested declarations', async () => {
		const emitter = await lsif('/@test', new Map([
			[
				'/@test/a.ts',
				[
					'interface RAL { readonly console: { warn(message?: any): void; } }',
					'export default RAL;'
				].join(os.EOL)
			],
			[
				'/@test/b.ts',
				[
					'import RAL from "./a";',
					'let r: RAL;',
					'r.console.warn();'
				].join(os.EOL)
			]
		]), compilerOptions);
		assert.deepEqual(emitter.lastId, 142);
		const validate: Element[] = [
			JSON.parse('{"id":43,"type":"vertex","label":"resultSet"}'),
			JSON.parse('{"id":44,"type":"edge","label":"next","outV":43,"inV":15}'),
			JSON.parse('{"id":45,"type":"vertex","label":"moniker","scheme":"tsc","identifier":"a:default","unique":"group","kind":"export"}'),
			JSON.parse('{"id":46,"type":"edge","label":"moniker","outV":43,"inV":45}'),
			JSON.parse('{"id":47,"type":"vertex","label":"range","start":{"line":1,"character":15},"end":{"line":1,"character":18},"tag":{"type":"reference","text":"RAL"}}'),
			JSON.parse('{"id":48,"type":"edge","label":"next","outV":47,"inV":15}'),
			JSON.parse('{"id":49,"type":"vertex","label":"moniker","scheme":"tsc","identifier":"a:default.console","unique":"group","kind":"export"}'),
			JSON.parse('{"id":50,"type":"edge","label":"attach","outV":49,"inV":23}'),
			JSON.parse('{"id":51,"type":"vertex","label":"moniker","scheme":"tsc","identifier":"a:default.console.warn","unique":"group","kind":"export"}'),
			JSON.parse('{"id":52,"type":"edge","label":"attach","outV":51,"inV":30}')
		];
		for (const elem of validate) {
			assert.deepEqual(emitter.elements.get(elem.id), elem);
		}
	});
	test('Export default RAL with merged nested declarations', async () => {
		const emitter = await lsif('/@test', new Map([
			[
				'/@test/a.ts',
				[
					'interface RAL {',
					'    readonly console: {',
					'        info(message?: any, ...optionalParams: any[]): void;',
					'        log(message?: any, ...optionalParams: any[]): void;',
					'    }',
					'}',
					'',
					'let _ral: RAL | undefined;',
					'',
					'function RAL(): RAL {',
					'	return _ral;',
					'}',
					'namespace RAL {',
					'	export function install(ral: RAL): void {',
					'		_ral = ral;',
					'	}',
					'}',
					'export default RAL;'
				].join(os.EOL)
			],
			[
				'/@test/b.ts',
				[
					'import RAL from "./a";',
					'let r: RAL;',
					'r.console.warn();'
				].join(os.EOL)
			]
		]), Object.assign<ts.CompilerOptions, ts.CompilerOptions, ts.CompilerOptions>({}, compilerOptions, { 'lib': [ 'es2017' ] }));
		assert.deepEqual(emitter.lastId, 254);
		for (const elem of emitter.sequence) {
			if (elem.type === ElementTypes.vertex && elem.label === VertexLabels.moniker) {
				if (elem.identifier.indexOf('__arg') !== -1 || elem.identifier.indexOf('__rt') !== -1) {
					throw new Error(`Attached moniker with arg or return type detected.\n${JSON.stringify(elem, undefined, 0)}`);
				}
			}
		}
	});
	test('Export default RAL with nested public declarations', async () => {
		const emitter = await lsif('/@test', new Map([
			[
				'/@test/a.ts',
				[
					'export interface MyConsole { warn(message?: any, ...optionalParams: any[]): void; }',
					'interface RAL { readonly console: MyConsole }',
					'export default RAL;'
				].join(os.EOL)
			],
			[
				'/@test/b.ts',
				[
					'import RAL from "./a";',
					'let r: RAL;',
					'r.console.warn();'
				].join(os.EOL)
			]
		]), compilerOptions);
		assert.deepEqual(emitter.lastId, 195);
		const validate: Element[] = [
			JSON.parse('{"id":16,"type":"vertex","label":"moniker","scheme":"tsc","identifier":"a:MyConsole","unique":"group","kind":"export"}'),
			JSON.parse('{"id":23,"type":"vertex","label":"moniker","scheme":"tsc","identifier":"a:MyConsole.warn","unique":"group","kind":"export"}'),
			JSON.parse('{"id":76,"type":"vertex","label":"moniker","scheme":"tsc","identifier":"a:default","unique":"group","kind":"export"}'),
			JSON.parse('{"id":80,"type":"vertex","label":"moniker","scheme":"tsc","identifier":"a:default.console","unique":"group","kind":"export"}'),
			JSON.parse('{"id":81,"type":"edge","label":"attach","outV":80,"inV":66}')
		];
		for (const elem of validate) {
			assert.deepEqual(emitter.elements.get(elem.id), elem);
		}
	});
	test('Export default RAL with aliased interface type', async () => {
		const emitter = await lsif('/@test', new Map([
			[
				'/@test/a.ts',
				[
					'interface _Buffer { end(); }',
					'namespace RAL { export type Buffer = _Buffer; }',
					'export default RAL;'
				].join(os.EOL)
			],
			[
				'/@test/b.ts',
				[
					'import RAL from "./a";',
					'let b: RAL.Buffer;'
				].join(os.EOL)
			]
		]), compilerOptions);
		assert.deepEqual(emitter.lastId, 137);
		// There is no a:RAL.Buffer.end since _Buffer is named.
		const validate: Element[] = [
			JSON.parse('{"id":47,"type":"vertex","label":"moniker","scheme":"tsc","identifier":"a:default","unique":"group","kind":"export"}'),
			JSON.parse('{"id":51,"type":"vertex","label":"moniker","scheme":"tsc","identifier":"a:default.Buffer","unique":"group","kind":"export"}'),
			JSON.parse('{"id":52,"type":"edge","label":"attach","outV":51,"inV":37}')
		];
		for (const elem of validate) {
			assert.deepEqual(emitter.elements.get(elem.id), elem);
		}
	});
	test('Transient symbols', async () => {
		const emitter = await lsif('/@test', new Map([
			[
				'/@test/a.ts',
				[
					'export interface IEditorMinimapOptions {',
					'	enabled?: boolean;',
					'}',
					'export let minimapOpts: Readonly<Required<IEditorMinimapOptions>>;'
				].join(os.EOL)
			],
			[
				'/@test/b.ts',
				[
					'import { minimapOpts } from "./a";',
					'minimapOpts.enabled;'
				].join(os.EOL)
			]
		]), compilerOptions);
		assert.deepEqual(emitter.lastId, 152);
		// Ensure that be sees enabled.
	});
	test('Property with ReadonlyArray<string>', async () => {
		const emitter = await lsif('/@test', new Map([
			[
				'/@test/a.ts',
				[
					'export interface CodeActionProvider {',
					'	readonly providedCodeActionKinds?: ReadonlyArray<string>;',
					'}'
				].join(os.EOL)
			],
			[
				'/@test/b.ts',
				[
					'import { CodeActionProvider } from "./a";',
					'let c: CodeActionProvider;',
					'c.providedCodeActionKinds;'
				].join(os.EOL)
			]
		]), compilerOptions);
		assert.deepEqual(emitter.lastId, 126);
		const validate: Element[] = [
			JSON.parse('{"id":23,"type":"vertex","label":"moniker","scheme":"tsc","identifier":"a:CodeActionProvider.providedCodeActionKinds","unique":"group","kind":"export"}')
		];
		for (const elem of validate) {
			assert.deepEqual(emitter.elements.get(elem.id), elem);
		}
	});
	test('Property with ReadonlyArray<literal type>', async () => {
		const emitter = await lsif('/@test', new Map([
			[
				'/@test/a.ts',
				[
					'export interface CodeActionProvider {',
					'	readonly documentation?: ReadonlyArray<{ readonly kind: string, readonly command: number }>',
					'}'
				].join(os.EOL)
			],
			[
				'/@test/b.ts',
				[
					'import { CodeActionProvider } from "./a";',
					'let provider: CodeActionProvider;',
					'provider?.documentation?[0].kind'
				].join(os.EOL)
			]
		]), compilerOptions);
		assert.deepEqual(emitter.lastId, 160);
		const validate: Element[] = [
			JSON.parse('{"id":43,"type":"vertex","label":"moniker","scheme":"tsc","identifier":"a:CodeActionProvider.documentation.kind","unique":"group","kind":"export"}'),
			JSON.parse('{"id":44,"type":"edge","label":"attach","outV":43,"inV":30}'),
			JSON.parse('{"id":45,"type":"vertex","label":"moniker","scheme":"tsc","identifier":"a:CodeActionProvider.documentation.command","unique":"group","kind":"export"}'),
			JSON.parse('{"id":46,"type":"edge","label":"attach","outV":45,"inV":37}')
		];
		for (const elem of validate) {
			assert.deepEqual(emitter.elements.get(elem.id), elem);
		}
	});
	test('Property with literal type[]', async () => {
		const emitter = await lsif('/@test', new Map([
			[
				'/@test/a.ts',
				[
					'export interface IModelTokensChangedEvent {',
					'	readonly ranges: {',
					'		readonly fromLineNumber: number;',
					'		readonly toLineNumber: number;',
					'	}[];',
					'}'
				].join(os.EOL)
			],
			[
				'/@test/b.ts',
				[
					'import { IModelTokensChangedEvent } from "./a";',
					'let event: IModelTokensChangedEvent;',
					'event.ranges.fromLineNumber;'
				].join(os.EOL)
			]
		]), compilerOptions);
		assert.deepEqual(emitter.lastId, 160);
		const validate: Element[] = [
			JSON.parse('{"id":16,"type":"vertex","label":"moniker","scheme":"tsc","identifier":"a:IModelTokensChangedEvent","unique":"group","kind":"export"}'),
			JSON.parse('{"id":23,"type":"vertex","label":"moniker","scheme":"tsc","identifier":"a:IModelTokensChangedEvent.ranges","unique":"group","kind":"export"}'),
			JSON.parse('{"id":43,"type":"vertex","label":"moniker","scheme":"tsc","identifier":"a:IModelTokensChangedEvent.ranges.fromLineNumber","unique":"group","kind":"export"}'),
			JSON.parse('{"id":44,"type":"edge","label":"attach","outV":43,"inV":30}'),
			JSON.parse('{"id":45,"type":"vertex","label":"moniker","scheme":"tsc","identifier":"a:IModelTokensChangedEvent.ranges.toLineNumber","unique":"group","kind":"export"}'),
			JSON.parse('{"id":46,"type":"edge","label":"attach","outV":45,"inV":37}')
		];
		for (const elem of validate) {
			assert.deepEqual(emitter.elements.get(elem.id), elem);
		}
	});
});