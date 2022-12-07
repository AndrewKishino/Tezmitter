import Client from './client';

export default class TezmitterApi extends Client {
  submitFundedTransaction = ({
    opHash,
    blockHash,
    shieldedTx,
    amount,
    contract,
  }) =>
    this.post('/api/submitFundedTransaction', {
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        opHash,
        blockHash,
        shieldedTx,
        amount,
        contract,
      }),
    }).then((res) => res.json());
}
