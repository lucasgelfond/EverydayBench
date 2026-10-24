// An Apple Wallet pass: a zip holding pass.json. Unsigned (Wallet won't import it), but a harness or an agent sees a
// real .pkpass: the right type, a zip, the pass's fields.

import { crc32 } from 'node:zlib';

// A zip of stored (uncompressed) files.
export function zip(files: Record<string, string>) {
	const parts: Buffer[] = [];
	const central: Buffer[] = [];
	let offset = 0;
	for (const [name, text] of Object.entries(files)) {
		const data = Buffer.from(text);
		const fname = Buffer.from(name);
		const crc = crc32(data);
		const local = Buffer.alloc(30);
		local.writeUInt32LE(0x04034b50, 0);
		local.writeUInt16LE(20, 4);
		local.writeUInt32LE(crc, 14);
		local.writeUInt32LE(data.length, 18);
		local.writeUInt32LE(data.length, 22);
		local.writeUInt16LE(fname.length, 26);
		const dir = Buffer.alloc(46);
		dir.writeUInt32LE(0x02014b50, 0);
		dir.writeUInt16LE(20, 4);
		dir.writeUInt16LE(20, 6);
		dir.writeUInt32LE(crc, 16);
		dir.writeUInt32LE(data.length, 20);
		dir.writeUInt32LE(data.length, 24);
		dir.writeUInt16LE(fname.length, 28);
		dir.writeUInt32LE(offset, 42);
		parts.push(local, fname, data);
		central.push(dir, fname);
		offset += 30 + fname.length + data.length;
	}
	const size = central.reduce((s, b) => s + b.length, 0);
	const end = Buffer.alloc(22);
	end.writeUInt32LE(0x06054b50, 0);
	end.writeUInt16LE(central.length / 2, 8);
	end.writeUInt16LE(central.length / 2, 10);
	end.writeUInt32LE(size, 12);
	end.writeUInt32LE(offset, 16);
	return Buffer.concat([...parts, ...central, end]);
}
