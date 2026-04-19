# Fhenix 合约调用实现总结

## ✅ 已完成的功能

### 1. Invoice 支付逻辑

**文件**: `hooks/useFhenixProtocolWrites.ts`

**函数**: `useFhenixInvoiceWrites().payInvoice(invoiceId: Bytes32)`

**实现细节**:
- 使用 wagmi 的 `useWriteContract` hook
- 调用 `InvoiceRegistry` 合约的 `payInvoice` 函数
- 等待交易确认后返回交易哈希
- 错误处理包括钱包未连接、合约未配置等情况

**集成位置**:
- `app/[locale]/(app)/invoices/[id]/page.tsx` 的 `handlePayInvoice` 函数
- 支付成功后更新发票状态为 `PAID`
- 生成收据并添加到 receipt store

**调用流程**:
```typescript
const result = await payInvoice(invoice.id as Bytes32);
if (result.success && result.transactionHash) {
  // 更新发票状态
  persistInvoiceToStore({
    ...invoice,
    status: InvoiceStatus.PAID,
    transactionHash: result.transactionHash,
  });
  // 创建收据
  addReceipt({
    paymentId: result.transactionHash,
    invoiceId: invoice.id,
    payer: invoice.buyer,
    payee: invoice.seller,
    amount: invoice.amount,
    paidAt: new Date(),
  });
}
```

---

### 2. Invoice 取消逻辑

**文件**: `hooks/useFhenixProtocolWrites.ts`

**函数**: `useFhenixInvoiceWrites().cancelInvoice(invoiceId: Bytes32)`

**实现细节**:
- 使用 wagmi 的 `useWriteContract` hook
- 调用 `InvoiceRegistry` 合约的 `cancelInvoice` 函数
- 仅允许 seller 取消未支付的发票
- 等待交易确认后返回结果

**集成位置**:
- `app/[locale]/(app)/invoices/[id]/page.tsx` 的 `handleCancelInvoice` 函数
- 取消成功后更新发票状态为 `CANCELLED`

**调用流程**:
```typescript
const result = await cancelInvoice(invoice.id as Bytes32);
if (result.success) {
  // 更新发票状态
  persistInvoiceToStore({
    ...invoice,
    status: InvoiceStatus.CANCELLED,
    transactionHash: result.transactionHash,
    updatedAt: new Date(),
  });
}
```

---

### 3. Dispute 解决逻辑

**文件**: `hooks/useFhenixProtocolWrites.ts`

**函数**: `useFhenixDisputeWrites().resolveDispute(disputeId: Bytes32, resolution: 'plaintiff' | 'defendant')`

**实现细节**:
- 使用 wagmi 的 `useWriteContract` hook
- 调用 `Dispute` 合约的 `resolveDispute` 函数
- 支持两种解决方案:
  - `'plaintiff'` → `DisputeStatus.RESOLVED_CANCEL` (取消发票)
  - `'defendant'` → `DisputeStatus.RESOLVED_PAY` (支付发票)
- 生成 resolution hash 作为链上证明
- **注意**: `'split'` (分账) 暂不支持，UI 中已禁用

**集成位置**:
- `app/[locale]/(app)/disputes/[id]/page.tsx` 的 `handleResolve` 函数
- 仅仲裁人可以解决纠纷
- 解决成功后更新纠纷状态

**调用流程**:
```typescript
const result = await resolveDispute(dispute.id as Bytes32, resolution);
if (result.success) {
  const nextStatus =
    resolution === 'plaintiff'
      ? DisputeStatus.RESOLVED_CANCEL
      : DisputeStatus.RESOLVED_PAY;
  updateDispute(dispute.id as Bytes32, { status: nextStatus });
}
```

---

## 🔧 技术栈

- **区块链交互**: wagmi v2 (useWriteContract, usePublicClient)
- **网络**: Fhenix Helium Testnet (Chain ID: 8008135)
- **合约标准**: Solidity + FHE (全同态加密)
- **类型安全**: TypeScript with strict mode
- **状态管理**: Zustand stores

---

## 📋 合约 ABIs

所有合约 ABIs 定义在 `lib/contracts.ts`:

1. **InvoiceRegistryABI**: 发票注册表合约
   - `payInvoice(bytes32 invoiceId)`
   - `cancelInvoice(bytes32 invoiceId)`
   - `getInvoice(bytes32 invoiceId)` (view)
   - `getInvoiceStatus(bytes32 invoiceId)` (view)

2. **DisputeABI**: 纠纷合约
   - `raiseDispute(...)`
   - `resolveDispute(bytes32 disputeId, uint8 resolution, bytes32 resolutionHash)`
   - `submitEvidence(bytes32 disputeId, bytes32 evidenceHash)`
   - `getDispute(bytes32 disputeId)` (view)

3. **EscrowABI**: 托管合约
   - `createEscrow(...)`
   - `confirmDelivery(bytes32 escrowId)`
   - `timeoutRefund(bytes32 escrowId)`
   - `arbiterResolve(bytes32 escrowId, bool releaseToSeller)`

---

## 🌐 环境变量配置

需要在 `.env.local` 中配置合约地址:

```env
NEXT_PUBLIC_INVOICE_REGISTRY_ADDRESS=0x...
NEXT_PUBLIC_ESCROW_ADDRESS=0x...
NEXT_PUBLIC_DISPUTE_ADDRESS=0x...
```

**验证配置**:
```typescript
import { areContractsConfigured } from '@/lib/contracts';

if (!areContractsConfigured()) {
  toast.error('Contract addresses are not configured');
}
```

---

## 🎯 用户体验流程

### 支付发票流程
1. Buyer 进入发票详情页 (`/invoices/[id]`)
2. 点击 "Pay Invoice" 按钮
3. 钱包弹出签名确认
4. 等待交易上链确认
5. 发票状态更新为 PAID
6. 生成收据并保存到 receipt store
7. 自动跳转到发票列表页

### 取消发票流程
1. Seller 进入发票详情页
2. 点击 "Cancel Invoice" 按钮
3. 钱包弹出签名确认
4. 等待交易上链确认
5. 发票状态更新为 CANCELLED
6. 自动跳转到发票列表页

### 解决纠纷流程
1. Arbiter 进入纠纷详情页 (`/disputes/[id]`)
2. 查看纠纷信息和时间线
3. 选择解决方案:
   - "Favour Plaintiff" - 支持原告(取消发票)
   - "Favour Defendant" - 支持被告(支付发票)
   - "Split" - 分账 (暂不支持，按钮已禁用)
4. 钱包弹出签名确认
5. 等待交易上链确认
6. 纠纷状态更新为 RESOLVED
7. 自动跳转到纠纷列表页

---

## ⚠️ 错误处理

所有函数都有完善的错误处理:

```typescript
interface ProtocolWriteResult {
  success: boolean;
  transactionHash?: TransactionHash;
  error?: string;
}
```

**常见错误**:
- `Wallet not connected` - 用户未连接钱包
- `Contract addresses are not configured` - 合约地址未配置
- `Transaction failed` - 交易失败 (gas 不足、revert 等)
- 用户拒绝签名 - wagmi 会自动处理

**UI 反馈**:
- 使用 `sonner` toast 显示成功/失败消息
- 按钮 loading 状态防止重复提交
- 交易失败后可以重试

---

## 🔐 安全考虑

1. **权限检查**:
   - 支付: 仅 buyer 可以支付
   - 取消: 仅 seller 可以取消
   - 解决: 仅 arbiter 可以解决纠纷

2. **状态验证**:
   - 支付前检查发票状态为 PENDING
   - 取消前检查发票状态为 PENDING
   - 解决前检查纠纷状态为 OPEN

3. **交易确认**:
   - 所有交易都等待链上确认
   - 使用 `publicClient.waitForTransactionReceipt()`

4. **类型安全**:
   - 严格的 TypeScript 类型
   - Bytes32 类型确保正确的哈希格式

---

## 🚀 下一步

目前所有核心功能已完成，建议后续工作:

1. ✅ 添加审计包生成功能 (已实现)
2. ⏳ 添加 Escrow 功能的 UI 集成
3. ⏳ 添加事件监听器自动更新状态
4. ⏳ 添加交易历史查询
5. ⏳ 添加 Gas 费用预估显示
6. ⏳ 添加批量操作支持

---

*最后更新: 2026-04-19*
