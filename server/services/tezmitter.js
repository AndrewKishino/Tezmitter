const { TezosToolkit } = require('@taquito/taquito');
const { InMemorySigner } = require('@taquito/signer');

const RPC_MAP = {
  mainnet: 'https://mainnet.api.tez.ie',
  ghostnet: 'https://ghostnet.ecadinfra.com',
  kathmandunet: 'https://kathmandunet.ecadinfra.com',
};

const TRANSACTION_OPERATIONS_INDEX = 3;
const BASE_FEE = process.env.REACT_APP_BASE_FEE;

const tezos = new TezosToolkit(RPC_MAP[process.env.REACT_APP_TEZOS_NETWORK]);
tezos.setProvider({
  signer: new InMemorySigner(process.env.FUNDING_SECRET_KEY),
});

class Tezmitter {
  constructor(io) {
    this.io = io;
  }

  transactionInterval = setInterval(() => {
    if (!this.transactionPending && this.inMemoryQueue.length) {
      const tx = this.inMemoryQueue.shift();
      this.settleFundedTransaction(tx);
    }
  }, 15_000);

  inMemoryQueue = [];

  inMemoryOpMap = {};

  transactionPending = false;

  validateFundedTransaction = async (opHash, blockHash, amount) => {
    if (this.inMemoryOpMap[opHash]) {
      return false;
    }

    const block = await tezos.rpc.getBlock({ block: blockHash });
    const operation = block.operations[TRANSACTION_OPERATIONS_INDEX].find(
      (op) => op.hash === opHash,
    );

    const operationContent = operation?.contents?.find(
      (content) =>
        content.destination === process.env.REACT_APP_FUNDING_ADDRESS,
    );

    if (!operationContent) {
      return false;
    }

    return (
      parseInt(operationContent.amount, 10) >=
      (parseInt(amount, 10) + parseInt(BASE_FEE, 10)) * 1_000_000
    );
  };

  settleFundedTransaction = async ({
    opHash,
    blockHash,
    shieldedTx,
    amount,
    contract,
  }) => {
    if (this.transactionPending) {
      this.inMemoryQueue.unshift({
        opHash,
        blockHash,
        shieldedTx,
        amount,
        contract,
      });
      return;
    }

    if (!contract) {
      throw new Error('No contract provided');
    }

    const isValid = await this.validateFundedTransaction(
      opHash,
      blockHash,
      amount,
    );

    if (!isValid) {
      throw new Error('Submitted funded transaction is not valid');
    }

    console.log(
      `Submitting sapling transaction: ${JSON.stringify(
        { shieldedTx, amount, contract, isValid },
        null,
        2,
      )}`,
    );

    tezos.contract
      .at(contract)
      .then((saplingContract) =>
        saplingContract.methods
          .default([shieldedTx])
          .send({ amount, mutez: false }),
      )
      .then((op) =>
        op.confirmation(2).then(() => {
          this.inMemoryOpMap[opHash] = true;
          this.transactionPending = false;
          this.io.emit(opHash, true);
          return op.hash;
        }),
      )
      .catch((err) => {
        console.log(err.message);
        this.inMemoryOpMap[opHash] = true;
        this.transactionPending = false;
      });
  };

  queueFundedTransaction = async ({
    opHash,
    blockHash,
    shieldedTx,
    amount,
    contract,
  }) => {
    if (!this.inMemoryOpMap[opHash]) {
      this.inMemoryQueue.push({
        opHash,
        blockHash,
        shieldedTx,
        amount,
        contract,
      });
    }
  };
}

module.exports = {
  Tezmitter,
};
