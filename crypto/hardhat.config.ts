import "@nomicfoundation/hardhat-toolbox";

module.exports = {
  solidity: "0.8.28",
  networks: {
    fuji: {
      url: "https://api.avax-test.network/ext/bc/C/rpc",
      chainId: 43113,
      accounts: [
        "0x80fbdc7b8f30eab7f5f30a890be53b08a183a1562c1e065481971ef4ddb1c084"
      ],
    }
  }
};