import Client from './client';

const DOMAIN =
  process.env.NODE_ENV === 'production' ? process.env.REACT_APP_WEBSITE : '';

export default class TezmitterApi extends Client {
  submitFundedTransaction = ({
    opHash,
    blockHash,
    shieldedTx,
    amount,
    contract,
  }) =>
    this.post(`${DOMAIN}/api/submitFundedTransaction`, {
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
