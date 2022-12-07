import { NetworkType } from '@airgap/beacon-dapp';
import Client from './client';

const network = process.env.REACT_APP_TEZOS_NETWORK || 'mainnet';

const tzktApiMap = {
  [NetworkType.MAINNET]: 'https://api.tzkt.io',
  [NetworkType.GHOSTNET]: 'https://api.ghostnet.tzkt.io',
  [NetworkType.KATHMANDUNET]: 'https://api.kathmandunet.tzkt.io',
};

export default class Tzkt extends Client {
  constructor() {
    super(tzktApiMap[network]);

    this.accounts = {
      delegator: (delegator) => this.get(`/v1/accounts/${delegator}`),
    };
    this.blocks = {
      block: (level) => this.get(`/v1/blocks/${level}`),
      current: () => this.get('/v1/blocks?sort.desc=level&limit=1'),
    };
    this.bigmaps = {
      key: (id, key) => this.get(`/v1/bigmaps/${id}/keys/${key}`),
    };
    this.contracts = {
      storage: (address) => this.get(`/v1/contracts/${address}/storage`),
    };
    this.delegates = {
      baker: (baker) => this.get(`/v1/delegates/${baker}`),
    };
    this.rewards = {
      delegator: (delegator, { limit = 1000, offset = 0 } = {}) =>
        this.get(
          `/v1/rewards/delegators/${delegator}?limit=${limit}&offset=${offset}`,
        ),
      split: (baker, cycle, { limit = 1000, offset = 0 } = {}) =>
        this.get(
          `/v1/rewards/split/${baker}/${cycle}?limit=${limit}&offset=${offset}`,
        ),
    };
    this.voting = {
      period: (index) => this.get(`/v1/voting/periods/${index}`),
      current: () => this.get('/v1/voting/periods/current'),
    };
  }
}
