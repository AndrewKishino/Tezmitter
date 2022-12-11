/* eslint-disable jsx-a11y/anchor-is-valid */
/* eslint-disable no-unused-vars */
import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import Form from 'react-bootstrap/Form';
import Button from 'react-bootstrap/Button';
import Badge from 'react-bootstrap/Badge';
import OverlayTrigger from 'react-bootstrap/OverlayTrigger';
import Spinner from 'react-bootstrap/Spinner';
import Tab from 'react-bootstrap/Tab';
import Tabs from 'react-bootstrap/Tabs';
import Tooltip from 'react-bootstrap/Tooltip';
import toast from 'react-hot-toast';
import { NetworkType } from '@airgap/beacon-dapp';

import TezmitterApi from 'clients/tezmitterApi';
import { useSocketState } from 'context/SocketContext';
import TezosValue from 'components/TezosValue';

import styles from './Tezmitter.module.scss';

const RPC_MAP = {
  [NetworkType.MAINNET]: 'https://mainnet.api.tez.ie',
  [NetworkType.GHOSTNET]: 'https://ghostnet.ecadinfra.com',
  [NetworkType.KATHMANDUNET]: 'https://kathmandunet.ecadinfra.com',
};

const BASE_FEE = parseFloat(process.env.REACT_APP_BASE_FEE);

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
  socket,
  tezosClient,
}) {
  const { latestBlock, constants, connectionStatus } = useSocketState();
  const [tab, setTab] = useState('loadKey');

  const [secretKeyInput, setSecretKeyInput] = useState('');

  const [isTransactionPending, setIsTransactionPending] = useState(false);
  const [isTransactionBuilding, setIsTransactionBuilding] = useState(false);
  const [fundingTransactionStatus, setFundingTransactionStatus] = useState('');

  const [shieldAddressInput, setShieldAddressInput] = useState('');
  const [shieldAmountInput, setShieldAmountInput] = useState(0);
  const [shieldMemoInput, setShieldMemoInput] = useState('');
  const [shieldAnonymously, setShieldAnonymously] = useState(true);

  const [transferAddressInput, setTransferAddressInput] = useState('');
  const [transferAmountInput, setTransferAmountInput] = useState(0);
  const [transferMemoInput, setTransferMemoInput] = useState('');
  const [transferAnonymously, setTransferAnonymously] = useState(true);

  const [unshieldAddressInput, setUnshieldAddressInput] = useState('');
  const [unshieldAmountInput, setUnshieldAmountInput] = useState(0);
  const [unshieldAnonymously, setUnshieldAnonymously] = useState(true);

  const [rpcUrlInput, setRpcUrlInput] = useState(rpcUrl);
  const [saplingContractInput, setSaplingContractInput] =
    useState(saplingContract);

  // Input validation
  const secretKeyInputIsValid =
    secretKeyInput.startsWith('sask') && secretKeyInput.length === 241;
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
  const transferAmountInputisValid =
    transferAmountInput > 0 &&
    transferAmountInput <= shieldedBalance / 1_000_000;
  const transferAmountInputisInvalid =
    transferAmountInput < 0 ||
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

    if (!shieldAnonymously) {
      prepareShieldedTransaction({
        to: shieldAddressInput,
        amount: shieldAmountInput,
        memo: shieldMemoInput,
        mutez: false,
      })
        .then((shieldedTx) => {
          setIsTransactionBuilding(false);
          submitSaplingTransaction(shieldedTx, shieldAmountInput);
        })
        .catch((err) => {
          console.error(err.message);
          triggerToast('Transaction failed', '❌');
          setIsTransactionBuilding(false);
          setIsTransactionPending(false);
        });
    } else {
      const shieldTransaction = await prepareShieldedTransaction({
        to: shieldAddressInput,
        amount: shieldAmountInput,
        memo: shieldMemoInput,
        mutez: false,
      }).then((shieldedTx) => {
        setIsTransactionBuilding(false);
        return shieldedTx;
      });

      submitFundingTransaction(shieldAmountInput, shieldTransaction)
        .then(() => {
          triggerToast('Transaction submitted', '✅');
          getSaplingAccountData();
          setIsTransactionPending(false);
        })
        .catch((err) => {
          console.error(err.message);
          triggerToast('Transaction failed', '❌');
          setIsTransactionBuilding(false);
          setIsTransactionPending(false);
        });
    }
  };

  const submitUnshieldTransaction = async () => {
    setIsTransactionPending(true);
    setIsTransactionBuilding(true);

    if (!unshieldAnonymously) {
      prepareUnshieldedTransaction({
        to: unshieldAddressInput,
        amount: unshieldAmountInput,
        mutez: false,
      })
        .then((shieldedTx) => {
          setIsTransactionBuilding(false);
          submitSaplingTransaction(shieldedTx);
        })
        .catch((err) => {
          console.error(err.message);
          triggerToast('Transaction failed', '❌');
          setIsTransactionBuilding(false);
          setIsTransactionPending(false);
        });
    } else {
      const unshieldTransaction = await prepareUnshieldedTransaction({
        to: unshieldAddressInput,
        amount: unshieldAmountInput,
        mutez: false,
      }).then((shieldedTx) => {
        setIsTransactionBuilding(false);
        return shieldedTx;
      });

      submitFundingTransaction(0, unshieldTransaction)
        .then(() => {
          triggerToast('Transaction submitted', '✅');
          getSaplingAccountData();
          setIsTransactionPending(false);
        })
        .catch((err) => {
          console.error(err.message);
          triggerToast('Transaction failed', '❌');
          setIsTransactionBuilding(false);
          setIsTransactionPending(false);
        });
    }
  };

  const submitTransferTransaction = async () => {
    setIsTransactionPending(true);
    setIsTransactionBuilding(true);

    if (!transferAnonymously) {
      prepareSaplingTransaction({
        to: transferAddressInput,
        amount: transferAmountInput,
        memo: transferMemoInput,
        mutez: false,
      })
        .then((shieldedTx) => {
          setIsTransactionBuilding(false);
          submitSaplingTransaction(shieldedTx);
        })
        .catch((err) => {
          console.error(err.message);
          triggerToast('Transaction failed', '❌');
          setIsTransactionBuilding(false);
          setIsTransactionPending(false);
        });
    } else {
      const transferTransaction = await prepareSaplingTransaction({
        to: transferAddressInput,
        amount: transferAmountInput,
        mutez: false,
      }).then((shieldedTx) => {
        setIsTransactionBuilding(false);
        return shieldedTx;
      });

      submitFundingTransaction(0, transferTransaction)
        .then(() => {
          triggerToast('Transaction submitted', '✅');
          getSaplingAccountData();
          setIsTransactionPending(false);
        })
        .catch((err) => {
          console.error(err.message);
          triggerToast('Transaction failed', '❌');
          setIsTransactionBuilding(false);
          setIsTransactionPending(false);
        });
    }
  };

  const estimateSaplingTransactionCost = (amount, shieldedTx) =>
    tezosClient.wallet.at(saplingContract).then((contract) => {
      const transferParams = contract.methods
        .default([shieldedTx])
        .toTransferParams({ amount });
      return tezosClient.estimate.transfer(transferParams);
    });

  const submitFundingTransaction = async (amount, shieldedTx) => {
    setFundingTransactionStatus('Estimating fees');
    const estimate = await estimateSaplingTransactionCost(amount, shieldedTx);

    const transactionCost = estimate.totalCost / 1_000_000;

    const totalAmount = +(amount + BASE_FEE + transactionCost).toFixed(6);

    setFundingTransactionStatus('Requesting funds');
    const fundingOperation = await tezosClient.wallet
      .transfer({
        to: process.env.REACT_APP_FUNDING_ADDRESS,
        amount: totalAmount,
      })
      .send()
      .then((op) =>
        op.confirmation(1).then(({ block }) => {
          setFundingTransactionStatus('Confirming transaction (1/2)');
          return op.confirmation(2).then(() => {
            setFundingTransactionStatus('Confirming transaction (2/2)');
            return {
              opHash: op.opHash,
              blockHash: block.hash,
            };
          });
        }),
      )
      .catch((err) => {
        setFundingTransactionStatus('');
        console.error(err.message);
        throw err;
      });

    socket.on(fundingOperation.opHash, () => {
      triggerToast('Transaction complete', '✅');
      getSaplingAccountData();
    });

    setFundingTransactionStatus('Submitting transaction');
    await tezmitterApi.submitFundedTransaction({
      ...fundingOperation,
      shieldedTx,
      amount,
      contract: saplingContract,
    });

    setFundingTransactionStatus('');
  };

  const submitSaplingTransaction = (saplingTransaction, amount = 0) =>
    tezosClient.wallet
      .at(saplingContract)
      .then((contract) =>
        contract.methods.default([saplingTransaction]).send({ amount }),
      )
      .then((op) => op.confirmation(1))
      .then(() => {
        triggerToast('Transaction submitted', '✅');
        setIsTransactionPending(false);
      });

  const renderLoadKey = () => (
    <div className={styles.tabContent}>
      <Form>
        <Form.Group className="mb-3" controlId="secretKeyTextarea">
          <Form.Label>Sapling Secret Key</Form.Label>
          <Form.Control
            as="textarea"
            rows={7}
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
            setSecretKey(secretKeyInput);
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
              Use my sapling address (
              <TezosValue
                value={(shieldedBalance / 1_000_000).toLocaleString(undefined, {
                  maximumFractionDigits: 6,
                })}
              />
              )
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
            Shield tez and credit this sapling address
          </Form.Text>
        </Form.Group>
        <Form.Group className="mb-2" controlId="shieldAmountInput">
          <Form.Label>Amount</Form.Label>
          <Form.Control
            onChange={(evt) => {
              setShieldAmountInput(parseInt(evt.target.value || 0, 10));
            }}
            type="number"
            value={shieldAmountInput}
            isValid={shieldAmountInput > 0}
            isInvalid={shieldAmountInput < 0}
          />
          <Form.Text className="text-muted">Amount of tez to shield</Form.Text>
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
        <div>
          <Form.Check
            className={`mb-2 me-2 ${styles.anonymousCheckbox}`}
            type="checkbox"
            label="Submit transaction anonymously"
            checked={shieldAnonymously}
            disabled={isTransactionPending}
            onClick={() => {
              if (!isTransactionPending) {
                setShieldAnonymously(!shieldAnonymously);
              }
            }}
            inline
          />
          <OverlayTrigger
            placement="right"
            delay={{ show: 250, hide: 400 }}
            overlay={
              <Tooltip>
                Generate the sapling transaction and submit the transaction to a
                dedicated transaction submitter
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
        <Form.Group
          className={`mb-2 ${styles.presetInputButton}`}
          controlId="unshieldAddressInput"
        >
          <Form.Label>
            Unshielding Address
            <Badge
              className="ms-2"
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
            Unshield tez from your sapling address to this address
          </Form.Text>
        </Form.Group>
        <Form.Group className="mb-3" controlId="unshieldAmountInput">
          <Form.Label>Amount</Form.Label>
          <Form.Control
            onChange={(evt) => {
              setUnshieldAmountInput(parseInt(evt.target.value || 0, 10));
            }}
            type="number"
            value={unshieldAmountInput}
            isValid={unshieldAmountInputIsValid}
            isInvalid={unshieldAmountInputIsInvalid}
          />
          <Form.Text className="text-muted">
            Amount of tez to unshield. Balance:{' '}
            <TezosValue
              value={(shieldedBalance / 1_000_000).toLocaleString(undefined, {
                maximumFractionDigits: 6,
              })}
            />
          </Form.Text>
        </Form.Group>
        <div>
          <Form.Check
            className={`mb-2 me-2 ${styles.anonymousCheckbox}`}
            type="checkbox"
            label="Submit transaction anonymously"
            checked={unshieldAnonymously}
            disabled={isTransactionPending}
            onClick={() => {
              if (!isTransactionPending) {
                setUnshieldAnonymously(!unshieldAnonymously);
              }
            }}
            inline
          />
          <OverlayTrigger
            placement="right"
            delay={{ show: 250, hide: 400 }}
            overlay={
              <Tooltip>
                Generate the sapling transaction and submit the transaction to a
                dedicated transaction submitter
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
            Transfer shielded tez to this sapling address
          </Form.Text>
        </Form.Group>
        <Form.Group className="mb-2" controlId="transferAmountInput">
          <Form.Label>Amount</Form.Label>
          <Form.Control
            onChange={(evt) => {
              setTransferAmountInput(parseInt(evt.target.value || 0, 10));
            }}
            type="number"
            value={transferAmountInput}
            isValid={transferAmountInputisValid}
            isInvalid={transferAmountInputisInvalid}
          />
          <Form.Text className="text-muted">
            Amount of shielded tez to transfer. Balance:{' '}
            <TezosValue
              value={(shieldedBalance / 1_000_000).toLocaleString(undefined, {
                maximumFractionDigits: 6,
              })}
            />
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
            onClick={() => {
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
                Generate the sapling transaction and submit the transaction to a
                dedicated transaction submitter
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

  return (
    <div className={styles.mainComponentContainer}>
      <div className={styles.mainComponent}>
        {saplingWorkerLoaded ? (
          <Tabs activeKey={tab} onSelect={setTab}>
            <Tab
              eventKey="shield"
              title={
                <span>
                  Shield Tez
                  <OverlayTrigger
                    placement="right"
                    delay={{ show: 250, hide: 400 }}
                    overlay={
                      <Tooltip>
                        {shieldAnonymously ? 'Private' : 'Public'}
                      </Tooltip>
                    }
                  >
                    <i
                      className={`fad fa-eye${
                        shieldAnonymously ? '-slash' : ''
                      } ms-2`}
                    />
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
                  Unshield Tez
                  <OverlayTrigger
                    placement="right"
                    delay={{ show: 250, hide: 400 }}
                    overlay={
                      <Tooltip>
                        {unshieldAnonymously ? 'Private' : 'Public'}
                      </Tooltip>
                    }
                  >
                    <i
                      className={`fad fa-eye${
                        unshieldAnonymously ? '-slash' : ''
                      } ms-2`}
                    />
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
      </div>
    </div>
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
  // eslint-disable-next-line react/forbid-prop-types
  socket: PropTypes.object.isRequired,
  // eslint-disable-next-line react/forbid-prop-types
  tezosClient: PropTypes.object.isRequired,
};

Tezmitter.defaultProps = {
  account: '',
  saplingAccount: '',
  shieldedBalance: 0,
  saplingWorkerIsLoading: false,
  saplingWorkerLoaded: false,
};

export default Tezmitter;
