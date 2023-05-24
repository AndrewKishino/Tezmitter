import React, { useState, useEffect } from 'react';
import workerpool from 'workerpool';
import toast from 'react-hot-toast';

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
    if (typeof sk[0] !== 'undefined' && typeof sk[1] !== 'undefined') {
      setWorkerIsLoading(true);
      saplingWorker
        .exec('loadSaplingSecret', [sk, saplingContractAddress, rpcUrl])
        .then(() => {
          setWorkerIsLoading(false);
          setWorkerLoaded(true);
        })
        .catch((err) => {
          setWorkerIsLoading(false);
          // Temporary for now to provide feedback to invalid keys
          toast(<b>{err.message}</b>, {
            icon: '❌',
            position: 'bottom-center',
            duration: 10_000,
            style: {
              borderRadius: '10px',
              background: '#1b2235',
              color: '#ffffff',
            },
          });
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
