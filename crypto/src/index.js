// import { ethers, Network } from "ethers";
// import { EventLog, BlockTag } from "ethers";
// import abi from "./abis/Token.json";
// declare global {
//   interface Window {
//     ethereum?: any;
//   }
// }
// const contractAddress = "0xbFF022b04DE3fb22334D43DeDcd87BcC41edbe9c";
// let provider: ethers.JsonRpcProvider;
// let signer: ethers.JsonRpcSigner;
// let contract: ethers.Contract;
// let currentAccount: string;
// let deploymentBlock = 43138084
// async function displayTransferredFromOwner() {
//   const recipientAddress = await signer.getAddress();
// //   const ownerAddress = await contract.owner();
//   const filter = contract.filters.Transfer(contract.ownerAddress, recipientAddress);
//   console.log(filter)
//   const latestBlock = await provider.getBlockNumber();
//   const step = 2048;
//   let fromBlock = deploymentBlock;;
//   let total = BigInt(0);
//   console.log(latestBlock);
//   while (fromBlock <= latestBlock) {
//     const toBlock = Math.min(fromBlock + step - 1, latestBlock);
//     const events = await contract.queryFilter(filter, fromBlock as BlockTag, toBlock as BlockTag);
//     for (const e of events) {
//         const event = e as EventLog;
//         if (!event.args) {
//             console.warn("Event missing args", event);
//             continue;
//         }
//         // Defensive extraction:
//         const amountRaw = event.args.value ?? event.args.amount ?? event.args[2];
//         if (amountRaw === undefined) {
//             console.warn("Event missing amount field", event.args);
//             continue;
//         }
//         const amount = BigInt(amountRaw);
//         total += amount;
//     }
//     fromBlock = toBlock + 1;
//   }
//   const transferredEl = document.getElementById("transferred");
//   if (transferredEl) {
//     transferredEl.textContent = `Transferred from owner: ${total.toString()} tokens`;
//   }
// }
// async function connectWallet() {
//   if (!window.ethereum) {
//     alert("Please install MetaMask");
//     return;
//   }
//   provider = new ethers.JsonRpcProvider("https://avalanche-fuji-c-chain-rpc.publicnode.com");
//   const accounts = await provider.send("eth_requestAccounts", []);
//   currentAccount = accounts[0];
//   document.getElementById("account")!.textContent = `Connected: ${currentAccount}`;
//   signer = await provider.getSigner();
//   contract = new ethers.Contract(contractAddress, abi.abi, signer);
//   await updateBalance();
//   await displayTransferredFromOwner();
// }
// async function updateBalance() {
//   const balance: bigint = await contract.balanceOf(currentAccount);
//   document.getElementById("balance")!.textContent = `Balance: ${balance.toString()}`;
// }
// async function transferTokens() {
//   const to = (document.getElementById("to") as HTMLInputElement).value;
//   const amount = (document.getElementById("amount") as HTMLInputElement).value;
//   if (!to || !amount) {
//     alert("Please fill in both fields");
//     return;
//   }
//   const tx = await contract.transfer(to, BigInt(amount));
//   await tx.wait();
//   alert("Transfer successful!");
//   updateBalance();
// }
// document.getElementById("connect")!.addEventListener("click", connectWallet);
// document.getElementById("transfer")!.addEventListener("click", transferTokens);
import { ethers } from "ethers";
import abi from "./abis/Token.json" assert { type: "json" };
// Admin private key — ⚠️ TESTING ONLY
const PRIVATE_KEY = "0x80fbdc7b8f30eab7f5f30a890be53b08a183a1562c1e065481971ef4ddb1c084";
const RPC_URL = "https://api.avax-test.network/ext/bc/C/rpc";
const CONTRACT_ADDRESS = "0xbFF022b04DE3fb22334D43DeDcd87BcC41edbe9c";
const provider = new ethers.JsonRpcProvider(RPC_URL);
const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
const contract = new ethers.Contract(CONTRACT_ADDRESS, abi.abi, wallet);
document.getElementById("withdraw-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const avax = await provider.getBalance(wallet.address);
    console.log("AVAX balance:", ethers.formatEther(avax));
    const address = document.getElementById("address").value.trim();
    const amount = document.getElementById("amount").value.trim();
    const status = document.getElementById("status");
    if (!ethers.isAddress(address)) {
        status.textContent = "Invalid address!";
        return;
    }
    try {
        status.textContent = "Sending...";
        const tx = await contract.transfer(address, BigInt(amount));
        await tx.wait();
        status.textContent = `✅ Transfer successful: ${tx.hash}`;
    }
    catch (err) {
        console.error(err);
        status.textContent = `❌ Error: ${err.message}`;
    }
});
