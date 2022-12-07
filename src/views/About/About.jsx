import React from 'react';

import TezosValue from 'components/TezosValue';

function About() {
  return (
    <div className="ps-5 pe-5 pt-5 pb-5">
      <h1 className="text-center pt-3">About</h1>
      <p>
        Tezmitter is an application that interfaces with sapling contracts on
        the Tezos blockchain. Sapling contracts allow you to shield tez in a
        pool. Shielded tez can be transferred within the pool by submitting
        signed sapling transactions.
      </p>
      <p>
        While it is possible to see interactions with the sapling contract, the
        allocation of tez within the contract is unknown. A user is able to
        retrieve their balance and transaction history if they have access to
        the sapling spending key.
      </p>
      <p>
        In order to address the issue of having to interact directly with the
        sapling contract, we have developed a process to fund and submit sapling
        transactions. This requires a level of trust as you will need to fund a
        shielded transaction entirely by sending the funds to an intermediary
        submitter. Otherwise, you are able to interact directly with the
        contract if you wish.
      </p>

      <h1 className="text-center pt-3">How It Works</h1>
      <p>
        When constructing a sapling transaction, you have the option to submit
        the transaction directly (which sacrifices anonymity) or through a
        funded transaction.
      </p>
      <p>
        If you choose to submit the transaction anonymously, you will be
        prompted to fund the transaction. The base fee for all anonymous
        submissions is <TezosValue value={0.5} />. In addition, the estimated
        transaction costs are included in the funding transaction. Once the
        transaction is funded, the sapling transaction is submitted to a service
        to be injected in the next available block.
      </p>
      <p>
        If you choose not to submit the transaction anonymously, the transaction
        will be injected directly from the connected wallet.
      </p>
      <p>
        Shielding tez requires you to send the exact amount you wish to credit
        to your sapling address. For these transactions, the wallet will require
        you to send the amount you wish to shield either directly through the
        wallet or through a funded transaction.
      </p>
    </div>
  );
}

export default About;
