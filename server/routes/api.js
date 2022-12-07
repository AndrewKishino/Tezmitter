const express = require('express');
const { Tezmitter } = require('../services');

const apiRouter = (io) => {
  const router = express.Router();

  const tezmitter = new Tezmitter(io);

  router.post('/submitFundedTransaction', async (req, res) => {
    const { opHash, blockHash, shieldedTx, contract, amount } = req.body;

    try {
      await tezmitter.queueFundedTransaction({
        opHash,
        blockHash,
        shieldedTx,
        contract,
        amount,
      });
      res.status(200).send({ success: true });
    } catch (err) {
      res.status(400).send({ error: err.message });
    }
  });

  return router;
};

module.exports = apiRouter;
