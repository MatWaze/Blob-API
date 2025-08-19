import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const SUPPLY = 1000000n * (10n ** 18n);;

const BlobModule = buildModule("blobModule", (m) =>
{
	const blob = m.contract("Blob", [ SUPPLY ]);

	return { blob };
});

export default BlobModule;