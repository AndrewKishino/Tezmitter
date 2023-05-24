import React from 'react';
import PropTypes from 'prop-types';

import Button from 'react-bootstrap/Button';
import Modal from 'react-bootstrap/Modal';
import CtezValue from 'components/CtezValue';

import styles from '../Tezmitter.module.scss';

function ConfirmInjectModal({ txn, onHide, confirm }) {
  return (
    <Modal
      show={!!txn}
      onHide={onHide}
      size="md"
      aria-labelledby="contained-modal-title-vcenter"
      centered
      animation
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
          a <CtezValue value={process.env.REACT_APP_BASE_FEE} /> fee if you wish
          to submit it through an injector service. Please confirm your
          selection.
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
  txn: PropTypes.string,
  onHide: PropTypes.func.isRequired,
  confirm: PropTypes.func.isRequired,
};

ConfirmInjectModal.defaultProps = {
  txn: '',
};

export default ConfirmInjectModal;
