import { ethers } from "ethers";
import abi from "../abis/Blob.json";
import { config } from "dotenv";
import { getUserByWalletAddress } from "./userService.ts";

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
const decimals = await contract.decimals();

contract.on("Transfer", async (from: string, to: string, amount: ethers.BigNumber) =>
{
	if (to === wallet.address)
	{
		console.log("someone sent Blobcoin to the owner ");
		// TODO: Top up the user's balance
		// depending on the amount they sent to the owner
		const formattedAmount = ethers.utils.formatUnits(amount, decimals);
		const user = await getUserByWalletAddress(from);
		console.log(`[Deposit] Received ${formattedAmount} tokens from ${from}`);
	}
});

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

export async function sendTokens(toAddress: string, amount: string): Promise<string | undefined>
{
	try
	{
		const amountInWei = ethers.utils.parseUnits(amount, decimals);

		const tx = await contract.transfer(toAddress, amountInWei);
		await tx.wait();
		
		return tx.hash;
	}
	catch (error)
	{
		console.error("Error sending tokens:", error);
	}
}