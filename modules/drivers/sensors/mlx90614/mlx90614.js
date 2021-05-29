/*
 * Copyright (c) 2016-2021  Moddable Tech, Inc.
 *
 *   This file is part of the Moddable SDK Runtime.
 * 
 *   The Moddable SDK Runtime is free software: you can redistribute it and/or modify
 *   it under the terms of the GNU Lesser General Public License as published by
 *   the Free Software Foundation, either version 3 of the License, or
 *   (at your option) any later version.
 * 
 *   The Moddable SDK Runtime is distributed in the hope that it will be useful,
 *   but WITHOUT ANY WARRANTY; without even the implied warranty of
 *   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *   GNU Lesser General Public License for more details.
 * 
 *   You should have received a copy of the GNU Lesser General Public License
 *   along with the Moddable SDK Runtime.  If not, see <http://www.gnu.org/licenses/>.
 *
 */
 
/*
	MLX90614 sensor - data sheet at https://components101.com/asset/sites/default/files/component_datasheet/MLX90614-Datasheet.pdf

*/

import SMBus from "embedded:io/smbus";
import CRC8 from "crc";
import Timer from "timer";

const Register = {
	MLX90614_RAWIR1:	0x04,
	MLX90614_RAWIR2:	0x05,
	MLX90614_TA:		0x06,
	MLX90614_TOBJ1:		0x07,
	MLX90614_TOBJ2:		0x08,

	MLX90614_TOMAX:		0x20,
	MLX90614_TOMIN:		0x21,
	MLX90614_PWMCTRL:	0x22,
	MLX90614_TARANGE:	0x23,
	MLX90614_EMISS:		0x24,
	MLX90614_CONFIG:	0x25,
	MLX90614_ADDR:		0x2E,
	MLX90614_ID1:		0x3C,
	MLX90614_ID2:		0x3D,
	MLX90614_ID3:		0x3E,
	MLX90614_ID4:		0x3F
};
Object.freeze(Register);

class MLX90614 {
	#io;
	#address;
	#byteBuffer;
	#valueBuffer;
	#pecBuffer;
	#crc;

	constructor(options) {
		this.#address = options?.address ?? 0x5A;

		const io = this.#io = new SMBus({
			hz: 100_000,
			address: this.#address,
			...options
		});

		this.#byteBuffer = new Uint8Array(1);
		this.#valueBuffer = new Uint8Array(3);
		this.#pecBuffer = new Uint8Array(5);

		this.#crc = new CRC8(0x07);
	}

	sample() {
		let value = {};
		value.ambient = this.#readTemp(Register.MLX90614_TA);
		value.temperature = this.#readTemp(Register.MLX90614_TOBJ1);
		return value;
	}

	#readTemp(reg) {
		const io = this.#io;
		const vBuf = this.#valueBuffer;
		const pBuf = this.#pecBuffer;
		io.readBlock(reg, vBuf);

		pBuf[0] = this.#address << 1;
		pBuf[1] = reg;
		pBuf[2] = (this.#address << 1) + 1;
		pBuf[3] = vBuf[0];
		pBuf[4] = vBuf[1];

		if (this.#crc.checksum(pBuf) !== vBuf[2])
			xsUnknownError("bad checksum\n");

		let value = (vBuf[1] << 8) | vBuf[0];
		return (value * 0.02) - 273.15;
	}
}
export default MLX90614;
