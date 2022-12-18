import workerpool from 'workerpool';
import { RpcReadAdapter } from '@taquito/taquito';
import { SaplingToolkit, InMemorySpendingKey } from '@taquito/sapling';
import { RpcClient } from '@taquito/rpc';
import { Prefix, prefix, b58cencode } from '@taquito/utils';
import * as sapling from '@airgap/sapling-wasm';
import * as bip39 from 'bip39';

let iMSK;
let sTk;

const createExtendedSpendingKey = async (mnemonic) => {
  const fullSeed = await bip39.mnemonicToSeed(
    mnemonic || bip39.generateMnemonic(),
  );
  const first32 = fullSeed.subarray(0, 32);
  const second32 = fullSeed.subarray(32);
  const seed = Buffer.from(
    first32.map((byte, index) => byte ^ second32[index]),
  );
  const spendingKeyArr = new Uint8Array(
    await sapling.getExtendedSpendingKey(seed, 'm/'),
  );
  return b58cencode(spendingKeyArr, prefix[Prefix.SASK]);
};

const loadSaplingSecret = (sk, saplingContractAddress, rpcUrl) => {
  try {
    iMSK = new InMemorySpendingKey(sk);
  } catch (err) {
    iMSK = null;
    sTk = null;
    throw err;
  }

  try {
    sTk = new SaplingToolkit(
      { saplingSigner: iMSK },
      { contractAddress: saplingContractAddress, memoSize: 8 },
      new RpcReadAdapter(new RpcClient(rpcUrl)),
    );
  } catch (err) {
    iMSK = null;
    sTk = null;
    throw err;
  }
};

const getPaymentAddress = () =>
  iMSK
    ?.getSaplingViewingKeyProvider()
    .then((inMemoryViewingKey) => inMemoryViewingKey.getAddress());

const prepareShieldedTransaction = (transactions = []) =>
  sTk
    ?.prepareShieldedTransaction(transactions)
    .catch((err) => console.error(err.message));

const prepareUnshieldedTransaction = ({ amount, to, mutez = false }) =>
  sTk
    ?.prepareUnshieldedTransaction({
      to,
      amount,
      mutez,
    })
    .catch((err) => console.error(err.message));

const prepareSaplingTransaction = (transactions = []) =>
  sTk
    ?.prepareSaplingTransaction(transactions)
    .catch((err) => console.error(err.message));

const getSaplingBalance = () =>
  sTk
    ?.getSaplingTransactionViewer()
    .then((txViewer) =>
      txViewer.getBalance().then((balance) => balance.toNumber()),
    )
    .catch((err) => console.error(err.message));

const getSaplingTransactions = () =>
  sTk
    ?.getSaplingTransactionViewer()
    .then((txViewer) => txViewer.getIncomingAndOutgoingTransactions())
    .then((transactionHistory) => ({
      incoming: transactionHistory.incoming.map((tx) => ({
        ...tx,
        value: tx.value.toNumber(),
      })),
      outgoing: transactionHistory.outgoing.map((tx) => ({
        ...tx,
        value: tx.value.toNumber(),
      })),
    }))
    .catch((err) => console.error(err.message));

const reInitializeSapling = () => {
  iMSK = null;
  sTk = null;
};

workerpool.worker({
  createExtendedSpendingKey,
  loadSaplingSecret,
  getPaymentAddress,
  prepareShieldedTransaction,
  prepareUnshieldedTransaction,
  prepareSaplingTransaction,
  getSaplingBalance,
  getSaplingTransactions,
  reInitializeSapling,
});
