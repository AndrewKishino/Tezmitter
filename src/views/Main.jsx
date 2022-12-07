/* eslint-disable no-unused-vars */
import React, { useEffect, useRef, useState } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { TezosToolkit } from '@taquito/taquito';
import { NetworkType, BlockExplorer } from '@airgap/beacon-dapp';
import { BeaconWallet } from '@taquito/beacon-wallet';
import io from 'socket.io-client';
import { Toaster } from 'react-hot-toast';

import Navbar from 'components/Navbar/Navbar';
import {
  useSocketDispatch,
  updateConnection,
  updateConstants,
  updateLatestBlock,
} from 'context/SocketContext';
import { useLocalStorage, useSaplingWorker } from 'hooks';

import Tezmitter from './Tezmitter';
import About from './About';

class TzktBeacon extends BlockExplorer {
  /**
   * Return a blockexplorer link for an address

   * @param address The address to be opened
   * @param network The network that was used
   */
  getAddressLink = async (address, network) => {
    const networkLink = await this.getLinkForNetwork(network);
    return `${networkLink}/${address}`;
  };

  /**
   * Return a blockexplorer link for a transaction hash
   *
   * @param transactionId The hash of the transaction
   * @param network The network that was used
   */
  getTransactionLink = async (transactionId, network) => {
    const networkLink = await this.getLinkForNetwork(network);
    return `${networkLink}/${transactionId}`;
  };
}

const networkMap = {
  mainnet: {
    type: NetworkType.MAINNET,
    name: 'Mainnet',
  },
  ghostnet: {
    type: NetworkType.GHOSTNET,
    name: 'Ghostnet',
  },
  kathmandunet: {
    type: NetworkType.KATHMANDUNET,
    name: 'Kathmandunet',
  },
};

const NETWORK = networkMap[process.env.REACT_APP_TEZOS_NETWORK];

const RPC_MAP = {
  [NetworkType.MAINNET]: 'https://mainnet.api.tez.ie',
  [NetworkType.GHOSTNET]: 'https://ghostnet.ecadinfra.com',
  [NetworkType.KATHMANDUNET]: 'https://kathmandunet.ecadinfra.com',
};

// const SAPLING_CONTRACT = 'KT1JMDxmQ4DAbzXpzAJmL6QeZ9HB7DTVnZYd';
const SAPLING_CONTRACT = process.env.REACT_APP_SAPLING_CONTRACT;

const wallet = new BeaconWallet({
  name: 'Tezmitter',
  iconUrl: process.env.REACT_APP_LOGO,
  appUrl: 'https://tezmitter.com',
  preferredNetwork: NETWORK,
  blockExplorer: new TzktBeacon({
    [NetworkType.MAINNET]: 'https://tzkt.io',
    [NetworkType.GHOSTNET]: 'https://ghostnet.tzkt.io',
    [NetworkType.KATHMANDUNET]: 'https://kathmandunet.tzkt.io',
  }),
});

const socket = io('/');

function Main() {
  const mainRef = useRef(null);
  const socketDispatch = useSocketDispatch();
  const [rpcUrl, setRpcUrl] = useLocalStorage(
    'RPC_URL',
    RPC_MAP[process.env.REACT_APP_TEZOS_NETWORK],
  );
  const [saplingContract, setSaplingContract] = useLocalStorage(
    'SAPLING_CONTRACT',
    SAPLING_CONTRACT,
  );

  const [tezosClient] = useState(new TezosToolkit(rpcUrl));

  const [secretKey, setSecretKey] = useState('');
  const [
    worker,
    reInitializeSapling,
    { loading: workerIsLoading, loaded: workerLoaded },
  ] = useSaplingWorker(secretKey, saplingContract, rpcUrl);

  const [account, setAccount] = useState(null);
  const [saplingAccount, setSaplingAccount] = useState(null);

  const [shieldedBalance, setShieldedBalance] = useState(null);
  const [transactionHistory, setTransactionHistory] = useState(null);

  useEffect(() => {
    socket.on('connect', () => {
      updateConnection(socketDispatch, true);
    });
    socket.on('disconnect', () => {
      updateConnection(socketDispatch, false);
    });
    socket.on('block', (payload) => {
      updateLatestBlock(socketDispatch, payload);
    });
    socket.on('constants', (payload) => {
      updateConstants(socketDispatch, payload);
    });
  }, []);

  useEffect(() => {
    document.documentElement.scrollTop = 0;
    document.scrollingElement.scrollTop = 0;
    mainRef.current.scrollTop = 0;
    initDappClient();
    tezosClient.setRpcProvider(rpcUrl);
  }, []);

  useEffect(() => {
    if (workerLoaded) {
      setSecretKey('');
      getPaymentAddress();
      getSaplingAccountData();
    }
  }, [workerLoaded]);

  useEffect(() => {
    if (rpcUrl) {
      tezosClient.setRpcProvider(rpcUrl);
    }
  }, [rpcUrl]);

  const initDappClient = () => {
    wallet.client.getActiveAccount().then((activeAccount) => {
      if (activeAccount) {
        tezosClient.setWalletProvider(wallet);
        setAccount(activeAccount.address);
      }
    });
  };

  const connectDapp = () => {
    wallet
      .requestPermissions({
        network: NETWORK,
      })
      .then(() => {
        tezosClient.setWalletProvider(wallet);
        wallet.getPKH().then(setAccount);
      })
      .catch(console.error);
  };

  const disconnectDapp = () => {
    wallet
      .clearActiveAccount()
      .then(() => {
        setAccount('');
      })
      .catch(console.error);
  };

  const getPaymentAddress = () => {
    worker.exec('getPaymentAddress').then((address) => {
      setSaplingAccount(address?.address);
    });
  };

  const prepareShieldedTransaction = ({
    to = saplingAccount,
    amount,
    memo = '',
    mutez = false,
  }) =>
    worker.exec('prepareShieldedTransaction', [[{ to, amount, memo, mutez }]]);

  const prepareUnshieldedTransaction = ({
    amount,
    to = account,
    mutez = false,
  }) =>
    worker.exec('prepareUnshieldedTransaction', [
      {
        to,
        amount,
        mutez,
      },
    ]);

  const prepareSaplingTransaction = ({
    to,
    amount,
    memo = '',
    mutez = false,
  }) =>
    worker.exec('prepareSaplingTransaction', [[{ to, amount, memo, mutez }]]);

  const getSaplingAccountData = () => {
    worker.exec('getSaplingTransactions').then(setTransactionHistory);
    worker.exec('getSaplingBalance').then(setShieldedBalance);
  };

  return (
    <BrowserRouter>
      <Navbar
        account={account}
        connectDapp={connectDapp}
        disconnectDapp={disconnectDapp}
        saplingAccount={saplingAccount}
        reInitializeSapling={() => {
          setSaplingAccount('');
          reInitializeSapling();
        }}
      />
      <main ref={mainRef}>
        <Routes>
          <Route
            path="/"
            exact
            element={
              <Tezmitter
                account={account}
                getSaplingAccountData={getSaplingAccountData}
                prepareSaplingTransaction={prepareSaplingTransaction}
                prepareShieldedTransaction={prepareShieldedTransaction}
                prepareUnshieldedTransaction={prepareUnshieldedTransaction}
                reInitializeSapling={() => {
                  setSaplingAccount('');
                  reInitializeSapling();
                }}
                rpcUrl={rpcUrl}
                saplingAccount={saplingAccount}
                saplingContract={saplingContract}
                saplingWorkerIsLoading={workerIsLoading}
                saplingWorkerLoaded={workerLoaded}
                setRpcUrl={setRpcUrl}
                setSaplingContract={setSaplingContract}
                setSecretKey={setSecretKey}
                shieldedBalance={shieldedBalance}
                socket={socket}
                tezosClient={tezosClient}
              />
            }
          />
          <Route path="/about" exact element={<About />} />
        </Routes>
      </main>
      <Toaster />
    </BrowserRouter>
  );
}

export default Main;
