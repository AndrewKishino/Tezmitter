import React from 'react';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import Button from 'react-bootstrap/Button';
import Modal from 'react-bootstrap/Modal';

import styles from '../Tezmitter.module.scss';

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

export default HelpModal;
