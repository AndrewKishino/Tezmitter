import React from 'react';
import PropTypes from 'prop-types';

function CtezValue({ value }) {
  return (
    <span>
      <span className="icon-ctez me-1" style={{ fontSize: '90%' }} />
      {value}
    </span>
  );
}

CtezValue.propTypes = {
  value: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
};

CtezValue.defaultProps = {
  value: '',
};

export default CtezValue;
