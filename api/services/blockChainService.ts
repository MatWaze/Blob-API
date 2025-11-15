import { ethers } from "ethers";
import abi from "../abis/Blob.json" with { type: "json" };
import { config } from "dotenv";
import { getUserByWalletAddress } from "./userService.ts";
import { depositBlob } from "./transactionService.ts";
import { WebhookBody } from "../controllers/blockChainController.ts";

config();

export interface TransferEvent
{
	from: string;
	to: string;
	amount: string;
	blockNumber: number;
	transactionHash: string;
	timestamp: string;
}

const PRIVATE_KEY = process.env.PRIVATE_KEY as string;
const RPC_URL = process.env.RPC_URL as string;
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS as string;
const SNOWTRACE_API_KEY = process.env.SNOWTRACE_API_KEY as string;

const provider = new ethers.providers.JsonRpcProvider(RPC_URL);

const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
const contract = new ethers.Contract(CONTRACT_ADDRESS, abi.abi, provider);
const contractWithSigner = new ethers.Contract(CONTRACT_ADDRESS, abi.abi, wallet);
const decimals = await contract.decimals();

// contract.on("Transfer", async (from: string, to: string, amount: ethers.BigNumber) =>
// {
// 	if (to === wallet.address)
// 	{
// 		console.log("someone sent Blobcoin to the owner ");
// 		const formattedAmount = parseFloat(ethers.utils.formatUnits(amount, decimals));
// 		const user = await getUserByWalletAddress(from);
// 		await depositBlob(user, formattedAmount);
// 		console.log(`[Deposit] Received ${formattedAmount} tokens from ${from}`);
// 	}
// });

export async function getTransfersSnowTrace(recipientAddress: string): Promise<TransferEvent[] | undefined>
{
	try
	{
		const url = `https://api-testnet.snowtrace.io/api?module=account&action=tokentx&contractaddress=${CONTRACT_ADDRESS}&address=${recipientAddress}&startblock=0&endblock=99999999&sort=desc`;
		
		const response = await fetch(url);
		const data = await response.json();
		
		// Check if API returned an error
		if (data.status !== "1")
			throw new Error(data.message || "API request failed");
		
		// Check if we have any results at all
		if (!data.result || data.result.length === 0)
			return [];
		
		const owner = wallet.address;
		
		// Filter for transfers FROM owner TO the specified address
		const ownerTransfers = data.result.filter((tx: any) => {
			const isFromOwner = tx.from.toLowerCase() === owner.toLowerCase();
			const isToTarget = tx.to.toLowerCase() === recipientAddress.toLowerCase();
			return isFromOwner && isToTarget;
		});
		
		return ownerTransfers.map((tx: any) => ({
			from: tx.from,
			to: tx.to,
			amount: ethers.utils.formatUnits(tx.value, decimals),
			blockNumber: parseInt(tx.blockNumber),
			transactionHash: tx.hash,
			timestamp: new Date(parseInt(tx.timeStamp) * 1000).toISOString()
		}));
		
	}
	catch (error)
	{
		console.error("Error fetching transfers from Snowtrace API:", error);
	}
}

export async function getTransfersEthersProvider(recipientAddress: string): Promise<TransferEvent[] | undefined>
{
	try
	{
		const owner = wallet.address;

		// Get the latest block number
		const latestBlock = await provider.getBlockNumber();

		// Calculate block range (last 50,000 blocks or from deployment)
		const fromBlock = Math.max(latestBlock - 50000, 43138084);
		const toBlock = latestBlock;

		// Create contract instance for event filtering
		const contract = new ethers.Contract(CONTRACT_ADDRESS, abi.abi, provider);

		// Create filter for Transfer events from owner to recipient
		const filter = contract.filters.Transfer(owner, recipientAddress);

		// Get logs for Transfer events
		const logs = await contract.queryFilter(filter, fromBlock, toBlock);

		// Process logs and get block timestamps
		const transfers: TransferEvent[] = [];

		for (const log of logs)
		{
			try
			{
				// Get block to extract timestamp
				const block = await provider.getBlock(log.blockNumber);
				const timestamp = new Date(Number(block!.timestamp) * 1000).toISOString();
				
				// Parse the log data
				const parsedLog = contract.interface.parseLog({
					topics: log.topics,
					data: log.data
				});
				
				const amount = ethers.utils.formatUnits(parsedLog!.args[2], decimals);
				
				transfers.push({
					from: owner,
					to: recipientAddress,
					amount: amount,
					blockNumber: log.blockNumber,
					transactionHash: log.transactionHash,
					timestamp: timestamp
				});
				
				console.log(`Transfer: ${amount} tokens at block ${log.blockNumber}`);
			}
			catch (error)
			{
				console.error("Error processing log:", error);
			}
		}
		
		// Sort by block number (descending)
		transfers.sort((a, b) => b.blockNumber - a.blockNumber);

		return transfers;
	}
	catch (error)
	{
		console.error("Error fetching transfers using Ethers provider:", error);
	}
}


// Fallback method that tries Snowtrace first, then Avalanche SDK
export async function getTransfers(recipientAddress: string): Promise<TransferEvent[] | undefined>
{
	try
	{
		return await getTransfersSnowTrace(recipientAddress);
	}
	catch (snowtraceError)
	{
		
		try
		{
			return await getTransfersEthersProvider(recipientAddress);
		}
		catch (sdkError)
		{
			console.error("Both methods failed:", { snowtraceError, sdkError });
		}
	}
}

// Additional utility functions
export async function getBalance(address: string): Promise<string | undefined>
{
	try
	{
		const balance = await contract.balanceOf(address);
		return ethers.utils.formatUnits(balance, decimals);
	}
	catch (error)
	{
		console.error("Error getting balance:", error);
	}
}

export async function sendTokens(toAddress: string, amount: number): Promise<string | undefined>
{
	try
	{
		const amountWei = ethers.utils.parseUnits(amount.toString(), decimals);

		const tx = await contractWithSigner.transfer(toAddress, amountWei);

		await tx.wait();
		
		return tx.hash;
	}
	catch (error)
	{
		console.error("Error sending tokens:", error);
	}
}

export function processEvent(body: WebhookBody)
{
	switch (body.eventType)
	{
		case "address_activity":
			body.event.transaction.erc20Transfers.forEach(t =>
			{
				const blobSent = parseFloat(ethers.utils.formatUnits(t.value, decimals));
				console.log(`sent to ${t.to} ${blobSent}BLOB`);
			})
			break;
		default:
			break;
	}
}

/*
{
  "webhookId": "3718a368-f4d7-4bab-a790-6eda1b0e6d07",
  "eventType": "address_activity",
  "messageId": "6f8ea237-611d-4459-9ae5-750089b56317",
  "event": {
    "transaction": {
      "blockHash": "0xb3729a7bb82d07757e06b318d47fff7c496fb5feef1e39ace476e42d719550c8",
      "blockNumber": "47689400",
      "from": "0x47a2c5701DB0D39408fef68A4d0c1e628B1c35ff",
      "gas": "35494",
      "gasPrice": "3",
      "maxFeePerGas": "3",
      "maxPriorityFeePerGas": "1",
      "txHash": "0xb8ba5e8c941dadac65110b6a23dd662ed713b6ccd30338e810876ed2e81ef468",
      "txStatus": "1",
      "input": "0xa9059cbb000000000000000000000000da8770ef037cf2738a79b4478d78d1172ce7f71000000000000000000000000000000000000000000000021e19e0c9bab2400000",
      "nonce": "15",
      "to": "0xc4d983c497e45a614c1d9449a8a8214d08f52e6f",
      "transactionIndex": 0,
      "value": "0",
      "type": 2,
      "chainId": "43113",
      "receiptCumulativeGasUsed": "35134",
      "receiptGasUsed": "35134",
      "receiptEffectiveGasPrice": "2",
      "receiptRoot": "0xb78a3373b2f342ca859b19e1dbc0c85711be9e04722954b486988a96207d222e",
      "erc20Transfers": [
        {
          "transactionHash": "0xb8ba5e8c941dadac65110b6a23dd662ed713b6ccd30338e810876ed2e81ef468",
          "type": "ERC20",
          "from": "0x47a2c5701DB0D39408fef68A4d0c1e628B1c35ff",
          "to": "0xdA8770ef037cF2738A79b4478D78d1172cE7F710",
          "value": "10000000000000000000000",
          "blockTimestamp": 1763111216,
          "logIndex": 0,
          "erc20Token": {
            "address": "0xC4D983c497E45A614C1D9449A8A8214d08F52E6F",
            "name": "Blobcoin",
            "symbol": "BLOB",
            "decimals": 18,
            "valueWithDecimals": "1.864712049423024"
          }
        }
      ],
      "erc721Transfers": [],
      "erc1155Transfers": [],
      "internalTransactions": [
        {
          "from": "0x47a2c5701DB0D39408fef68A4d0c1e628B1c35ff",
          "to": "0xC4D983c497E45A614C1D9449A8A8214d08F52E6F",
          "internalTxType": "CALL",
          "value": "0",
          "gasUsed": "35134",
          "gasLimit": "35494",
          "transactionHash": "0xb8ba5e8c941dadac65110b6a23dd662ed713b6ccd30338e810876ed2e81ef468"
        }
      ],
      "blockTimestamp": 1763111216
    },
    "logs": [
      {
        "address": "0xC4D983c497E45A614C1D9449A8A8214d08F52E6F",
        "topic0": "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef",
        "topic1": "0x00000000000000000000000047a2c5701db0d39408fef68a4d0c1e628b1c35ff",
        "topic2": "0x000000000000000000000000da8770ef037cf2738a79b4478d78d1172ce7f710",
        "topic3": null,
        "data": "0x00000000000000000000000000000000000000000000021e19e0c9bab2400000",
        "transactionIndex": 0,
        "logIndex": 0,
        "removed": false
      }
    ]
  }
}
*/