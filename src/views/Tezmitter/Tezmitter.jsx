/* eslint-disable jsx-a11y/anchor-is-valid */
/* eslint-disable no-unused-vars */
import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import Badge from 'react-bootstrap/Badge';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import Modal from 'react-bootstrap/Modal';
import OverlayTrigger from 'react-bootstrap/OverlayTrigger';
import Spinner from 'react-bootstrap/Spinner';
import Tab from 'react-bootstrap/Tab';
import Tabs from 'react-bootstrap/Tabs';
import Tooltip from 'react-bootstrap/Tooltip';
import toast from 'react-hot-toast';
import { NetworkType } from '@airgap/beacon-dapp';
import { nanoid } from 'nanoid';

import TezmitterApi from 'clients/tezmitterApi';
import { useSocketState } from 'context/SocketContext';
import CtezValue from 'components/CtezValue';

import styles from './Tezmitter.module.scss';

const RPC_MAP = {
  [NetworkType.MAINNET]: 'https://mainnet.api.tez.ie',
  [NetworkType.GHOSTNET]: 'https://ghostnet.ecadinfra.com',
  [NetworkType.KATHMANDUNET]: 'https://kathmandunet.ecadinfra.com',
};

const BASE_FEE = parseFloat(process.env.REACT_APP_BASE_FEE);

const CTEZ_CONTRACT = process.env.REACT_APP_CTEZ_CONTRACT;

const SAPLING_FEE_ADDRESS = process.env.REACT_APP_SAPLING_FEE_ADDRESS;

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

function HelpModal({ show, onHide }) {
  return (
    <Modal
      show={show}
      onHide={onHide}
      size="lg"
      aria-labelledby="contained-modal-title-vcenter"
      centered
      animation={false}
      backdropClassName={styles.modalBackdrop}
    >
      <Modal.Header closeButton closeVariant="white">
        <Modal.Title id="contained-modal-title-vcenter">
          How to get started with Tezmitter
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <h5>Sapling Secret Key</h5>
        <p>
          In order to use Tezmitter, you will need to have a Sapling secret key
          which can be generated using the Octez client and issuing the command:
        </p>
        <p className={`${styles.codeBlock} font-monospace`}>
          ./octez-client sapling gen key test-sapling-key --unencrypted
        </p>
        <p>
          By default, this should generate a new Sapling secret key at{' '}
          <span className={`${styles.monoSpace} font-monospace`}>
            {' '}
            ~/.tezos-client/sapling_keys
          </span>
          . The unencrypted Sapling secret key starts with{' '}
          <span className={`${styles.monoSpace} font-monospace`}>sask...</span>.
        </p>

        <h5>Connected Wallet</h5>
        <p>
          Any Beacon compatible wallet can be connected to Tezmitter in order to
          submit sapling transactions directly or submit transactions through an{' '}
          <Link to="/about">injector service</Link>.
        </p>
      </Modal.Body>
      <Modal.Footer>
        <Button onClick={onHide}>Close</Button>
      </Modal.Footer>
    </Modal>
  );
}

HelpModal.propTypes = {
  show: PropTypes.bool.isRequired,
  onHide: PropTypes.func.isRequired,
};

function ConfirmInjectModal({ txn, onHide, confirm }) {
  return (
    <Modal
      show={!!txn}
      onHide={onHide}
      size="md"
      aria-labelledby="contained-modal-title-vcenter"
      centered
      animation={false}
      backdropClassName={styles.modalBackdrop}
    >
      <Modal.Header closeButton closeVariant="white">
        <Modal.Title id="contained-modal-title-vcenter">
          Submit Sapling Transaction
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <p>
          The sapling transaction has been generated. This transaction includes
          a <CtezValue value={0.5} /> fee if you wish to submit it through an
          injector service. Please confirm your selection.
        </p>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>
          Cancel
        </Button>
        <Button variant="primary" onClick={confirm}>
          Confirm
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

ConfirmInjectModal.propTypes = {
  txn: PropTypes.bool.isRequired,
  onHide: PropTypes.func.isRequired,
  confirm: PropTypes.func.isRequired,
};

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
          <Form.Label>Sapling Secret Key</Form.Label>
          <Form.Control
            as="textarea"
            rows={7}
            placeholder="sask..."
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
        <Button
          className="ms-2"
          variant="secondary"
          size="md"
          onClick={() => {
            setShowHelpModal(true);
          }}
          disabled={saplingWorkerIsLoading}
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
              Use my sapling address. Shielded balance:{' '}
              <CtezValue
                value={(shieldedBalance / 1_000_000).toLocaleString(undefined, {
                  maximumFractionDigits: 6,
                })}
              />
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
                evt.target.value ? parseFloat(evt.target.value) : undefined,
              );
            }}
            type="number"
            value={shieldAmountInput}
            isValid={shieldAmountInput > 0}
            isInvalid={shieldAmountInput < 0}
          />
          <Form.Text className="text-muted">Amount of ctez to shield</Form.Text>
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
                parseFloat(
                  evt.target.value ? parseFloat(evt.target.value) : undefined,
                ),
              );
            }}
            type="number"
            value={unshieldAmountInput}
            isValid={unshieldAmountInputIsValid}
            isInvalid={unshieldAmountInputIsInvalid}
          />
          <Form.Text className="text-muted">
            Amount of ctez to unshield. Shielded balance:{' '}
            <CtezValue
              value={(shieldedBalance / 1_000_000).toLocaleString(undefined, {
                maximumFractionDigits: 6,
              })}
            />
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
            {transferAnonymously ? <CtezValue value={0.5} /> : ''}
            {transferAnonymously ? ' fee' : ''}
          </Form.Label>
          <Form.Control
            onChange={(evt) => {
              setTransferAmountInput(
                parseFloat(
                  evt.target.value ? parseFloat(evt.target.value) : undefined,
                ),
              );
            }}
            type="number"
            value={transferAmountInput}
            isValid={transferAmountInputisValid}
            isInvalid={transferAmountInputisInvalid}
          />
          <Form.Text className="text-muted">
            Amount of shielded ctez to transfer. Shielded balance:{' '}
            <CtezValue
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
                injector service. ( <CtezValue value={0.5} /> fee )
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

  return (
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
