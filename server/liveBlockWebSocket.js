const { TezosToolkit } = require('@taquito/taquito');

const RPC_MAP = {
  mainnet: 'https://mainnet.api.tez.ie',
  ghostnet: 'https://ghostnet.ecadinfra.com',
  kathmandunet: 'https://kathmandunet.ecadinfra.com',
};

const tezos = new TezosToolkit(RPC_MAP[process.env.REACT_APP_TEZOS_NETWORK]);

let IO;
let INTERVAL = 30;

// GLOBAL VARIABLES
let head;
let currentCycle = 0;
let currentLevel = 0;

/**
 * @description Runs the main process which monitors the head of the chain and acts on new levels and cycles
 * @param {Io} io The socket io instance
 */
const main = async (io) => {
  try {
    head = await tezos.rpc.getBlock();
    // Bootstrap the block monitor
    if (io) {
      IO = io;

      const constants = await tezos.rpc.getConstants();

      await initialize(head, constants);
      return loop(INTERVAL);
    }
    // Set new current level and cycle
    checkNewLevel(head);
    // Sleep and repeat
    return loop(INTERVAL);
  } catch (e) {
    return loop(INTERVAL);
  }
};

/**
 * @description Initilizes the variables used to track the current state of the chain
 * @param {Object} headBlock The latest block
 * @param {Object} constants The protocol constants
 */
const initialize = async (headBlock, constants) => {
  INTERVAL = parseInt(constants.minimal_block_delay, 10) / 2;

  const {
    metadata: {
      level_info: { cycle, level },
    },
  } = headBlock;

  IO.on('connection', (socket) => {
    socket.emit('block', head);
    socket.emit('constants', constants);
  });

  currentLevel = level;
  currentCycle = cycle;

  console.log('Initializing block data system');
  console.log(`Level: ${level}`);
  console.log(`Cycle: ${cycle}`);
};

/**
 * @description Increments the current level and pays out any generated rewards
 * @param {Number} level The level of the current block
 */
const checkNewLevel = (headBlock) => {
  const {
    metadata: {
      level_info: { cycle, level },
    },
  } = headBlock;

  if (currentCycle !== cycle) {
    currentCycle = cycle;
  }

  if (currentLevel !== level) {
    currentLevel = level;
    IO.emit('block', headBlock);
  }
};

/**
 * @description Runs the loop function
 * @param {Number} seconds How often (in seconds) to run the loop function
 */
const loop = (seconds) => setTimeout(main, seconds * 1000);

module.exports = main;
