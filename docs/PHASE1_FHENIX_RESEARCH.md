# Phase 1: Fhenix 基础设施研究报告

> 创建日期: 2026-04-18
> 状态: 已完成

---

## 1. Fhenix 生态概述

### 1.1 什么是 Fhenix?

Fhenix 是基于全同态加密 (FHE - Fully Homomorphic Encryption) 的区块链解决方案，为 Web3 提供端到端加密能力。与 Aleo 的零知识证明 (ZK) 不同，FHE 允许在加密数据上直接进行计算，无需解密。

### 1.2 fhEVM vs 标准 EVM

| 特性 | 标准 EVM | fhEVM |
|------|---------|-------|
| 数据类型 | uint256, bytes32 等 | euint8, euint16, euint32, euint64, euint128, ebool, eaddress |
| 计算方式 | 明文计算 | 加密状态下计算 |
| 兼容性 | Solidity 原生 | Solidity + FHE.sol 库 |
| 隐私保护 | 无（链上数据公开） | 链上数据加密 |

### 1.3 FHE vs ZK 对比

| 维度 | FHE (Fhenix) | ZK (Aleo) |
|------|--------------|-----------|
| 核心目的 | 加密计算 | 证明验证 |
| 数据可见性 | 数据始终加密 | 数据本地，仅提交证明 |
| 共享状态 | 支持加密的共享状态 | 仅支持单一所有者的私有状态 |
| 计算位置 | 链上（协处理器） | 本地生成证明 |
| 抗量子 | 是（基于 RLWE 问题） | 取决于具体算法 |
| Gas 成本 | 较高（FHE 操作复杂） | 验证成本固定 |

**关键差异**: Aleo 的 `record` 概念在 EVM 中无直接等价物。我们需要使用合约 storage + FHE 加密字段来替代。

---

## 2. fhenix.js SDK

### 2.1 安装

```bash
npm install fhenixjs
# 或
pnpm add fhenixjs
```

要求: Node.js 20+

### 2.2 核心功能

- **加密 (Encryption)**: 将明文数据加密为 FHE 密文
- **解密 (Decryption/Unsealing)**: 将链上加密数据解密为明文
- **Permit 系统**: 授权管理，控制谁可以解密特定数据

### 2.3 基本使用示例

```typescript
import { FhenixClient, getPermit } from "fhenixjs";
import { BrowserProvider } from "ethers";

// 初始化客户端
const provider = new BrowserProvider(window.ethereum);
const client = new FhenixClient({ provider });

// 加密数据
const encryptedAmount = await client.encrypt_uint32(1000);

// 获取 permit 用于解密
const permit = await getPermit(contractAddress, provider);
client.storePermit(permit);

// 调用合约并解密返回值
const sealedResult = await contract.getEncryptedBalance(permit.publicKey);
const balance = client.unseal(contractAddress, sealedResult);
```

### 2.4 文档资源

- 官方文档: https://fhenixjs.fhenix.zone/
- GitHub: https://github.com/FhenixProtocol/fhenix.js
- npm: https://www.npmjs.com/package/fhenixjs

---

## 3. 网络配置

### 3.1 Fhenix Helium Testnet

Fhenix 原生测试链：

| 配置项 | 值 |
|--------|-----|
| Chain ID | 8008135 |
| RPC URL | https://api.helium.fhenix.zone |
| Block Explorer | https://explorer.helium.fhenix.zone |
| Native Token | tFHE |
| Faucet | https://get-helium.fhenix.zone |

### 3.2 CoFHE 支持的网络

CoFHE 是 Fhenix 的协处理器方案，可以在现有 EVM 链上使用 FHE：

| 网络 | Chain ID | RPC URL | 推荐程度 |
|------|----------|---------|---------|
| Arbitrum Sepolia | 421614 | https://sepolia-rollup.arbitrum.io/rpc | 推荐（低 gas） |
| Ethereum Sepolia | 11155111 | https://rpc.sepolia.org | 可用 |
| Base Sepolia | 84532 | https://sepolia.base.org | 可用 |

**建议**: 当前项目已配置 Arbitrum Sepolia，可直接使用 CoFHE 进行开发。

### 3.3 MetaMask 配置

添加网络到 MetaMask:

```javascript
await window.ethereum.request({
  method: 'wallet_addEthereumChain',
  params: [{
    chainId: '0x7A31C7',  // 8008135 in hex
    chainName: 'Fhenix Helium',
    nativeCurrency: {
      name: 'Test FHE',
      symbol: 'tFHE',
      decimals: 18
    },
    rpcUrls: ['https://api.helium.fhenix.zone'],
    blockExplorerUrls: ['https://explorer.helium.fhenix.zone']
  }]
});
```

---

## 4. 开发工具

### 4.1 已安装的依赖

```json
{
  "@cofhe/hardhat-plugin": "0.4.0",
  "@fhenixprotocol/cofhe-contracts": "0.1.3",
  "fhenixjs": "0.4.1"
}
```

### 4.2 Hardhat 集成

在 `hardhat.config.ts` 中添加：

```typescript
import "@cofhe/hardhat-plugin";

const config: HardhatUserConfig = {
  solidity: "0.8.26",
  networks: {
    "arb-sepolia": {
      url: process.env.FHENIX_RPC_URL,
      accounts: [process.env.PRIVATE_KEY],
    },
  },
};
```

### 4.3 CoFHE 合约示例

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "@fhenixprotocol/cofhe-contracts/FHE.sol";

contract EncryptedInvoice {
    euint64 private encryptedAmount;

    function setAmount(einput calldata encryptedInput, bytes calldata proof) public {
        encryptedAmount = FHE.asEuint64(encryptedInput, proof);
        FHE.allowThis(encryptedAmount);
        FHE.allowSender(encryptedAmount);
    }

    function addAmount(euint64 value) public {
        encryptedAmount = FHE.add(encryptedAmount, value);
    }
}
```

---

## 5. 钱包兼容性

### 5.1 支持的钱包

Fhenix 作为 EVM 兼容链，支持所有标准 EVM 钱包：

- MetaMask (推荐)
- WalletConnect 兼容钱包
- Coinbase Wallet
- Rainbow
- 其他 EVM 钱包

### 5.2 前端集成方案

推荐使用 wagmi + RainbowKit 或 ConnectKit：

```bash
pnpm add wagmi viem @rainbow-me/rainbowkit @tanstack/react-query
```

---

## 6. 获取测试代币

### 6.1 Fhenix Helium (tFHE)

- Faucet: https://get-helium.fhenix.zone
- 限制: 每 5 分钟 0.1 tFHE
- 更多代币: 联系 Fhenix Discord 或从 Sepolia 桥接

### 6.2 Arbitrum Sepolia ETH

- QuickNode Faucet: https://faucet.quicknode.com/arbitrum/sepolia
- Chainlink Faucet: https://faucets.chain.link/arbitrum-sepolia

### 6.3 Ethereum Sepolia ETH

- Chainlink Faucet: https://faucets.chain.link/sepolia
- Alchemy Faucet: https://sepoliafaucet.com

---

## 7. 项目配置状态

### 7.1 已完成

- [x] 安装 @cofhe/hardhat-plugin
- [x] 安装 @fhenixprotocol/cofhe-contracts
- [x] 安装 fhenixjs SDK
- [x] 添加网络配置到 `packages/config`
- [x] 研究 fhEVM vs 标准 EVM 差异
- [x] 研究 FHE vs ZK 差异
- [x] 了解 SDK API 使用方式
- [x] 确认钱包兼容性

### 7.2 后续步骤 (Phase 2)

1. 将现有 `InvoiceRegistryFHE.sol` 升级为真正的 FHE 合约
2. 添加 FHE 加密字段 (euint64 for amounts, ebool for status)
3. 集成 CoFHE permit 系统
4. 编写 Hardhat 测试用例

---

## 8. 参考链接

- [Fhenix 官网](https://www.fhenix.io/)
- [CoFHE 文档](https://cofhe-docs.fhenix.zone/fhe-library/introduction/quick-start)
- [fhenix.js SDK](https://fhenixjs.fhenix.zone/)
- [CoFHE Hardhat Starter](https://github.com/fhenixprotocol/cofhe-hardhat-starter)
- [Fhenix Helium Explorer](https://explorer.helium.fhenix.zone)
- [wagmi 文档](https://wagmi.sh/)
- [RainbowKit](https://www.rainbowkit.com/)

---

## 9. 注意事项与风险

### 9.1 技术风险

1. **FHE 计算成本**: FHE 操作的 gas 成本较高，需要优化合约设计
2. **SDK 稳定性**: fhenixjs 仍为 beta 版本 (0.4.x)，API 可能变化
3. **Breaking Changes**: cofhe-contracts v0.1.0 有重大变更，加密类型句柄从 uint256 改为 bytes32

### 9.2 迁移建议

1. 保持 Aleo 版本代码作为备份
2. 先在 Arbitrum Sepolia 上进行开发测试
3. 考虑抽象区块链无关层，便于未来多链支持
