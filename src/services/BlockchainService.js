const { ethers } = require('ethers');
const CacheService = require('./CacheService');
const { getDatabase } = require('../config/database');

// Contract ABIs (minimal for gas optimization)
const NFT_CONTRACT_ABI = [
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "to",
				"type": "address"
			},
			{
				"internalType": "uint256",
				"name": "tokenId",
				"type": "uint256"
			}
		],
		"name": "approve",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "_usdtToken",
				"type": "address"
			},
			{
				"internalType": "address",
				"name": "initialOwner",
				"type": "address"
			}
		],
		"stateMutability": "nonpayable",
		"type": "constructor"
	},
	{
		"inputs": [],
		"name": "AlreadyMember",
		"type": "error"
	},
	{
		"inputs": [],
		"name": "ERC721EnumerableForbiddenBatchMint",
		"type": "error"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "sender",
				"type": "address"
			},
			{
				"internalType": "uint256",
				"name": "tokenId",
				"type": "uint256"
			},
			{
				"internalType": "address",
				"name": "owner",
				"type": "address"
			}
		],
		"name": "ERC721IncorrectOwner",
		"type": "error"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "operator",
				"type": "address"
			},
			{
				"internalType": "uint256",
				"name": "tokenId",
				"type": "uint256"
			}
		],
		"name": "ERC721InsufficientApproval",
		"type": "error"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "approver",
				"type": "address"
			}
		],
		"name": "ERC721InvalidApprover",
		"type": "error"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "operator",
				"type": "address"
			}
		],
		"name": "ERC721InvalidOperator",
		"type": "error"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "owner",
				"type": "address"
			}
		],
		"name": "ERC721InvalidOwner",
		"type": "error"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "receiver",
				"type": "address"
			}
		],
		"name": "ERC721InvalidReceiver",
		"type": "error"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "sender",
				"type": "address"
			}
		],
		"name": "ERC721InvalidSender",
		"type": "error"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "tokenId",
				"type": "uint256"
			}
		],
		"name": "ERC721NonexistentToken",
		"type": "error"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "owner",
				"type": "address"
			},
			{
				"internalType": "uint256",
				"name": "index",
				"type": "uint256"
			}
		],
		"name": "ERC721OutOfBoundsIndex",
		"type": "error"
	},
	{
		"inputs": [],
		"name": "EmptyURI",
		"type": "error"
	},
	{
		"inputs": [],
		"name": "InactivePlan",
		"type": "error"
	},
	{
		"inputs": [],
		"name": "InvalidAmount",
		"type": "error"
	},
	{
		"inputs": [],
		"name": "InvalidCycleMembers",
		"type": "error"
	},
	{
		"inputs": [],
		"name": "InvalidDecimals",
		"type": "error"
	},
	{
		"inputs": [],
		"name": "InvalidPlanID",
		"type": "error"
	},
	{
		"inputs": [],
		"name": "InvalidRequest",
		"type": "error"
	},
	{
		"inputs": [],
		"name": "InvalidRequests",
		"type": "error"
	},
	{
		"inputs": [],
		"name": "LowFeeBalance",
		"type": "error"
	},
	{
		"inputs": [],
		"name": "LowFundBalance",
		"type": "error"
	},
	{
		"inputs": [],
		"name": "LowOwnerBalance",
		"type": "error"
	},
	{
		"inputs": [],
		"name": "NextPlanOnly",
		"type": "error"
	},
	{
		"inputs": [],
		"name": "NoPlanImage",
		"type": "error"
	},
	{
		"inputs": [],
		"name": "NoRequest",
		"type": "error"
	},
	{
		"inputs": [],
		"name": "NonTransferable",
		"type": "error"
	},
	{
		"inputs": [],
		"name": "NonexistentToken",
		"type": "error"
	},
	{
		"inputs": [],
		"name": "NotMember",
		"type": "error"
	},
	{
		"inputs": [],
		"name": "NotPaused",
		"type": "error"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "owner",
				"type": "address"
			}
		],
		"name": "OwnableInvalidOwner",
		"type": "error"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "account",
				"type": "address"
			}
		],
		"name": "OwnableUnauthorizedAccount",
		"type": "error"
	},
	{
		"inputs": [],
		"name": "Paused",
		"type": "error"
	},
	{
		"inputs": [],
		"name": "Plan1Only",
		"type": "error"
	},
	{
		"inputs": [],
		"name": "ReentrancyGuardReentrantCall",
		"type": "error"
	},
	{
		"inputs": [],
		"name": "ReentrantTransfer",
		"type": "error"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "token",
				"type": "address"
			}
		],
		"name": "SafeERC20FailedOperation",
		"type": "error"
	},
	{
		"inputs": [],
		"name": "ThirtyDayLock",
		"type": "error"
	},
	{
		"inputs": [],
		"name": "TimelockActive",
		"type": "error"
	},
	{
		"inputs": [],
		"name": "UplineNotMember",
		"type": "error"
	},
	{
		"inputs": [],
		"name": "UplinePlanLow",
		"type": "error"
	},
	{
		"inputs": [],
		"name": "ZeroAddress",
		"type": "error"
	},
	{
		"inputs": [],
		"name": "ZeroBalance",
		"type": "error"
	},
	{
		"inputs": [],
		"name": "ZeroPrice",
		"type": "error"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": true,
				"internalType": "address",
				"name": "owner",
				"type": "address"
			},
			{
				"indexed": true,
				"internalType": "address",
				"name": "approved",
				"type": "address"
			},
			{
				"indexed": true,
				"internalType": "uint256",
				"name": "tokenId",
				"type": "uint256"
			}
		],
		"name": "Approval",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": true,
				"internalType": "address",
				"name": "owner",
				"type": "address"
			},
			{
				"indexed": true,
				"internalType": "address",
				"name": "operator",
				"type": "address"
			},
			{
				"indexed": false,
				"internalType": "bool",
				"name": "approved",
				"type": "bool"
			}
		],
		"name": "ApprovalForAll",
		"type": "event"
	},
	{
		"inputs": [
			{
				"components": [
					{
						"internalType": "address",
						"name": "recipient",
						"type": "address"
					},
					{
						"internalType": "uint256",
						"name": "amount",
						"type": "uint256"
					},
					{
						"internalType": "uint256",
						"name": "balanceType",
						"type": "uint256"
					}
				],
				"internalType": "struct CryptoMembershipNFT.WithdrawalRequest[]",
				"name": "requests",
				"type": "tuple[]"
			}
		],
		"name": "batchWithdraw",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "totalOwner",
				"type": "uint256"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "totalFee",
				"type": "uint256"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "totalFund",
				"type": "uint256"
			}
		],
		"name": "BatchWithdrawalProcessed",
		"type": "event"
	},
	{
		"inputs": [],
		"name": "cancelEmergencyWithdraw",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "expected",
				"type": "uint256"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "actual",
				"type": "uint256"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "difference",
				"type": "uint256"
			}
		],
		"name": "ContractBalanceAlert",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": false,
				"internalType": "bool",
				"name": "status",
				"type": "bool"
			}
		],
		"name": "ContractPaused",
		"type": "event"
	},
	{
		"inputs": [],
		"name": "emergencyWithdraw",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": true,
				"internalType": "address",
				"name": "to",
				"type": "address"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "amount",
				"type": "uint256"
			}
		],
		"name": "EmergencyWithdraw",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "timestamp",
				"type": "uint256"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "amount",
				"type": "uint256"
			}
		],
		"name": "EmergencyWithdrawInitiated",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "timestamp",
				"type": "uint256"
			}
		],
		"name": "EmergencyWithdrawRequested",
		"type": "event"
	},
	{
		"inputs": [],
		"name": "exitMembership",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "oldBalance",
				"type": "uint256"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "newBalance",
				"type": "uint256"
			},
			{
				"indexed": false,
				"internalType": "string",
				"name": "operation",
				"type": "string"
			}
		],
		"name": "FundBalanceUpdated",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "ownerAmount",
				"type": "uint256"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "feeAmount",
				"type": "uint256"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "fundAmount",
				"type": "uint256"
			}
		],
		"name": "FundsDistributed",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": true,
				"internalType": "address",
				"name": "member",
				"type": "address"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "refundAmount",
				"type": "uint256"
			}
		],
		"name": "MemberExited",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": true,
				"internalType": "address",
				"name": "member",
				"type": "address"
			},
			{
				"indexed": true,
				"internalType": "address",
				"name": "upline",
				"type": "address"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "planId",
				"type": "uint256"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "cycleNumber",
				"type": "uint256"
			}
		],
		"name": "MemberRegistered",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": true,
				"internalType": "address",
				"name": "to",
				"type": "address"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "tokenId",
				"type": "uint256"
			},
			{
				"indexed": false,
				"internalType": "string",
				"name": "message",
				"type": "string"
			}
		],
		"name": "MembershipMinted",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": true,
				"internalType": "uint256",
				"name": "tokenId",
				"type": "uint256"
			},
			{
				"indexed": false,
				"internalType": "string",
				"name": "newURI",
				"type": "string"
			}
		],
		"name": "MetadataUpdated",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "planId",
				"type": "uint256"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "cycleNumber",
				"type": "uint256"
			}
		],
		"name": "NewCycleStarted",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": true,
				"internalType": "address",
				"name": "owner",
				"type": "address"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "fromPlan",
				"type": "uint256"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "toPlan",
				"type": "uint256"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "timestamp",
				"type": "uint256"
			}
		],
		"name": "OwnerUpgradeBypass",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": true,
				"internalType": "address",
				"name": "previousOwner",
				"type": "address"
			},
			{
				"indexed": true,
				"internalType": "address",
				"name": "newOwner",
				"type": "address"
			}
		],
		"name": "OwnershipTransferred",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "planId",
				"type": "uint256"
			},
			{
				"indexed": false,
				"internalType": "string",
				"name": "name",
				"type": "string"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "price",
				"type": "uint256"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "membersPerCycle",
				"type": "uint256"
			}
		],
		"name": "PlanCreated",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": true,
				"internalType": "uint256",
				"name": "planId",
				"type": "uint256"
			},
			{
				"indexed": false,
				"internalType": "string",
				"name": "imageURI",
				"type": "string"
			}
		],
		"name": "PlanDefaultImageSet",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": true,
				"internalType": "uint256",
				"name": "planId",
				"type": "uint256"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "oldPrice",
				"type": "uint256"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "newPrice",
				"type": "uint256"
			}
		],
		"name": "PlanPriceUpdated",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": true,
				"internalType": "address",
				"name": "member",
				"type": "address"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "oldPlanId",
				"type": "uint256"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "newPlanId",
				"type": "uint256"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "cycleNumber",
				"type": "uint256"
			}
		],
		"name": "PlanUpgraded",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": true,
				"internalType": "address",
				"name": "newPriceFeed",
				"type": "address"
			}
		],
		"name": "PriceFeedUpdated",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": true,
				"internalType": "address",
				"name": "from",
				"type": "address"
			},
			{
				"indexed": true,
				"internalType": "address",
				"name": "to",
				"type": "address"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "amount",
				"type": "uint256"
			}
		],
		"name": "ReferralPaid",
		"type": "event"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "_planId",
				"type": "uint256"
			},
			{
				"internalType": "address",
				"name": "_upline",
				"type": "address"
			}
		],
		"name": "registerMember",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "renounceOwnership",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "requestEmergencyWithdraw",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "restartAfterPause",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "from",
				"type": "address"
			},
			{
				"internalType": "address",
				"name": "to",
				"type": "address"
			},
			{
				"internalType": "uint256",
				"name": "tokenId",
				"type": "uint256"
			}
		],
		"name": "safeTransferFrom",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "from",
				"type": "address"
			},
			{
				"internalType": "address",
				"name": "to",
				"type": "address"
			},
			{
				"internalType": "uint256",
				"name": "tokenId",
				"type": "uint256"
			},
			{
				"internalType": "bytes",
				"name": "data",
				"type": "bytes"
			}
		],
		"name": "safeTransferFrom",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "operator",
				"type": "address"
			},
			{
				"internalType": "bool",
				"name": "approved",
				"type": "bool"
			}
		],
		"name": "setApprovalForAll",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "string",
				"name": "baseURI",
				"type": "string"
			}
		],
		"name": "setBaseURI",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "bool",
				"name": "_paused",
				"type": "bool"
			}
		],
		"name": "setPaused",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "_planId",
				"type": "uint256"
			},
			{
				"internalType": "string",
				"name": "_imageURI",
				"type": "string"
			}
		],
		"name": "setPlanDefaultImage",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "_planId",
				"type": "uint256"
			},
			{
				"internalType": "bool",
				"name": "_isActive",
				"type": "bool"
			}
		],
		"name": "setPlanStatus",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "_priceFeed",
				"type": "address"
			}
		],
		"name": "setPriceFeed",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "newDuration",
				"type": "uint256"
			}
		],
		"name": "TimelockUpdated",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": true,
				"internalType": "address",
				"name": "from",
				"type": "address"
			},
			{
				"indexed": true,
				"internalType": "address",
				"name": "to",
				"type": "address"
			},
			{
				"indexed": true,
				"internalType": "uint256",
				"name": "tokenId",
				"type": "uint256"
			}
		],
		"name": "Transfer",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": true,
				"internalType": "address",
				"name": "from",
				"type": "address"
			},
			{
				"indexed": true,
				"internalType": "address",
				"name": "to",
				"type": "address"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "tokenId",
				"type": "uint256"
			}
		],
		"name": "TransferAttemptBlocked",
		"type": "event"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "from",
				"type": "address"
			},
			{
				"internalType": "address",
				"name": "to",
				"type": "address"
			},
			{
				"internalType": "uint256",
				"name": "tokenId",
				"type": "uint256"
			}
		],
		"name": "transferFrom",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "newOwner",
				"type": "address"
			}
		],
		"name": "transferOwnership",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "_planId",
				"type": "uint256"
			},
			{
				"internalType": "uint256",
				"name": "_newMembersPerCycle",
				"type": "uint256"
			}
		],
		"name": "updateMembersPerCycle",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "_planId",
				"type": "uint256"
			},
			{
				"internalType": "uint256",
				"name": "_newPrice",
				"type": "uint256"
			}
		],
		"name": "updatePlanPrice",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "_newPlanId",
				"type": "uint256"
			}
		],
		"name": "upgradePlan",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": true,
				"internalType": "address",
				"name": "upline",
				"type": "address"
			},
			{
				"indexed": true,
				"internalType": "address",
				"name": "downline",
				"type": "address"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "downlineCurrentPlan",
				"type": "uint256"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "downlineTargetPlan",
				"type": "uint256"
			}
		],
		"name": "UplineNotified",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": true,
				"internalType": "address",
				"name": "user",
				"type": "address"
			},
			{
				"indexed": false,
				"internalType": "string",
				"name": "reason",
				"type": "string"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "timestamp",
				"type": "uint256"
			}
		],
		"name": "ValidationError",
		"type": "event"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "amount",
				"type": "uint256"
			}
		],
		"name": "withdrawFeeSystemBalance",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "amount",
				"type": "uint256"
			}
		],
		"name": "withdrawFundBalance",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "amount",
				"type": "uint256"
			}
		],
		"name": "withdrawOwnerBalance",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "owner",
				"type": "address"
			}
		],
		"name": "balanceOf",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "tokenId",
				"type": "uint256"
			}
		],
		"name": "getApproved",
		"outputs": [
			{
				"internalType": "address",
				"name": "",
				"type": "address"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "getContractStatus",
		"outputs": [
			{
				"internalType": "bool",
				"name": "isPaused",
				"type": "bool"
			},
			{
				"internalType": "uint256",
				"name": "totalBalance",
				"type": "uint256"
			},
			{
				"internalType": "uint256",
				"name": "memberCount",
				"type": "uint256"
			},
			{
				"internalType": "uint256",
				"name": "currentPlanCount",
				"type": "uint256"
			},
			{
				"internalType": "bool",
				"name": "hasEmergencyRequest",
				"type": "bool"
			},
			{
				"internalType": "uint256",
				"name": "emergencyTimeRemaining",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "_tokenId",
				"type": "uint256"
			}
		],
		"name": "getNFTImage",
		"outputs": [
			{
				"internalType": "string",
				"name": "imageURI",
				"type": "string"
			},
			{
				"internalType": "string",
				"name": "name",
				"type": "string"
			},
			{
				"internalType": "string",
				"name": "description",
				"type": "string"
			},
			{
				"internalType": "uint256",
				"name": "planId",
				"type": "uint256"
			},
			{
				"internalType": "uint256",
				"name": "createdAt",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "_planId",
				"type": "uint256"
			}
		],
		"name": "getPlanCycleInfo",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "currentCycle",
				"type": "uint256"
			},
			{
				"internalType": "uint256",
				"name": "membersInCurrentCycle",
				"type": "uint256"
			},
			{
				"internalType": "uint256",
				"name": "membersPerCycle",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "_planId",
				"type": "uint256"
			}
		],
		"name": "getPlanInfo",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "price",
				"type": "uint256"
			},
			{
				"internalType": "string",
				"name": "name",
				"type": "string"
			},
			{
				"internalType": "uint256",
				"name": "membersPerCycle",
				"type": "uint256"
			},
			{
				"internalType": "bool",
				"name": "isActive",
				"type": "bool"
			},
			{
				"internalType": "string",
				"name": "imageURI",
				"type": "string"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "_member",
				"type": "address"
			}
		],
		"name": "getReferralChain",
		"outputs": [
			{
				"internalType": "address[]",
				"name": "",
				"type": "address[]"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "getSystemStats",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "totalMembers",
				"type": "uint256"
			},
			{
				"internalType": "uint256",
				"name": "totalRevenue",
				"type": "uint256"
			},
			{
				"internalType": "uint256",
				"name": "totalCommission",
				"type": "uint256"
			},
			{
				"internalType": "uint256",
				"name": "ownerFunds",
				"type": "uint256"
			},
			{
				"internalType": "uint256",
				"name": "feeFunds",
				"type": "uint256"
			},
			{
				"internalType": "uint256",
				"name": "fundFunds",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "getTotalPlanCount",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "owner",
				"type": "address"
			},
			{
				"internalType": "address",
				"name": "operator",
				"type": "address"
			}
		],
		"name": "isApprovedForAll",
		"outputs": [
			{
				"internalType": "bool",
				"name": "",
				"type": "bool"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "isTokenTransferable",
		"outputs": [
			{
				"internalType": "bool",
				"name": "",
				"type": "bool"
			}
		],
		"stateMutability": "pure",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "MAX_MEMBERS_PER_CYCLE",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "",
				"type": "address"
			}
		],
		"name": "members",
		"outputs": [
			{
				"internalType": "address",
				"name": "upline",
				"type": "address"
			},
			{
				"internalType": "uint256",
				"name": "totalReferrals",
				"type": "uint256"
			},
			{
				"internalType": "uint256",
				"name": "totalEarnings",
				"type": "uint256"
			},
			{
				"internalType": "uint256",
				"name": "planId",
				"type": "uint256"
			},
			{
				"internalType": "uint256",
				"name": "cycleNumber",
				"type": "uint256"
			},
			{
				"internalType": "uint256",
				"name": "registeredAt",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "name",
		"outputs": [
			{
				"internalType": "string",
				"name": "",
				"type": "string"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "owner",
		"outputs": [
			{
				"internalType": "address",
				"name": "",
				"type": "address"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "tokenId",
				"type": "uint256"
			}
		],
		"name": "ownerOf",
		"outputs": [
			{
				"internalType": "address",
				"name": "",
				"type": "address"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"name": "planCycles",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "currentCycle",
				"type": "uint256"
			},
			{
				"internalType": "uint256",
				"name": "membersInCurrentCycle",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"name": "planDefaultImages",
		"outputs": [
			{
				"internalType": "string",
				"name": "",
				"type": "string"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"name": "plans",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "price",
				"type": "uint256"
			},
			{
				"internalType": "string",
				"name": "name",
				"type": "string"
			},
			{
				"internalType": "uint256",
				"name": "membersPerCycle",
				"type": "uint256"
			},
			{
				"internalType": "bool",
				"name": "isActive",
				"type": "bool"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "priceFeed",
		"outputs": [
			{
				"internalType": "address",
				"name": "",
				"type": "address"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "bytes4",
				"name": "interfaceId",
				"type": "bytes4"
			}
		],
		"name": "supportsInterface",
		"outputs": [
			{
				"internalType": "bool",
				"name": "",
				"type": "bool"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "symbol",
		"outputs": [
			{
				"internalType": "string",
				"name": "",
				"type": "string"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "TIMELOCK_DURATION",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "index",
				"type": "uint256"
			}
		],
		"name": "tokenByIndex",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"name": "tokenImages",
		"outputs": [
			{
				"internalType": "string",
				"name": "imageURI",
				"type": "string"
			},
			{
				"internalType": "string",
				"name": "name",
				"type": "string"
			},
			{
				"internalType": "string",
				"name": "description",
				"type": "string"
			},
			{
				"internalType": "uint256",
				"name": "planId",
				"type": "uint256"
			},
			{
				"internalType": "uint256",
				"name": "createdAt",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "owner",
				"type": "address"
			},
			{
				"internalType": "uint256",
				"name": "index",
				"type": "uint256"
			}
		],
		"name": "tokenOfOwnerByIndex",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "_tokenId",
				"type": "uint256"
			}
		],
		"name": "tokenURI",
		"outputs": [
			{
				"internalType": "string",
				"name": "",
				"type": "string"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "totalSupply",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "usdtToken",
		"outputs": [
			{
				"internalType": "contract IERC20",
				"name": "",
				"type": "address"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "validateContractBalance",
		"outputs": [
			{
				"internalType": "bool",
				"name": "",
				"type": "bool"
			},
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			},
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	}
];

const USDT_CONTRACT_ABI = [
	{
		"inputs": [],
		"stateMutability": "nonpayable",
		"type": "constructor"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "spender",
				"type": "address"
			},
			{
				"internalType": "uint256",
				"name": "allowance",
				"type": "uint256"
			},
			{
				"internalType": "uint256",
				"name": "needed",
				"type": "uint256"
			}
		],
		"name": "ERC20InsufficientAllowance",
		"type": "error"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "sender",
				"type": "address"
			},
			{
				"internalType": "uint256",
				"name": "balance",
				"type": "uint256"
			},
			{
				"internalType": "uint256",
				"name": "needed",
				"type": "uint256"
			}
		],
		"name": "ERC20InsufficientBalance",
		"type": "error"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "approver",
				"type": "address"
			}
		],
		"name": "ERC20InvalidApprover",
		"type": "error"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "receiver",
				"type": "address"
			}
		],
		"name": "ERC20InvalidReceiver",
		"type": "error"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "sender",
				"type": "address"
			}
		],
		"name": "ERC20InvalidSender",
		"type": "error"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "spender",
				"type": "address"
			}
		],
		"name": "ERC20InvalidSpender",
		"type": "error"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "owner",
				"type": "address"
			}
		],
		"name": "OwnableInvalidOwner",
		"type": "error"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "account",
				"type": "address"
			}
		],
		"name": "OwnableUnauthorizedAccount",
		"type": "error"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": true,
				"internalType": "address",
				"name": "owner",
				"type": "address"
			},
			{
				"indexed": true,
				"internalType": "address",
				"name": "spender",
				"type": "address"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "value",
				"type": "uint256"
			}
		],
		"name": "Approval",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": true,
				"internalType": "address",
				"name": "previousOwner",
				"type": "address"
			},
			{
				"indexed": true,
				"internalType": "address",
				"name": "newOwner",
				"type": "address"
			}
		],
		"name": "OwnershipTransferred",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": true,
				"internalType": "address",
				"name": "from",
				"type": "address"
			},
			{
				"indexed": true,
				"internalType": "address",
				"name": "to",
				"type": "address"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "value",
				"type": "uint256"
			}
		],
		"name": "Transfer",
		"type": "event"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "owner",
				"type": "address"
			},
			{
				"internalType": "address",
				"name": "spender",
				"type": "address"
			}
		],
		"name": "allowance",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "spender",
				"type": "address"
			},
			{
				"internalType": "uint256",
				"name": "value",
				"type": "uint256"
			}
		],
		"name": "approve",
		"outputs": [
			{
				"internalType": "bool",
				"name": "",
				"type": "bool"
			}
		],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "account",
				"type": "address"
			}
		],
		"name": "balanceOf",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "amount",
				"type": "uint256"
			}
		],
		"name": "burn",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "account",
				"type": "address"
			},
			{
				"internalType": "uint256",
				"name": "amount",
				"type": "uint256"
			}
		],
		"name": "burnFrom",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "decimals",
		"outputs": [
			{
				"internalType": "uint8",
				"name": "",
				"type": "uint8"
			}
		],
		"stateMutability": "pure",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "to",
				"type": "address"
			},
			{
				"internalType": "uint256",
				"name": "amount",
				"type": "uint256"
			}
		],
		"name": "faucet",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "to",
				"type": "address"
			},
			{
				"internalType": "uint256",
				"name": "amount",
				"type": "uint256"
			}
		],
		"name": "mint",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "name",
		"outputs": [
			{
				"internalType": "string",
				"name": "",
				"type": "string"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "owner",
		"outputs": [
			{
				"internalType": "address",
				"name": "",
				"type": "address"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "renounceOwnership",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "symbol",
		"outputs": [
			{
				"internalType": "string",
				"name": "",
				"type": "string"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "totalSupply",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "to",
				"type": "address"
			},
			{
				"internalType": "uint256",
				"name": "value",
				"type": "uint256"
			}
		],
		"name": "transfer",
		"outputs": [
			{
				"internalType": "bool",
				"name": "",
				"type": "bool"
			}
		],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "from",
				"type": "address"
			},
			{
				"internalType": "address",
				"name": "to",
				"type": "address"
			},
			{
				"internalType": "uint256",
				"name": "value",
				"type": "uint256"
			}
		],
		"name": "transferFrom",
		"outputs": [
			{
				"internalType": "bool",
				"name": "",
				"type": "bool"
			}
		],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "newOwner",
				"type": "address"
			}
		],
		"name": "transferOwnership",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	}
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
        
        // Rate limiting for RPC requests
        this.rateLimit = {
            requests: [],
            maxRequestsPerMinute: 30,
            windowMs: 60000,
            backoffMs: 2000 // 2 seconds backoff
        };
        
        // Connection pool for redundancy
        this.providers = [
            'https://data-seed-prebsc-1-s1.binance.org:8545/',
            'https://data-seed-prebsc-2-s1.binance.org:8545/',
            'https://data-seed-prebsc-1-s2.binance.org:8545/',
            'https://data-seed-prebsc-1-s3.binance.org:8545/'
        ];
        this.currentProviderIndex = 0;
        this.eventProcessingActive = false;
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

    // Rate limiting for RPC requests
    async checkRateLimit() {
        const now = Date.now();
        
        // Clean old requests
        this.rateLimit.requests = this.rateLimit.requests.filter(
            timestamp => now - timestamp < this.rateLimit.windowMs
        );
        
        // Check if we're at the limit
        if (this.rateLimit.requests.length >= this.rateLimit.maxRequestsPerMinute) {
            console.log('⚠️ Rate limit reached, waiting...');
            await new Promise(resolve => setTimeout(resolve, this.rateLimit.backoffMs));
            return this.checkRateLimit(); // Recursive check
        }
        
        // Record this request
        this.rateLimit.requests.push(now);
        return true;
    }

    async connectToProvider() {
        for (let i = 0; i < this.providers.length; i++) {
            try {
                const providerUrl = this.providers[this.currentProviderIndex];
                this.provider = new ethers.JsonRpcProvider(providerUrl);
                
                // Test connection with rate limiting
                await this.checkRateLimit();
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
            
            // Test contract calls with rate limiting
            await this.checkRateLimit();
            const totalPlans = await this.nftContract.getTotalPlanCount();
            console.log(`📋 Total plans available: ${totalPlans}`);
            
            // Cache USDT decimals
            await this.checkRateLimit();
            const decimals = await this.usdtContract.decimals();
            this.cache.set('usdt_decimals', decimals, 86400); // Cache for 24 hours
            
        } catch (error) {
            console.error('❌ Contract initialization failed:', error);
            throw error;
        }
    }

    async setupEventListeners() {
        try {
            // Get current block number with rate limiting
            await this.checkRateLimit();
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
                await this.checkRateLimit();
                const [upline, totalReferrals, totalEarnings, planId, cycleNumber, registeredAt] = 
                    await this.nftContract.members(walletAddress);
                
                await this.checkRateLimit();
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
                await this.checkRateLimit();
                const [price, name, membersPerCycle, isActive, imageURI] = 
                    await this.nftContract.getPlanInfo(planId);
                
                await this.checkRateLimit();
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
            
            await this.checkRateLimit();
            const usdtBalance = await this.usdtContract.balanceOf(userWallet.address);
            const requiredAmount = ethers.parseUnits(planInfo.priceFormatted, 6);
            
            if (usdtBalance < requiredAmount) {
                throw new Error(`Insufficient USDT balance. Required: ${planInfo.priceFormatted} USDT`);
            }
            
            // Check allowance
            await this.checkRateLimit();
            const allowance = await this.usdtContract.allowance(
                userWallet.address, 
                process.env.NFT_CONTRACT_ADDRESS
            );
            
            if (allowance < requiredAmount) {
                // Request approval first
                throw new Error('USDT_APPROVAL_REQUIRED');
            }
            
            // Estimate gas
            await this.checkRateLimit();
            const gasEstimate = await this.nftContract.registerMember.estimateGas(
                planId, 
                uplineAddress || process.env.OWNER_WALLET_ADDRESS
            );
            
            // Add 20% buffer for gas
            const gasLimit = gasEstimate * 120n / 100n;
            
            // Get gas price
            await this.checkRateLimit();
            const feeData = await this.provider.getFeeData();
            
            // Send transaction
            await this.checkRateLimit();
            const tx = await this.nftContract.registerMember(
                planId, 
                uplineAddress || process.env.OWNER_WALLET_ADDRESS,
                { 
                    gasLimit,
                    gasPrice: feeData.gasPrice
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

    // Process new blockchain events with improved rate limiting
    async processNewEvents() {
        // Prevent multiple concurrent event processing
        if (this.eventProcessingActive) {
            console.log('📡 Event processing already active, skipping...');
            return;
        }

        this.eventProcessingActive = true;

        try {
            await this.checkRateLimit();
            const currentBlock = await this.provider.getBlockNumber();
            
            if (currentBlock <= this.lastBlockNumber) {
                this.eventProcessingActive = false;
                return; // No new blocks
            }
            
            const fromBlock = this.lastBlockNumber + 1;
            const toBlock = Math.min(currentBlock, fromBlock + 4); // Process max 20 blocks at once (reduced from 100)
            
            console.log(`📡 Processing events from block ${fromBlock} to ${toBlock}`);
            
            // Process events one filter at a time to avoid rate limits
            const allEvents = [];
            
            for (const [eventName, filter] of Object.entries(this.eventFilters)) {
                try {
                    await this.checkRateLimit();
                    const events = await this.nftContract.queryFilter(filter, fromBlock, toBlock);
                    allEvents.push(...events);
                    
                    // Small delay between filter queries
                    if (Object.keys(this.eventFilters).length > 1) {
                        await new Promise(resolve => setTimeout(resolve, 500));
                    }
                } catch (error) {
                    console.error(`❌ Error querying ${eventName} events:`, error.message);
                    
                    // If rate limited, break and try again later
                    if (error.message.includes('rate limit')) {
                        console.log('⚠️ Hit rate limit, will retry later');
                        break;
                    }
                }
            }
            
            // Sort events by block number and log index
            allEvents.sort((a, b) => {
                if (a.blockNumber !== b.blockNumber) {
                    return a.blockNumber - b.blockNumber;
                }
                return a.logIndex - b.logIndex;
            });
            
            // Process events
            for (const event of allEvents) {
                try {
                    await this.processEvent(event);
                    // Small delay between event processing
                    await new Promise(resolve => setTimeout(resolve, 100));
                } catch (error) {
                    console.error('❌ Error processing event:', error);
                }
            }
            
            this.lastBlockNumber = toBlock;
            
            if (allEvents.length > 0) {
                console.log(`📡 Processed ${allEvents.length} events from blocks ${fromBlock}-${toBlock}`);
            }
            
        } catch (error) {
            console.error('❌ Error processing events:', error);
            
            // If this is a rate limit error, wait longer before next attempt
            if (error.message.includes('rate limit') || error.message.includes('Bad Data')) {
                console.log('⚠️ Rate limit detected, implementing longer backoff');
                await new Promise(resolve => setTimeout(resolve, 10000)); // 10 second backoff
            }
        } finally {
            this.eventProcessingActive = false;
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

    // Upgrade plan with rate limiting
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
            await this.checkRateLimit();
            const usdtBalance = await this.usdtContract.balanceOf(userWallet.address);
            if (usdtBalance < priceDifference) {
                const requiredFormatted = ethers.formatUnits(priceDifference, 6);
                throw new Error(`Insufficient USDT balance. Required: ${requiredFormatted} USDT`);
            }
            
            await this.checkRateLimit();
            const allowance = await this.usdtContract.allowance(
                userWallet.address, 
                process.env.NFT_CONTRACT_ADDRESS
            );
            
            if (allowance < priceDifference) {
                throw new Error('USDT_APPROVAL_REQUIRED');
            }
            
            // Estimate gas
            await this.checkRateLimit();
            const gasEstimate = await this.nftContract.upgradePlan.estimateGas(newPlanId);
            const gasLimit = gasEstimate * 120n / 100n;
            
            // Get gas price
            await this.checkRateLimit();
            const feeData = await this.provider.getFeeData();
            
            // Send transaction
            await this.checkRateLimit();
            const tx = await this.nftContract.upgradePlan(newPlanId, {
                gasLimit,
                gasPrice: feeData.gasPrice
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

    // Get system statistics with rate limiting
    async getSystemStats() {
        try {
            const cacheKey = 'system_stats';
            let stats = this.cache.get(cacheKey);
            
            if (!stats) {
                await this.checkRateLimit();
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
            },
            rateLimit: {
                requestsInWindow: this.rateLimit.requests.length,
                maxRequestsPerMinute: this.rateLimit.maxRequestsPerMinute
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
            this.eventProcessingActive = false;
            console.log('✅ Blockchain service cleanup complete');
        } catch (error) {
            console.error('❌ Error during blockchain cleanup:', error);
        }
    }
}

module.exports = BlockchainService;