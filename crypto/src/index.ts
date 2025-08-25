import { ethers } from "ethers";
import abi from "./abis/Blob.json";

const PRIVATE_KEY = "0x80fbdc7b8f30eab7f5f30a890be53b08a183a1562c1e065481971ef4ddb1c084";
const RPC_URL = "https://api.avax-test.network/ext/bc/C/rpc";
const CONTRACT_ADDRESS = "0xC4D983c497E45A614C1D9449A8A8214d08F52E6F";
const SNOWTRACE_API_KEY = 'YOUR_API_KEY_HERE'; // Get free API key from snowtrace.io (optional for free tier)

const provider = new ethers.JsonRpcProvider(RPC_URL);
const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
const contract = new ethers.Contract(CONTRACT_ADDRESS, abi.abi, wallet);

interface TransferEvent {
  from: string;
  to: string;
  amount: string;
  blockNumber: number;
  transactionHash: string;
  timestamp: string;
}

// Helper function to safely get decimals
async function getDecimals(): Promise<number> {
  try {
    if (typeof contract.decimals === 'function') {
      return await contract.decimals();
    }
  } catch (error) {
    console.warn("Contract doesn't have decimals function, using default 18");
  }
  return 18;
}

// Load contract information
async function loadContractInfo() {
  try {
    console.log("Loading contract info...");
    
    const [name, symbol, totalSupply] = await Promise.all([
      contract.name().catch(() => "Unknown"),
      contract.symbol().catch(() => "UNK"),
      contract.totalSupply().catch(() => BigInt(0))
    ]);
    
    const decimals = await getDecimals();
    const owner = wallet.address; // Use the deployer's address directly

    const contractInfo = document.getElementById("contract-info")!;
    contractInfo.innerHTML = `
      <div><strong>Name:</strong> ${name}</div>
      <div><strong>Symbol:</strong> ${symbol}</div>
      <div><strong>Total Supply:</strong> ${ethers.formatUnits(totalSupply, decimals)} ${symbol}</div>
      <div><strong>Decimals:</strong> ${decimals}</div>
      <div><strong>Owner:</strong> ${owner}</div>
      <div><strong>Contract:</strong> ${CONTRACT_ADDRESS}</div>
    `;
  } catch (error) {
    console.error("Error loading contract info:", error);
    const contractInfo = document.getElementById("contract-info")!;
    contractInfo.innerHTML = `
      <div><strong>Contract:</strong> ${CONTRACT_ADDRESS}</div>
      <div class="error">Error loading contract information</div>
    `;
  }
}

// Fast method using Snowtrace API
async function getTransfersFromSnowtraceAPI(address: string): Promise<TransferEvent[]> {
  try {
    const url = `https://api-testnet.snowtrace.io/api?module=account&action=tokentx&contractaddress=${CONTRACT_ADDRESS}&address=${address}&startblock=0&endblock=99999999&sort=desc&apikey=${SNOWTRACE_API_KEY}`;
    
    console.log("Fetching from Snowtrace API...");
    console.log("URL:", url);
    
    const response = await fetch(url);
    const data = await response.json();
    
    console.log("Full API Response:", data);
    
    if (data.result && data.result.length > 0) {
      console.log("Transfer Events:", data.result);
    } else {
      console.warn("No transfer events found in API response.");
    }
    
    // Check if API returned an error
    if (data.status !== "1") {
      console.log("API Error - Status:", data.status);
      console.log("API Error - Message:", data.message);
      throw new Error(data.message || "API request failed");
    }
    
    // Check if we have any results at all
    if (!data.result || data.result.length === 0) {
      console.log("No transactions found in API response");
      return [];
    }
    
    console.log(`Found ${data.result.length} total token transactions`);
    
    const decimals = await getDecimals();
    const owner = wallet.address; // Use the deployer's address directly
    
    console.log("Contract owner:", owner);
    console.log("Target address:", address);
    
    // Filter for transfers FROM owner TO the specified address
    const ownerTransfers = data.result.filter((tx: any) => {
      const isFromOwner = tx.from.toLowerCase() === owner.toLowerCase();
      const isToTarget = tx.to.toLowerCase() === address.toLowerCase();
      console.log(`Transaction ${tx.hash}: from=${tx.from}, to=${tx.to}, fromOwner=${isFromOwner}, toTarget=${isToTarget}`);
      return isFromOwner && isToTarget;
    });
    
    console.log(`Found ${ownerTransfers.length} transfers from owner to target address`);
    
    return ownerTransfers.map((tx: any) => ({
      from: tx.from,
      to: tx.to,
      amount: ethers.formatUnits(tx.value, decimals),
      blockNumber: parseInt(tx.blockNumber),
      transactionHash: tx.hash,
      timestamp: new Date(parseInt(tx.timeStamp) * 1000).toISOString()
    }));
    
  } catch (error) {
    console.error("Snowtrace API error:", error);
    throw error;
  }
}

// Alternative: Get balance difference method
async function getTotalTokensReceivedFromOwner(address: string): Promise<string> {
  try {
    console.log("Getting total tokens received from owner using balance and transfer events...");
    
    const decimals = await getDecimals();
    const currentBalance = await contract.balanceOf(address);
    const owner = wallet.address; // Use the deployer's address directly
    
    console.log(`Current balance: ${ethers.formatUnits(currentBalance, decimals)}`);
    console.log(`Owner address: ${owner}`);
    
    // Try to get recent transfers (last 50,000 blocks)
    const latestBlock = await provider.getBlockNumber();
    const fromBlock = Math.max(latestBlock - 50000, 43138084);
    
    console.log(`Searching blocks ${fromBlock} to ${latestBlock}`);
    
    const filter = contract.filters.Transfer(owner, address);
    const events = await contract.queryFilter(filter, fromBlock, latestBlock);
    
    console.log(`Found ${events.length} transfer events in recent blocks`);
    
    let totalFromRecentEvents = BigInt(0);
    events.forEach((event: any, index) => {
      if (event.args) {
        const amount = event.args[2];
        totalFromRecentEvents += amount;
        console.log(`Event ${index}: ${ethers.formatUnits(amount, decimals)} tokens`);
      }
    });
    
    const totalFromEvents = ethers.formatUnits(totalFromRecentEvents, decimals);
    console.log(`Total from recent events: ${totalFromEvents}`);
    
    // If current balance is higher than recent events, there might be older transfers
    const currentBalanceFormatted = ethers.formatUnits(currentBalance, decimals);
    const balanceNumber = parseFloat(currentBalanceFormatted);
    const eventsNumber = parseFloat(totalFromEvents);
    
    if (balanceNumber > eventsNumber) {
      console.log("Balance is higher than recent events, there might be older transfers");
      return `At least ${totalFromEvents} (current balance: ${currentBalanceFormatted})`;
    }
    
    return totalFromEvents;
    
  } catch (error) {
    console.error("Error calculating total tokens received:", error);
    throw error;
  }
}

// Updated fast method with fallback
async function getTransfersFast(recipientAddress: string): Promise<TransferEvent[]> {
  try {
    const url = `https://api-testnet.snowtrace.io/api?module=account&action=tokentx&contractaddress=${CONTRACT_ADDRESS}&address=${recipientAddress}&startblock=0&endblock=99999999&sort=desc&apikey=${SNOWTRACE_API_KEY}`;
    
    console.log("Fetching transfers from Snowtrace API...");
    console.log("URL:", url);
    
    const response = await fetch(url);
    const data = await response.json();
    
    console.log("Full API Response:", data);
    
    if (data.result && data.result.length > 0) {
      console.log("Transfer Events:", data.result);
    } else {
      console.warn("No transfer events found in API response.");
    }
    
    // Check if API returned an error
    if (data.status !== "1") {
      console.log("API Error - Status:", data.status);
      console.log("API Error - Message:", data.message);
      throw new Error(data.message || "API request failed");
    }
    
    // Check if we have any results at all
    if (!data.result || data.result.length === 0) {
      console.log("No transactions found in API response");
      return [];
    }
    
    console.log(`Found ${data.result.length} total token transactions`);
    
    const decimals = await getDecimals();
    const owner = wallet.address; // Use the deployer's address directly
    
    console.log("Contract owner:", owner);
    console.log("Target address:", recipientAddress);
    
    // Filter for transfers FROM owner TO the specified address
    const ownerTransfers = data.result.filter((tx: any) => {
      const isFromOwner = tx.from.toLowerCase() === owner.toLowerCase();
      const isToTarget = tx.to.toLowerCase() === recipientAddress.toLowerCase();
      console.log(`Transaction ${tx.hash}: from=${tx.from}, to=${tx.to}, fromOwner=${isFromOwner}, toTarget=${isToTarget}`);
      return isFromOwner && isToTarget;
    });
    
    console.log(`Found ${ownerTransfers.length} transfers from owner to target address`);
    
    return ownerTransfers.map((tx: any) => ({
      from: tx.from,
      to: tx.to,
      amount: ethers.formatUnits(tx.value, decimals),
      blockNumber: parseInt(tx.blockNumber),
      transactionHash: tx.hash,
      timestamp: new Date(parseInt(tx.timeStamp) * 1000).toISOString()
    }));
    
  } catch (error) {
    console.error("Error fetching transfers from Snowtrace API:", error);
    throw error;
  }
}

// Updated display function to show total more clearly
function displayTransfers(transfers: TransferEvent[], recipientAddress: string) {
  const resultsDiv = document.getElementById("transfer-results")!;
  
  // Calculate total
  let totalReceived = 0;
  transfers.forEach(transfer => {
    totalReceived += parseFloat(transfer.amount);
  });
  
  if (transfers.length === 0) {
    resultsDiv.innerHTML = `
      <h3>No recent transfers found</h3>
      <p>No recent token transfers found from the contract owner to address: ${recipientAddress}</p>
      <p><strong>Note:</strong> This might mean transfers are older than the search range, or the API is not working.</p>
      <p>Check the console for detailed logs.</p>
    `;
    return;
  }
  
  const transfersHtml = transfers.map((transfer, index) => {
    return `
      <div class="transfer-item">
        <div><strong>Transfer #${index + 1}</strong></div>
        <div><strong>Amount:</strong> ${transfer.amount} tokens</div>
        <div><strong>Block:</strong> ${transfer.blockNumber}</div>
        <div><strong>Time:</strong> ${transfer.timestamp}</div>
        <div><strong>Transaction:</strong> <a href="https://testnet.snowtrace.io/tx/${transfer.transactionHash}" target="_blank">${transfer.transactionHash}</a></div>
      </div>
    `;
  }).join('');
  
  resultsDiv.innerHTML = `
    <h3>Transfers from Owner (${transfers.length} found)</h3>
    <div style="background: #e7f3ff; padding: 15px; border-radius: 5px; margin: 10px 0;">
      <div><strong>🎯 TOTAL RECEIVED FROM OWNER: ${totalReceived.toFixed(8)} tokens</strong></div>
      <div><strong>Recipient:</strong> ${recipientAddress}</div>
    </div>
    <br>
    ${transfersHtml}
  `;
}

// Get current balance
async function getBalance(address: string): Promise<string> {
  const balance = await contract.balanceOf(address);
  const decimals = await getDecimals();
  return ethers.formatUnits(balance, decimals);
}

// Event listeners
document.getElementById("check-transfers-form")!.addEventListener("submit", async (e) => {
  e.preventDefault();
  
  const address = (document.getElementById("recipient-address") as HTMLInputElement).value.trim();
  const status = document.getElementById("status")!;
  
  if (!ethers.isAddress(address)) {
    status.textContent = "❌ Invalid address format!";
    status.className = "error";
    return;
  }
  
  try {
    status.textContent = "🚀 Fetching transfers (fast method)...";
    status.className = "";
    
    document.getElementById("transfer-results")!.innerHTML = "<p>Loading...</p>";
    
    const transfers = await getTransfersFast(address);
    const balance = await getBalance(address);
    
    displayTransfers(transfers, address);
    
    status.textContent = `✅ Complete! Found ${transfers.length} transfers. Current balance: ${balance} tokens`;
    status.className = "success";
  } catch (error: any) {
    console.error(error);
    status.textContent = `❌ Error: ${error.message}`;
    status.className = "error";
  }
});

document.getElementById("withdraw-form")!.addEventListener("submit", async (e) => {
  e.preventDefault();
  
  const address = (document.getElementById("address") as HTMLInputElement).value.trim();
  const amount = (document.getElementById("amount") as HTMLInputElement).value.trim();
  const status = document.getElementById("status")!;
  
  if (!ethers.isAddress(address)) {
    status.textContent = "❌ Invalid address format!";
    status.className = "error";
    return;
  }
  
  if (!amount || parseFloat(amount) <= 0) {
    status.textContent = "❌ Please enter a valid amount!";
    status.className = "error";
    return;
  }
  
  try {
    status.textContent = "📤 Sending tokens...";
    status.className = "";
    
    const decimals = await getDecimals();
    const amountInWei = ethers.parseUnits(amount, decimals);
    
    const tx = await contract.transfer(address, amountInWei);
    await tx.wait();
    
    status.textContent = `✅ Transfer successful! TX: ${tx.hash}`;
    status.className = "success";
    
    // Clear form
    (document.getElementById("address") as HTMLInputElement).value = "";
    (document.getElementById("amount") as HTMLInputElement).value = "";
    
  } catch (error: any) {
    console.error(error);
    status.textContent = `❌ Error: ${error.message}`;
    status.className = "error";
  }
});

window.addEventListener('load', loadContractInfo);