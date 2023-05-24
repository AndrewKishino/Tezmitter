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

const CTEZ_CONTRACT = process.env.REACT_APP_CTEZ_CONTRACT;

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
const DOMAIN =
  process.env.NODE_ENV === 'production' ? process.env.REACT_APP_WEBSITE : '/';

const socket = io(DOMAIN);

function Main() {
  const mainRef = useRef(null);
  const socketDispatch = useSocketDispatch();
  const [rpcUrl, setRpcUrl] = useLocalStorage(
    'RPC_URL',
    RPC_MAP[process.env.REACT_APP_TEZOS_NETWORK],
  );
  const [saplingContract, setSaplingContract] = useLocalStorage(
    'SAPLING_CONTRACT_CTEZ',
    SAPLING_CONTRACT,
  );

  const [tezosClient] = useState(new TezosToolkit(rpcUrl));

  const [secretKey, setSecretKey] = useState([]);
  const [
    worker,
    reInitializeSapling,
    { loading: workerIsLoading, loaded: workerLoaded },
  ] = useSaplingWorker(secretKey, saplingContract, rpcUrl);

  const [account, setAccount] = useState(null);
  const [saplingAccount, setSaplingAccount] = useState(null);

  const [shieldedBalance, setShieldedBalance] = useState(null);
  const [transactionHistory, setTransactionHistory] = useState(null);

  const [cTezBalance, setCtezBalance] = useState(null);

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
      setSecretKey([]);
      getPaymentAddress();
      getSaplingAccountData();
    }
  }, [workerLoaded]);

  useEffect(() => {
    if (account) {
      getCtezBalance().then(setCtezBalance);
    } else {
      setCtezBalance(null);
    }
  }, [account]);

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

  const prepareShieldedTransaction = (txns) =>
    worker.exec('prepareShieldedTransaction', [txns]);

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

  const prepareSaplingTransaction = (txns) =>
    worker.exec('prepareSaplingTransaction', [txns]);

  const getSaplingAccountData = () => {
    worker.exec('getSaplingTransactions').then(setTransactionHistory);
    worker.exec('getSaplingBalance').then(setShieldedBalance);
    if (account) {
      getCtezBalance().then(setCtezBalance);
    }
  };

  const getCtezBalance = async () => {
    const cTezContract = await tezosClient.wallet.at(CTEZ_CONTRACT);
    const storage = await cTezContract.storage();
    const balance = await storage.tokens.get(account);
    return balance.toNumber();
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
                cTezBalance={cTezBalance}
                socket={socket}
                tezosClient={tezosClient}
                transactionHistory={transactionHistory}
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
