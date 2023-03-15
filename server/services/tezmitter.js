const { TezosToolkit } = require('@taquito/taquito');
const { InMemorySigner } = require('@taquito/signer');

const RPC_MAP = {
  mainnet: 'https://mainnet.api.tez.ie',
  ghostnet: 'https://ghostnet.ecadinfra.com',
  kathmandunet: 'https://kathmandunet.ecadinfra.com',
};

const tezos = new TezosToolkit(RPC_MAP[process.env.REACT_APP_TEZOS_NETWORK]);
tezos.setProvider({
  signer: new InMemorySigner(process.env.FUNDING_SECRET_KEY),
});

class Tezmitter {
  constructor(io) {
    this.websocket = io;
    this.inMemoryQueue = [];
    this.transactionPending = false;
    this.settlementProcessorTimeoutId = this.settlementProcessor();
  }

  submitPrivateTransaction = async ({
    txnId,
    shieldedTx,
    contract,
    amount = 0,
  }) => {
    if (!contract) {
      throw new Error('No contract provided');
    }

    console.log(
      `Submitting sapling transaction: ${JSON.stringify(
        { txnId, shieldedTx, amount, contract },
        null,
        2,
      )}`,
    );

    return tezos.contract
      .at(contract)
      .then((saplingContract) =>
        saplingContract.methods
          .default([shieldedTx])
          .send({ amount, mutez: false }),
      )
      .then((op) =>
        op.confirmation(2).then(() => {
          this.websocket.emit(txnId, true);
        }),
      )
      .catch((_err) => {
        this.websocket.emit(txnId, false);
      });
  };

  settlementProcessor = () => setTimeout(this.settlementProcess, 15_000);

  settlementProcess = async () => {
    try {
      if (!this.transactionPending && this.inMemoryQueue.length) {
        this.transactionPending = true;
        const tx = this.inMemoryQueue.shift();
        await this.submitPrivateTransaction(tx).catch(console.error);
        this.transactionPending = false;
      }
      this.settlementProcessorTimeoutId = this.settlementProcessor();
    } catch (err) {
      this.transactionPending = false;
      this.settlementProcessorTimeoutId = this.settlementProcessor();
      console.error(err);
    }
  };

  queuePrivateTransaction = async ({ txnId, shieldedTx, contract }) => {
    this.inMemoryQueue.push({
      txnId,
      shieldedTx,
      contract,
    });
  };
}

module.exports = {
  Tezmitter,
};
