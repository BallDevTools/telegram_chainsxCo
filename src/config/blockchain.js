// src/config/blockchain.js
const { ethers } = require('ethers');

class BlockchainConfig {
    constructor() {
        this.network = process.env.NETWORK || 'bsc_testnet';
        this.rpcUrl = process.env.RPC_URL;
        this.chainId = parseInt(process.env.CHAIN_ID) || 97;
        this.privateKey = process.env.PRIVATE_KEY;
        this.contractAddresses = {
            nft: process.env.NFT_CONTRACT_ADDRESS,
            usdt: process.env.USDT_CONTRACT_ADDRESS
        };
        
        // Network configurations
        this.networks = {
            bsc_mainnet: {
                name: 'BSC Mainnet',
                chainId: 56,
                rpcUrls: [
                    'https://bsc-dataseed.binance.org/',
                    'https://bsc-dataseed1.defibit.io/',
                    'https://bsc-dataseed2.defibit.io/'
                ],
                explorer: 'https://bscscan.com',
                currency: {
                    name: 'BNB',
                    symbol: 'BNB',
                    decimals: 18
                }
            },
            bsc_testnet: {
                name: 'BSC Testnet',
                chainId: 97,
                rpcUrls: [
                    'https://data-seed-prebsc-1-s1.binance.org:8545/',
                    'https://data-seed-prebsc-2-s1.binance.org:8545/',
                    'https://data-seed-prebsc-1-s2.binance.org:8545/'
                ],
                explorer: 'https://testnet.bscscan.com',
                currency: {
                    name: 'tBNB',
                    symbol: 'tBNB',
                    decimals: 18
                }
            }
        };
        
        // Gas settings
        this.gasSettings = {
            gasLimit: {
                register: 300000,
                upgrade: 250000,
                transfer: 21000,
                approve: 60000
            },
            gasPriceMultiplier: 1.1, // 10% buffer
            maxGasPrice: ethers.parseUnits('20', 'gwei')
        };
        
        // Transaction settings
        this.transactionSettings = {
            confirmations: 3,
            timeout: 300000, // 5 minutes
            retryAttempts: 3,
            retryDelay: 5000, // 5 seconds
            maxPriorityFeePerGas: ethers.parseUnits('2', 'gwei'),
            maxFeePerGas: ethers.parseUnits('20', 'gwei')
        };
    }

    getCurrentNetwork() {
        return this.networks[this.network] || this.networks.bsc_testnet;
    }

    getRpcUrls() {
        return this.getCurrentNetwork().rpcUrls;
    }

    getExplorerUrl() {
        return this.getCurrentNetwork().explorer;
    }

    getChainId() {
        return this.getCurrentNetwork().chainId;
    }

    isMainnet() {
        return this.network === 'bsc_mainnet';
    }

    isTestnet() {
        return this.network === 'bsc_testnet';
    }

    getContractAddress(contractName) {
        return this.contractAddresses[contractName.toLowerCase()];
    }

    getGasSettings(transactionType) {
        return {
            gasLimit: this.gasSettings.gasLimit[transactionType] || 200000,
            maxFeePerGas: this.transactionSettings.maxFeePerGas,
            maxPriorityFeePerGas: this.transactionSettings.maxPriorityFeePerGas
        };
    }

    createProvider(rpcUrl = null) {
        const url = rpcUrl || this.rpcUrl || this.getRpcUrls()[0];
        return new ethers.JsonRpcProvider(url);
    }

    createWallet(provider) {
        if (!this.privateKey) {
            throw new Error('Private key not configured');
        }
        return new ethers.Wallet(this.privateKey, provider);
    }

    validateConfiguration() {
        const errors = [];

        if (!this.rpcUrl) {
            errors.push('RPC URL not configured');
        }

        if (!this.privateKey) {
            errors.push('Private key not configured');
        }

        if (!this.contractAddresses.nft) {
            errors.push('NFT contract address not configured');
        }

        if (!this.contractAddresses.usdt) {
            errors.push('USDT contract address not configured');
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    getNetworkInfo() {
        const network = this.getCurrentNetwork();
        return {
            name: network.name,
            chainId: network.chainId,
            explorer: network.explorer,
            currency: network.currency,
            rpcUrls: network.rpcUrls,
            contracts: this.contractAddresses
        };
    }

    // Helper methods for transaction configuration
    getTransactionConfig(type = 'default') {
        const gasConfig = this.getGasSettings(type);
        
        return {
            ...gasConfig,
            type: 2, // EIP-1559 transaction
        };
    }

    calculateGasPrice(baseFee, priorityFee) {
        const maxFee = baseFee * BigInt(2) + priorityFee;
        return {
            maxFeePerGas: maxFee,
            maxPriorityFeePerGas: priorityFee
        };
    }

    // Development helpers
    getFaucetInfo() {
        if (this.isTestnet()) {
            return {
                bnb: 'https://testnet.binance.org/faucet-smart',
                usdt: 'Contact admin for testnet USDT'
            };
        }
        return null;
    }

    getDebugInfo() {
        return {
            network: this.network,
            chainId: this.chainId,
            rpcUrl: this.rpcUrl,
            contracts: this.contractAddresses,
            gasSettings: this.gasSettings,
            isMainnet: this.isMainnet(),
            isTestnet: this.isTestnet()
        };
    }
}

// Export singleton instance
const blockchainConfig = new BlockchainConfig();

module.exports = {
    BlockchainConfig,
    blockchainConfig,
    
    // Helper functions
    createProvider: (rpcUrl) => blockchainConfig.createProvider(rpcUrl),
    createWallet: (provider) => blockchainConfig.createWallet(provider),
    getCurrentNetwork: () => blockchainConfig.getCurrentNetwork(),
    getNetworkInfo: () => blockchainConfig.getNetworkInfo(),
    isMainnet: () => blockchainConfig.isMainnet(),
    isTestnet: () => blockchainConfig.isTestnet()
};