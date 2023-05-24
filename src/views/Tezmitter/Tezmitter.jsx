import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import Badge from 'react-bootstrap/Badge';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import OverlayTrigger from 'react-bootstrap/OverlayTrigger';
import Pagination from 'react-bootstrap/Pagination';
import Spinner from 'react-bootstrap/Spinner';
import Tab from 'react-bootstrap/Tab';
import Tabs from 'react-bootstrap/Tabs';
import Tooltip from 'react-bootstrap/Tooltip';
import toast from 'react-hot-toast';
import { CopyToClipboard } from 'react-copy-to-clipboard';
import { NetworkType } from '@airgap/beacon-dapp';
import { nanoid } from 'nanoid';

import TezmitterApi from 'clients/tezmitterApi';
import CtezValue from 'components/CtezValue';
import ConfirmInjectModal from './sub/ConfirmInjectModal';
import HelpModal from './sub/HelpModal';

// import { useSocketState } from 'context/SocketContext';

import styles from './Tezmitter.module.scss';

const RPC_MAP = {
  [NetworkType.MAINNET]: 'https://mainnet.api.tez.ie',
  [NetworkType.GHOSTNET]: 'https://ghostnet.ecadinfra.com',
  [NetworkType.KATHMANDUNET]: 'https://kathmandunet.ecadinfra.com',
};
const BASE_FEE = parseInt(process.env.REACT_APP_BASE_FEE, 10);
const CTEZ_CONTRACT = process.env.REACT_APP_CTEZ_CONTRACT;
const SAPLING_FEE_ADDRESS = process.env.REACT_APP_SAPLING_FEE_ADDRESS;

const ITEMS_PER_PAGE = 10;

const SECRET_KEY_METHOD = 0;
const MNEMONIC_METHOD = 1;

const isValidUrl = (urlString = '') => {
  try {
    return Boolean(new URL(urlString));
  } catch (e) {
    return false;
  }
};

const isValidContract = (contract = '') =>
  contract.startsWith('KT') && contract.length === 36;

const tezmitterApi = new TezmitterApi();

function Tezmitter({
  account,
  getSaplingAccountData,
  prepareSaplingTransaction,
  prepareShieldedTransaction,
  prepareUnshieldedTransaction,
  reInitializeSapling,
  rpcUrl,
  saplingAccount,
  saplingContract,
  saplingWorkerIsLoading,
  saplingWorkerLoaded,
  setRpcUrl,
  setSecretKey,
  setSaplingContract,
  shieldedBalance,
  cTezBalance,
  socket,
  tezosClient,
  transactionHistory,
}) {
  // const { latestBlock, constants, connectionStatus } = useSocketState();
  const [tab, setTab] = useState('loadKey');
  const [txnTab, setTxnTab] = useState('incoming');

  const [loadAccountMethod, setLoadAccountMethod] = useState(MNEMONIC_METHOD);
  const [secretKeyInput, setSecretKeyInput] = useState('');
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [confirmInjectTxn, setConfirmInjectTxn] = useState('');

  const [isTransactionPending, setIsTransactionPending] = useState(false);
  const [isTransactionBuilding, setIsTransactionBuilding] = useState(false);
  const [fundingTransactionStatus, setFundingTransactionStatus] = useState('');

  const [shieldAddressInput, setShieldAddressInput] = useState('');
  const [shieldAmountInput, setShieldAmountInput] = useState(0);
  const [shieldMemoInput, setShieldMemoInput] = useState('');

  const [transferAddressInput, setTransferAddressInput] = useState('');
  const [transferAmountInput, setTransferAmountInput] = useState(0);
  const [transferMemoInput, setTransferMemoInput] = useState('');
  const [transferAnonymously, setTransferAnonymously] = useState(false);

  const [unshieldAddressInput, setUnshieldAddressInput] = useState('');
  const [unshieldAmountInput, setUnshieldAmountInput] = useState(0);

  const [rpcUrlInput, setRpcUrlInput] = useState(rpcUrl);
  const [saplingContractInput, setSaplingContractInput] =
    useState(saplingContract);

  const [incomingTransactionPage, setIncomingTransactionPage] = useState(1);
  const [outgoingTransactionPage, setOutgoingTransactionPage] = useState(1);

  // Input validation
  const secretKeyInputIsValid =
    loadAccountMethod === MNEMONIC_METHOD
      ? secretKeyInput.trim().split(/\s+/g).length >= 12
      : secretKeyInput.startsWith('sask') && secretKeyInput.length === 241;
  const shieldAddressInputIsValid =
    shieldAddressInput.startsWith('zet') && shieldAddressInput.length === 69;
  const unshieldAddressInputIsValid =
    unshieldAddressInput.startsWith('tz') && unshieldAddressInput.length === 36;
  const unshieldAmountInputIsValid =
    unshieldAmountInput > 0 &&
    unshieldAmountInput <= shieldedBalance / 1_000_000;
  const unshieldAmountInputIsInvalid =
    unshieldAmountInput < 0 ||
    unshieldAmountInput > shieldedBalance / 1_000_000;
  const transferAddressInputIsValid =
    transferAddressInput.startsWith('zet') &&
    transferAddressInput.length === 69;
  const transferAmountInputisValid = transferAnonymously
    ? transferAmountInput > 0 &&
      transferAmountInput <= shieldedBalance / 1_000_000 &&
      transferAmountInput + BASE_FEE <= shieldedBalance / 1_000_000
    : transferAmountInput > 0 &&
      transferAmountInput <= shieldedBalance / 1_000_000;
  const transferAmountInputisInvalid = transferAnonymously
    ? transferAmountInput < 0 ||
      transferAmountInput + BASE_FEE > shieldedBalance / 1_000_000
    : transferAmountInput < 0 ||
      transferAmountInput > shieldedBalance / 1_000_000;

  useEffect(() => {
    if (saplingWorkerLoaded && tab === 'loadKey') {
      setTab('shield');
    } else if (
      !saplingWorkerLoaded &&
      ['shield', 'transfer', 'unshield'].includes(tab)
    ) {
      setTab('loadKey');
    }
  }, [saplingWorkerLoaded]);

  const triggerToast = (text, icon) => {
    toast(<b>{text}</b>, {
      icon,
      position: 'bottom-center',
      duration: 15_000,
      style: {
        borderRadius: '10px',
        background: '#1b2235',
        color: '#ffffff',
      },
    });
  };

  const submitShieldTransaction = async () => {
    setIsTransactionPending(true);
    setIsTransactionBuilding(true);

    return prepareShieldedTransaction([
      {
        to: shieldAddressInput,
        amount: shieldAmountInput,
        memo: shieldMemoInput,
        mutez: false,
      },
    ])
      .then((shieldedTx) => {
        setIsTransactionBuilding(false);
        submitSaplingTransaction(shieldedTx, shieldAmountInput).catch((err) => {
          console.error(err.message);
          triggerToast('Transaction failed', '❌');
          setIsTransactionBuilding(false);
          setIsTransactionPending(false);
        });
      })
      .catch((err) => {
        console.error(err.message);
        triggerToast('Transaction failed', '❌');
        setIsTransactionBuilding(false);
        setIsTransactionPending(false);
      });
  };

  const submitUnshieldTransaction = async () => {
    setIsTransactionPending(true);
    setIsTransactionBuilding(true);

    return prepareUnshieldedTransaction({
      to: unshieldAddressInput,
      amount: unshieldAmountInput,
      mutez: false,
    })
      .then((shieldedTx) => {
        setIsTransactionBuilding(false);
        submitSaplingTransaction(shieldedTx).catch((err) => {
          console.error(err.message);
          triggerToast('Transaction failed', '❌');
          setIsTransactionBuilding(false);
          setIsTransactionPending(false);
        });
      })
      .catch((err) => {
        console.error(err.message);
        triggerToast('Transaction failed', '❌');
        setIsTransactionBuilding(false);
        setIsTransactionPending(false);
      });
  };

  const submitTransferTransaction = async () => {
    setIsTransactionPending(true);
    setIsTransactionBuilding(true);

    if (!transferAnonymously) {
      prepareSaplingTransaction([
        {
          to: transferAddressInput,
          amount: transferAmountInput,
          memo: transferMemoInput,
          mutez: false,
        },
      ])
        .then((shieldedTx) => {
          setIsTransactionBuilding(false);
          submitSaplingTransaction(shieldedTx).catch((err) => {
            console.error(err.message);
            triggerToast('Transaction failed', '❌');
            setIsTransactionBuilding(false);
            setIsTransactionPending(false);
          });
        })
        .catch((err) => {
          console.error(err.message);
          triggerToast('Transaction failed', '❌');
          setIsTransactionBuilding(false);
          setIsTransactionPending(false);
        });
    } else {
      const shieldedTx = await prepareSaplingTransaction([
        {
          to: SAPLING_FEE_ADDRESS,
          amount: BASE_FEE,
          mutez: false,
        },
        {
          to: transferAddressInput,
          amount: transferAmountInput,
          memo: transferMemoInput,
          mutez: false,
        },
      ]);

      setIsTransactionBuilding(false);
      setConfirmInjectTxn(shieldedTx);
    }
  };

  const submitPrivateTransaction = async (shieldedTx, txnId) => {
    setFundingTransactionStatus('Submitting transaction');
    await tezmitterApi.submitPrivateTransaction({
      txnId,
      shieldedTx,
      contract: saplingContract,
    });
    setFundingTransactionStatus('');
  };

  const submitSaplingTransaction = async (saplingTransaction, amount) => {
    const sContract = await tezosClient.wallet.at(saplingContract);
    const cTezContract = await tezosClient.wallet.at(CTEZ_CONTRACT);

    let batch;

    if (amount) {
      batch = await tezosClient.wallet
        .batch()
        .withContractCall(
          cTezContract.methods.approve(saplingContract, amount * 1_000_000),
        )
        .withContractCall(sContract.methods.default([saplingTransaction]));
    } else {
      batch = await tezosClient.wallet
        .batch()
        .withContractCall(sContract.methods.default([saplingTransaction]));
    }

    await batch
      .send()
      .then((op) => op.confirmation(1))
      .then(() => {
        triggerToast('Transaction submitted', '✅');
        getSaplingAccountData();
        setIsTransactionPending(false);
      });
  };

  const renderLoadKey = () => (
    <div className={styles.tabContent}>
      <Form>
        <Form.Group className="mb-3" controlId="secretKeyTextarea">
          <Form.Label
            style={{ display: 'flex', justifyContent: 'space-between' }}
          >
            {loadAccountMethod === MNEMONIC_METHOD ? (
              <div>Sapling Mnemonic</div>
            ) : (
              <div>Sapling Secret Key</div>
            )}
            <div className="d-flex">
              <span className="me-2">Mnemonic</span>
              <Form.Switch
                label=""
                id="account-input-switch"
                checked={loadAccountMethod === SECRET_KEY_METHOD}
                onChange={(evt) => {
                  setLoadAccountMethod(
                    evt.target.checked ? SECRET_KEY_METHOD : MNEMONIC_METHOD,
                  );
                }}
              />
              <span>Secret Key</span>
            </div>
          </Form.Label>
          <Form.Control
            as="textarea"
            rows={7}
            placeholder={
              loadAccountMethod === MNEMONIC_METHOD ? 'words...' : 'sask...'
            }
            onChange={(evt) => setSecretKeyInput(evt.target.value)}
            value={secretKeyInput}
            isValid={secretKeyInputIsValid}
          />
          <Form.Text className="text-muted">
            Information on this webpage is never shared with anyone
          </Form.Text>
        </Form.Group>
        <Button
          variant="primary"
          onClick={() => {
            setSecretKey([secretKeyInput, loadAccountMethod]);
            setSecretKeyInput('');
          }}
          disabled={saplingWorkerIsLoading}
        >
          {saplingWorkerIsLoading ? (
            <>
              <Spinner
                as="span"
                animation="border"
                size="sm"
                role="status"
                aria-hidden="true"
              />
              <span> Loading key...</span>
            </>
          ) : (
            'Load Key'
          )}
        </Button>
        <Button
          className="ms-2"
          variant="secondary"
          size="md"
          onClick={() => {
            setShowHelpModal(true);
          }}
          disabled={!secretKeyInputIsValid || saplingWorkerIsLoading}
        >
          Help
        </Button>
      </Form>
    </div>
  );

  const renderShield = () => (
    <div className={styles.tabContent}>
      <Form>
        <Form.Group className="mb-2" controlId="shieldAddressInput">
          <Form.Label>
            Shielded Address
            <Badge
              className={`ms-2 ${styles.presetInputButton}`}
              onClick={() => {
                setShieldAddressInput(saplingAccount);
              }}
            >
              Use my sapling address
            </Badge>
          </Form.Label>
          <Form.Control
            onChange={(evt) => {
              setShieldAddressInput(evt.target.value);
            }}
            placeholder="zet..."
            value={shieldAddressInput}
            isValid={shieldAddressInputIsValid}
          />
          <Form.Text className="text-muted">
            Shield ctez and credit this sapling address
          </Form.Text>
        </Form.Group>
        <Form.Group className="mb-2" controlId="shieldAmountInput">
          <Form.Label>Amount</Form.Label>
          <Form.Control
            onChange={(evt) => {
              setShieldAmountInput(
                evt.target.value
                  ? Math.round(parseFloat(evt.target.value) * 1_000_000) /
                      1_000_000
                  : undefined,
              );
            }}
            type="number"
            value={shieldAmountInput}
            isValid={shieldAmountInput > 0}
            isInvalid={shieldAmountInput < 0}
          />
          <Form.Text className="text-muted">
            Amount of ctez to shield. cTez balance:{' '}
            <CtezValue
              value={(cTezBalance / 1_000_000).toLocaleString(undefined, {
                maximumFractionDigits: 6,
              })}
            />
          </Form.Text>
        </Form.Group>
        <Form.Group className="mb-3" controlId="shieldMemoInput">
          <Form.Label>Memo (optional)</Form.Label>
          <Form.Control
            onChange={(evt) => {
              setShieldMemoInput(evt.target.value);
            }}
            value={shieldMemoInput}
            maxLength={8}
          />
          <Form.Text className="text-muted">
            Attach a memo to the sapling transaction
          </Form.Text>
        </Form.Group>
        <Button
          variant="primary"
          onClick={submitShieldTransaction}
          disabled={
            isTransactionPending ||
            !shieldAddressInputIsValid ||
            !account ||
            shieldAmountInput <= 0
          }
        >
          {isTransactionPending ? (
            <>
              <Spinner
                as="span"
                animation="border"
                size="sm"
                role="status"
                aria-hidden="true"
              />
              <span>
                {' '}
                {isTransactionBuilding
                  ? 'Preparing Sapling Transaction'
                  : fundingTransactionStatus || 'Pending'}
                ...
              </span>
            </>
          ) : (
            'Submit Shield Transaction'
          )}
        </Button>
        <div>
          <Form.Text className="text-muted">
            Transactions can take upwards of a minute or more to construct
          </Form.Text>
        </div>
      </Form>
    </div>
  );

  const renderUnshield = () => (
    <div className={styles.tabContent}>
      <Form>
        <Form.Group className="mb-2" controlId="unshieldAddressInput">
          <Form.Label>
            Unshielding Address
            <Badge
              className={`ms-2 ${styles.presetInputButton}`}
              onClick={() => {
                setUnshieldAddressInput(account);
              }}
            >
              Use my connected wallet
            </Badge>
          </Form.Label>
          <Form.Control
            onChange={(evt) => {
              setUnshieldAddressInput(evt.target.value);
            }}
            placeholder="tz..."
            value={unshieldAddressInput}
            isValid={unshieldAddressInputIsValid}
          />
          <Form.Text className="text-muted">
            Unshield ctez from your sapling address to this address
          </Form.Text>
        </Form.Group>
        <Form.Group className="mb-3" controlId="unshieldAmountInput">
          <Form.Label>Amount</Form.Label>
          <Form.Control
            onChange={(evt) => {
              setUnshieldAmountInput(
                evt.target.value
                  ? Math.round(parseFloat(evt.target.value) * 1_000_000) /
                      1_000_000
                  : undefined,
              );
            }}
            type="number"
            value={unshieldAmountInput}
            isValid={unshieldAmountInputIsValid}
            isInvalid={unshieldAmountInputIsInvalid}
          />
          <Form.Text className="text-muted">
            Amount of ctez to unshield
          </Form.Text>
        </Form.Group>
        <Button
          variant="primary"
          onClick={submitUnshieldTransaction}
          disabled={
            isTransactionPending ||
            !unshieldAddressInputIsValid ||
            !unshieldAmountInputIsValid ||
            !account
          }
        >
          {isTransactionPending ? (
            <>
              <Spinner
                as="span"
                animation="border"
                size="sm"
                role="status"
                aria-hidden="true"
              />
              <span>
                {' '}
                {isTransactionBuilding
                  ? 'Preparing Sapling Transaction'
                  : fundingTransactionStatus || 'Pending'}
                ...
              </span>
            </>
          ) : (
            'Submit Unshield Transaction'
          )}
        </Button>
        <div>
          <Form.Text className="text-muted">
            Transactions can take upwards of a minute or more to construct
          </Form.Text>
        </div>
      </Form>
    </div>
  );

  const renderTransfer = () => (
    <div className={styles.tabContent}>
      <Form>
        <Form.Group className="mb-2" controlId="transferAddressInput">
          <Form.Label>Destination</Form.Label>
          <Form.Control
            onChange={(evt) => setTransferAddressInput(evt.target.value)}
            placeholder="zet..."
            value={transferAddressInput}
            isValid={transferAddressInputIsValid}
          />
          <Form.Text className="text-muted">
            Transfer shielded ctez to this sapling address
          </Form.Text>
        </Form.Group>
        <Form.Group className="mb-2" controlId="transferAmountInput">
          <Form.Label>
            Amount
            {transferAnonymously ? ' + ' : ''}
            {transferAnonymously ? (
              <CtezValue value={process.env.REACT_APP_BASE_FEE} />
            ) : (
              ''
            )}
            {transferAnonymously ? ' fee' : ''}
          </Form.Label>
          <Form.Control
            onChange={(evt) => {
              setTransferAmountInput(
                evt.target.value
                  ? Math.round(parseFloat(evt.target.value) * 1_000_000) /
                      1_000_000
                  : undefined,
              );
            }}
            type="number"
            value={transferAmountInput}
            isValid={transferAmountInputisValid}
            isInvalid={transferAmountInputisInvalid}
          />
          <Form.Text className="text-muted">
            Amount of shielded ctez to transfer
          </Form.Text>
        </Form.Group>
        <Form.Group className="mb-3" controlId="transferMemoInput">
          <Form.Label>Memo (optional)</Form.Label>
          <Form.Control
            onChange={(evt) => setTransferMemoInput(evt.target.value)}
            value={transferMemoInput}
            maxLength={8}
          />
          <Form.Text className="text-muted">
            Attach a memo to the sapling transaction
          </Form.Text>
        </Form.Group>
        <div>
          <Form.Check
            className={`mb-2 me-2 ${styles.anonymousCheckbox}`}
            type="checkbox"
            label="Submit transaction anonymously"
            checked={transferAnonymously}
            disabled={isTransactionPending}
            onChange={() => {
              if (!isTransactionPending) {
                setTransferAnonymously(!transferAnonymously);
              }
            }}
            inline
          />
          <OverlayTrigger
            placement="right"
            delay={{ show: 250, hide: 400 }}
            overlay={
              <Tooltip>
                Generate the sapling transaction and submit it to a transaction
                injector service. ({' '}
                <CtezValue value={process.env.REACT_APP_BASE_FEE} /> fee )
              </Tooltip>
            }
          >
            <i className="fad fa-info-circle" />
          </OverlayTrigger>
          {isTransactionPending ? null : (
            <Link className="d-inline-block ms-2" to="/about">
              Learn more
            </Link>
          )}
        </div>
        <Button
          variant="primary"
          onClick={submitTransferTransaction}
          disabled={
            isTransactionPending ||
            !transferAddressInputIsValid ||
            !transferAmountInputisValid ||
            !account
          }
        >
          {isTransactionPending ? (
            <>
              <Spinner
                as="span"
                animation="border"
                size="sm"
                role="status"
                aria-hidden="true"
              />
              <span>
                {' '}
                {isTransactionBuilding
                  ? 'Preparing Sapling Transaction'
                  : fundingTransactionStatus || 'Pending'}
                ...
              </span>
            </>
          ) : (
            'Submit Sapling Transaction'
          )}
        </Button>
        <div>
          <Form.Text className="text-muted">
            Transactions can take upwards of a minute or more to construct
          </Form.Text>
        </div>
      </Form>
    </div>
  );

  const renderSettings = () => (
    <div className={styles.tabContent}>
      <Form>
        <Form.Group className="mb-2" controlId="rpcUrlInput">
          <Form.Label>Custom RPC URL</Form.Label>
          <Form.Control
            onChange={(evt) => {
              setRpcUrlInput(evt.target.value);
            }}
            placeholder="https://"
            value={rpcUrlInput}
            isValid={isValidUrl(rpcUrlInput)}
          />
          <Form.Text className="text-muted">
            Update the public RPC to use for all network requests
          </Form.Text>
        </Form.Group>
        <Form.Group className="mb-3" controlId="saplingContractInput">
          <Form.Label>Sapling Contract Address</Form.Label>
          <Form.Control
            onChange={(evt) => {
              setSaplingContractInput(evt.target.value);
            }}
            placeholder="KT..."
            value={saplingContractInput}
            isValid={isValidContract(saplingContractInput)}
          />
          <Form.Text className="text-muted">
            Set the sapling contract address
          </Form.Text>
        </Form.Group>
        <Button
          variant="primary"
          onClick={() => {
            setRpcUrlInput(RPC_MAP[process.env.REACT_APP_TEZOS_NETWORK]);
            setRpcUrl(RPC_MAP[process.env.REACT_APP_TEZOS_NETWORK]);
            setSaplingContractInput(process.env.REACT_APP_SAPLING_CONTRACT);
            setSaplingContract(process.env.REACT_APP_SAPLING_CONTRACT);
            reInitializeSapling();
          }}
        >
          Reset Settings
        </Button>
        <Button
          className="ms-2"
          variant="primary"
          onClick={() => {
            setRpcUrl(rpcUrlInput);
            setSaplingContract(saplingContractInput);
            reInitializeSapling();
          }}
          disabled={
            !isValidUrl(rpcUrlInput) || !isValidContract(saplingContractInput)
          }
        >
          Save
        </Button>
      </Form>
    </div>
  );

  const renderIncomingTxns = () => {
    const pageItems = [];
    const incomingTransactionLength = transactionHistory?.incoming?.length || 0;
    const pages = Math.ceil(incomingTransactionLength / ITEMS_PER_PAGE);

    for (let number = 1; number <= pages; number++) {
      if (Math.abs(number - incomingTransactionPage) < 5) {
        pageItems.push(
          <Pagination.Item
            key={number}
            active={number === incomingTransactionPage}
            onClick={() => setIncomingTransactionPage(number)}
          >
            {number}
          </Pagination.Item>,
        );
      } else if (Math.abs(number - incomingTransactionPage) === 5) {
        pageItems.push(
          <Pagination.Ellipsis
            key={number}
            onClick={() => setIncomingTransactionPage(number)}
          />,
        );
      }
    }

    const startIndex = (incomingTransactionPage - 1) * ITEMS_PER_PAGE;

    const pageTransactions =
      transactionHistory?.incoming
        ?.slice()
        .reverse()
        .slice(startIndex, startIndex + ITEMS_PER_PAGE) || [];

    return (
      <div className={styles.tabContent}>
        {pageTransactions.map((txn, idx) => (
          // eslint-disable-next-line react/no-array-index-key
          <div key={idx} className={styles.txnItem}>
            <div>
              From: {txn.paymentAddress.slice(0, 10)}...
              {txn.paymentAddress.slice(-10)}
              <div>
                <small className="text-muted">Memo: {txn.memo}</small>
              </div>
            </div>
            <div style={{ color: 'green' }}>
              +{' '}
              <CtezValue
                value={(txn.value / 1_000_000).toLocaleString(undefined, {
                  maximumFractionDigits: 6,
                })}
              />
            </div>
          </div>
        ))}
        <div className={styles.paginationContainer}>
          <Pagination size="md">
            <Pagination.First onClick={() => setIncomingTransactionPage(1)} />
            <Pagination.Prev
              onClick={() => {
                if (incomingTransactionPage === 1) {
                  return;
                }
                setIncomingTransactionPage(incomingTransactionPage - 1);
              }}
            />
            {pageItems}
            <Pagination.Next
              onClick={() => {
                if (incomingTransactionPage === pages) {
                  return;
                }
                setIncomingTransactionPage(incomingTransactionPage + 1);
              }}
            />
            <Pagination.Last
              onClick={() => setIncomingTransactionPage(pages)}
            />
          </Pagination>
        </div>
      </div>
    );
  };

  const renderOutgoingTxns = () => {
    const pageItems = [];
    const outgoingTransactionLength = transactionHistory?.outgoing?.length || 0;
    const pages = Math.ceil(outgoingTransactionLength / ITEMS_PER_PAGE);

    for (let number = 1; number <= pages; number++) {
      if (Math.abs(number - outgoingTransactionPage) < 5) {
        pageItems.push(
          <Pagination.Item
            key={number}
            active={number === outgoingTransactionPage}
            onClick={() => setOutgoingTransactionPage(number)}
          >
            {number}
          </Pagination.Item>,
        );
      } else if (Math.abs(number - outgoingTransactionPage) === 5) {
        pageItems.push(
          <Pagination.Ellipsis
            key={number}
            onClick={() => setOutgoingTransactionPage(number)}
          />,
        );
      }
    }

    const startIndex = (outgoingTransactionPage - 1) * ITEMS_PER_PAGE;

    const pageTransactions =
      transactionHistory?.outgoing
        ?.slice()
        .reverse()
        .slice(startIndex, startIndex + ITEMS_PER_PAGE) || [];

    return (
      <div className={styles.tabContent}>
        {pageTransactions.map((txn, idx) => (
          // eslint-disable-next-line react/no-array-index-key
          <div key={idx} className={styles.txnItem}>
            <div>
              To: {txn.paymentAddress.slice(0, 10)}...
              {txn.paymentAddress.slice(-10)}
              <div>
                <small className="text-muted">Memo: {txn.memo}</small>
              </div>
            </div>
            <div style={{ color: 'red' }}>
              -{' '}
              <CtezValue
                value={(txn.value / 1_000_000).toLocaleString(undefined, {
                  maximumFractionDigits: 6,
                })}
              />
            </div>
          </div>
        ))}
        <div className={styles.paginationContainer}>
          <Pagination size="md">
            <Pagination.First onClick={() => setOutgoingTransactionPage(1)} />
            <Pagination.Prev
              onClick={() => {
                if (outgoingTransactionPage === 1) {
                  return;
                }
                setOutgoingTransactionPage(outgoingTransactionPage - 1);
              }}
            />
            {pageItems}
            <Pagination.Next
              onClick={() => {
                if (outgoingTransactionPage === pages) {
                  return;
                }
                setOutgoingTransactionPage(outgoingTransactionPage + 1);
              }}
            />
            <Pagination.Last
              onClick={() => setOutgoingTransactionPage(pages)}
            />
          </Pagination>
        </div>
      </div>
    );
  };

  return (
    <>
      <div className={styles.mainComponentContainer}>
        <div className={styles.mainComponent}>
          {saplingWorkerLoaded ? (
            <Tabs activeKey={tab} onSelect={setTab}>
              <Tab
                eventKey="shield"
                title={
                  <span>
                    Shield ctez
                    <OverlayTrigger
                      placement="right"
                      delay={{ show: 250, hide: 400 }}
                      overlay={<Tooltip>Public</Tooltip>}
                    >
                      <i className="fad fa-eye ms-2" />
                    </OverlayTrigger>
                  </span>
                }
              >
                {renderShield()}
              </Tab>
              <Tab
                eventKey="transfer"
                title={
                  <span>
                    Transfer
                    <OverlayTrigger
                      placement="right"
                      delay={{ show: 250, hide: 400 }}
                      overlay={
                        <Tooltip>
                          {transferAnonymously ? 'Private' : 'Public'}
                        </Tooltip>
                      }
                    >
                      <i
                        className={`fad fa-eye${
                          transferAnonymously ? '-slash' : ''
                        } ms-2`}
                      />
                    </OverlayTrigger>
                  </span>
                }
              >
                {renderTransfer()}
              </Tab>
              <Tab
                eventKey="unshield"
                title={
                  <span>
                    Unshield ctez
                    <OverlayTrigger
                      placement="right"
                      delay={{ show: 250, hide: 400 }}
                      overlay={<Tooltip>Public</Tooltip>}
                    >
                      <i className="fad fa-eye ms-2" />
                    </OverlayTrigger>
                  </span>
                }
              >
                {renderUnshield()}
              </Tab>
              <Tab
                eventKey="settings"
                title={
                  <OverlayTrigger
                    placement="right"
                    delay={{ show: 250, hide: 400 }}
                    overlay={<Tooltip>Settings</Tooltip>}
                  >
                    <i className="fad fa-cogs" />
                  </OverlayTrigger>
                }
              >
                {renderSettings()}
              </Tab>
            </Tabs>
          ) : (
            <Tabs className="" activeKey={tab} onSelect={setTab}>
              <Tab
                eventKey="loadKey"
                title={
                  <span>
                    Load key
                    <i className="fad fa-key ms-2" />
                  </span>
                }
              >
                {renderLoadKey()}
              </Tab>
              <Tab
                eventKey="settings"
                title={
                  <OverlayTrigger
                    placement="right"
                    delay={{ show: 250, hide: 400 }}
                    overlay={<Tooltip>Settings</Tooltip>}
                  >
                    <i className="fad fa-cogs" />
                  </OverlayTrigger>
                }
              >
                {renderSettings()}
              </Tab>
            </Tabs>
          )}
          <HelpModal
            show={showHelpModal}
            onHide={() => {
              setShowHelpModal(false);
            }}
          />
          <ConfirmInjectModal
            txn={confirmInjectTxn}
            onHide={() => {
              setIsTransactionPending(false);
              setConfirmInjectTxn('');
            }}
            confirm={() => {
              const txnId = nanoid();
              socket.on(txnId, (successful) => {
                getSaplingAccountData();
                if (successful) {
                  triggerToast('Transaction processed', '✅');
                }
                socket.off(txnId);
              });

              submitPrivateTransaction(confirmInjectTxn, txnId)
                .then(() => {
                  triggerToast('Transaction submitted', '✅');
                  getSaplingAccountData();
                  setIsTransactionPending(false);
                  setConfirmInjectTxn('');
                })
                .catch((err) => {
                  socket.off(txnId);
                  console.error(err.message);
                  triggerToast('Transaction failed', '❌');
                  setIsTransactionBuilding(false);
                  setIsTransactionPending(false);
                  setConfirmInjectTxn('');
                });
            }}
          />
        </div>
      </div>
      {saplingWorkerLoaded ? (
        <div className={styles.txnComponentContainer}>
          <div className={styles.txnComponent}>
            <div className={styles.balanceContainer}>
              <div className={styles.balanceContent}>
                <span>
                  Shielded balance:{' '}
                  <CtezValue
                    value={(shieldedBalance / 1_000_000).toLocaleString(
                      undefined,
                      {
                        maximumFractionDigits: 6,
                      },
                    )}
                  />
                </span>
              </div>
              <div className={styles.balanceContent}>
                <span>
                  Shielded address:{' '}
                  {`${saplingAccount?.slice(0, 10)}...${saplingAccount?.slice(
                    -10,
                  )}`}
                  <CopyToClipboard
                    text={saplingAccount}
                    onCopy={() =>
                      triggerToast('Copied to clipboard', '📋', 2_000)
                    }
                  >
                    <i
                      style={{ cursor: 'pointer' }}
                      className="fas fa-copy ms-2"
                    />
                  </CopyToClipboard>
                </span>
              </div>
            </div>
            <Tabs activeKey={txnTab} onSelect={setTxnTab}>
              <Tab eventKey="incoming" title="Incoming Transactions">
                {renderIncomingTxns()}
              </Tab>
              <Tab eventKey="outgoing" title="Outgoing Transactions">
                {renderOutgoingTxns()}
              </Tab>
            </Tabs>
          </div>
        </div>
      ) : null}
    </>
  );
}

Tezmitter.propTypes = {
  account: PropTypes.string,
  getSaplingAccountData: PropTypes.func.isRequired,
  prepareSaplingTransaction: PropTypes.func.isRequired,
  prepareShieldedTransaction: PropTypes.func.isRequired,
  prepareUnshieldedTransaction: PropTypes.func.isRequired,
  reInitializeSapling: PropTypes.func.isRequired,
  rpcUrl: PropTypes.string.isRequired,
  saplingAccount: PropTypes.string,
  saplingContract: PropTypes.string.isRequired,
  saplingWorkerIsLoading: PropTypes.bool,
  saplingWorkerLoaded: PropTypes.bool,
  setRpcUrl: PropTypes.func.isRequired,
  setSaplingContract: PropTypes.func.isRequired,
  setSecretKey: PropTypes.func.isRequired,
  shieldedBalance: PropTypes.number,
  cTezBalance: PropTypes.number,
  // eslint-disable-next-line react/forbid-prop-types
  socket: PropTypes.object.isRequired,
  // eslint-disable-next-line react/forbid-prop-types
  tezosClient: PropTypes.object.isRequired,
  // eslint-disable-next-line react/forbid-prop-types
  transactionHistory: PropTypes.object,
};

Tezmitter.defaultProps = {
  account: '',
  saplingAccount: '',
  shieldedBalance: 0,
  cTezBalance: 0,
  saplingWorkerIsLoading: false,
  saplingWorkerLoaded: false,
  transactionHistory: {},
};

export default Tezmitter;
