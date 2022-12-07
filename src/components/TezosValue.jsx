import React from 'react';
import PropTypes from 'prop-types';

function TezosValue({ value }) {
  return (
    <span>
      <span className="icon-tezos me-1" style={{ fontSize: '80%' }} />
      {value}
    </span>
  );
}

TezosValue.propTypes = {
  value: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
};

TezosValue.defaultProps = {
  value: '',
};

export default TezosValue;
