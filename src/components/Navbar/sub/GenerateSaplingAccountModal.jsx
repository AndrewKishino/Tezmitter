import React, { useState } from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import * as bip39 from 'bip39';
import Button from 'react-bootstrap/Button';
import Modal from 'react-bootstrap/Modal';

import styles from './GenerateSaplingAccountModal.module.scss';

const generateMnemonic = () => {
  const mnemonic = bip39.generateMnemonic(256);
  return mnemonic;
};

function GenerateSaplingAccountModal({ show, onHide }) {
  const [mnemonic, setMnemonic] = useState('');

  const displayMnemonic = () => {
    const generatedMnemonic = generateMnemonic();
    setMnemonic(generatedMnemonic);
  };

  return (
    <Modal
      show={show}
      onHide={onHide}
      onExited={() => {
        setMnemonic('');
      }}
      size="lg"
      aria-labelledby="contained-modal-title-vcenter"
      centered
      animation
      backdropClassName={styles.modalBackdrop}
    >
      <Modal.Header closeButton closeVariant="white">
        <Modal.Title id="contained-modal-title-vcenter">
          Generate a new Sapling Account
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <h5>Generate a new Sapling Mnemonic</h5>
        <p>
          Click the &quot;Generate&quot; button below to generate a new Sapling
          mnemonic phrase. This phrase can be used to access a sapling account
          in order to sign sapling transactions and view sapling balances. Keep
          this phrase safe as this is the only way to access your sapling
          account.
        </p>
        <div className="d-flex justify-content-center my-5">
          {mnemonic ? (
            <div
              className={classnames(
                styles.codeBlock,
                'p-4 font-monospace text-center',
              )}
            >
              {mnemonic}
            </div>
          ) : (
            <Button className="text-light" onClick={displayMnemonic}>
              Generate ✨
            </Button>
          )}
        </div>
      </Modal.Body>
      <Modal.Footer>
        <Button className="text-light" onClick={onHide}>
          Close
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

GenerateSaplingAccountModal.propTypes = {
  show: PropTypes.bool.isRequired,
  onHide: PropTypes.func.isRequired,
};

export default GenerateSaplingAccountModal;
