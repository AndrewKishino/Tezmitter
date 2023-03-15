const express = require('express');
const cors = require('cors');
const { Tezmitter } = require('../services');

const apiRouter = (io) => {
  const tezmitter = new Tezmitter(io);

  const router = express.Router();

  router.use(cors());

  router.post('/submitPrivateTransaction', async (req, res) => {
    const { txnId, shieldedTx, contract } = req.body;

    try {
      await tezmitter.queuePrivateTransaction({
        txnId,
        shieldedTx,
        contract,
      });
      res.status(200).send({ success: true });
    } catch (err) {
      res.status(400).send({ error: err.message });
    }
  });

  return router;
};

module.exports = apiRouter;
