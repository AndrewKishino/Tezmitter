const { TezosToolkit } = require('@taquito/taquito');
const { InMemorySigner } = require('@taquito/signer');
const Queue = require('bee-queue');

const RPC_MAP = {
  mainnet: 'https://mainnet.api.tez.ie',
  ghostnet: 'https://ghostnet.ecadinfra.com',
};

const tezos = new TezosToolkit(RPC_MAP[process.env.REACT_APP_TEZOS_NETWORK]);
tezos.setProvider({
  signer: new InMemorySigner(
    process.env.FUNDING_SECRET_KEY,
    process.env.FUNDING_SECRET_KEY_PASSPHRASE,
  ),
});

class Tezmitter {
  constructor(io) {
    this.websocket = io;
    this.queue = new Queue(
      `saplingTxQueue-${process.env.REACT_APP_TEZOS_NETWORK}`,
    );

    this.queue.process(async (job) => {
      const { txnId, shieldedTx, contract } = job.data;
      await this.submitPrivateTransaction({
        txnId,
        shieldedTx,
        contract,
      });
    });
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

  queuePrivateTransaction = ({ txnId, shieldedTx, contract }) => {
    const job = this.queue.createJob({
      txnId,
      shieldedTx,
      contract,
    });

    job.save();
  };
}

module.exports = {
  Tezmitter,
};
