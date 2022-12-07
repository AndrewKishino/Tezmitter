import { useState, useEffect } from 'react';
import workerpool from 'workerpool';

export function useSaplingWorker(sk, saplingContractAddress, rpcUrl) {
  const [saplingWorker, setSaplingWorker] = useState(null);
  const [workerIsLoading, setWorkerIsLoading] = useState(false);
  const [workerLoaded, setWorkerLoaded] = useState(false);

  useEffect(() => {
    const worker = workerpool.pool('/static/js/sapling.bundle.js', {
      maxWorkers: 1,
    });
    setSaplingWorker(worker);
    return () => {
      worker.terminate();
    };
  }, []);

  useEffect(() => {
    if (sk) {
      setWorkerIsLoading(true);
      saplingWorker
        .exec('loadSaplingSecret', [sk, saplingContractAddress, rpcUrl])
        .then(() => {
          setWorkerIsLoading(false);
          setWorkerLoaded(true);
        })
        .catch((err) => {
          setWorkerIsLoading(false);
          console.error(err.message);
        });
    }
  }, [sk, saplingContractAddress, rpcUrl]);

  const reInitializeSapling = () => {
    saplingWorker
      .exec('reInitializeSapling')
      .then(() => {
        setWorkerIsLoading(false);
        setWorkerLoaded(false);
      })
      .catch((err) => {
        setWorkerIsLoading(false);
        console.error(err.message);
      });
  };

  return [
    saplingWorker,
    reInitializeSapling,
    { loading: workerIsLoading, loaded: workerLoaded },
  ];
}
