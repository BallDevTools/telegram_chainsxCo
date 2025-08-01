const { ethers } = require('ethers');
const CacheService = require('./CacheService');
const { getDatabase } = require('../config/database');

// Contract ABIs (minimal for gas optimization)
const NFT_CONTRACT_ABI = [
    "function registerMember(uint256 _planId, address _upline) external",
    "function upgradePlan(uint256 _newPlanId) external",
    "function getPlanInfo(uint256 _planId) external view returns (uint256 price, string memory name, uint256 membersPerCycle, bool isActive, string memory imageURI)",
    "function members(address) external view returns (address upline, uint256 totalReferrals, uint256 totalEarnings, uint256 planId, uint256 cycleNumber, uint256 registeredAt)",
    "function balanceOf(address owner) external view returns (uint256)",
    "function tokenOfOwnerByIndex(address owner, uint256 index) external view returns (uint256)",
    "function tokenURI(uint256 tokenId) external view returns (string memory)",
    "function getTotalPlanCount() external view returns (uint256)",
    "function getPlanCycleInfo(uint256 _planId) external view returns (uint256 currentCycle, uint256 membersInCurrentCycle, uint256 membersPerCycle)",
    "function getSystemStats() external view returns (uint256 totalMembers, uint256 totalRevenue, uint256 totalCommission, uint256 ownerFunds, uint256 feeFunds, uint256 fundFunds)",
    "event MemberRegistered(address indexed member, address indexed upline, uint256 planId, uint256 cycleNumber)",
    "event PlanUpgraded(address indexed member, uint256 oldPlanId, uint256 newPlanId, uint256 cycleNumber)",
    "event ReferralPaid(address indexed from, address indexed to, uint256 amount)"
];

const USDT_CONTRACT_ABI = [
    "function balanceOf(address account) external view returns (uint256)",
    "function approve(address spender, uint256 amount) external returns (bool)",
    "function allowance(address owner, address spender) external view returns (uint256)",
    "function decimals() external view returns (uint8)",
    "function transfer(address to, uint256 amount) external returns (bool)"
];

class BlockchainService {
    constructor() {
        this.provider = null;
        this.wallet = null;
        this.nftContract = null;
        this.usdtContract = null;
        this.cache = CacheService;
        this.isInitialized = false;
        this.lastBlockNumber = 0;
        this.eventFilters = {};
        
        // Connection pool for redundancy
        this.providers = [
            'https://data-seed-prebsc-1-s1.binance.org:8545/',
            'https://data-seed-prebsc-2-s1.binance.org:8545/',
            'https://data-seed-prebsc-1-s2.binance.org:8545/'
        ];
        this.currentProviderIndex = 0;
    }

    async initialize() {
        try {
            await this.connectToProvider();
            await this.initializeContracts();
            await this.setupEventListeners();
            this.isInitialized = true;
            console.log('✅ Blockchain service initialized');
        } catch (error) {
            console.error('❌ Failed to initialize blockchain service:', error);
            throw error;
        }
    }

    async connectToProvider() {
        for (let i = 0; i < this.providers.length; i++) {
            try {
                const providerUrl = this.providers[this.currentProviderIndex];
                this.provider = new ethers.JsonRpcProvider(providerUrl);
                
                // Test connection
                const network = await this.provider.getNetwork();
                console.log(`⛓️ Connected to BSC Testnet (Chain ID: ${network.chainId})`);
                
                // Initialize wallet
                this.wallet = new ethers.Wallet(process.env.PRIVATE_KEY, this.provider);
                console.log(`👛 Wallet address: ${this.wallet.address}`);
                
                return;
                
            } catch (error) {
                console.error(`Failed to connect to provider ${this.currentProviderIndex}:`, error.message);
                this.currentProviderIndex = (this.currentProviderIndex + 1) % this.providers.length;
                
                if (i === this.providers.length - 1) {
                    throw new Error('All RPC providers failed');
                }
            }
        }
    }

    async initializeContracts() {
        try {
            // Initialize NFT Contract
            this.nftContract = new ethers.Contract(
                process.env.NFT_CONTRACT_ADDRESS,
                NFT_CONTRACT_ABI,
                this.wallet
            );
            
            // Initialize USDT Contract
            this.usdtContract = new ethers.Contract(
                process.env.USDT_CONTRACT_ADDRESS,
                USDT_CONTRACT_ABI,
                this.wallet
            );
            
            // Test contract calls
            const totalPlans = await this.nftContract.getTotalPlanCount();
            console.log(`📋 Total plans available: ${totalPlans}`);
            
            // Cache USDT decimals
            const decimals = await this.usdtContract.decimals();
            this.cache.set('usdt_decimals', decimals, 86400); // Cache for 24 hours
            
        } catch (error) {
            console.error('❌ Contract initialization failed:', error);
            throw error;
        }
    }

    async setupEventListeners() {
        try {
            // Get current block number
            this.lastBlockNumber = await this.provider.getBlockNumber();
            
            // Setup event filters
            this.eventFilters = {
                memberRegistered: this.nftContract.filters.MemberRegistered(),
                planUpgraded: this.nftContract.filters.PlanUpgraded(),
                referralPaid: this.nftContract.filters.ReferralPaid()
            };
            
            console.log(`📡 Event listeners setup from block ${this.lastBlockNumber}`);
            
        } catch (error) {
            console.error('❌ Event listener setup failed:', error);
            throw error;
        }
    }

    // Get user's membership info from blockchain
    async getMemberInfo(walletAddress) {
        try {
            const cacheKey = `member_${walletAddress}`;
            let memberInfo = this.cache.get(cacheKey);
            
            if (!memberInfo) {
                const [upline, totalReferrals, totalEarnings, planId, cycleNumber, registeredAt] = 
                    await this.nftContract.members(walletAddress);
                
                const hasNFT = await this.nftContract.balanceOf(walletAddress) > 0;
                
                memberInfo = {
                    upline,
                    totalReferrals: totalReferrals.toString(),
                    totalEarnings: totalEarnings.toString(),
                    planId: planId.toString(),
                    cycleNumber: cycleNumber.toString(),
                    registeredAt: registeredAt.toString(),
                    hasNFT,
                    isRegistered: hasNFT && planId > 0
                };
                
                // Cache for 5 minutes
                this.cache.set(cacheKey, memberInfo, 300);
            }
            
            return memberInfo;
            
        } catch (error) {
            console.error('❌ Error getting member info:', error);
            return null;
        }
    }

    // Get plan information
    async getPlanInfo(planId) {
        try {
            const cacheKey = `plan_${planId}`;
            let planInfo = this.cache.get(cacheKey);
            
            if (!planInfo) {
                const [price, name, membersPerCycle, isActive, imageURI] = 
                    await this.nftContract.getPlanInfo(planId);
                
                const [currentCycle, membersInCurrentCycle] = 
                    await this.nftContract.getPlanCycleInfo(planId);
                
                planInfo = {
                    id: planId,
                    price: price.toString(),
                    name,
                    membersPerCycle: membersPerCycle.toString(),
                    isActive,
                    imageURI,
                    currentCycle: currentCycle.toString(),
                    membersInCurrentCycle: membersInCurrentCycle.toString(),
                    priceFormatted: this.formatTokenAmount(price.toString())
                };
                
                // Cache for 1 hour
                this.cache.set(cacheKey, planInfo, 3600);
            }
            
            return planInfo;
            
        } catch (error) {
            console.error(`❌ Error getting plan ${planId} info:`, error);
            return null;
        }
    }

    // Register new member
    async registerMember(planId, uplineAddress, userWallet) {
        try {
            console.log(`📝 Registering member for plan ${planId}...`);
            
            // Check USDT balance and approval
            const planInfo = await this.getPlanInfo(planId);
            if (!planInfo) {
                throw new Error('Plan not found');
            }
            
            const usdtBalance = await this.usdtContract.balanceOf(userWallet.address);
            const requiredAmount = ethers.parseUnits(planInfo.priceFormatted, 6);
            
            if (usdtBalance < requiredAmount) {
                throw new Error(`Insufficient USDT balance. Required: ${planInfo.priceFormatted} USDT`);
            }
            
            // Check allowance
            const allowance = await this.usdtContract.allowance(
                userWallet.address, 
                process.env.NFT_CONTRACT_ADDRESS
            );
            
            if (allowance < requiredAmount) {
                // Request approval first
                throw new Error('USDT_APPROVAL_REQUIRED');
            }
            
            // Estimate gas
            const gasEstimate = await this.nftContract.registerMember.estimateGas(
                planId, 
                uplineAddress || process.env.OWNER_WALLET_ADDRESS
            );
            
            // Add 20% buffer for gas
            const gasLimit = gasEstimate * 120n / 100n;
            
            // Send transaction
            const tx = await this.nftContract.registerMember(
                planId, 
                uplineAddress || process.env.OWNER_WALLET_ADDRESS,
                { 
                    gasLimit,
                    gasPrice: await this.provider.getFeeData().then(f => f.gasPrice)
                }
            );
            
            console.log(`📤 Registration transaction sent: ${tx.hash}`);
            
            // Save to database
            await this.saveTransaction({
                userAddress: userWallet.address,
                txHash: tx.hash,
                type: 'register',
                planId,
                amount: planInfo.price,
                status: 'pending'
            });
            
            return {
                success: true,
                txHash: tx.hash,
                message: 'Registration transaction sent successfully'
            };
            
        } catch (error) {
            console.error('❌ Registration failed:', error);
            
            if (error.message === 'USDT_APPROVAL_REQUIRED') {
                return {
                    success: false,
                    requiresApproval: true,
                    approvalAmount: planInfo.priceFormatted,
                    message: 'Please approve USDT spending first'
                };
            }
            
            return {
                success: false,
                error: error.message || 'Registration failed'
            };
        }
    }

    // Upgrade plan
    async upgradePlan(newPlanId, userWallet) {
        try {
            console.log(`⬆️ Upgrading to plan ${newPlanId}...`);
            
            // Get current member info
            const memberInfo = await this.getMemberInfo(userWallet.address);
            if (!memberInfo || !memberInfo.isRegistered) {
                throw new Error('User is not registered');
            }
            
            const currentPlanId = parseInt(memberInfo.planId);
            if (newPlanId <= currentPlanId) {
                throw new Error('Can only upgrade to higher plans');
            }
            
            if (newPlanId !== currentPlanId + 1) {
                throw new Error('Can only upgrade to the next plan level');
            }
            
            // Get plan prices
            const currentPlan = await this.getPlanInfo(currentPlanId);
            const newPlan = await this.getPlanInfo(newPlanId);
            
            if (!currentPlan || !newPlan) {
                throw new Error('Plan information not available');
            }
            
            // Calculate price difference
            const currentPrice = ethers.parseUnits(currentPlan.priceFormatted, 6);
            const newPrice = ethers.parseUnits(newPlan.priceFormatted, 6);
            const priceDifference = newPrice - currentPrice;
            
            // Check USDT balance and approval
            const usdtBalance = await this.usdtContract.balanceOf(userWallet.address);
            if (usdtBalance < priceDifference) {
                const requiredFormatted = ethers.formatUnits(priceDifference, 6);
                throw new Error(`Insufficient USDT balance. Required: ${requiredFormatted} USDT`);
            }
            
            const allowance = await this.usdtContract.allowance(
                userWallet.address, 
                process.env.NFT_CONTRACT_ADDRESS
            );
            
            if (allowance < priceDifference) {
                throw new Error('USDT_APPROVAL_REQUIRED');
            }
            
            // Estimate gas
            const gasEstimate = await this.nftContract.upgradePlan.estimateGas(newPlanId);
            const gasLimit = gasEstimate * 120n / 100n;
            
            // Send transaction
            const tx = await this.nftContract.upgradePlan(newPlanId, {
                gasLimit,
                gasPrice: await this.provider.getFeeData().then(f => f.gasPrice)
            });
            
            console.log(`📤 Upgrade transaction sent: ${tx.hash}`);
            
            // Save to database
            await this.saveTransaction({
                userAddress: userWallet.address,
                txHash: tx.hash,
                type: 'upgrade',
                fromPlanId: currentPlanId,
                toPlanId: newPlanId,
                amount: priceDifference.toString(),
                status: 'pending'
            });
            
            return {
                success: true,
                txHash: tx.hash,
                message: `Upgrade to ${newPlan.name} plan transaction sent successfully`
            };
            
        } catch (error) {
            console.error('❌ Upgrade failed:', error);
            
            if (error.message === 'USDT_APPROVAL_REQUIRED') {
                return {
                    success: false,
                    requiresApproval: true,
                    message: 'Please approve USDT spending first'
                };
            }
            
            return {
                success: false,
                error: error.message || 'Upgrade failed'
            };
        }
    }

    // Get USDT approval transaction data
    async getApprovalTransaction(userAddress, amount) {
        try {
            const amountWei = ethers.parseUnits(amount.toString(), 6);
            
            // Create approval transaction data
            const approvalData = this.usdtContract.interface.encodeFunctionData('approve', [
                process.env.NFT_CONTRACT_ADDRESS,
                amountWei
            ]);
            
            return {
                to: process.env.USDT_CONTRACT_ADDRESS,
                data: approvalData,
                value: '0'
            };
            
        } catch (error) {
            console.error('❌ Error creating approval transaction:', error);
            return null;
        }
    }

    // Process new blockchain events
    async processNewEvents() {
        try {
            const currentBlock = await this.provider.getBlockNumber();
            if (currentBlock <= this.lastBlockNumber) {
                return; // No new blocks
            }
            
            const fromBlock = this.lastBlockNumber + 1;
            const toBlock = Math.min(currentBlock, fromBlock + 100); // Process max 100 blocks at once
            
            // Get all events
            const events = await Promise.all([
                this.nftContract.queryFilter(this.eventFilters.memberRegistered, fromBlock, toBlock),
                this.nftContract.queryFilter(this.eventFilters.planUpgraded, fromBlock, toBlock),
                this.nftContract.queryFilter(this.eventFilters.referralPaid, fromBlock, toBlock)
            ]);
            
            const allEvents = events.flat().sort((a, b) => {
                if (a.blockNumber !== b.blockNumber) {
                    return a.blockNumber - b.blockNumber;
                }
                return a.logIndex - b.logIndex;
            });
            
            for (const event of allEvents) {
                await this.processEvent(event);
            }
            
            this.lastBlockNumber = toBlock;
            
            if (allEvents.length > 0) {
                console.log(`📡 Processed ${allEvents.length} events from blocks ${fromBlock}-${toBlock}`);
            }
            
        } catch (error) {
            console.error('❌ Error processing events:', error);
        }
    }

    // Process individual blockchain event
    async processEvent(event) {
        try {
            const db = getDatabase();
            
            // Check if event already processed
            const existing = await db.get(
                'SELECT id FROM blockchain_events WHERE tx_hash = ? AND event_type = ?',
                [event.transactionHash, event.eventName || event.fragment.name]
            );
            
            if (existing) {
                return; // Already processed
            }
            
            const eventData = {
                event_type: event.eventName || event.fragment.name,
                contract_address: event.address,
                tx_hash: event.transactionHash,
                block_number: event.blockNumber,
                event_data: JSON.stringify(event.args),
                processed: 0
            };
            
            // Save event to database
            await db.run(`
                INSERT INTO blockchain_events 
                (event_type, contract_address, tx_hash, block_number, event_data, processed)
                VALUES (?, ?, ?, ?, ?, ?)
            `, [
                eventData.event_type,
                eventData.contract_address,
                eventData.tx_hash,
                eventData.block_number,
                eventData.event_data,
                eventData.processed
            ]);
            
            // Update transaction status
            await db.run(
                'UPDATE transactions SET status = ?, block_number = ?, confirmed_at = CURRENT_TIMESTAMP WHERE tx_hash = ?',
                ['confirmed', event.blockNumber, event.transactionHash]
            );
            
            // Clear related cache
            if (event.args && event.args.member) {
                this.cache.delete(`member_${event.args.member}`);
            }
            
            console.log(`✅ Processed ${eventData.event_type} event: ${event.transactionHash}`);
            
        } catch (error) {
            console.error('❌ Error processing event:', error);
        }
    }

    // Save transaction to database
    async saveTransaction(txData) {
        try {
            const db = getDatabase();
            
            // Get user ID from wallet address
            const user = await db.get(
                'SELECT id, telegram_id FROM users WHERE wallet_address = ?',
                [txData.userAddress]
            );
            
            if (!user) {
                console.error('❌ User not found for wallet:', txData.userAddress);
                return;
            }
            
            await db.run(`
                INSERT INTO transactions 
                (user_id, tx_hash, type, status, amount, plan_id, from_plan_id, to_plan_id)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                user.id,
                txData.txHash,
                txData.type,
                txData.status || 'pending',
                txData.amount,
                txData.planId || null,
                txData.fromPlanId || null,
                txData.toPlanId || null
            ]);
            
            console.log(`💾 Transaction saved: ${txData.txHash}`);
            
        } catch (error) {
            console.error('❌ Error saving transaction:', error);
        }
    }

    // Get system statistics
    async getSystemStats() {
        try {
            const cacheKey = 'system_stats';
            let stats = this.cache.get(cacheKey);
            
            if (!stats) {
                const [totalMembers, totalRevenue, totalCommission, ownerFunds, feeFunds, fundFunds] = 
                    await this.nftContract.getSystemStats();
                
                stats = {
                    totalMembers: totalMembers.toString(),
                    totalRevenue: this.formatTokenAmount(totalRevenue.toString()),
                    totalCommission: this.formatTokenAmount(totalCommission.toString()),
                    ownerFunds: this.formatTokenAmount(ownerFunds.toString()),
                    feeFunds: this.formatTokenAmount(feeFunds.toString()),
                    fundFunds: this.formatTokenAmount(fundFunds.toString())
                };
                
                // Cache for 10 minutes
                this.cache.set(cacheKey, stats, 600);
            }
            
            return stats;
            
        } catch (error) {
            console.error('❌ Error getting system stats:', error);
            return null;
        }
    }

    // Utility: Format token amount
    formatTokenAmount(amount, decimals = 6) {
        try {
            return ethers.formatUnits(amount, decimals);
        } catch (error) {
            return '0';
        }
    }

    // Utility: Parse token amount
    parseTokenAmount(amount, decimals = 6) {
        try {
            return ethers.parseUnits(amount.toString(), decimals);
        } catch (error) {
            return 0n;
        }
    }

    // Get service status
    getStatus() {
        return {
            initialized: this.isInitialized,
            connected: this.provider !== null,
            lastBlockNumber: this.lastBlockNumber,
            contractAddresses: {
                nft: process.env.NFT_CONTRACT_ADDRESS,
                usdt: process.env.USDT_CONTRACT_ADDRESS
            }
        };
    }

    // Cleanup connections
    async cleanup() {
        try {
            if (this.provider) {
                // Remove all listeners
                this.provider.removeAllListeners();
            }
            this.isInitialized = false;
            console.log('✅ Blockchain service cleanup complete');
        } catch (error) {
            console.error('❌ Error during blockchain cleanup:', error);
        }
    }
}

module.exports = BlockchainService;