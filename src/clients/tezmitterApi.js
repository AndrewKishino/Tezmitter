import Client from './client';

const DOMAIN =
  process.env.NODE_ENV === 'production' ? process.env.REACT_APP_WEBSITE : '';

export default class TezmitterApi extends Client {
  submitPrivateTransaction = ({ txnId, shieldedTx, contract }) =>
    this.post(`${DOMAIN}/api/submitPrivateTransaction`, {
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        txnId,
        shieldedTx,
        contract,
      }),
    }).then((res) => res.json());
}
