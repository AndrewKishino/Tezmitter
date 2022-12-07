import React, { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';

const getNextIndex = (currentIndex = 0, texts = []) => {
  if (currentIndex >= texts.length - 1) {
    return 0;
  }
  return currentIndex + 1;
};

function useInterval(callback, delay) {
  const savedCallback = useRef();

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    const id = setInterval(() => {
      savedCallback.current();
    }, delay);
    return () => clearInterval(id);
  }, [delay]);
}

function CycleIcons({ id, icons = [], interval = 1000, style }) {
  const [index, setIndex] = useState(0);

  useInterval(() => {
    setIndex(getNextIndex(index, icons));
  }, interval);

  return <i id={id} className={`fad fa-${icons[index]}`} style={style} />;
}

CycleIcons.propTypes = {
  id: PropTypes.string,
  icons: PropTypes.arrayOf(PropTypes.string),
  interval: PropTypes.number,
  style: PropTypes.shape({}),
};

CycleIcons.defaultProps = {
  id: '',
  icons: [],
  interval: 1000,
  style: {},
};

export default CycleIcons;
